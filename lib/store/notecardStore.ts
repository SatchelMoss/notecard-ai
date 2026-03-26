import { create } from 'zustand'
import {
  NotecardConfig,
  DimensionPreset,
  Dimensions,
  CardSide,
  PRESETS,
  ParsedDocument,
  TopicPriority,
} from '@/types/notecard'

interface NotecardStore {
  config: NotecardConfig
  documents: ParsedDocument[]
  priorities: TopicPriority[]
  editorContentFront: object | null
  editorContentBack: object | null
  activeEditorSide: 'front' | 'back'

  setPreset: (preset: DimensionPreset) => void
  setCustomDimensions: (dims: Dimensions) => void
  setSides: (sides: CardSide) => void
  setSheets: (sheets: number) => void
  addDocument: (doc: ParsedDocument) => void
  removeDocument: (documentId: string) => void
  setPriorities: (priorities: TopicPriority[]) => void
  updatePriority: (topicId: string, weight: number) => void
  setEditorContent: (side: 'front' | 'back', content: object) => void
  setActiveEditorSide: (side: 'front' | 'back') => void
}

export const useNotecardStore = create<NotecardStore>((set) => ({
  config: {
    preset: 'index-3x5',
    dimensions: { width: 3, height: 5 },
    sides: 'double',
    sheets: 1,
  },
  documents: [],
  priorities: [],
  editorContentFront: null,
  editorContentBack: null,
  activeEditorSide: 'front',

  setPreset: (preset) =>
    set((state) => ({
      config: {
        ...state.config,
        preset,
        dimensions: PRESETS[preset] ?? state.config.dimensions,
      },
    })),

  setCustomDimensions: (dims) =>
    set((state) => ({
      config: { ...state.config, preset: 'custom', dimensions: dims },
    })),

  setSides: (sides) =>
    set((state) => ({ config: { ...state.config, sides } })),

  setSheets: (sheets) =>
    set((state) => ({ config: { ...state.config, sheets } })),

  addDocument: (doc) =>
    set((state) => {
      const pages = doc.pages
      const newPriorities: TopicPriority[] = pages
        .filter((p) => p.structuredText.headings.length > 0)
        .slice(0, 10)
        .map((p) => ({
          topicId: `${doc.documentId}-p${p.pageNumber}`,
          label: p.structuredText.headings[0] || `Page ${p.pageNumber}`,
          weight: 3,
        }))
      return {
        documents: [...state.documents, doc],
        priorities: [...state.priorities, ...newPriorities],
      }
    }),

  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.documentId !== documentId),
      priorities: state.priorities.filter(
        (p) => !p.topicId.startsWith(documentId)
      ),
    })),

  setPriorities: (priorities) => set({ priorities }),

  updatePriority: (topicId, weight) =>
    set((state) => ({
      priorities: state.priorities.map((p) =>
        p.topicId === topicId ? { ...p, weight } : p
      ),
    })),

  setEditorContent: (side, content) =>
    set(side === 'front'
      ? { editorContentFront: content }
      : { editorContentBack: content }
    ),

  setActiveEditorSide: (side) => set({ activeEditorSide: side }),
}))
