/**
 * Clipboard HTML → TipTap JSON with proper math rendering.
 *
 * Plain HTML sub/sup cannot position ∑ limits above/below or render x̄.
 * Only KaTeX can. We:
 *   1. Parse clipboard HTML from Claude/ChatGPT
 *   2. Extract MathML from KaTeX's katex-mathml spans
 *   3. Convert MathML → LaTeX
 *   4. Output TipTap JSON with inlineMath nodes (rendered by KaTeX)
 */

// ── MathML → LaTeX ────────────────────────────────────────────────────────────

const GREEK_TO_LATEX: Record<string, string> = {
  'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\varepsilon',
  'ζ':'\\zeta','η':'\\eta','θ':'\\theta','ι':'\\iota','κ':'\\kappa',
  'λ':'\\lambda','μ':'\\mu','ν':'\\nu','ξ':'\\xi','π':'\\pi','ρ':'\\rho',
  'σ':'\\sigma','τ':'\\tau','υ':'\\upsilon','φ':'\\phi','χ':'\\chi',
  'ψ':'\\psi','ω':'\\omega',
  'Γ':'\\Gamma','Δ':'\\Delta','Θ':'\\Theta','Λ':'\\Lambda','Ξ':'\\Xi',
  'Π':'\\Pi','Σ':'\\Sigma','Υ':'\\Upsilon','Φ':'\\Phi','Ψ':'\\Psi','Ω':'\\Omega',
}

const OP_TO_LATEX: Record<string, string> = {
  '∑':'\\sum','∏':'\\prod','∫':'\\int','∬':'\\iint','∭':'\\iiint',
  '∂':'\\partial','∞':'\\infty','∇':'\\nabla',
  '≤':'\\leq','≥':'\\geq','≠':'\\neq','≈':'\\approx','≡':'\\equiv','∝':'\\propto',
  '±':'\\pm','∓':'\\mp','×':'\\times','÷':'\\div','⋅':'\\cdot','·':'\\cdot',
  '→':'\\to','←':'\\leftarrow','↔':'\\leftrightarrow',
  '⇒':'\\Rightarrow','⇐':'\\Leftarrow','⟹':'\\Longrightarrow',
  '∈':'\\in','∉':'\\notin','⊂':'\\subset','⊃':'\\supset','⊆':'\\subseteq',
  '∩':'\\cap','∪':'\\cup','∅':'\\emptyset',
  '…':'\\ldots','⋯':'\\cdots','⋮':'\\vdots',
  '√':'\\sqrt','|':'|','‖':'\\|',
  'max':'\\max','min':'\\min','arg':'\\arg','lim':'\\lim',
  'log':'\\log','ln':'\\ln','exp':'\\exp','sin':'\\sin','cos':'\\cos',
  'tan':'\\tan','sup':'\\sup','inf':'\\inf','det':'\\det',
  'mod':'\\bmod','∼':'\\sim',
}

function mathChildren(el: Element): string {
  return Array.from(el.children).map(mathToLatex).join('')
}

function mathToLatex(el: Element): string {
  const tag = el.tagName.toLowerCase().replace(/^[a-z]+:/, '')

  switch (tag) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
      return mathChildren(el)

    case 'semantics': {
      // First child is real MathML; rest are annotations (skip)
      const ch = Array.from(el.children)
      const mathChild = ch.find(c => c.tagName.toLowerCase().replace(/^[a-z]+:/, '') !== 'annotation')
      return mathChild ? mathToLatex(mathChild) : mathChildren(el)
    }

    case 'msub': {
      const [base, sub] = Array.from(el.children)
      return `{${mathToLatex(base)}}_{${sub ? mathToLatex(sub) : ''}}`
    }
    case 'msup': {
      const [base, sup] = Array.from(el.children)
      return `{${mathToLatex(base)}}^{${sup ? mathToLatex(sup) : ''}}`
    }
    case 'msubsup': {
      const [base, sub, sup] = Array.from(el.children)
      return `{${mathToLatex(base)}}_{${sub ? mathToLatex(sub) : ''}}^{${sup ? mathToLatex(sup) : ''}}`
    }
    case 'munderover': {
      const [base, under, over] = Array.from(el.children)
      return `{${mathToLatex(base)}}_{${under ? mathToLatex(under) : ''}}^{${over ? mathToLatex(over) : ''}}`
    }
    case 'munder': {
      const [base, under] = Array.from(el.children)
      return `{${mathToLatex(base)}}_{${under ? mathToLatex(under) : ''}}`
    }
    case 'mover': {
      const [base, over] = Array.from(el.children)
      const accent = over?.textContent?.trim() ?? ''
      const baseLatex = mathToLatex(base)
      if ('¯ˉ‾'.includes(accent)) return `\\bar{${baseLatex}}`
      if ('^ˆ'.includes(accent))  return `\\hat{${baseLatex}}`
      if ('~˜'.includes(accent))  return `\\tilde{${baseLatex}}`
      if ('→'.includes(accent))   return `\\vec{${baseLatex}}`
      if ('⃗'.includes(accent))   return `\\vec{${baseLatex}}`
      if ('·'.includes(accent))   return `\\dot{${baseLatex}}`
      if ('¨'.includes(accent))   return `\\ddot{${baseLatex}}`
      return `\\overset{${over ? mathToLatex(over) : ''}}{${baseLatex}}`
    }
    case 'mfrac': {
      const [num, den] = Array.from(el.children)
      return `\\frac{${num ? mathToLatex(num) : ''}}{${den ? mathToLatex(den) : ''}}`
    }
    case 'msqrt': return `\\sqrt{${mathChildren(el)}}`
    case 'mroot': {
      const [base, index] = Array.from(el.children)
      return `\\sqrt[${index ? mathToLatex(index) : ''}]{${base ? mathToLatex(base) : ''}}`
    }
    case 'mspace': return '\\ '
    case 'annotation': return ''   // LaTeX source — ignore (avoid double render)

    case 'mi': {
      const t = el.textContent?.trim() ?? ''
      return GREEK_TO_LATEX[t] ?? t
    }
    case 'mn': return el.textContent?.trim() ?? ''
    case 'mo': {
      const t = el.textContent?.trim() ?? ''
      return OP_TO_LATEX[t] ?? t
    }
    case 'mtext': {
      const t = el.textContent?.trim() ?? ''
      return `\\text{${t}}`
    }
    default: return mathChildren(el)
  }
}

// ── TipTap JSON node builders ─────────────────────────────────────────────────

type TipTapNode =
  | { type: 'text'; text: string; marks?: { type: string }[] }
  | { type: 'inlineMath'; attrs: { latex: string } }
  | { type: 'hardBreak' }
  | { type: 'paragraph'; content: TipTapNode[] }

function textNode(text: string, bold = false): TipTapNode {
  if (!text) return { type: 'text', text: '' }
  return bold
    ? { type: 'text', text, marks: [{ type: 'bold' }] }
    : { type: 'text', text }
}

function mathNode(latex: string): TipTapNode {
  return { type: 'inlineMath', attrs: { latex: latex.trim() } }
}

// ── DOM walker → TipTap inline nodes ─────────────────────────────────────────

function walkInline(node: Node, bold = false): TipTapNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? ''
    return t ? [textNode(t, bold)] : []
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const el = node as Element

  // Skip aria-hidden (KaTeX visual renders)
  if (el.getAttribute('aria-hidden') === 'true') return []

  const tag = el.tagName.toLowerCase()
  if (['script', 'style', 'head'].includes(tag)) return []

  // MathML root → inlineMath node with KaTeX
  if (tag === 'math') {
    const latex = mathToLatex(el)
    return latex.trim() ? [mathNode(latex)] : []
  }

  // KaTeX mathml wrapper
  if (el.classList.contains('katex-mathml')) {
    const math = el.querySelector('math')
    if (math) {
      const latex = mathToLatex(math)
      return latex.trim() ? [mathNode(latex)] : []
    }
    return []
  }

  // KaTeX visual render — skip
  if (el.classList.contains('katex-html')) return []

  const isBold = bold || tag === 'strong' || tag === 'b'

  const children = Array.from(el.childNodes).flatMap(n => walkInline(n, isBold))

  if (tag === 'br') return [{ type: 'hardBreak' }]
  return children
}

// ── Block-level walker ────────────────────────────────────────────────────────

const HEADING_MARK = '\x01'
const BULLET_MARK  = '\x02'

interface RawBlock {
  type: 'heading' | 'bullet' | 'para'
  inline: TipTapNode[]
}

function walkBlocks(node: Node): RawBlock[] {
  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const el = node as Element
  if (el.getAttribute('aria-hidden') === 'true') return []

  const tag = el.tagName.toLowerCase()
  if (['script','style','head'].includes(tag)) return []

  if (/^h[1-6]$/.test(tag)) {
    const inline = Array.from(el.childNodes).flatMap(n => walkInline(n, true))
    return [{ type: 'heading', inline }]
  }

  if (tag === 'li') {
    const inline = Array.from(el.childNodes).flatMap(n => walkInline(n))
    return [{ type: 'bullet', inline }]
  }

  if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
    // Check if any child is a block element — if so, recurse into blocks
    const hasBlocks = Array.from(el.children).some(c =>
      /^(h[1-6]|p|div|ul|ol|li|section|article|blockquote)$/.test(c.tagName.toLowerCase())
    )
    if (hasBlocks) {
      return Array.from(el.childNodes).flatMap(n => walkBlocks(n))
    }
    const inline = Array.from(el.childNodes).flatMap(n => walkInline(n))
    if (inline.length) return [{ type: 'para', inline }]
    return []
  }

  // For ul/ol/table etc., recurse
  return Array.from(el.childNodes).flatMap(n => walkBlocks(n))
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface NotecardTipTapDoc {
  type: 'doc'
  content: { type: 'paragraph'; content: TipTapNode[] }[]
}

/**
 * Parse clipboard HTML into a compact TipTap document.
 * Each heading starts a new paragraph with bold header.
 * Math elements become inlineMath nodes (rendered by KaTeX).
 * Returns null if nothing usable found.
 */
export function parseClipboardToTipTap(html: string): NotecardTipTapDoc | null {
  if (!html?.trim()) return null

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return null
  }

  // Remove script/style
  doc.querySelectorAll('script,style').forEach(el => el.remove())

  const blocks = walkBlocks(doc.body)
  if (!blocks.length) return null

  // Group into paragraphs: each heading starts a new paragraph
  // Bullets and paras flow into the current paragraph inline with • separators
  const paragraphs: { type: 'paragraph'; content: TipTapNode[] }[] = []
  let cur: TipTapNode[] = []

  const flushPara = () => {
    const trimmed = cur.filter(n => !(n.type === 'text' && !(n as {text:string}).text?.trim()))
    if (trimmed.length) paragraphs.push({ type: 'paragraph', content: trimmed })
    cur = []
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      flushPara()
      cur.push(...block.inline)
      cur.push(textNode(' '))
    } else if (block.type === 'bullet') {
      if (cur.length) cur.push(textNode('  '))
      cur.push(textNode('• '))
      cur.push(...block.inline)
    } else {
      // para — add space separator if we're mid-paragraph
      if (cur.length) cur.push(textNode(' '))
      cur.push(...block.inline)
    }
  }
  flushPara()

  return paragraphs.length ? { type: 'doc', content: paragraphs } : null
}
