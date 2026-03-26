'use client'

import { useState, useRef } from 'react'
import { parsePastedNotes } from '@/lib/parsing/pasteParser'
import { parseClipboardHtml, sectionsToHtml } from '@/lib/parsing/clipboardParser'
import { useNotecardStore } from '@/lib/store/notecardStore'

export default function PasteNotesPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ chars: number; source: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setPendingHtml } = useNotecardStore()

  const format = (rawText: string, htmlOverride?: string) => {
    setError(null)
    let html: string
    let source: string

    if (htmlOverride) {
      // Try clipboard HTML path first (preserves MathML sub/sup)
      const sections = parseClipboardHtml(htmlOverride)
      if (sections && sections.length > 0) {
        html = sectionsToHtml(sections)
        source = 'rich'
      } else {
        // Fall back to plain text parser
        const result = parsePastedNotes(rawText)
        html = result.html
        source = 'text'
      }
    } else {
      const result = parsePastedNotes(rawText)
      html = result.html
      source = 'text'
    }

    if (!html.trim()) {
      setError('Nothing to format — paste your notes first.')
      return
    }

    setPendingHtml(html)
    setStatus({ chars: html.replace(/<[^>]+>/g, '').length, source })
  }

  // Intercept paste to capture clipboard HTML (contains MathML sub/sup)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData.getData('text/html')
    const textData = e.clipboardData.getData('text/plain')

    // Let the default paste fill the textarea (for display / fallback)
    // Then after the textarea updates, run format
    setTimeout(() => {
      const current = textareaRef.current?.value ?? textData
      format(current, htmlData)
      setText(current)
    }, 0)
  }

  const handleManualFormat = () => {
    if (!text.trim()) {
      setError('Paste your notes first.')
      return
    }
    format(text)
  }

  const handleClear = () => {
    setText('')
    setStatus(null)
    setError(null)
  }

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
        Copy your notesheet from Claude or ChatGPT and paste below. Equations, subscripts, superscripts, and Greek letters are preserved from the source.
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
          ✓ Formatted — {status.chars} chars
          {status.source === 'rich' ? ' (math preserved from clipboard)' : ''}
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

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        Formatting runs automatically on paste. Use the button if you edit the text manually.
      </p>
    </div>
  )
}
