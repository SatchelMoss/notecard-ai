import { NotecardConfig } from '@/types/notecard'

const LETTER_W = 7.5  // printable width at 0.5" margins
const LETTER_H = 10   // printable height at 0.5" margins
const GUTTER = 0.25   // space between cards (for cut lines)

export interface PrintLayout {
  cols: number
  rows: number
  cardsPerPage: number
  totalCards: number    // sides × sheets
  totalPages: number
  cardWidthIn: number
  cardHeightIn: number
  isFullPage: boolean
}

export function calculateLayout(config: NotecardConfig): PrintLayout {
  const { dimensions, sides, sheets, preset } = config
  const isFullPage = preset === 'full-page'

  if (isFullPage) {
    const totalCards = sides === 'double' ? sheets * 2 : sheets
    return {
      cols: 1, rows: 1, cardsPerPage: 1,
      totalCards, totalPages: totalCards,
      cardWidthIn: 8.5, cardHeightIn: 11,
      isFullPage: true,
    }
  }

  const cols = Math.max(1, Math.floor(LETTER_W / (dimensions.width + GUTTER)))
  const rows = Math.max(1, Math.floor(LETTER_H / (dimensions.height + GUTTER)))
  const cardsPerPage = cols * rows

  const totalCards = sides === 'double' ? sheets * 2 : sheets
  const totalPages = Math.ceil(totalCards / cardsPerPage)

  return {
    cols,
    rows,
    cardsPerPage,
    totalCards,
    totalPages,
    cardWidthIn: dimensions.width,
    cardHeightIn: dimensions.height,
    isFullPage: false,
  }
}

export function estimateCharBudget(config: NotecardConfig): number {
  const { dimensions, sides, sheets } = config
  const charsPerSqIn = 144 // at ~8pt font
  const area = dimensions.width * dimensions.height
  const totalSides = sides === 'double' ? sheets * 2 : sheets
  return Math.round(area * charsPerSqIn * totalSides * 0.85) // 15% margin
}
