'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { TextStyle } from '@tiptap/extension-text-style'
import Mathematics from '@tiptap/extension-mathematics'
import { useEffect, useRef } from 'react'
import { useNotecardStore } from '@/lib/store/notecardStore'
import EditorToolbar from './EditorToolbar'
import 'katex/dist/katex.min.css'

const PX_PER_INCH = 96
const MIN_FONT_PT = 6.5
const MAX_FONT_PT = 9
const PT_TO_PX = 4 / 3  // 1pt = 1.333px

export default function NotecardEditor() {
  const {
    config, activeEditorSide, setActiveEditorSide,
    setEditorContent, pendingHtml, setPendingHtml,
  } = useNotecardStore()
  const { dimensions, sides, sheets } = config
  const canvasRef = useRef<HTMLDivElement>(null)

  const widthPx  = Math.round(dimensions.width  * PX_PER_INCH)
  const heightPx = Math.round(dimensions.height * PX_PER_INCH)

  // Padding inside the card (in px)
  const PAD = 8

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Superscript, Subscript, TextStyle, Mathematics],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setEditorContent(activeEditorSide, editor.getJSON())
      autoScale()
    },
  })

  /**
   * Auto-scale: start at MAX_FONT_PT and step down until content fits,
   * or stop at MIN_FONT_PT. This maximises text size while ensuring
   * everything is visible on the card.
   */
  const autoScale = () => {
    const card = canvasRef.current
    if (!card) return
    const proseMirror = card.querySelector('.ProseMirror') as HTMLElement | null
    if (!proseMirror) return

    const maxHeight = heightPx - PAD * 2

    // Start at max, step down
    for (let pt = MAX_FONT_PT; pt >= MIN_FONT_PT; pt -= 0.5) {
      proseMirror.style.fontSize = `${pt * PT_TO_PX}px`
      if (proseMirror.scrollHeight <= maxHeight) break
    }
  }

  useEffect(() => { autoScale() }, [dimensions])

  // Load HTML pushed from the paste panel
  useEffect(() => {
    if (pendingHtml && editor) {
      editor.commands.setContent(pendingHtml)
      setPendingHtml(null)
      // Two-pass: let DOM settle, then scale
      requestAnimationFrame(() => requestAnimationFrame(autoScale))
    }
  }, [pendingHtml, editor])

  const totalSides = sides === 'double' ? sheets * 2 : sheets
  const sideLabels = Array.from({ length: totalSides }, (_, i) => {
    if (sides === 'single') return `Sheet ${i + 1}`
    return `Sheet ${Math.ceil((i + 1) / 2)} — ${i % 2 === 0 ? 'Front' : 'Back'}`
  })

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4 flex-1 overflow-y-auto bg-gray-950">
      <div className="flex flex-col items-center gap-3 w-full">

        {/* Side tabs */}
        {totalSides > 1 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {sideLabels.map((label, i) => {
              const sideKey = i % 2 === 0 ? 'front' : 'back'
              return (
                <button
                  key={i}
                  onClick={() => setActiveEditorSide(sideKey)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    activeEditorSide === sideKey
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Toolbar */}
        {editor && <EditorToolbar editor={editor} />}

        {/* Card canvas — exact size, white background, clipped */}
        <div
          className="bg-white text-black shadow-2xl overflow-hidden"
          style={{ width: widthPx, height: heightPx, border: '1px solid #ccc' }}
        >
          <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden"
            style={{ padding: PAD }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {dimensions.width}" × {dimensions.height}" •{' '}
          {sides === 'double' ? 'Double-sided' : 'Single-sided'} •{' '}
          {sheets} sheet{sheets > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
