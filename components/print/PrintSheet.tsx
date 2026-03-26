'use client'

import { PrintLayout } from '@/lib/print/layoutCalculator'
import { NotecardConfig } from '@/types/notecard'

interface Props {
  layout: PrintLayout
  config: NotecardConfig
  htmlFront: string
  htmlBack: string
  pageIndex: number        // which page (0-based)
  cardsPerSide: number     // how many card slots per physical page
}

const CARD_STYLES = `
  font-size: 8pt;
  line-height: 1.2;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  word-break: break-word;
`

const CONTENT_STYLES = `
  p, ul, ol, li, h1, h2, h3 { margin: 0; padding: 0; }
  p { margin-bottom: 0; }
  ul { padding-left: 10px; list-style-type: disc; }
  li { line-height: 1.2; }
  strong { font-weight: 700; }
  code { font-family: 'Courier New', monospace; font-size: 7pt; background: #f0f0f0; padding: 0 1px; }
  sub { font-size: 6pt; vertical-align: sub; line-height: 0; }
  sup { font-size: 6pt; vertical-align: super; line-height: 0; }
`

interface CardBoxProps {
  widthIn: number
  heightIn: number
  html: string
  label?: string
}

function CardBox({ widthIn, heightIn, html, label }: CardBoxProps) {
  return (
    <div style={{
      width: `${widthIn}in`,
      height: `${heightIn}in`,
      boxSizing: 'border-box',
      border: '1.5px dashed #aaa',
      padding: '0.12in',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Corner tick marks for cutting */}
      {[
        { top: -3, left: -3, borderTop: '1px solid #666', borderLeft: '1px solid #666' },
        { top: -3, right: -3, borderTop: '1px solid #666', borderRight: '1px solid #666' },
        { bottom: -3, left: -3, borderBottom: '1px solid #666', borderLeft: '1px solid #666' },
        { bottom: -3, right: -3, borderBottom: '1px solid #666', borderRight: '1px solid #666' },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'absolute', width: 6, height: 6, ...pos }} />
      ))}

      {/* Card content */}
      {html ? (
        <div
          style={{ width: '100%', height: '100%', overflow: 'hidden', ...Object.fromEntries(
            CARD_STYLES.split(';').filter(Boolean).map(s => {
              const [k, v] = s.split(':').map(x => x.trim())
              return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]
            })
          )}}
        >
          <style>{CONTENT_STYLES}</style>
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ) : (
        <div style={{ color: '#ccc', fontSize: '7pt', padding: '2px' }}>{label}</div>
      )}
    </div>
  )
}

export default function PrintSheet({ layout, config, htmlFront, htmlBack, pageIndex, cardsPerSide }: Props) {
  const { cols, rows, cardWidthIn, cardHeightIn, isFullPage } = layout
  const { sides } = config

  if (isFullPage) {
    const isBack = sides === 'double' && pageIndex % 2 === 1
    return (
      <div style={{
        width: '8.5in', minHeight: '11in',
        padding: '0.5in', boxSizing: 'border-box',
        background: 'white',
      }}>
        <style>{CONTENT_STYLES}</style>
        <div style={{
          width: '7.5in', minHeight: '10in',
          fontSize: '10pt', lineHeight: 1.3, color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}>
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: isBack ? htmlBack : htmlFront }} />
        </div>
      </div>
    )
  }

  // For index cards: tile on the page
  // Determine which content to show in each slot on this page
  const startSlot = pageIndex * cardsPerSide
  const slots = Array.from({ length: cols * rows }, (_, i) => startSlot + i)

  const getHtmlForSlot = (slotIndex: number): { html: string; label: string } => {
    // slotIndex maps to a side: front or back
    if (sides === 'single') {
      return { html: slotIndex === 0 ? htmlFront : '', label: `Card ${slotIndex + 1}` }
    }
    // double-sided: even slots = front, odd = back
    const isFront = slotIndex % 2 === 0
    return {
      html: isFront ? htmlFront : htmlBack,
      label: isFront ? 'Front' : 'Back',
    }
  }

  return (
    <div style={{
      width: '8.5in', minHeight: '11in',
      padding: '0.4in', boxSizing: 'border-box',
      background: 'white',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25in' }}>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} style={{ display: 'flex', gap: '0.25in', flexWrap: 'nowrap' }}>
            {Array.from({ length: cols }, (_, col) => {
              const slot = slots[row * cols + col]
              const { html, label } = getHtmlForSlot(slot)
              return (
                <CardBox
                  key={col}
                  widthIn={cardWidthIn}
                  heightIn={cardHeightIn}
                  html={html}
                  label={label}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Cut instructions */}
      <p style={{
        marginTop: '0.15in',
        fontSize: '7pt',
        color: '#999',
        fontFamily: 'Arial, sans-serif',
      }}>
        Cut along dashed lines. {sides === 'double' ? 'Print double-sided, or print front + back separately and glue together.' : ''}
      </p>
    </div>
  )
}
