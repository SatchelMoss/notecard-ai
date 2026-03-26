'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNotecardStore } from '@/lib/store/notecardStore'
import { ParsedDocument } from '@/types/notecard'
import { v4 as uuidv4 } from 'uuid'

export default function UploadPanel() {
  const { documents, addDocument, removeDocument } = useNotecardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const endpoint = file.name.endsWith('.pdf')
          ? '/api/parse-pdf'
          : '/api/parse-text'

        const res = await fetch(endpoint, { method: 'POST', body: formData })
        if (!res.ok) throw new Error(await res.text())
        const doc: ParsedDocument = await res.json()
        addDocument({ ...doc, fileName: file.name })
      } catch (e: unknown) {
        setError(`Failed to parse ${file.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setLoading(false)
  }, [addDocument])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Upload Materials
      </h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-950/30'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-3xl mb-2">📄</div>
        <p className="text-sm text-gray-300">
          {isDragActive ? 'Drop files here' : 'Drag PDFs or text files here'}
        </p>
        <p className="text-xs text-gray-500 mt-1">or click to browse</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-indigo-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Parsing files…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 rounded p-2">{error}</p>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">{documents.length} file{documents.length > 1 ? 's' : ''} loaded</p>
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
            >
              <div>
                <p className="text-sm text-gray-200 truncate max-w-[180px]">{doc.fileName}</p>
                <p className="text-xs text-gray-500">{doc.pages.length} page{doc.pages.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => removeDocument(doc.documentId)}
                className="text-gray-500 hover:text-red-400 text-lg leading-none ml-2"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
