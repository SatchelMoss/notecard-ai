'use client'

import { PrintLayout } from '@/lib/print/layoutCalculator'
import { NotecardConfig } from '@/types/notecard'

interface Props {
  layout: PrintLayout
  config: NotecardConfig
  contentFront: object | null
  contentBack: object | null
}

// Renders a single letter-sized page with card grid and cut guides
export default function PrintSheet({ layout, config }: Props) {
  const { cols, rows, cardWidthIn, cardHeightIn, isFullPage } = layout

  if (isFullPage) {
    return (
      <div
        className="print-sheet"
        style={{
          width: '8.5in',
          minHeight: '11in',
          padding: '0.5in',
          boxSizing: 'border-box',
          position: 'relative',
          background: 'white',
        }}
      >
        <div
          style={{
            width: `${config.dimensions.width}in`,
            height: `${config.dimensions.height}in`,
            border: '1px solid #ccc',
            padding: '0.25in',
            boxSizing: 'border-box',
            fontSize: '8pt',
            lineHeight: 1.3,
          }}
        >
          {/* Editor content rendered here via print */}
        </div>
      </div>
    )
  }

  const cards = Array.from({ length: cols * rows })

  return (
    <div
      className="print-sheet"
      style={{
        width: '8.5in',
        minHeight: '11in',
        padding: '0.5in',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25in',
        background: 'white',
      }}
    >
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={{ display: 'flex', gap: '0.25in', flexWrap: 'nowrap' }}
        >
          {Array.from({ length: cols }).map((_, col) => {
            const index = row * cols + col
            return (
              <div
                key={col}
                style={{
                  width: `${cardWidthIn}in`,
                  height: `${cardHeightIn}in`,
                  border: '1.5px dashed #999',
                  boxSizing: 'border-box',
                  padding: '0.15in',
                  fontSize: '8pt',
                  lineHeight: 1.3,
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Corner tick marks */}
                {[
                  { top: -4, left: -4 },
                  { top: -4, right: -4 },
                  { bottom: -4, left: -4 },
                  { bottom: -4, right: -4 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: 6,
                      height: 6,
                      borderTop: pos.top !== undefined ? '1px solid #666' : undefined,
                      borderBottom: pos.bottom !== undefined ? '1px solid #666' : undefined,
                      borderLeft: pos.left !== undefined ? '1px solid #666' : undefined,
                      borderRight: pos.right !== undefined ? '1px solid #666' : undefined,
                      ...pos,
                    }}
                  />
                ))}
                <span style={{ color: '#bbb', fontSize: '7pt' }}>
                  Card {index + 1}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
