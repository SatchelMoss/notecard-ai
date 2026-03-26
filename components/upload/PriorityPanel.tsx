'use client'

import { useNotecardStore } from '@/lib/store/notecardStore'

export default function PriorityPanel() {
  const { priorities, updatePriority } = useNotecardStore()

  if (priorities.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Topic Priorities
      </h2>
      <div className="flex flex-col gap-2">
        {priorities.map((p) => (
          <div key={p.topicId} className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300 truncate max-w-[180px]">{p.label}</span>
              <span className="text-xs text-indigo-400 font-mono w-4 text-right">{p.weight}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={p.weight}
              onChange={(e) => updatePriority(p.topicId, Number(e.target.value))}
              className="w-full accent-indigo-500 h-1"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Higher = more space on your notecard
      </p>
    </div>
  )
}
