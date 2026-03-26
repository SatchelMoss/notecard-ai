/**
 * Client-side clipboard HTML parser.
 *
 * When copying from Claude.ai or ChatGPT, the clipboard contains rich HTML
 * including KaTeX output. KaTeX renders both:
 *   - <span class="katex-html" aria-hidden="true"> — visual render (skip)
 *   - <span class="katex-mathml"><math>...</math></span> — MathML (use this)
 *
 * We parse the MathML to recover proper sub/superscripts, fractions, etc.
 */

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ── MathML → compact HTML ─────────────────────────────────────────────────────

function mathChildren(el: Element): string {
  return Array.from(el.children).map(mathToHtml).join('')
}

function mathToHtml(el: Element): string {
  const tag = el.tagName.toLowerCase().replace(/^[a-z]+:/, '') // strip namespace

  switch (tag) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
      return mathChildren(el)

    case 'semantics': {
      // First child is the actual MathML; rest are annotations — skip annotations
      const ch = Array.from(el.children)
      return ch.length ? mathToHtml(ch[0]) : mathChildren(el)
    }

    case 'msub': {
      const [base, sub] = Array.from(el.children)
      if (!base) return mathChildren(el)
      return `${mathToHtml(base)}<sub>${sub ? mathToHtml(sub) : ''}</sub>`
    }
    case 'msup': {
      const [base, sup] = Array.from(el.children)
      if (!base) return mathChildren(el)
      return `${mathToHtml(base)}<sup>${sup ? mathToHtml(sup) : ''}</sup>`
    }
    case 'msubsup': {
      const [base, sub, sup] = Array.from(el.children)
      if (!base) return mathChildren(el)
      return `${mathToHtml(base)}<sub>${sub ? mathToHtml(sub) : ''}</sub><sup>${sup ? mathToHtml(sup) : ''}</sup>`
    }
    case 'munderover': {
      const [base, under, over] = Array.from(el.children)
      if (!base) return mathChildren(el)
      return `${mathToHtml(base)}<sub>${under ? mathToHtml(under) : ''}</sub><sup>${over ? mathToHtml(over) : ''}</sup>`
    }
    case 'munder': {
      const [base, under] = Array.from(el.children)
      if (!base) return mathChildren(el)
      return `${mathToHtml(base)}<sub>${under ? mathToHtml(under) : ''}</sub>`
    }
    case 'mover': {
      const [base, over] = Array.from(el.children)
      if (!base) return mathChildren(el)
      const accent = over?.textContent?.trim() ?? ''
      if ('¯‾―'.includes(accent)) return `${mathToHtml(base)}̄`   // x-bar
      if ('^ˆ'.includes(accent))  return `${mathToHtml(base)}̂`   // x-hat
      if ('→⃗'.includes(accent))  return `${mathToHtml(base)}⃗`   // x-vec
      return `${mathToHtml(base)}<sup>${mathToHtml(over)}</sup>`
    }
    case 'mfrac': {
      const [num, den] = Array.from(el.children)
      return `(${num ? mathToHtml(num) : ''})/(${den ? mathToHtml(den) : ''})`
    }
    case 'msqrt': return `√(${mathChildren(el)})`
    case 'mroot': {
      const [base, index] = Array.from(el.children)
      return `${index ? mathToHtml(index) : ''}√(${base ? mathToHtml(base) : ''})`
    }
    case 'mspace':      return ' '
    case 'annotation':  return ''  // LaTeX source — skip
    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext':       return esc(el.textContent ?? '')
    default:            return mathChildren(el)
  }
}

// ── HTML DOM walker ───────────────────────────────────────────────────────────

// Markers for structural elements — replaced later
const HEADING_MARK = '\x01'
const BULLET_MARK  = '\x02'

function walkNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return esc(node.textContent ?? '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element

  // Skip aria-hidden elements (KaTeX visual renders, decorative spans)
  if (el.getAttribute('aria-hidden') === 'true') return ''

  const tag = el.tagName.toLowerCase()

  // Skip non-content elements
  if (['head','script','style','noscript'].includes(tag)) return ''

  // MathML root — convert to compact HTML
  if (tag === 'math') return mathToHtml(el)

  // KaTeX mathml wrapper — find the math element inside
  if (el.classList.contains('katex-mathml')) {
    const math = el.querySelector('math')
    return math ? mathToHtml(math) : ''
  }

  // KaTeX visual render — skip entirely
  if (el.classList.contains('katex-html')) return ''

  // Walk children
  const children = Array.from(el.childNodes).map(walkNode).join('')

  switch (tag) {
    case 'strong': case 'b': return `<strong>${children}</strong>`
    case 'em':     case 'i': return `<em>${children}</em>`
    case 'sub':              return `<sub>${children}</sub>`
    case 'sup':              return `<sup>${children}</sup>`
    case 'code':             return `<code>${children}</code>`
    case 'br':               return '\n'

    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6':
      return `\n${HEADING_MARK}${children}\n`

    case 'li':  return `\n${BULLET_MARK}${children}`
    case 'ul': case 'ol': return children + '\n'

    case 'p':
    case 'div':
    case 'tr':
    case 'section':
    case 'article': return children + '\n'

    case 'td': case 'th': return children + '  '

    default: return children
  }
}

// ── line-level cleanup ────────────────────────────────────────────────────────

function normalizeSpaces(s: string): string {
  return s
    .replace(/[\u200B\u200C\u200D\u2061\u2062\u2063\u2064\uFEFF\u00AD\u2060]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── main export ───────────────────────────────────────────────────────────────

export interface ClipboardSection {
  header: string   // '' if no heading
  bullets: string[]
  lines: string[]
}

/**
 * Parse clipboard HTML into sections ready for compact notecard rendering.
 * Returns null if the HTML is empty or unparseable.
 */
export function parseClipboardHtml(html: string): ClipboardSection[] | null {
  if (!html?.trim()) return null

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return null
  }

  const raw = walkNode(doc.body)
  if (!raw.trim()) return null

  // Split into lines, apply markers
  const rawLines = raw.split('\n')
  const sections: ClipboardSection[] = []
  let cur: ClipboardSection = { header: '', bullets: [], lines: [] }

  const pushCur = () => {
    if (cur.header || cur.bullets.length || cur.lines.length) {
      sections.push(cur)
    }
    cur = { header: '', bullets: [], lines: [] }
  }

  for (const rawLine of rawLines) {
    if (rawLine.startsWith(HEADING_MARK)) {
      pushCur()
      cur.header = normalizeSpaces(rawLine.slice(1))
      continue
    }
    if (rawLine.startsWith(BULLET_MARK)) {
      cur.bullets.push(normalizeSpaces(rawLine.slice(1)))
      continue
    }
    const clean = normalizeSpaces(rawLine)
    if (clean) cur.lines.push(clean)
  }
  pushCur()

  return sections.length ? sections : null
}

/**
 * Convert parsed clipboard sections to compact notecard HTML.
 * One <p> per section, everything inline.
 */
export function sectionsToHtml(sections: ClipboardSection[]): string {
  const parts: string[] = []

  for (const sec of sections) {
    const tokens: string[] = []

    if (sec.header) {
      tokens.push(`<strong>${sec.header}</strong>`)
    }

    for (const line of sec.lines) {
      if (line) tokens.push(line)
    }

    for (const bullet of sec.bullets) {
      if (bullet) tokens.push(`• ${bullet}`)
    }

    if (tokens.length) {
      parts.push(`<p>${tokens.join(' ')}</p>`)
    }
  }

  return parts.join('')
}
