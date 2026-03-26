/**
 * Converts copy-pasted Claude/ChatGPT output into compact HORIZONTAL notecard HTML.
 *
 * The goal: pack everything left-to-right. Section header → inline bold, then
 * all content flows as one paragraph, bullets joined with " • ".
 * No wasted vertical space. Every line should be full-width.
 *
 * Raw paste problems:
 *  1. Equations appear TWICE — unicode math italic + ASCII fallback (zero-width spaces)
 *  2. Sometimes both versions are on the same line (concatenated)
 */

// ── Unicode math italic → ASCII ───────────────────────────────────────────────
const buildMathMap = (): Map<string, string> => {
  const m = new Map<string, string>()
  const add = (base: number, ascii: number, n: number) => {
    for (let i = 0; i < n; i++)
      m.set(String.fromCodePoint(base + i), String.fromCharCode(ascii + i))
  }
  add(0x1D44E, 97, 26); add(0x1D434, 65, 26)  // italic a-z, A-Z
  add(0x1D41A, 97, 26); add(0x1D400, 65, 26)  // bold a-z, A-Z
  add(0x1D482, 97, 26); add(0x1D468, 65, 26)  // bold-italic a-z, A-Z
  add(0x1D4EA, 97, 26); add(0x1D4D0, 65, 26)  // script a-z, A-Z
  add(0x1D7CE, 48, 10); add(0x1D7E2, 48, 10)  // bold/double-struck digits
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

// ── helpers ───────────────────────────────────────────────────────────────────

function convertUnicode(s: string): string {
  let out = ''
  for (const ch of s) out += MATH_MAP.get(ch) ?? GREEK[ch] ?? ch
  return out
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

/** Convert sub/sup unicode → HTML tags, escape everything else */
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

function cleanText(raw: string): string {
  return convertUnicode(raw.replace(INVIS_RE, ''))
}

function norm(s: string): string {
  return s.replace(/\s+/g,'').replace(/[.,;:!?]/g,'').toLowerCase()
}

/** Remove same-line duplicate: unicode version + ASCII version concatenated */
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
  const m = line.match(/^(\d+)\)\s*(.+)/) ?? line.match(/^(\d+)\.\s*(.+)/)
  if (m) return { num: m[1], title: m[2] }
  const m2 = line.match(/^#{1,3}\s+(.+)/)
  if (m2) return { num: '', title: m2[1] }
  return null
}

function parseBullet(line: string): string | null {
  const m = line.match(/^[-•·*]\s*(.+)/) ?? line.match(/^\d+\.\s+(.+)/)
  return m ? m[1] : null
}

/** True if line is mostly a math expression */
function isMathLine(line: string): boolean {
  const mathCount = (line.match(/[=≡≈∑∏∫∂∞≤≥±×÷→⇒←↔√αβγδεζηθλμνπρσχω]/g) || []).length
  return mathCount >= 2 || /[₀-₉⁰-⁹]/.test(line)
}

// ── section model ─────────────────────────────────────────────────────────────

interface Block {
  type: 'section' | 'para' | 'bullets' | 'math'
  header?: string   // bold prefix for section blocks
  items: string[]   // text lines / bullet texts
}

// ── main export ───────────────────────────────────────────────────────────────

export interface ParsedNotesheet {
  html: string
  charCount: number
}

export function parsePastedNotes(raw: string): ParsedNotesheet {
  // ── Phase 1: clean each line ──────────────────────────────────────────────
  const lines: string[] = []
  for (const rawLine of raw.split('\n')) {
    // Skip accessibility-fallback lines (contain zero-width spaces)
    if (INVIS_RE.test(rawLine)) continue
    const c = dedupeInline(cleanText(rawLine.trim()))
    if (c) lines.push(c)
  }

  // Remove adjacent duplicate lines
  const unique: string[] = []
  for (const line of lines) {
    if (unique.length && norm(line) === norm(unique[unique.length - 1])) continue
    unique.push(line)
  }

  // ── Phase 2: group into blocks ───────────────────────────────────────────
  const blocks: Block[] = []
  let current: Block | null = null

  const pushCurrent = () => { if (current) blocks.push(current) }

  for (const line of unique) {
    if (!line.trim()) continue

    const sec = parseSectionHeader(line)
    if (sec) {
      pushCurrent()
      const label = sec.num ? `${sec.num}.` : ''
      current = { type: 'section', header: label + ' ' + sec.title.toUpperCase(), items: [] }
      continue
    }

    const bullet = parseBullet(line)
    if (bullet !== null) {
      if (!current) current = { type: 'bullets', items: [] }
      if (current.type === 'section' || current.type === 'bullets') {
        current.items.push(bullet)
      } else {
        pushCurrent()
        current = { type: 'bullets', items: [bullet] }
      }
      continue
    }

    // Colon-label sub-headers like "Input analysis:" → inline bold sub-header
    if (/^[A-Z][^.!?\n]{0,60}:$/.test(line)) {
      if (current?.type === 'section') {
        // Inline into the section as a bold prefix for the next items
        current.items.push('\x00SUBHEAD:' + line)
      } else {
        pushCurrent()
        current = { type: 'section', header: line, items: [] }
      }
      continue
    }

    // Math line or regular line — append to current section, or start para
    if (!current) current = { type: 'para', items: [] }
    if (current.type === 'section' || current.type === 'para' || current.type === 'math') {
      current.items.push(line)
    } else {
      pushCurrent()
      current = { type: isMathLine(line) ? 'math' : 'para', items: [line] }
    }
  }
  pushCurrent()

  // ── Phase 3: render compact horizontal HTML ──────────────────────────────
  // Each section becomes ONE <p> with everything inline:
  //   [BOLD HEADER] intro text • bullet1 • bullet2 • eq1  eq2
  const parts: string[] = []

  for (const block of blocks) {
    if (!block.items.length && !block.header) continue

    const tokens: string[] = []

    // Section / sub-header bold prefix
    if (block.header) {
      tokens.push(`<strong>${toHtml(block.header)}</strong>`)
    }

    // All items inline
    let bulletRun: string[] = []

    const flushBullets = () => {
      if (!bulletRun.length) return
      tokens.push(bulletRun.map(b => `• ${toHtml(b)}`).join(' '))
      bulletRun = []
    }

    for (const item of block.items) {
      if (item.startsWith('\x00SUBHEAD:')) {
        flushBullets()
        const text = item.slice(9)
        tokens.push(`<strong>${toHtml(text)}</strong>`)
      } else if (isMathLine(item)) {
        flushBullets()
        tokens.push(`<code>${toHtml(item)}</code>`)
      } else {
        // Short items that look like list entries — collect as bullets
        const isBulletLike = item.length < 60 &&
          !/[.!?]$/.test(item) &&
          block.type === 'section' &&
          !block.header?.includes(':')
        if (isBulletLike && !tokens.some(t => t.includes('<code>'))) {
          bulletRun.push(item)
        } else {
          flushBullets()
          tokens.push(toHtml(item))
        }
      }
    }
    flushBullets()

    parts.push(`<p>${tokens.join(' ')}</p>`)
  }

  const html = parts.join('')
  return { html, charCount: html.replace(/<[^>]+>/g, '').length }
}
