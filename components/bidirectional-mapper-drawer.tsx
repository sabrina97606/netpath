"use client"

import { useState, useRef, useEffect } from "react"
import { X, Plus, Trash2, ChevronDown, HelpCircle, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { EnricherUserGuide } from "./enricher-user-guide"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface MatchRule {
  id: string
  fieldName: string
  priority: string  // "P1", "P2", "P3", ...
}

interface PreCondition {
  id: string
  fieldName: string
}

interface MappingRule {
  id: string
  preConditionValues: Record<string, string>  // key = preCondition id, value = cell value
  matchValue: string
  outputValue: string
}

interface SampleData {
  id: string
  name: string
  content: string
  selected: boolean
}

interface BidirectionalMapperDrawerProps {
  open: boolean
  onClose: () => void
  pipelineName: string
}

export function BidirectionalMapperDrawer({
  open,
  onClose,
  pipelineName,
}: BidirectionalMapperDrawerProps) {
  const { language } = useLanguage()
  const t = translations[language]

  const [operatorName, setOperatorName] = useState(() => {
    // Set initial default name based on current language
    return language === "en" ? "Universal Bi-Directional Enricher" : "通用双向富化器"
  })
  const [matchRules, setMatchRules] = useState<MatchRule[]>([
    { id: "1", fieldName: "dst_port", priority: "P1" },
    { id: "2", fieldName: "src_port", priority: "P2" },
  ])
  const [preConditionsExpanded, setPreConditionsExpanded] = useState(true)
  const [preConditions, setPreConditions] = useState<PreCondition[]>([
    { id: "protocol", fieldName: "protocol" },
  ])
  const [mappingRules, setMappingRules] = useState<MappingRule[]>([
    { id: "1", preConditionValues: { protocol: "TCP" }, matchValue: "3306", outputValue: "mysql" },
    { id: "2", preConditionValues: { protocol: "TCP" }, matchValue: "443",  outputValue: "https" },
    { id: "3", preConditionValues: { protocol: "TCP" }, matchValue: "80",   outputValue: "http" },
    { id: "4", preConditionValues: { protocol: "UDP" }, matchValue: "53",   outputValue: "dns" },
    { id: "5", preConditionValues: { protocol: "TCP" }, matchValue: "22",   outputValue: "ssh" },
    { id: "6", preConditionValues: { protocol: "TCP" }, matchValue: "3260", outputValue: "iscsi-target" },
    { id: "7", preConditionValues: { protocol: "TCP" }, matchValue: "1433", outputValue: "ms-sql-s" },
    { id: "8", preConditionValues: { protocol: "TCP" }, matchValue: "2055", outputValue: "NetFlow" },
  ])

  const [enrichmentField, setEnrichmentField] = useState("application")
  const [fallbackDefault, setFallbackDefault] = useState("min(dst_port, src_port)")
  const [conflictProtection, setConflictProtection] = useState(true)

  // Debug
  const [sampleDataList, setSampleDataList] = useState<SampleData[]>([
    { id: "1", name: "Sample Data 1", content: "", selected: true }
  ])
  const [debugExpanded, setDebugExpanded] = useState(true)
  const [debugResult, setDebugResult] = useState<{ keys: number; message: string } | null>(null)
  const [executionTime, setExecutionTime] = useState<string | null>(null)

  // UI States
  const [guideOpen, setGuideOpen] = useState(false)
  const [parseJSONOpen, setParseJSONOpen] = useState(false)
  const [parseJSONText, setParseJSONText] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)

  const parseJSONRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!parseJSONOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (parseJSONRef.current && !parseJSONRef.current.contains(e.target as Node)) {
        setParseJSONOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [parseJSONOpen])

  // Resize
  const drawerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(1200)
  const startXRef = useRef(0)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
  }

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX
      setDrawerWidth((prev) => Math.max(700, Math.min(1800, prev + deltaX)))
      startXRef.current = e.clientX
    }
    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  // Match Rules helpers
  const addMatchRule = () => {
    const nextP = `P${matchRules.length + 1}`
    setMatchRules((prev) => [...prev, { id: String(Date.now()), fieldName: "", priority: nextP }])
  }
  const removeMatchRule = (id: string) => setMatchRules((prev) => prev.filter((r) => r.id !== id))
  const updateMatchRule = (id: string, key: keyof MatchRule, value: string) =>
    setMatchRules((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))

  // Check for duplicate priorities
  const getDuplicatePriorities = () => {
    const priorityCounts: Record<string, number> = {}
    matchRules.forEach((r) => {
      priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1
    })
    return Object.keys(priorityCounts).filter((p) => priorityCounts[p] > 1)
  }
  const duplicatePriorities = getDuplicatePriorities()
  const hasDuplicatePriority = (priority: string) => duplicatePriorities.includes(priority)

  // Pre-condition helpers — adding/removing also syncs mapping rule columns
  const addPreCondition = () => {
    const newId = String(Date.now())
    setPreConditions((prev) => [...prev, { id: newId, fieldName: "" }])
    setMappingRules((prev) => prev.map((r) => ({
      ...r,
      preConditionValues: { ...r.preConditionValues, [newId]: "*" },
    })))
  }
  const removePreCondition = (id: string) => {
    setPreConditions((prev) => prev.filter((p) => p.id !== id))
    setMappingRules((prev) => prev.map((r) => {
      const { [id]: _removed, ...rest } = r.preConditionValues
      return { ...r, preConditionValues: rest }
    }))
  }
  const updatePreConditionName = (id: string, fieldName: string) =>
    setPreConditions((prev) => prev.map((p) => (p.id === id ? { ...p, fieldName } : p)))

  // Mapping Rule helpers
  const addMappingRule = () =>
    setMappingRules((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        preConditionValues: Object.fromEntries(preConditions.map((p) => [p.id, "*"])),
        matchValue: "",
        outputValue: "",
      },
    ])
  const removeMappingRule = (id: string) => setMappingRules((prev) => prev.filter((r) => r.id !== id))
  const updateMappingRule = (id: string, key: "matchValue" | "outputValue", value: string) =>
    setMappingRules((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  const updateMappingRulePreCond = (ruleId: string, preCondId: string, value: string) =>
    setMappingRules((prev) => prev.map((r) =>
      r.id === ruleId
        ? { ...r, preConditionValues: { ...r.preConditionValues, [preCondId]: value } }
        : r
    ))

  const addSampleData = () => {
    setSampleDataList((prev) => [
      ...prev,
      { id: String(Date.now()), name: `Sample Data ${prev.length + 1}`, content: "", selected: false },
    ])
  }

  const selectSampleData = (id: string) => {
    setSampleDataList((prev) => prev.map((s) => ({ ...s, selected: s.id === id })))
  }

  const removeSampleData = (id: string) => {
    setSampleDataList((prev) => prev.filter((s) => s.id !== id))
  }

  const handleExecuteDebug = () => {
    setExecutionTime((Math.random() * 0.1 + 0.01).toFixed(4))
    setDebugResult({ keys: 1, message: "" })
    setDebugExpanded(true)
  }

  const buildConfigJSON = () => JSON.stringify({
    matchRules: matchRules.map((r) => ({ field: r.fieldName, priority: r.priority })),
    preConditionFields: preConditions.map((p) => p.fieldName),
    lookupTable: mappingRules.map((r) => ({
      ...Object.fromEntries(preConditions.map((p) => [p.fieldName || p.id, r.preConditionValues[p.id] ?? ""])),
      matchValue: r.matchValue,
      outputValue: r.outputValue,
    })),
    outputField: enrichmentField,
    fallbackDefault,
    conflictProtection,
  }, null, 2)

  const handleToggleParseJSON = () => {
    if (!parseJSONOpen) {
      setParseJSONText(buildConfigJSON())
    }
    setParseJSONOpen((v) => !v)
  }

  const handleFormatJSON = () => {
    try {
      setParseJSONText(JSON.stringify(JSON.parse(parseJSONText), null, 2))
    } catch {
      // invalid JSON, leave as-is
    }
  }

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(buildConfigJSON()).catch(() => {})
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Shared input style
  const inputCls = "w-full px-3 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white placeholder:text-slate-300"
  const rowCls = "flex items-start gap-0"
  const labelCls = "w-44 flex-shrink-0 flex items-center gap-0.5 text-sm text-slate-600 pt-[9px] pr-4"
  const requiredDot = <span className="text-red-500 mr-0.5">*</span>

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/20 transition-opacity z-40",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className={cn(
          "fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-sky-400 transition-colors z-10",
            isResizing && "bg-sky-500"
          )}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-medium text-slate-900">{t.bidirectionalEnricher.title}</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setGuideOpen(true)}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              {t.operator.userGuide}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Configuration ── */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 bg-sky-500 rounded-full" />
              <span className="text-sm font-semibold text-slate-900">{t.bidirectionalEnricher.configuration}</span>
            </div>

            {/* Name */}
            <div className={cn(rowCls, "mb-5")}>
              <span className={labelCls}>{requiredDot} {t.operator.name}:</span>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="e.g. Port-to-App Enricher"
                className={inputCls}
              />
            </div>

            {/* Manual Configuration box */}
            <div className={cn(rowCls, "mb-5 items-start")}>
              <span className={cn(labelCls, "pt-3")}>{t.bidirectionalEnricher.configuration}:</span>
              <div className="flex-1 border border-slate-200 rounded">

                {/* Box header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{t.operator.manualConfiguration}</span>
                  <div className="flex items-center gap-2">
                    {/* Copy JSON with success feedback */}
                    <div className="relative">
                      <button
                        onClick={handleCopyJSON}
                        className={cn(
                          "px-3 py-1 text-xs border rounded flex items-center gap-1 transition-colors",
                          copySuccess
                            ? "bg-green-50 text-green-600 border-green-300"
                            : "text-slate-600 border-slate-200 bg-white hover:bg-slate-100"
                        )}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copySuccess ? t.operator.copied : t.operator.copyJSON}
                      </button>
                    </div>

                    {/* Parse JSON — popover trigger */}
                    <div ref={parseJSONRef} className="relative">
                      <button
                        onClick={handleToggleParseJSON}
                        className={cn(
                          "px-3 py-1 text-xs border rounded transition-colors",
                          parseJSONOpen
                            ? "bg-sky-500 text-white border-sky-500"
                            : "text-slate-600 border-slate-200 bg-white hover:bg-slate-100"
                        )}
                      >
                        {t.operator.parseJSON}
                      </button>

                      {/* Floating popover */}
                      {parseJSONOpen && (
                        <div className="absolute right-0 top-full mt-2 w-[520px] bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                          {/* Popover header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                            <span className="text-sm font-semibold text-slate-800">{t.operator.parseJSON}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleFormatJSON}
                                className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded bg-white hover:bg-slate-100"
                              >
                                {t.operator.format}
                              </button>
                              <button
                                onClick={() => setParseJSONOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Code editor area */}
                          <div className="flex font-mono text-xs rounded-b-lg overflow-hidden">
                            {/* Line numbers */}
                            <div className="select-none bg-slate-100 text-slate-400 px-3 py-3 text-right leading-5 border-r border-slate-200 min-w-[2.75rem]">
                              {parseJSONText.split("\n").map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
                            {/* Editable textarea */}
                            <textarea
                              value={parseJSONText}
                              onChange={(e) => setParseJSONText(e.target.value)}
                              spellCheck={false}
                              className="flex-1 py-3 px-4 leading-5 bg-white text-slate-800 resize-none focus:outline-none"
                              style={{ minHeight: `${Math.max(8, parseJSONText.split("\n").length) * 1.25 + 1.5}rem` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-5">

                  {/* ── 1. Match Rules ── */}
                  <div className="flex items-start gap-0">
                    <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                      {requiredDot} {t.bidirectionalEnricher.matchRules}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-400 mb-2">{t.bidirectionalEnricher.matchRulesDesc}</p>
                      {matchRules.map((rule) => (
                        <div key={rule.id} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={rule.fieldName}
                              onChange={(e) => updateMatchRule(rule.id, "fieldName", e.target.value)}
                              placeholder={t.bidirectionalEnricher.fieldName}
                              className="flex-1 px-3 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                            <span className="text-xs text-slate-400 flex-shrink-0">{t.bidirectionalEnricher.lookupOrder}:</span>
                            <select
                              value={rule.priority}
                              onChange={(e) => updateMatchRule(rule.id, "priority", e.target.value)}
                              className={cn(
                                "px-2 py-[7px] text-sm border rounded focus:outline-none focus:ring-1 bg-white",
                                hasDuplicatePriority(rule.priority)
                                  ? "border-red-400 focus:ring-red-500"
                                  : "border-slate-300 focus:ring-sky-500"
                              )}
                            >
                              {["P1","P2","P3","P4","P5"].map((p) => (
                                <option key={p} value={p}>
                                  {language === "en" ? `${p} (${t.bidirectionalEnricher.priority} ${p.slice(1)})` : `第${p.slice(1)}优先级 (${p})`}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => removeMatchRule(rule.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {hasDuplicatePriority(rule.priority) && (
                            <p className="text-xs text-red-500 ml-0">
                              {t.bidirectionalEnricher.duplicatePriority}
                            </p>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addMatchRule}
                        className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600 mt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.bidirectionalEnricher.addMatchField}
                      </button>
                    </div>
                  </div>

                  {/* ── 2. Pre-conditions (collapsible) ── */}
                  <div className="flex items-start gap-0">
                    <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[7px] pr-4" />
                    <div className="flex-1 border border-dashed border-slate-200 rounded">
                      <button
                        onClick={() => setPreConditionsExpanded((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded"
                      >
                        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", !preConditionsExpanded && "-rotate-90")} />
                        <Plus className="h-3.5 w-3.5 text-sky-500" />
                        <span className="text-sky-500">
                          {t.bidirectionalEnricher.addMatchingPreConditions}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          {t.bidirectionalEnricher.preConditionsDesc}
                        </span>
                      </button>
                      {preConditionsExpanded && (
                        <div className="px-3 pb-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
                          {preConditions.map((p) => (
                            <div key={p.id} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 flex-shrink-0">{t.bidirectionalEnricher.field}:</span>
                              <input
                                type="text"
                                value={p.fieldName}
                                onChange={(e) => updatePreConditionName(p.id, e.target.value)}
                                placeholder={t.bidirectionalEnricher.fieldName}
                                className="w-48 px-2 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <button onClick={() => removePreCondition(p.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addPreCondition}
                            className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600 mt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t.bidirectionalEnricher.addCondition}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 3. Lookup Table ── */}
                  <div className="flex items-start gap-0">
                    <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                      {requiredDot} {t.bidirectionalEnricher.lookupTable}
                    </span>
                    <div className="flex-1">
                      <div className="border border-slate-200 rounded overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {/* Dynamic pre-condition columns */}
                              {preConditions.map((p) => (
                                <th key={p.id} className="px-3 py-2.5 text-left font-medium text-slate-600 text-xs whitespace-nowrap">
                                  {p.fieldName || t.bidirectionalEnricher.condition}
                                </th>
                              ))}
                              <th className="px-3 py-2.5 text-left font-medium text-slate-600 text-xs">
                                {t.bidirectionalEnricher.matchValue}
                              </th>
                              <th className="px-3 py-2.5 text-left font-medium text-slate-600 text-xs">
                                {t.bidirectionalEnricher.outputValue}
                              </th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {mappingRules.map((rule) => (
                              <tr key={rule.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                                {/* Dynamic pre-condition value cells */}
                                {preConditions.map((p) => (
                                  <td key={p.id} className="px-3 py-1.5">
                                    <input
                                      type="text"
                                      value={rule.preConditionValues[p.id] ?? ""}
                                      onChange={(e) => updateMappingRulePreCond(rule.id, p.id, e.target.value)}
                                      placeholder="* (any)"
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                  </td>
                                ))}
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    value={rule.matchValue}
                                    onChange={(e) => updateMappingRule(rule.id, "matchValue", e.target.value)}
                                    placeholder="80"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    value={rule.outputValue}
                                    onChange={(e) => updateMappingRule(rule.id, "outputValue", e.target.value)}
                                    placeholder="HTTP"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    onClick={() => removeMappingRule(rule.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-4">
                          <button onClick={addMappingRule} className="flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-600">
                            <Plus className="h-3.5 w-3.5" /> {t.operator.addRule}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrichment Output */}
                  <div>
                    <div className="flex items-start gap-0">
                      <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                        {requiredDot} {t.operator.outputField}
                        <br />
                        <span className="text-xs text-slate-400">{t.operator.writeResultTo}:</span>
                      </span>
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={enrichmentField}
                          onChange={(e) => setEnrichmentField(e.target.value)}
                          placeholder="app_name"
                          className={inputCls}
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-48 flex-shrink-0 -ml-48 hidden" />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{t.operator.fallbackDefault}:</span>
                            <div className="group relative inline-block">
                              <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                              <div className="hidden group-hover:block absolute z-50 top-0 left-6 p-4 bg-white border border-slate-200 rounded-lg shadow-xl text-slate-700 text-xs w-[520px] overflow-hidden">
                                <p className="font-semibold text-slate-900 mb-2">{language === "en" ? "Fallback default Usage Tips:" : "Fallback default使用提示："}</p>
                                <p className="text-slate-600 mb-3">
                                  {language === "en" 
                                    ? "When mapping rules fail to match in the lookup table, this value will be used as the output, making it easier to identify and fill in missing mappings later."
                                    : "当映射规则不全导致为命中映射表时，此值将作为结果输出，方便后续根据原始值来查缺补漏。"}
                                </p>
                                <p className="font-semibold text-slate-900 mb-2">{language === "en" ? "Configuration Syntax:" : "配置语法规范"}</p>
                                <p className="text-slate-600 mb-3">
                                  {language === "en"
                                    ? "To distinguish between \"fixed text\" and \"dynamic variables\", please follow these formats:"
                                    : "为了区分您输入的是\"固定文字\"还是\"动态变量\"，请遵循以下格式："}
                                </p>
                                <table className="w-full border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50">
                                      <th className="border border-slate-200 px-2 py-1.5 text-left font-medium">{language === "en" ? "Type" : "类型"}</th>
                                      <th className="border border-slate-200 px-2 py-1.5 text-left font-medium">{language === "en" ? "Format" : "格式要求"}</th>
                                      <th className="border border-slate-200 px-2 py-1.5 text-left font-medium">{language === "en" ? "Example" : "示例"}</th>
                                      <th className="border border-slate-200 px-2 py-1.5 text-left font-medium">{language === "en" ? "Expected Result" : "示例预期效果"}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Fixed Value" : "固定值"}</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Use double quotes \"\"" : "需使用英文双引号 \"\""}</td>
                                      <td className="border border-slate-200 px-2 py-1.5 font-mono bg-slate-50">{'"Unknown"'}</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Shows Unknown when not found" : "查不到时，统一显示 Unknown"}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Field Name" : "原文字段"}</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Enter field name directly" : "直接输入字段名"}</td>
                                      <td className="border border-slate-200 px-2 py-1.5 font-mono bg-slate-50">dst_port</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Shows original dest port when not found" : "查不到时，显示原始目的端口"}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Built-in Function" : "内置函数"}</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Enter function formula" : "直接输入函数公式"}</td>
                                      <td className="border border-slate-200 px-2 py-1.5 font-mono bg-slate-50">min(src_port, dst_port)</td>
                                      <td className="border border-slate-200 px-2 py-1.5">{language === "en" ? "Shows min of both ports when not found" : "查不到时，显示两个端口中的最小值"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={fallbackDefault}
                            onChange={(e) => setFallbackDefault(e.target.value)}
                            placeholder="min(dst_port, src_port)"
                            className="w-44 px-3 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <span className="text-xs text-slate-400">{t.operator.usedWhenNoRule}</span>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={conflictProtection}
                            onChange={(e) => setConflictProtection(e.target.checked)}
                            className="w-4 h-4 mt-0.5 accent-sky-500"
                          />
                          <span className="text-sm text-slate-700">
                            <span className="font-medium">{t.operator.conflictProtection}</span>
                            <span className="text-slate-500"> — {t.operator.conflictProtectionDesc}</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ── Debug ── */}
          <div className="px-6 pt-4 pb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 bg-sky-500 rounded-full" />
              <span className="text-sm font-semibold text-slate-900">{t.operator.debugging}</span>
            </div>

            <div className="flex gap-6">
              {/* Left: Data sources */}
              <div className="w-[430px] flex-shrink-0 space-y-3">
                {/* Global debug data */}
                <div>
                  <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="radio" name="debugSource" className="w-3.5 h-3.5 accent-sky-500" defaultChecked />
                    <span className="text-sm text-slate-700">{t.operator.globalDebugData}</span>
                  </label>
                  <textarea
                    disabled
                    className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded resize bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={t.operator.globalDebugMessage}
                    readOnly
                  />
                </div>

                {/* Sample data items */}
                {sampleDataList.map((sample) => (
                  <div key={sample.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="debugSource"
                          checked={sample.selected}
                          onChange={() => selectSampleData(sample.id)}
                          className="w-3.5 h-3.5 accent-sky-500"
                        />
                        <span className="text-sm text-slate-700">{sample.name}</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-slate-400 hover:text-slate-600">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeSampleData(sample.id)} className="p-1 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={sample.content}
                      onChange={(e) => setSampleDataList(sampleDataList.map(s => s.id === sample.id ? { ...s, content: e.target.value } : s))}
                      placeholder={t.operator.pleaseEnterSampleData}
                      className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded resize focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                ))}

                <button onClick={addSampleData} className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600">
                  <span>+</span> {t.operator.addSampleData}
                </button>
              </div>

              {/* Right: Output panel */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{t.operator.output}:</span>
                    <button
                      onClick={handleExecuteDebug}
                      className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                    >
                      {t.operator.debug}
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">
                    {t.operator.timeConsuming}: {executionTime != null ? `${executionTime} ms` : "-"}
                  </span>
                </div>

                <div className="border-b border-slate-200 pb-3">
                  {debugResult == null ? (
                    <p className="text-sm text-slate-400">{t.operator.noDebugResult}</p>
                  ) : (
                    <div className="flex items-start gap-2 text-sm">
                      <button onClick={() => setDebugExpanded(!debugExpanded)} className="mt-0.5 flex-shrink-0">
                        <ChevronDown className={cn("h-4 w-4 text-sky-500 transition-transform", !debugExpanded && "-rotate-90")} />
                      </button>
                      <div>
                        <span className="text-sky-500 font-medium">{t.operator.debuggingRecord}: </span>
                        <span className="text-sky-500">&quot;&quot;</span>
                        {debugExpanded && (
                          <div className="mt-2 text-xs text-slate-500 font-mono bg-slate-50 rounded px-3 py-2 border border-slate-200">
                            {`{ "matched": true, "outputField": "${enrichmentField}", "result": "" }`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <button className="px-6 py-2 bg-sky-500 text-white text-sm rounded hover:bg-sky-600 transition-colors">
            {t.operator.confirm}
          </button>
          <button onClick={onClose} className="px-6 py-2 text-slate-600 text-sm border border-slate-200 rounded hover:bg-slate-50">
            {t.operator.cancel}
          </button>
        </div>
      </div>

      {/* User Guide */}
      <EnricherUserGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  )
}
