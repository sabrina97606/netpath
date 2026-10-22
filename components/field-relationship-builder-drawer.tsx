"use client"

import { useState, useRef, useEffect } from "react"
import { X, Copy, ChevronDown, Trash2, Plus, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { RelationshipBuilderUserGuide } from "./relationship-builder-user-guide"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface SampleData {
  id: string
  name: string
  content: string
  selected: boolean
}

interface FieldRelationshipBuilderDrawerProps {
  open: boolean
  onClose: () => void
  pipelineName?: string
}

export function FieldRelationshipBuilderDrawer({
  open,
  onClose,
}: FieldRelationshipBuilderDrawerProps) {
  const { language } = useLanguage()
  const t = translations[language]

  // Basic config
  const [operatorName, setOperatorName] = useState(() => {
    // Set initial default name based on current language
    return language === "en" ? "Field Relationship Builder" : "字段拼接"
  })
  
  // Logic config - dynamic fields list
  const [fields, setFields] = useState([
    { id: "1", value: "src_addr" },
    { id: "2", value: "dst_addr" },
  ])
  const [sortRule, setSortRule] = useState<"lexicographical" | "original" | "numerical">("lexicographical")

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), value: "" }])
  }

  const removeField = (id: string) => {
    if (fields.length > 2) {
      setFields(fields.filter((f) => f.id !== id))
    }
  }

  const updateField = (id: string, value: string) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, value } : f)))
  }
  const [separator, setSeparator] = useState("↔")

  // Output config
  const [outputField, setOutputField] = useState("conversation")
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
  const [drawerWidth, setDrawerWidth] = useState(900)
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
      setDrawerWidth((prev) => Math.max(600, Math.min(1400, prev + deltaX)))
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

  // Sample data handlers
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

  // Build expression based on sort rule (supports N fields)
  const buildExpression = () => {
    const fieldNames = fields.map((f) => f.value || "?").join(`, '${separator}', `)
    if (sortRule === "original") {
      return `concat(${fieldNames})`
    } else if (sortRule === "lexicographical") {
      return `concat(sort([${fields.map((f) => f.value || "?").join(", ")}]), '${separator}')`
    } else {
      return `concat(sortNumeric([${fields.map((f) => f.value || "?").join(", ")}]), '${separator}')`
    }
  }

  const buildConfigJSON = () => JSON.stringify({
    type: "field_relationship_builder",
    name: operatorName,
    params: {
      source_fields: fields.map((f) => f.value),
      sort: sortRule,
    separator,
    output_field: outputField,
    conflict_protection: conflictProtection,
      expression: buildExpression(),
    }
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

  // Shared styles
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
          <h2 className="text-base font-medium text-slate-900">{t.fieldRelationshipBuilder.title}</h2>
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
              <span className="text-sm font-semibold text-slate-900">{t.fieldRelationshipBuilder.configuration}</span>
            </div>

            {/* Name */}
            <div className={cn(rowCls, "mb-5")}>
              <span className={labelCls}>{requiredDot} {t.operator.name}:</span>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="e.g. Session ID Generator"
                className={inputCls}
              />
            </div>

            {/* Manual Configuration box */}
            <div className={cn(rowCls, "mb-5 items-start")}>
              <span className={cn(labelCls, "pt-3")}>{t.fieldRelationshipBuilder.configuration}:</span>
              <div className="flex-1 border border-slate-200 rounded">

                {/* Box header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{t.operator.manualConfiguration}</span>
                  <div className="flex items-center gap-2">
                    {/* Copy JSON */}
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

                    {/* Parse JSON */}
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
                          <div className="flex font-mono text-xs rounded-b-lg overflow-hidden">
                            <div className="select-none bg-slate-100 text-slate-400 px-3 py-3 text-right leading-5 border-r border-slate-200 min-w-[2.75rem]">
                              {parseJSONText.split("\n").map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
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

                  {/* Source Fields (dynamic list) */}
                    <div className={cn(rowCls, "mb-4")}>
                      <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                        {requiredDot} {t.fieldRelationshipBuilder.sourceFields}
                        <br />
                        <span className="text-xs text-slate-400">{t.fieldRelationshipBuilder.fieldsToNormalize}:</span>
                      </span>
                      <div className="flex-1 space-y-2">
                        {fields.map((field, idx) => (
                          <div key={field.id} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateField(field.id, e.target.value)}
                              placeholder={`e.g. field_${idx + 1}`}
                              className={cn(inputCls, "flex-1")}
                            />
                            {fields.length > 2 && (
                              <button
                                onClick={() => removeField(field.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={addField}
                          className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600 mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> {t.fieldRelationshipBuilder.addField}
                        </button>
                      </div>
                    </div>

                    {/* Sort Rule */}
                    <div className={cn(rowCls, "mb-4")}>
                      <span className="w-36 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                        {requiredDot} {t.fieldRelationshipBuilder.sortRule}:
                      </span>
                      <div className="flex-1 space-y-2 pt-[6px]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="sortRule" 
                            checked={sortRule === "lexicographical"} 
                            onChange={() => setSortRule("lexicographical")} 
                            className="accent-sky-500" 
                          />
                          <span className="text-sm text-slate-700">{t.fieldRelationshipBuilder.lexicographical} {t.fieldRelationshipBuilder.recommended}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="sortRule" 
                            checked={sortRule === "original"} 
                            onChange={() => setSortRule("original")} 
                            className="accent-sky-500" 
                          />
                          <span className="text-sm text-slate-700">{t.fieldRelationshipBuilder.original}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="sortRule" 
                            checked={sortRule === "numerical"} 
                            onChange={() => setSortRule("numerical")} 
                            className="accent-sky-500" 
                          />
                          <span className="text-sm text-slate-700">{t.fieldRelationshipBuilder.numerical} {t.fieldRelationshipBuilder.ascending}</span>
                        </label>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className={cn(rowCls)}>
                      <span className="w-36 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                        {requiredDot} {t.fieldRelationshipBuilder.separator}:
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={separator}
                          onChange={(e) => setSeparator(e.target.value)}
                          placeholder="e.g. ↔, _, -"
                          className={cn(inputCls, "w-32")}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Example: 1.1.1.1 {separator} 2.2.2.2
                        </p>
                      </div>
                    </div>

                  {/* Output Configuration Section */}
                  <div>
                    {/* Output Field */}
                    <div className={cn(rowCls, "mb-4")}>
                      <span className="w-48 flex-shrink-0 text-sm text-slate-500 pt-[9px] pr-4">
                        {requiredDot} {t.operator.outputField}
                        <br />
                        <span className="text-xs text-slate-400">{t.operator.writeResultTo}:</span>
                      </span>
                      <input
                        type="text"
                        value={outputField}
                        onChange={(e) => setOutputField(e.target.value)}
                        placeholder="e.g. conversation, session_id"
                        className={inputCls}
                      />
                    </div>

                    {/* Conflict Protection */}
                    <div className={cn(rowCls)}>
                      <span className="w-48 flex-shrink-0 text-sm text-slate-500 pr-4" />
                      <label className="flex items-start gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={conflictProtection}
                          onChange={(e) => setConflictProtection(e.target.checked)}
                          className="mt-0.5 accent-sky-500"
                        />
                        <span className="text-sm text-sky-600">
                          {t.operator.conflictProtection} — {t.operator.conflictProtectionDesc}
                        </span>
                      </label>
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
                            {`{ "matched": true, "outputField": "${outputField}", "result": "${fields.map(f => f.value || "?").join(separator)}" }`}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
          >
            {t.operator.cancel}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600"
          >
            {t.operator.confirm}
          </button>
        </div>
      </div>

      {/* User Guide */}
      <RelationshipBuilderUserGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  )
}
