import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { ParsedDocument } from '@/types/notecard'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    const headings = lines.filter((l) => l.length < 80 && /^[A-Z]/.test(l) && !l.endsWith('.'))
    const bullets = lines.filter((l) => /^[-•*]\s/.test(l) || /^\d+\.\s/.test(l))
    const paragraphs = lines.filter(
      (l) => l.length > 80 && !bullets.includes(l) && !headings.includes(l)
    )
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
      metadata: { title: file.name, pageCount: 1 },
    }

    return NextResponse.json(doc)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Parse failed' },
      { status: 500 }
    )
  }
}
