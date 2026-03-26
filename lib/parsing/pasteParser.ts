/**
 * Converts copy-pasted Claude/ChatGPT output into compact notecard HTML.
 *
 * Problems in the raw paste:
 *  1. Each equation appears TWICE — unicode math italic version + ASCII fallback
 *     (sometimes on the same line, sometimes on consecutive lines with \u200B)
 *  2. Block-level formatting wastes vertical space on a notecard
 *
 * Goals:
 *  - Strip all duplicate content
 *  - Convert unicode math → readable ASCII + proper sub/sup tags
 *  - Produce the most compact HTML that still reads clearly
 */

// ── Unicode math italic → ASCII ───────────────────────────────────────────────
const buildMathMap = (): Map<string, string> => {
  const m = new Map<string, string>()
  const add = (base: number, ascii: number, count: number) => {
    for (let i = 0; i < count; i++)
      m.set(String.fromCodePoint(base + i), String.fromCharCode(ascii + i))
  }
  add(0x1D44E, 97, 26)  // italic a-z
  add(0x1D434, 65, 26)  // italic A-Z
  add(0x1D41A, 97, 26)  // bold a-z
  add(0x1D400, 65, 26)  // bold A-Z
  add(0x1D482, 97, 26)  // bold-italic a-z
  add(0x1D468, 65, 26)  // bold-italic A-Z
  add(0x1D4EA, 97, 26)  // script a-z
  add(0x1D4D0, 65, 26)  // script A-Z
  add(0x1D7CE, 48, 10)  // bold digits 0-9
  add(0x1D7E2, 48, 10)  // double-struck digits
  return m
}
const MATH_MAP = buildMathMap()

const GREEK_MAP: Record<string, string> = {
  '𝛼':'α','𝛽':'β','𝛾':'γ','𝛿':'δ','𝜀':'ε','𝜁':'ζ','𝜂':'η','𝜃':'θ',
  '𝜄':'ι','𝜅':'κ','𝜆':'λ','𝜇':'μ','𝜈':'ν','𝜉':'ξ','𝜋':'π','𝜌':'ρ',
  '𝜎':'σ','𝜏':'τ','𝜐':'υ','𝜑':'φ','𝜒':'χ','𝜓':'ψ','𝜔':'ω',
  '𝛤':'Γ','𝛥':'Δ','𝛩':'Θ','𝛬':'Λ','𝛯':'Ξ','𝛱':'Π','𝛴':'Σ',
  '𝛷':'Φ','𝛹':'Ψ','𝛺':'Ω',
  // bold greek
  '𝝰':'α','𝝱':'β','𝝲':'γ','𝝳':'δ','𝝺':'λ','𝝻':'μ','𝝼':'ν',
  '𝝿':'π','𝞂':'σ','𝞆':'χ',
  // hat/bar notation
  'ˉ':'̄',
}

const SUB: Record<string, string> = {
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
  'ₐ':'a','ₑ':'e','ₒ':'o','ₙ':'n','ₖ':'k','ₓ':'x','ᵢ':'i','ⱼ':'j',
  'ₘ':'m','ₚ':'p','ₛ':'s','ₜ':'t','ᵣ':'r',
}
const SUP: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
  'ⁿ':'n','ᵐ':'m','ᵏ':'k','ʲ':'j','ⁱ':'i','ᵀ':'T',
}

// Invisible/control chars to strip
const INVIS_RE = /[\u200B\u200C\u200D\u2061\u2062\u2063\u2064\uFEFF\u00AD\u2060]/g

// ── conversion helpers ────────────────────────────────────────────────────────

function convertUnicode(s: string): string {
  let out = ''
  for (const ch of s) {
    out += MATH_MAP.get(ch) ?? GREEK_MAP[ch] ?? ch
  }
  return out
}

// Convert sub/sup unicode → HTML tags; escape everything else
function toHtml(s: string): string {
  let out = ''
  let sub = '', sup = ''
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

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// Strip all invisible chars, convert unicode math, return plain text
function cleanText(raw: string): string {
  return convertUnicode(raw.replace(INVIS_RE, ''))
}

// Like cleanText but returns HTML with sub/sup tags
function cleanHtml(raw: string): string {
  return toHtml(convertUnicode(raw.replace(INVIS_RE, '')))
}

// ── deduplication ─────────────────────────────────────────────────────────────

/** Normalize a string for comparison: lowercase, strip spaces and punctuation */
function norm(s: string): string {
  return s.replace(/\s+/g, '').replace(/[.,;:!?]/g, '').toLowerCase()
}

/**
 * Same-line duplicate: ChatGPT/Claude sometimes emits unicode version + ASCII
 * version concatenated on one line. After unicode conversion both halves are
 * identical ASCII. Detect and keep only first half.
 */
function removeSameLineDuplicate(line: string): string {
  const n = line.length
  if (n < 8) return line
  // Try split points from 30% to 70% of line length
  for (let split = Math.floor(n * 0.3); split <= Math.floor(n * 0.7); split++) {
    const a = norm(line.slice(0, split))
    const b = norm(line.slice(split))
    if (a.length > 5 && a === b) return line.slice(0, split).trim()
    // Also check if b starts with a (one is a prefix of the other)
    if (a.length > 8 && b.startsWith(a)) return line.slice(0, split).trim()
  }
  return line
}

// ── structure detection ───────────────────────────────────────────────────────

function isSectionHeader(line: string): { yes: boolean; num: string; title: string } {
  const m = line.match(/^(\d+)\)\s*(.+)/)
  if (m) return { yes: true, num: m[1], title: m[2] }
  const m2 = line.match(/^#{1,3}\s+(.+)/)
  if (m2) return { yes: true, num: '', title: m2[1] }
  return { yes: false, num: '', title: '' }
}

function isBullet(line: string): string | null {
  const m = line.match(/^[-•·*]\s*(.+)/)
  if (m) return m[1]
  const m2 = line.match(/^\d+\.\s+(.+)/)
  if (m2) return m2[1]
  return null
}

function isEquation(line: string): boolean {
  // Line is mostly a formula (high density of math operators/greek/sub-sup)
  const mathChars = (line.match(/[=≡≈∝∑∏∫∂∞≤≥±×÷→⇒←↔√αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/g) || []).length
  return mathChars >= 2 || /[₀-₉⁰-⁹ᵢⱼₙₖ]/.test(line)
}

// ── main export ───────────────────────────────────────────────────────────────

export interface ParsedNotesheet {
  html: string
  charCount: number
}

export function parsePastedNotes(raw: string): ParsedNotesheet {
  // 1. Split into lines
  const rawLines = raw.split('\n')

  // 2. For each line: strip invisible chars, flag fallback lines
  //    Fallback lines (containing \u200B etc.) are the accessibility duplicates — remove them
  const cleaned: string[] = []
  for (const raw of rawLines) {
    if (INVIS_RE.test(raw)) continue   // skip fallback/accessibility lines
    const c = cleanText(raw.trim())
    if (c) cleaned.push(c)
  }

  // 3. Remove same-line duplicates (unicode+ASCII concatenated on one line)
  const deduped = cleaned.map(removeSameLineDuplicate)

  // 4. Remove adjacent duplicate lines (after normalization)
  const unique: string[] = []
  for (const line of deduped) {
    const last = unique[unique.length - 1]
    if (last && norm(line) === norm(last)) continue
    unique.push(line)
  }

  // 5. Build compact HTML
  const parts: string[] = []
  let bulletBuffer: string[] = []
  let inSection = false

  const flushBullets = () => {
    if (!bulletBuffer.length) return
    // Short bullets (avg < 30 chars) go inline to save space
    const avgLen = bulletBuffer.reduce((s, b) => s + b.length, 0) / bulletBuffer.length
    if (avgLen < 35 && bulletBuffer.length <= 6) {
      parts.push(`<p class="bl">${bulletBuffer.map(b => '• ' + toHtml(b)).join('  ')}</p>`)
    } else {
      parts.push('<ul>' + bulletBuffer.map(b => `<li>${toHtml(b)}</li>`).join('') + '</ul>')
    }
    bulletBuffer = []
  }

  for (const line of unique) {
    // Blank line — flush bullets, no extra space
    if (!line.trim()) { flushBullets(); continue }

    const sec = isSectionHeader(line)
    if (sec.yes) {
      flushBullets()
      const label = sec.num ? `${sec.num}. ${sec.title}` : sec.title
      parts.push(`<p class="sh"><strong>${toHtml(label)}</strong></p>`)
      inSection = true
      continue
    }

    const bulletText = isBullet(line)
    if (bulletText !== null) {
      bulletBuffer.push(bulletText)
      continue
    }

    flushBullets()

    // Colon-label lines like "Input analysis:" → treat as sub-header inline
    if (/^[A-Z][^.!?]{0,50}:$/.test(line)) {
      parts.push(`<p><strong>${toHtml(line)}</strong></p>`)
      continue
    }

    if (isEquation(line)) {
      parts.push(`<p class="eq">${toHtml(line)}</p>`)
    } else {
      parts.push(`<p>${toHtml(line)}</p>`)
    }
  }

  flushBullets()

  const html = parts.join('')
  return { html, charCount: html.replace(/<[^>]+>/g, '').length }
}
