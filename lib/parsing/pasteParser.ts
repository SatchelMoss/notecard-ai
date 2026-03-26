/**
 * Converts copy-pasted Claude/ChatGPT output into compact horizontal notecard HTML.
 *
 * Raw paste problems:
 *  1. Equations appear TWICE — unicode math italic + ASCII fallback (zero-width spaces)
 *  2. Sometimes both versions on the same line (concatenated)
 *
 * Output: one <p> per section, everything flowing left-to-right.
 * Only items that were actual bullet points in the source get a • prefix.
 */

// ── Unicode math italic → ASCII ───────────────────────────────────────────────
const buildMathMap = (): Map<string, string> => {
  const m = new Map<string, string>()
  const add = (base: number, ascii: number, n: number) => {
    for (let i = 0; i < n; i++)
      m.set(String.fromCodePoint(base + i), String.fromCharCode(ascii + i))
  }
  add(0x1D44E, 97, 26); add(0x1D434, 65, 26)
  add(0x1D41A, 97, 26); add(0x1D400, 65, 26)
  add(0x1D482, 97, 26); add(0x1D468, 65, 26)
  add(0x1D4EA, 97, 26); add(0x1D4D0, 65, 26)
  add(0x1D7CE, 48, 10); add(0x1D7E2, 48, 10)
  return m
}
const MATH_MAP = buildMathMap()

const GREEK: Record<string, string> = {
  '𝛼':'α','𝛽':'β','𝛾':'γ','𝛿':'δ','𝜀':'ε','𝜁':'ζ','𝜂':'η','𝜃':'θ',
  '𝜄':'ι','𝜅':'κ','𝜆':'λ','𝜇':'μ','𝜈':'ν','𝜉':'ξ','𝜋':'π','𝜌':'ρ',
  '𝜎':'σ','𝜏':'τ','𝜐':'υ','𝜑':'φ','𝜒':'χ','𝜓':'ψ','𝜔':'ω',
  '𝛤':'Γ','𝛥':'Δ','𝛩':'Θ','𝛬':'Λ','𝛯':'Ξ','𝛱':'Π','𝛴':'Σ','𝛷':'Φ','𝛹':'Ψ','𝛺':'Ω',
  '𝝰':'α','𝝱':'β','𝝲':'γ','𝝳':'δ','𝝺':'λ','𝝻':'μ','𝝼':'ν','𝝿':'π','𝞂':'σ','𝞆':'χ',
}
const SUB: Record<string, string> = {
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
  'ₐ':'a','ₑ':'e','ₒ':'o','ₙ':'n','ₖ':'k','ₓ':'x','ᵢ':'i','ⱼ':'j','ₘ':'m','ₚ':'p','ₛ':'s','ₜ':'t',
}
const SUP: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
  'ⁿ':'n','ᵐ':'m','ᵏ':'k','ʲ':'j','ⁱ':'i','ᵀ':'T',
}
const INVIS_RE = /[\u200B\u200C\u200D\u2061\u2062\u2063\u2064\uFEFF\u00AD\u2060]/g

// ── conversion helpers ────────────────────────────────────────────────────────

function convertUnicode(s: string): string {
  let out = ''
  for (const ch of s) out += MATH_MAP.get(ch) ?? GREEK[ch] ?? ch
  return out
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function toHtml(raw: string): string {
  const s = convertUnicode(raw.replace(INVIS_RE, ''))
  let out = '', sub = '', sup = ''
  const flush = () => {
    if (sub) { out += `<sub>${esc(sub)}</sub>`; sub = '' }
    if (sup) { out += `<sup>${esc(sup)}</sup>`; sup = '' }
  }
  for (const ch of s) {
    if (SUB[ch])      { if (sup) flush(); sub += SUB[ch] }
    else if (SUP[ch]) { if (sub) flush(); sup += SUP[ch] }
    else              { flush(); out += esc(ch) }
  }
  flush()
  return out
}

function cleanText(s: string) {
  return convertUnicode(s.replace(INVIS_RE, ''))
}

function norm(s: string) {
  return s.replace(/\s+/g,'').replace(/[.,;:!?]/g,'').toLowerCase()
}

function dedupeInline(line: string): string {
  const n = line.length
  if (n < 8) return line
  for (let split = Math.floor(n * 0.3); split <= Math.floor(n * 0.7); split++) {
    const a = norm(line.slice(0, split))
    const b = norm(line.slice(split))
    if (a.length > 5 && a === b) return line.slice(0, split).trim()
    if (a.length > 8 && b.startsWith(a)) return line.slice(0, split).trim()
  }
  return line
}

// ── structure detection ───────────────────────────────────────────────────────

function parseSectionHeader(line: string): { num: string; title: string } | null {
  const m = line.match(/^(\d+)\)\s*(.+)/)
  if (m) return { num: m[1], title: m[2] }
  const m2 = line.match(/^#{1,3}\s+(.+)/)
  if (m2) return { num: '', title: m2[1] }
  return null
}

function parseBullet(line: string): string | null {
  const m = line.match(/^[-•·*]\s+(.+)/)
  return m ? m[1] : null
}

function isMathLine(line: string): boolean {
  const mathChars = (line.match(/[=≡≈∑∏∫∂∞≤≥±×÷→⇒←↔√αβγδεζηθλμνπρσχω]/g) || []).length
  return mathChars >= 2 || /[₀-₉⁰-⁹ₐₑₒₙₖ]/.test(line)
}

// ── block model ───────────────────────────────────────────────────────────────

type ItemKind = 'text' | 'bullet' | 'math' | 'subhead'
interface Item { kind: ItemKind; text: string }
interface Block { header: string; items: Item[] }

// ── main export ───────────────────────────────────────────────────────────────

export interface ParsedNotesheet { html: string; charCount: number }

export function parsePastedNotes(raw: string): ParsedNotesheet {
  // 1. Clean lines, strip fallbacks
  const lines: string[] = []
  for (const rawLine of raw.split('\n')) {
    if (INVIS_RE.test(rawLine)) continue
    const c = dedupeInline(cleanText(rawLine.trim()))
    if (c) lines.push(c)
  }

  // 2. Remove adjacent duplicates
  const unique: string[] = []
  for (const l of lines) {
    if (unique.length && norm(l) === norm(unique[unique.length - 1])) continue
    unique.push(l)
  }

  // 3. Group into blocks
  const blocks: Block[] = []
  let cur: Block = { header: '', items: [] }

  const push = () => {
    if (cur.header || cur.items.length) blocks.push(cur)
    cur = { header: '', items: [] }
  }

  for (const line of unique) {
    const sec = parseSectionHeader(line)
    if (sec) {
      push()
      cur.header = (sec.num ? sec.num + '. ' : '') + sec.title.toUpperCase()
      continue
    }

    // Explicit bullet from source (started with -, •, *, ·)
    const bullet = parseBullet(line)
    if (bullet !== null) {
      cur.items.push({ kind: 'bullet', text: bullet })
      continue
    }

    // Colon sub-header like "Input analysis:"
    if (/^[A-Z][^.!?\n]{0,60}:$/.test(line)) {
      cur.items.push({ kind: 'subhead', text: line })
      continue
    }

    // Math or regular text
    cur.items.push({ kind: isMathLine(line) ? 'math' : 'text', text: line })
  }
  push()

  // 4. Render: one <p> per block, everything inline
  const parts: string[] = []

  for (const block of blocks) {
    if (!block.header && !block.items.length) continue

    const tokens: string[] = []

    if (block.header) {
      tokens.push(`<strong>${toHtml(block.header)}</strong>`)
    }

    for (const item of block.items) {
      switch (item.kind) {
        case 'bullet':
          tokens.push(`• ${toHtml(item.text)}`)
          break
        case 'math':
          tokens.push(`<code>${toHtml(item.text)}</code>`)
          break
        case 'subhead':
          tokens.push(`<strong>${toHtml(item.text)}</strong>`)
          break
        case 'text':
          tokens.push(toHtml(item.text))
          break
      }
    }

    parts.push(`<p>${tokens.join(' ')}</p>`)
  }

  const html = parts.join('')
  return { html, charCount: html.replace(/<[^>]+>/g, '').length }
}
