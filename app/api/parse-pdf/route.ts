import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { ParsedDocument } from '@/types/notecard'

// Polyfill browser APIs that pdf-parse/pdfjs requires in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  }
}
if (typeof globalThis.Path2D === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Path2D = class Path2D {}
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const data = await pdfParse(buffer)

    const text: string = data.text
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)

    // Simple heuristic extraction
    const headings = lines.filter((l: string) => l.length < 80 && /^[A-Z]/.test(l) && !l.endsWith('.'))
    const bullets = lines.filter((l: string) => /^[-•*]\s/.test(l) || /^\d+\.\s/.test(l))
    const paragraphs = lines.filter(
      (l: string) => l.length > 80 && !bullets.includes(l) && !headings.includes(l)
    )

    // Extract LaTeX-like equations (common patterns)
    const equationRegex = /\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]/g
    const equations = (text.match(equationRegex) || []).slice(0, 50)

    const doc: ParsedDocument = {
      documentId: uuidv4(),
      fileName: file.name,
      pages: [
        {
          pageNumber: 1,
          textContent: text.slice(0, 50000),
          equations,
          images: [],
          structuredText: {
            headings: headings.slice(0, 20),
            bullets: bullets.slice(0, 50),
            paragraphs: paragraphs.slice(0, 30),
          },
        },
      ],
      metadata: {
        title: file.name.replace('.pdf', ''),
        pageCount: data.numpages || 1,
      },
    }

    return NextResponse.json(doc)
  } catch (e: unknown) {
    console.error('PDF parse error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Parse failed' },
      { status: 500 }
    )
  }
}
