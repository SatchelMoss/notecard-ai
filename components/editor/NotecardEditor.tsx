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

export default function NotecardEditor() {
  const { config, activeEditorSide, setActiveEditorSide, setEditorContent } =
    useNotecardStore()
  const { dimensions, sides, sheets } = config
  const canvasRef = useRef<HTMLDivElement>(null)

  const widthPx = Math.round(dimensions.width * PX_PER_INCH)
  const heightPx = Math.round(dimensions.height * PX_PER_INCH)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Superscript,
      Subscript,
      TextStyle,
      Mathematics,
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-invert max-w-none focus:outline-none h-full overflow-hidden text-[10px] leading-snug',
      },
    },
    onUpdate: ({ editor }) => {
      setEditorContent(activeEditorSide, editor.getJSON())
      autoScale()
    },
  })

  const autoScale = () => {
    const el = canvasRef.current
    if (!el) return
    const inner = el.querySelector('.ProseMirror') as HTMLElement | null
    if (!inner) return
    let size = 10
    inner.style.fontSize = `${size}px`
    while (inner.scrollHeight > el.clientHeight && size > 6) {
      size -= 0.5
      inner.style.fontSize = `${size}px`
    }
  }

  useEffect(() => {
    autoScale()
  }, [dimensions])

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
              const isActive = activeEditorSide === sideKey
              return (
                <button
                  key={i}
                  onClick={() => setActiveEditorSide(sideKey)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
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

        {/* Card canvas */}
        <div
          className="relative bg-white text-black rounded-md shadow-2xl overflow-hidden"
          style={{ width: widthPx, height: heightPx }}
        >
          <div
            ref={canvasRef}
            className="w-full h-full p-3 overflow-hidden"
          >
            <EditorContent editor={editor} className="h-full" />
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
