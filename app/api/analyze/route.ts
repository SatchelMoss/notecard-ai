import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { NotecardConfig, ParsedDocument, TopicPriority } from '@/types/notecard'
import { estimateCharBudget } from '@/lib/print/layoutCalculator'

const client = new Anthropic()

interface AnalyzeRequest {
  documents: ParsedDocument[]
  config: NotecardConfig
  priorities: TopicPriority[]
  manualNotes?: string
}

function buildPrompt(req: AnalyzeRequest): string {
  const { documents, config, priorities, manualNotes } = req
  const budget = estimateCharBudget(config)
  const totalSides = config.sides === 'double' ? config.sheets * 2 : config.sheets

  const priorityText = priorities.length > 0
    ? priorities.map((p) => `  - "${p.label}": priority ${p.weight}/5`).join('\n')
    : '  (no priorities set — treat all topics equally)'

  const docText = documents
    .map((doc) =>
      doc.pages
        .map((p) =>
          [
            p.structuredText.headings.map((h) => `# ${h}`).join('\n'),
            p.structuredText.bullets.join('\n'),
            p.textContent.slice(0, 3000),
          ]
            .filter(Boolean)
            .join('\n')
        )
        .join('\n---\n')
    )
    .join('\n===\n')

  return `You are a study assistant helping a student fill a notecard for an exam.

NOTECARD CONFIG:
- Size: ${config.dimensions.width}" × ${config.dimensions.height}"
- Sides: ${config.sides === 'double' ? 'double-sided' : 'single-sided'}
- Sheets: ${config.sheets}
- Total sides available: ${totalSides}
- Character budget (approximate): ${budget} characters total

TOPIC PRIORITIES (higher number = more space):
${priorityText}

OUTPUT FORMAT:
Emit one JSON object per line. Each line is a complete section:
{"side":"front","sheet":1,"label":"Section Title","content":"text here with $LaTeX$ for equations"}

Rules:
- Stay within the character budget across ALL sections combined
- Use $...$ for inline math (e.g. $E = mc^2$), $$...$$ for display math
- Preserve superscripts and subscripts in LaTeX (e.g. $x^2$, $H_2O$)
- Be extremely concise — every character counts
- Higher priority topics get more lines/sections
- Distribute content across sides: front first, then back if double-sided
- Do not include prose explanations — only formulas, definitions, key facts
- Start each line with the JSON object, nothing else

STUDENT MATERIALS:
${docText.slice(0, 15000)}
${manualNotes ? `\nMANUAL NOTES:\n${manualNotes}` : ''}`
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json()

    if (!body.documents?.length && !body.manualNotes) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    const prompt = buildPrompt(body)

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e: unknown) {
    console.error('Analyze error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
