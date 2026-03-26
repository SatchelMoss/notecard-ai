'use client'

import { useState, useRef } from 'react'
import { parsePastedNotes } from '@/lib/parsing/pasteParser'
import { parseClipboardToTipTap } from '@/lib/parsing/clipboardParser'
import { useNotecardStore } from '@/lib/store/notecardStore'

export default function PasteNotesPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ chars: number; rich: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setPendingHtml, setPendingJson } = useNotecardStore()

  const format = (rawText: string, clipboardHtml?: string) => {
    setError(null)

    // Try rich clipboard HTML path first — gives us proper KaTeX math nodes
    if (clipboardHtml) {
      const doc = parseClipboardToTipTap(clipboardHtml)
      if (doc && doc.content.length > 0) {
        setPendingJson(doc)
        const charCount = JSON.stringify(doc).replace(/"[^"]+"/g, m => m).length
        setStatus({ chars: charCount, rich: true })
        return
      }
    }

    // Fall back to plain text parser → HTML
    if (!rawText.trim()) { setError('Paste your notes first.'); return }
    const result = parsePastedNotes(rawText)
    if (!result.html.trim()) { setError('Nothing could be parsed.'); return }
    setPendingHtml(result.html)
    setStatus({ chars: result.charCount, rich: false })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData.getData('text/html')
    const textData = e.clipboardData.getData('text/plain')
    setTimeout(() => {
      const currentText = textareaRef.current?.value ?? textData
      setText(currentText)
      format(currentText, htmlData)
    }, 0)
  }

  const handleManualFormat = () => format(text)

  const handleClear = () => { setText(''); setStatus(null); setError(null) }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Paste Notes
        </h2>
        {text && (
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-gray-300">
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Copy your notesheet from Claude or ChatGPT and paste below.
        Subscripts, superscripts, x̄, ∑ limits, and Greek letters are preserved.
      </p>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); setStatus(null) }}
        onPaste={handlePaste}
        placeholder="Paste your LLM-generated notesheet here..."
        className="bg-gray-800 text-gray-200 rounded-lg p-3 text-xs resize-none h-48 border border-gray-700 focus:border-indigo-500 outline-none font-mono leading-relaxed"
        spellCheck={false}
      />

      {status && (
        <p className="text-xs text-green-400 bg-green-950/30 rounded px-2 py-1.5">
          ✓ Formatted{status.rich ? ' — math rendered with KaTeX' : ''}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 rounded px-2 py-1.5">{error}</p>
      )}

      <button
        onClick={handleManualFormat}
        disabled={!text.trim()}
        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          text.trim()
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        Format onto Notecard
      </button>
      <p className="text-xs text-gray-500 text-center">
        Auto-formats on paste. Use button after manual edits.
      </p>
    </div>
  )
}
