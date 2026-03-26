export type CardSide = 'single' | 'double'

export type DimensionPreset =
  | 'full-page'
  | 'index-3x5'
  | 'index-4x6'
  | 'custom'

export interface Dimensions {
  width: number  // inches
  height: number // inches
}

export const PRESETS: Record<DimensionPreset, Dimensions | null> = {
  'full-page': { width: 8.5, height: 11 },
  'index-3x5': { width: 3, height: 5 },
  'index-4x6': { width: 4, height: 6 },
  'custom': null,
}

export const PRESET_LABELS: Record<DimensionPreset, string> = {
  'full-page': 'Full Page (8.5 × 11")',
  'index-3x5': 'Index Card (3 × 5")',
  'index-4x6': 'Index Card (4 × 6")',
  'custom': 'Custom',
}

export interface NotecardConfig {
  preset: DimensionPreset
  dimensions: Dimensions
  sides: CardSide
  sheets: number
}

export interface ParsedPage {
  pageNumber: number
  textContent: string
  equations: string[]
  images: { base64: string; mimeType: string }[]
  structuredText: {
    headings: string[]
    bullets: string[]
    paragraphs: string[]
  }
}

export interface ParsedDocument {
  documentId: string
  fileName: string
  pages: ParsedPage[]
  metadata: { title: string; pageCount: number }
}

export interface TopicPriority {
  topicId: string
  label: string
  weight: number // 1-5
}
