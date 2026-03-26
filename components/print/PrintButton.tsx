'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useNotecardStore } from '@/lib/store/notecardStore'
import { calculateLayout } from '@/lib/print/layoutCalculator'
import PrintSheet from './PrintSheet'

export default function PrintButton() {
  const { config, editorHtmlFront, editorHtmlBack } = useNotecardStore()
  const layout = calculateLayout(config)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'NoteCard',
    pageStyle: `
      @page {
        size: letter;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-sheet {
          page-break-after: always;
          break-after: page;
        }
        .print-sheet:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }
      }
    `,
  })

  const cardsPerSide = layout.cols * layout.rows

  return (
    <>
      <button
        onClick={() => handlePrint()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <span>⬇</span> Download / Print
      </button>

      {/* Hidden print target — rendered off-screen */}
      <div className="hidden">
        <div ref={printRef}>
          {Array.from({ length: layout.totalPages }, (_, i) => (
            <div key={i} className="print-sheet">
              <PrintSheet
                layout={layout}
                config={config}
                htmlFront={editorHtmlFront}
                htmlBack={editorHtmlBack}
                pageIndex={i}
                cardsPerSide={cardsPerSide}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
