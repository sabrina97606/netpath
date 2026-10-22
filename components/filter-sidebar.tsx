"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface FilterGroupProps {
  title: string
  items: { label: string; count: number }[]
  expanded: boolean
  onToggle: () => void
}

function FilterGroup({ title, items, expanded, onToggle }: FilterGroupProps) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-2 hover:text-slate-900"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {title}
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-1">
          {items.map((item) => (
            <label
              key={item.label}
              className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="flex-1">{item.label}</span>
              <span className="text-slate-400">{item.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function FilterSidebar() {
  const { language } = useLanguage()
  const t = translations[language].filter

  const [expanded, setExpanded] = useState({
    pipelineStatus: true,
    pipelineContains: true,
  })

  const statusItems = [
    { label: t.enabled, count: 9 },
    { label: t.disabled, count: 17 },
  ]

  const containsItems = [
    { label: t.parseProcessor, count: 26 },
    { label: t.enrichProcessor, count: 26 },
    { label: t.transformProcessor, count: 26 },
    { label: t.filterProcessor, count: 26 },
  ]

  return (
    <div className="w-52 flex-shrink-0 pr-4 border-r border-slate-200">
      <FilterGroup
        title={t.pipelineStatus}
        items={statusItems}
        expanded={expanded.pipelineStatus}
        onToggle={() =>
          setExpanded((prev) => ({
            ...prev,
            pipelineStatus: !prev.pipelineStatus,
          }))
        }
      />
      <FilterGroup
        title={t.pipelineContains}
        items={containsItems}
        expanded={expanded.pipelineContains}
        onToggle={() =>
          setExpanded((prev) => ({
            ...prev,
            pipelineContains: !prev.pipelineContains,
          }))
        }
      />
    </div>
  )
}
