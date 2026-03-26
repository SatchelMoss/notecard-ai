// Converts copy-pasted Claude/ChatGPT output into clean HTML for the notecard editor.
// The main problem: browser-rendered math appears twice in copy-paste —
//   1. Unicode math italic (𝑆𝑘+1) — the visible version
//   2. Accessibility fallback (S k+1 ​) — contains zero-width spaces
// Strategy: remove fallback lines, clean unicode math, convert sub/superscripts.

// ── Unicode math italic → ASCII ──────────────────────────────────────────────
// Lowercase a–z: U+1D44E–U+1D467
// Uppercase A–Z: U+1D434–U+1D44D
// Bold variants, etc. mapped below
const buildMathItalicMap = (): Map<string, string> => {
  const m = new Map<string, string>()
  for (let i = 0; i < 26; i++) {
    m.set(String.fromCodePoint(0x1D44E + i), String.fromCharCode(97 + i))  // italic a-z
    m.set(String.fromCodePoint(0x1D434 + i), String.fromCharCode(65 + i))  // italic A-Z
    m.set(String.fromCodePoint(0x1D41A + i), String.fromCharCode(97 + i))  // bold a-z
    m.set(String.fromCodePoint(0x1D400 + i), String.fromCharCode(65 + i))  // bold A-Z
    m.set(String.fromCodePoint(0x1D482 + i), String.fromCharCode(97 + i))  // bold italic a-z
    m.set(String.fromCodePoint(0x1D468 + i), String.fromCharCode(65 + i))  // bold italic A-Z
  }
  // Bold digits 0-9: U+1D7CE–U+1D7D7
  for (let i = 0; i < 10; i++) {
    m.set(String.fromCodePoint(0x1D7CE + i), String.fromCharCode(48 + i))
  }
  return m
}

const MATH_ITALIC_MAP = buildMathItalicMap()

// Greek math italic → display greek
const GREEK_MAP: Record<string, string> = {
  '𝛼': 'α', '𝛽': 'β', '𝛾': 'γ', '𝛿': 'δ', '𝜀': 'ε', '𝜁': 'ζ',
  '𝜂': 'η', '𝜃': 'θ', '𝜄': 'ι', '𝜅': 'κ', '𝜆': 'λ', '𝜇': 'μ',
  '𝜈': 'ν', '𝜉': 'ξ', '𝜋': 'π', '𝜌': 'ρ', '𝜎': 'σ', '𝜏': 'τ',
  '𝜐': 'υ', '𝜑': 'φ', '𝜒': 'χ', '𝜓': 'ψ', '𝜔': 'ω',
  '𝛤': 'Γ', '𝛥': 'Δ', '𝛩': 'Θ', '𝛬': 'Λ', '𝛯': 'Ξ', '𝛱': 'Π',
  '𝛴': 'Σ', '𝛷': 'Φ', '𝛹': 'Ψ', '𝛺': 'Ω',
  // bold greek
  '𝝰': 'α', '𝝱': 'β', '𝝲': 'γ', '𝝳': 'δ', '𝝺': 'λ', '𝝻': 'μ',
  '𝝼': 'ν', '𝝿': 'π', '𝞂': 'σ', '𝞆': 'χ',
}

// Subscript unicode → sub-tag content
const SUBSCRIPT_CHARS: Record<string, string> = {
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4',
  '₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
  'ₐ':'a','ₑ':'e','ₒ':'o','ₙ':'n','ₖ':'k','ₓ':'x',
  'ᵢ':'i','ⱼ':'j','ₘ':'m','ₚ':'p','ₛ':'s','ₜ':'t',
}

// Superscript unicode → sup-tag content
const SUPERSCRIPT_CHARS: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4',
  '⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
  'ⁿ':'n','ᵐ':'m','ᵏ':'k','ʲ':'j','ⁱ':'i',
}

// Invisible / control characters to strip
const INVISIBLE_RE = /[\u200B\u200C\u200D\u2061\u2062\u2063\u2064\uFEFF\u00AD]/g

// ── helpers ───────────────────────────────────────────────────────────────────

function convertUnicode(text: string): string {
  let out = ''
  for (const char of text) {
    if (MATH_ITALIC_MAP.has(char)) out += MATH_ITALIC_MAP.get(char)!
    else if (GREEK_MAP[char]) out += GREEK_MAP[char]
    else out += char
  }
  return out
}

function convertSubSup(text: string): string {
  // Build HTML with <sub> and <sup> for subscript/superscript unicode
  let out = ''
  let subRun = ''
  let supRun = ''

  const flush = () => {
    if (subRun) { out += `<sub>${escHtml(subRun)}</sub>`; subRun = '' }
    if (supRun) { out += `<sup>${escHtml(supRun)}</sup>`; supRun = '' }
  }

  for (const char of text) {
    if (SUBSCRIPT_CHARS[char]) {
      if (supRun) flush()
      subRun += SUBSCRIPT_CHARS[char]
    } else if (SUPERSCRIPT_CHARS[char]) {
      if (subRun) flush()
      supRun += SUPERSCRIPT_CHARS[char]
    } else {
      flush()
      out += escHtml(char)
    }
  }
  flush()
  return out
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function normalizeLine(line: string): string {
  return line.replace(INVISIBLE_RE, '').replace(/\s+/g, '').toLowerCase()
}

function isFallbackLine(line: string): boolean {
  // Accessibility fallback lines contain zero-width spaces
  return line.includes('\u200B') || line.includes('\u200C') || line.includes('\u200D')
}

function processLine(raw: string): string {
  // Remove invisible chars, convert unicode math
  const step1 = raw.replace(INVISIBLE_RE, '')
  const step2 = convertUnicode(step1)
  return convertSubSup(step2)
}

// ── structure detection ───────────────────────────────────────────────────────

function isSectionHeader(line: string): boolean {
  return /^\d+\)\s/.test(line) || /^#{1,3}\s/.test(line)
}

function isBullet(line: string): boolean {
  return /^[-•·*]\s/.test(line) || /^\d+\.\s/.test(line)
}

function isEmpty(line: string): boolean {
  return line.trim() === ''
}

// ── main export ───────────────────────────────────────────────────────────────

export interface ParsedNotesheet {
  html: string
  sectionCount: number
  lineCount: number
}

export function parsePastedNotes(raw: string): ParsedNotesheet {
  const rawLines = raw.split('\n')

  // Step 1: remove accessibility fallback lines
  const withoutFallbacks = rawLines.filter(line => !isFallbackLine(line))

  // Step 2: deduplicate adjacent near-identical lines
  // (sometimes the same equation appears on consecutive lines in slightly different unicode forms)
  const deduped: string[] = []
  for (let i = 0; i < withoutFallbacks.length; i++) {
    const curr = normalizeLine(withoutFallbacks[i])
    const prev = deduped.length > 0 ? normalizeLine(deduped[deduped.length - 1]) : ''
    if (curr.length > 4 && curr === prev) continue  // exact duplicate after normalization
    deduped.push(withoutFallbacks[i])
  }

  // Step 3: group lines into blocks and emit HTML
  const htmlParts: string[] = []
  let inList = false
  let sectionCount = 0

  const closeList = () => {
    if (inList) { htmlParts.push('</ul>'); inList = false }
  }

  for (const rawLine of deduped) {
    const line = rawLine.trim()

    if (isEmpty(line)) {
      closeList()
      continue
    }

    if (isSectionHeader(line)) {
      closeList()
      sectionCount++
      // Strip leading number/hash markers, process the rest
      const text = line.replace(/^\d+\)\s*/, '').replace(/^#{1,3}\s*/, '')
      htmlParts.push(`<h3>${processLine(text)}</h3>`)
      continue
    }

    if (isBullet(line)) {
      if (!inList) { htmlParts.push('<ul>'); inList = true }
      const text = line.replace(/^[-•·*]\s*/, '').replace(/^\d+\.\s*/, '')
      htmlParts.push(`<li>${processLine(text)}</li>`)
      continue
    }

    // Regular line — check if it looks equation-heavy
    closeList()
    const processed = processLine(line)
    // Wrap equation-like lines in a <p> with monospace styling
    const isEquationLine = /[=≡≈∝∑∏∫∂∞≤≥±×÷→⇒⟹←⟸↔⟺√]/.test(line) ||
      /[α-ωΑ-Ω]/.test(line) ||
      /[₀-₉ⁿ⁰-⁹]/.test(line)
    if (isEquationLine) {
      htmlParts.push(`<p class="eq">${processed}</p>`)
    } else {
      htmlParts.push(`<p>${processed}</p>`)
    }
  }

  closeList()

  return {
    html: htmlParts.join(''),
    sectionCount,
    lineCount: deduped.filter(l => l.trim()).length,
  }
}
