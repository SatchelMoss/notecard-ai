'use client'

import { Editor } from '@tiptap/react'
import { useState } from 'react'

interface Props {
  editor: Editor
}

const Btn = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick() }}
    title={title}
    className={`px-2 py-1 rounded text-sm transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
)

export default function EditorToolbar({ editor }: Props) {
  const [showMathInput, setShowMathInput] = useState(false)
  const [mathInput, setMathInput] = useState('')

  const insertMath = () => {
    if (!mathInput.trim()) return
    editor.chain().focus().insertContent(`$${mathInput}$`).run()
    setMathInput('')
    setShowMathInput(false)
  }

  return (
    <div className="flex flex-wrap gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1.5 w-full max-w-lg">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <strong>B</strong>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <em>I</em>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
        x²
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
        x₂
      </Btn>
      <div className="w-px bg-gray-700 mx-0.5" />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        • List
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
        1. List
      </Btn>
      <div className="w-px bg-gray-700 mx-0.5" />
      <Btn onClick={() => setShowMathInput(!showMathInput)} active={showMathInput} title="Insert equation">
        ∑ Math
      </Btn>

      {showMathInput && (
        <div className="w-full flex gap-2 mt-1">
          <input
            autoFocus
            value={mathInput}
            onChange={(e) => setMathInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && insertMath()}
            placeholder="LaTeX, e.g. x^2 + y^2 = r^2"
            className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-xs font-mono"
          />
          <button
            onClick={insertMath}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1 text-xs"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  )
}
