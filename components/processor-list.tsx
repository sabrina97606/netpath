"use client"

import { useState, Fragment } from "react"
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DataSource, mockDataSources } from "@/lib/data"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface ProcessorListProps {
  onAddProcessor: (pipelineName: string) => void
}

export function ProcessorList({ onAddProcessor }: ProcessorListProps) {
  const { language } = useLanguage()
  const t = translations[language]

  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources)

  const toggleExpanded = (id: string) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === id ? { ...ds, expanded: !ds.expanded } : ds
      )
    )
  }

  const toggleEnabled = (id: string) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === id ? { ...ds, enabled: !ds.enabled } : ds
      )
    )
  }

  const toggleStepEnabled = (sourceId: string, stepId: string) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === sourceId
          ? {
              ...ds,
              steps: ds.steps?.map((step) =>
                step.id === stepId
                  ? { ...step, enabled: !step.enabled }
                  : step
              ),
            }
          : ds
      )
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="bg-slate-50 sticky top-0">
          <tr className="text-left text-sm text-slate-500">
            <th className="py-3 px-4 font-medium w-16"></th>
            <th className="py-3 px-4 font-medium">{t.processor.name}</th>
            <th className="py-3 px-4 font-medium">{t.processor.filterCondition}</th>
            <th className="py-3 px-4 font-medium w-44">{t.processor.lastUpdated}</th>
            <th className="py-3 px-4 font-medium w-24">{t.processor.enabled}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dataSources.map((source) => (
            <Fragment key={source.id}>
              <tr
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </button>
                    {source.steps && source.steps.length > 0 ? (
                      <button
                        onClick={() => toggleExpanded(source.id)}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        {source.expanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    ) : (
                      <button className="p-1 hover:bg-slate-100 rounded">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-medium">
                      {source.number}
                    </span>
                    <span className="font-medium text-slate-900">
                      {source.name}
                    </span>
                    {source.tag && (
                      <span className="px-2 py-0.5 text-xs rounded bg-sky-100 text-sky-600">
                        {source.tag}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 max-w-md truncate">
                  {source.filterCondition}
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">
                  {source.lastUpdated}
                </td>
                <td className="py-3 px-4">
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={() => toggleEnabled(source.id)}
                  />
                </td>
              </tr>
              {source.expanded &&
                source.steps?.map((step, stepIndex) => (
                  <tr
                    key={step.id}
                    className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1 pl-4">
                        <button className="p-1 hover:bg-slate-100 rounded">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-4" colSpan={2}>
                      <div className="flex items-center gap-2 pl-8">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-medium">
                          {stepIndex + 1}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700">
                          {t.processor.stepTypeMap[step.type as keyof typeof t.processor.stepTypeMap] || step.type}
                        </span>
                        <span className="text-sm text-slate-600">
                          {t.processor.stepLabelMap[step.label as keyof typeof t.processor.stepLabelMap] || step.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4">
                      <Switch
                        checked={step.enabled}
                        onCheckedChange={() =>
                          toggleStepEnabled(source.id, step.id)
                        }
                      />
                    </td>
                  </tr>
                ))}
              {source.expanded && (
                <tr className="bg-slate-50/30">
                  <td className="py-2 px-4" colSpan={5}>
                    <div className="flex items-center gap-4 pl-12">
                      <button
                        onClick={() => onAddProcessor(source.name)}
                        className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600"
                      >
                        <Plus className="h-4 w-4" />
                        {t.main.addProcessor}
                      </button>
                      <button className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600">
                        <Plus className="h-4 w-4" />
                        {t.main.addNestedPipeline}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
