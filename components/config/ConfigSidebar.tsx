'use client'

import { useNotecardStore } from '@/lib/store/notecardStore'
import { DimensionPreset, PRESET_LABELS } from '@/types/notecard'
import { useState } from 'react'

const PRESETS: DimensionPreset[] = ['full-page', 'index-3x5', 'index-4x6', 'custom']

export default function ConfigSidebar() {
  const { config, setPreset, setCustomDimensions, setSides, setSheets } =
    useNotecardStore()

  const [customW, setCustomW] = useState(String(config.dimensions.width))
  const [customH, setCustomH] = useState(String(config.dimensions.height))

  const handleCustomApply = () => {
    const w = parseFloat(customW)
    const h = parseFloat(customH)
    if (w > 0 && h > 0) setCustomDimensions({ width: w, height: h })
  }

  return (
    <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-700 p-5 flex flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Card Size
        </h2>
        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                config.preset === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {config.preset === 'custom' && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                max="17"
                step="0.25"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600"
                placeholder='Width"'
              />
              <span className="text-gray-400 text-sm">×</span>
              <input
                type="number"
                min="1"
                max="17"
                step="0.25"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600"
                placeholder='Height"'
              />
            </div>
            <button
              onClick={handleCustomApply}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1.5 text-sm"
            >
              Apply
            </button>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-500">
          {config.dimensions.width}" × {config.dimensions.height}"
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Sides
        </h2>
        <div className="flex gap-2">
          {(['single', 'double'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSides(s)}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors capitalize ${
                config.sides === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Sheets Allowed
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={5}
            value={config.sheets}
            onChange={(e) => setSheets(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-white font-semibold w-6 text-center">
            {config.sheets}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {config.sheets} sheet{config.sheets > 1 ? 's' : ''},{' '}
          {config.sides === 'double' ? config.sheets * 2 : config.sheets} side
          {config.sides === 'double' && config.sheets > 1 ? 's' : ''} total
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 leading-relaxed">
          {config.preset !== 'full-page'
            ? 'Cards will be printed on a letter page with cut guides so you can trim to size.'
            : 'Full page — prints directly on letter paper.'}
        </p>
      </div>
    </aside>
  )
}
