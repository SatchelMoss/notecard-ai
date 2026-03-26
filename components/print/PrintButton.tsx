'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useNotecardStore } from '@/lib/store/notecardStore'
import { calculateLayout } from '@/lib/print/layoutCalculator'
import PrintSheet from './PrintSheet'

export default function PrintButton() {
  const { config, editorContentFront, editorContentBack } = useNotecardStore()
  const layout = calculateLayout(config)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'NoteCard AI',
    pageStyle: `
      @page { size: letter; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-sheet { page-break-after: always; }
      }
    `,
  })

  return (
    <>
      <button
        onClick={() => handlePrint()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        🖨 Print
      </button>

      {/* Hidden print target */}
      <div className="hidden">
        <div ref={printRef}>
          {Array.from({ length: layout.totalPages }).map((_, i) => (
            <PrintSheet
              key={i}
              layout={layout}
              config={config}
              contentFront={editorContentFront}
              contentBack={editorContentBack}
            />
          ))}
        </div>
      </div>
    </>
  )
}
