'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { TextStyle } from '@tiptap/extension-text-style'
import Mathematics from '@tiptap/extension-mathematics'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNotecardStore } from '@/lib/store/notecardStore'
import EditorToolbar from './EditorToolbar'
import 'katex/dist/katex.min.css'

const PX_PER_INCH = 96
const PT_TO_PX = 4 / 3
const MIN_PT = 5
const MAX_PT = 14
const PAD = 8

export default function NotecardEditor() {
  const {
    config, activeEditorSide, setActiveEditorSide,
    setEditorContent, setEditorHtml,
    pendingHtml, setPendingHtml,
    pendingJson, setPendingJson,
  } = useNotecardStore()
  const { dimensions, sides, sheets } = config
  const canvasRef = useRef<HTMLDivElement>(null)

  // null = auto-scale; number = user-locked size
  const [lockedPt, setLockedPt] = useState<number | null>(null)
  const [displayPt, setDisplayPt] = useState(8)

  const widthPx  = Math.round(dimensions.width  * PX_PER_INCH)
  const heightPx = Math.round(dimensions.height * PX_PER_INCH)

  const applyFontSize = useCallback((pt: number) => {
    const el = canvasRef.current?.querySelector('.ProseMirror') as HTMLElement | null
    if (el) el.style.fontSize = `${pt * PT_TO_PX}px`
    setDisplayPt(Math.round(pt * 2) / 2)
  }, [])

  const autoScale = useCallback(() => {
    if (lockedPt !== null) { applyFontSize(lockedPt); return }
    const card = canvasRef.current
    const pm = card?.querySelector('.ProseMirror') as HTMLElement | null
    if (!card || !pm) return
    const maxH = heightPx - PAD * 2
    for (let pt = MAX_PT; pt >= MIN_PT; pt -= 0.5) {
      pm.style.fontSize = `${pt * PT_TO_PX}px`
      if (pm.scrollHeight <= maxH) { setDisplayPt(pt); break }
    }
  }, [lockedPt, heightPx, applyFontSize])

  const bumpFont = (delta: number) => {
    const next = Math.min(MAX_PT, Math.max(MIN_PT, (lockedPt ?? displayPt) + delta))
    setLockedPt(next)
    applyFontSize(next)
  }

  const resetFont = () => {
    setLockedPt(null)
    setTimeout(autoScale, 20)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Superscript, Subscript, TextStyle, Mathematics],
    content: '<p></p>',
    editorProps: { attributes: { class: 'focus:outline-none' } },
    onUpdate: ({ editor }) => {
      setEditorContent(activeEditorSide, editor.getJSON())
      setEditorHtml(activeEditorSide, editor.getHTML())
      if (lockedPt === null) autoScale()
    },
  })

  useEffect(() => { autoScale() }, [dimensions, lockedPt])

  useEffect(() => {
    if (pendingHtml && editor) {
      editor.commands.setContent(pendingHtml)
      setEditorHtml(activeEditorSide, editor.getHTML())
      setPendingHtml(null)
      setLockedPt(null)
      requestAnimationFrame(() => requestAnimationFrame(autoScale))
    }
  }, [pendingHtml, editor])

  useEffect(() => {
    if (pendingJson && editor) {
      editor.commands.setContent(pendingJson)
      setEditorHtml(activeEditorSide, editor.getHTML())
      setPendingJson(null)
      setLockedPt(null)
      requestAnimationFrame(() => requestAnimationFrame(autoScale))
    }
  }, [pendingJson, editor])

  const totalSides = sides === 'double' ? sheets * 2 : sheets
  const sideLabels = Array.from({ length: totalSides }, (_, i) =>
    sides === 'single'
      ? `Sheet ${i + 1}`
      : `Sheet ${Math.ceil((i + 1) / 2)} — ${i % 2 === 0 ? 'Front' : 'Back'}`
  )

  return (
    <div className="flex flex-col items-center gap-3 py-6 px-4 flex-1 overflow-y-auto bg-gray-950">

      {/* Side tabs */}
      {totalSides > 1 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {sideLabels.map((label, i) => {
            const sideKey = i % 2 === 0 ? 'front' : 'back'
            return (
              <button key={i} onClick={() => setActiveEditorSide(sideKey)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeEditorSide === sideKey
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >{label}</button>
            )
          })}
        </div>
      )}

      {/* Toolbar + font controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center w-full">
        {editor && <EditorToolbar editor={editor} />}

        {/* Font size control */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5">
          <button
            onClick={() => bumpFont(-0.5)}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:bg-gray-700 text-sm font-bold"
            title="Smaller"
          >−</button>
          <span className="text-xs text-gray-300 w-12 text-center tabular-nums">
            {displayPt}pt{lockedPt === null ? ' auto' : ''}
          </span>
          <button
            onClick={() => bumpFont(0.5)}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:bg-gray-700 text-sm font-bold"
            title="Larger"
          >+</button>
          {lockedPt !== null && (
            <button
              onClick={resetFont}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-1"
              title="Reset to auto"
            >auto</button>
          )}
        </div>
      </div>

      {/* Card canvas */}
      <div
        className="bg-white text-black shadow-2xl"
        style={{ width: widthPx, height: heightPx, border: '1px solid #ccc', overflow: 'hidden' }}
      >
        <div ref={canvasRef} style={{ padding: PAD, width: '100%', height: '100%', overflow: 'hidden' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {dimensions.width}" × {dimensions.height}" •{' '}
        {sides === 'double' ? 'Double-sided' : 'Single-sided'} •{' '}
        {sheets} sheet{sheets > 1 ? 's' : ''}
      </p>
    </div>
  )
}
