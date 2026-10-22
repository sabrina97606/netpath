"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"
import { processorCategories } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface AddProcessorDrawerProps {
  open: boolean
  onClose: () => void
  pipelineName: string
  onSelectProcessor?: (processorName: string) => void
}

// Category title mapping for translation
const categoryTitleMap: Record<string, keyof typeof translations.en.addProcessor> = {
  "Parse": "parse",
  "Enrich": "enrich",
  "Transform": "transform",
  "Filter": "filter",
}

export function AddProcessorDrawer({
  open,
  onClose,
  pipelineName,
  onSelectProcessor,
}: AddProcessorDrawerProps) {
  const { language } = useLanguage()
  const t = translations[language]

  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = processorCategories
    .map((category) => ({
      ...category,
      options: category.options.filter(
        (option) =>
          option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.options.length > 0)

  const getCategoryTitle = (title: string) => {
    // Map Common/List Operations/Field Operations to Chinese
    const titleMap: Record<string, string> = {
      "Common": t.addProcessor?.commonCategory || "常用",
      "List Operations": t.addProcessor?.listOperationsCategory || "列表操作",
      "Field Operations": t.addProcessor?.fieldOperationsCategory || "字段操作",
    }
    return titleMap[title] || title
  }

  const handleSelectProcessor = (processorName: string) => {
    if (processorName === "Universal Bi-Directional Enricher") {
      onSelectProcessor?.("Universal Bi-Directional Enricher")
    } else if (processorName === "Field Relationship Builder") {
      onSelectProcessor?.("Field Relationship Builder")
    } else if (processorName === "Metric Model Mapping") {
      onSelectProcessor?.("Metric Model Mapping")
    } else {
      onSelectProcessor?.(processorName)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 transition-opacity z-40",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[480px] bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-slate-900">
              {t.addProcessor.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.addProcessor.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredCategories.map((category) => (
            <div key={category.title} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-sky-500 rounded" />
                <h3 className="text-sm font-medium text-slate-900">
                  {getCategoryTitle(category.title)}
                </h3>
              </div>
              <div className="space-y-1">
                {category.options.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleSelectProcessor(option.name)}
                    className="w-full flex items-start gap-4 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-sm font-medium text-slate-700 w-32 flex-shrink-0 group-hover:text-sky-600">
                      {t.addProcessor.processorNames[option.name as keyof typeof t.addProcessor.processorNames] || option.name}
                    </span>
                    <span className="text-sm text-slate-500">
                      {t.addProcessor.processorDescriptions[option.name as keyof typeof t.addProcessor.processorDescriptions] || option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
