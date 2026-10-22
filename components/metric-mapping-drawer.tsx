"use client"

import { useState, useRef, useEffect } from "react"
import { X, Plus, Trash2, ChevronDown, HelpCircle, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface TagMapping {
  id: string
  sourceField: string
  targetKey: string
  dataType: string
  strategy: string
  staticValue?: string
}

interface SampleData {
  id: string
  name: string
  content: string
  selected: boolean
}

interface MetricMappingDrawerProps {
  open: boolean
  onClose: () => void
  pipelineName?: string
}

export function MetricMappingDrawer({
  open,
  onClose,
}: MetricMappingDrawerProps) {
  const { language } = useLanguage()
  const t = translations[language]

  // Basic
  const [operatorName, setOperatorName] = useState("Metric_Normalization_Processor_01")

  // Timestamp Alignment
  const [timestampField, setTimestampField] = useState("time_received_ns")
  const [timestampUnit, setTimestampUnit] = useState("ns_to_ms")

  // Sampling Compensation
  const [samplingRateField, setSamplingRateField] = useState("sampling_rate")
  const [samplingFormula, setSamplingFormula] = useState("value_multiply_rate")

  // Expansion Strategy
  const [expansionMode, setExpansionMode] = useState("cartesian")
  const [dimensionA, setDimensionA] = useState("direction (ingress, egress)")
  const [dimensionB, setDimensionB] = useState("metric_type (bytes, packets)")

  // Tag Mappings
  const [tagMappings, setTagMappings] = useState<TagMapping[]>([
    { id: "1", sourceField: "src_addr",    targetKey: "network.source.ip",      dataType: "String", strategy: "keep" },
    { id: "2", sourceField: "dst_addr",    targetKey: "network.destination.ip", dataType: "String", strategy: "keep" },
    { id: "3", sourceField: "proto",       targetKey: "network.transport",      dataType: "String", strategy: "convert" },
    { id: "4", sourceField: "application", targetKey: "service.name",           dataType: "String", strategy: "keep" },
    { id: "5", sourceField: "",            targetKey: "environment",            dataType: "String", strategy: "fixed", staticValue: "PROD" },
  ])

  // Debug
  const [sampleDataList, setSampleDataList] = useState<SampleData[]>([
    { id: "1", name: "Sample Data 1", content: "", selected: true },
  ])
  const [debugExpanded, setDebugExpanded] = useState(true)
  const [debugResult, setDebugResult] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  // Resize
  const [drawerWidth, setDrawerWidth] = useState(1100)
  const isResizing = useRef(false)
  const startXRef = useRef(0)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startXRef.current = e.clientX
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startXRef.current - e.clientX
      setDrawerWidth((prev) => Math.max(700, Math.min(1500, prev + delta)))
      startXRef.current = e.clientX
    }
    const handleMouseUp = () => { isResizing.current = false }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  // Tag mapping helpers
  const addTagMapping = () => {
    setTagMappings(prev => [...prev, { id: String(Date.now()), sourceField: "", targetKey: "", dataType: "String", strategy: "keep" }])
  }
  const removeTagMapping = (id: string) => setTagMappings(prev => prev.filter(m => m.id !== id))
  const updateTagMapping = (id: string, key: keyof TagMapping, value: string) => {
    setTagMappings(prev => prev.map(m => m.id === id ? { ...m, [key]: value } : m))
  }

  // Sample data helpers
  const addSampleData = () => {
    setSampleDataList(prev => [
      ...prev.map(s => ({ ...s, selected: false })),
      { id: String(Date.now()), name: `${language === "en" ? "Sample Data" : "样例数据"} ${prev.length + 1}`, content: "", selected: true },
    ])
  }
  const removeSampleData = (id: string) => {
    setSampleDataList(prev => {
      const filtered = prev.filter(s => s.id !== id)
      if (filtered.length > 0 && !filtered.some(s => s.selected)) filtered[0].selected = true
      return filtered
    })
  }
  const selectSampleData = (id: string) => setSampleDataList(prev => prev.map(s => ({ ...s, selected: s.id === id })))

  const handleExecuteDebug = () => {
    const start = performance.now()
    setTimeout(() => {
      setDebugResult(JSON.stringify({ metrics: 4, tags: tagMappings.length }, null, 2))
      setExecutionTime(Math.round(performance.now() - start))
    }, 120)
  }

  const inputCls = "px-3 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
  const selectCls = "px-3 py-[7px] text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"

  const unitOptions = [
    { value: "ns_to_ms", en: "Nanoseconds (ns) → Milliseconds (ms)", zh: "纳秒(ns) → 毫秒(ms)" },
    { value: "us_to_ms", en: "Microseconds (us) → Milliseconds (ms)", zh: "微秒(us) → 毫秒(ms)" },
    { value: "s_to_ms",  en: "Seconds (s) → Milliseconds (ms)",      zh: "秒(s) → 毫秒(ms)" },
    { value: "keep",     en: "Keep Original",                         zh: "保持原值" },
  ]
  const formulaOptions = [
    { value: "value_multiply_rate", en: "Value × Rate", zh: "Value × Rate" },
    { value: "value_divide_rate",   en: "Value ÷ Rate", zh: "Value ÷ Rate" },
    { value: "keep",                en: "No Compensation", zh: "不补偿" },
  ]
  const expansionOptions = [
    { value: "cartesian", en: "Cartesian Expansion (Metric × Dimension)", zh: "指标维度交叉膨胀 (Cartesian)" },
    { value: "single",    en: "Single Metric",                            zh: "单指标模式" },
  ]
  const strategyOptions = [
    { value: "keep",    en: "Keep",       zh: "保留" },
    { value: "convert", en: "Convert",    zh: "转换" },
    { value: "fixed",   en: "Fixed Value", zh: "固定值" },
  ]
  const dataTypeOptions = ["String", "Int", "Float", "Boolean"]

  const labelW = "w-32 flex-shrink-0 text-sm text-slate-500"

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
          "fixed top-0 right-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: drawerWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-sky-400 transition-colors z-10"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {language === "en" ? "Metric Model Mapping" : "指标模型映射"}
          </h2>
          <div className="flex items-center gap-3">
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <HelpCircle className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Configuration ── */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 bg-sky-500 rounded-full" />
              <span className="text-sm font-semibold text-slate-900">
                {language === "en" ? "Configuration" : "配置"}
              </span>
            </div>

            {/* Processor Name */}
            <div className="flex items-center mb-5">
              <span className={labelW}>{language === "en" ? "Processor Name:" : "处理器名称:"}</span>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className={cn(inputCls, "flex-1")}
              />
            </div>

            {/* Manual Configuration Box */}
            <div className="flex items-start mb-5">
              <span className={cn(labelW, "pt-[9px]")}>{language === "en" ? "Configuration:" : "配置:"}</span>
              <div className="flex-1 border border-slate-200 rounded">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t">
                  <span className="text-sm font-medium text-slate-700">
                    {language === "en" ? "Manual Configuration" : "手动配置"}
                  </span>
                </div>

                <div className="px-4 py-4 space-y-0">

                  {/* Timestamp Alignment */}
                  <div className="border-b border-slate-100 pb-5 mb-5">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {language === "en" ? "Timestamp Alignment" : "时间戳对齐"}
                    </p>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                          {language === "en" ? "Source Field:" : "来源字段:"}
                        </span>
                        <input
                          type="text"
                          value={timestampField}
                          onChange={(e) => setTimestampField(e.target.value)}
                          className={cn(inputCls, "w-44 text-xs py-1.5")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {language === "en" ? "Unit Conversion:" : "单位转换:"}
                        </span>
                        <select
                          value={timestampUnit}
                          onChange={(e) => setTimestampUnit(e.target.value)}
                          className={cn(selectCls, "text-xs py-1.5")}
                        >
                          {unitOptions.map(o => (
                            <option key={o.value} value={o.value}>{language === "en" ? o.en : o.zh}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sampling Compensation */}
                  <div className="border-b border-slate-100 pb-5 mb-5">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {language === "en" ? "Resampling Compensation" : "采样补偿"}
                    </p>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                          {language === "en" ? "Rate Field:" : "采样率字段:"}
                        </span>
                        <input
                          type="text"
                          value={samplingRateField}
                          onChange={(e) => setSamplingRateField(e.target.value)}
                          className={cn(inputCls, "w-36 text-xs py-1.5")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {language === "en" ? "Formula:" : "公式:"}
                        </span>
                        <select
                          value={samplingFormula}
                          onChange={(e) => setSamplingFormula(e.target.value)}
                          className={cn(selectCls, "text-xs py-1.5")}
                        >
                          {formulaOptions.map(o => (
                            <option key={o.value} value={o.value}>{language === "en" ? o.en : o.zh}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Expansion Strategy */}
                  <div className="border-b border-slate-100 pb-5 mb-5">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {language === "en" ? "Expansion Strategy" : "膨胀策略"}
                    </p>
                    <div className="space-y-2.5 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                          {language === "en" ? "Mode:" : "模式:"}
                        </span>
                        <select
                          value={expansionMode}
                          onChange={(e) => setExpansionMode(e.target.value)}
                          className={cn(selectCls, "text-xs py-1.5 w-72")}
                        >
                          {expansionOptions.map(o => (
                            <option key={o.value} value={o.value}>{language === "en" ? o.en : o.zh}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                          {language === "en" ? "Dimension A:" : "维度 A:"}
                        </span>
                        <input
                          type="text"
                          value={dimensionA}
                          onChange={(e) => setDimensionA(e.target.value)}
                          className={cn(inputCls, "w-72 text-xs py-1.5")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                          {language === "en" ? "Dimension B:" : "维度 B:"}
                        </span>
                        <input
                          type="text"
                          value={dimensionB}
                          onChange={(e) => setDimensionB(e.target.value)}
                          className={cn(inputCls, "w-72 text-xs py-1.5")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attributes & Tags Mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        {language === "en" ? "Attributes & Tags Mapping" : "标签与元数据映射"}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={addTagMapping}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-sky-600 border border-sky-200 rounded hover:bg-sky-50"
                        >
                          <Plus className="h-3 w-3" />
                          {language === "en" ? "Add Rule" : "添加规则"}
                        </button>
                        <button className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                          {language === "en" ? "Load Recommended Tags" : "批量载入推荐标签"}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {language === "en"
                        ? "Fields defined here will be wrapped into the standard metric_tags object. Follow Semantic Conventions (SemConv) where possible."
                        : "在此定义的字段将自动封装进标准 metric_tags 对象。建议遵循语义约定 (SemConv)。"}
                    </p>
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200">
                              {language === "en" ? "Source Field" : "原始字段名"}
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200">
                              {language === "en" ? "Target Semantic Key" : "目标标签 Key (Semantic)"}
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200 w-24">
                              {language === "en" ? "Data Type" : "数据类型"}
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b border-slate-200 w-32">
                              {language === "en" ? "Strategy" : "处理策略"}
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-slate-600 border-b border-slate-200 w-12">
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tagMappings.map((mapping) => (
                            <tr key={mapping.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mapping.sourceField}
                                  onChange={(e) => updateTagMapping(mapping.id, "sourceField", e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  placeholder="field_name"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mapping.targetKey}
                                  onChange={(e) => updateTagMapping(mapping.id, "targetKey", e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  placeholder="semantic.key.name"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={mapping.dataType}
                                  onChange={(e) => updateTagMapping(mapping.id, "dataType", e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                                >
                                  {dataTypeOptions.map(dt => <option key={dt}>{dt}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                {mapping.strategy === "fixed" ? (
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value="fixed"
                                      onChange={(e) => updateTagMapping(mapping.id, "strategy", e.target.value)}
                                      className="w-20 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
                                    >
                                      {strategyOptions.map(o => (
                                        <option key={o.value} value={o.value}>{language === "en" ? o.en : o.zh}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={mapping.staticValue || ""}
                                      onChange={(e) => updateTagMapping(mapping.id, "staticValue", e.target.value)}
                                      className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded"
                                      placeholder="value"
                                    />
                                  </div>
                                ) : (
                                  <select
                                    value={mapping.strategy}
                                    onChange={(e) => updateTagMapping(mapping.id, "strategy", e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                                  >
                                    {strategyOptions.map(o => (
                                      <option key={o.value} value={o.value}>{language === "en" ? o.en : o.zh}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => removeTagMapping(mapping.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
              <span className="text-sm font-semibold text-slate-900">
                {language === "en" ? "Debugging" : "调试"}
              </span>
            </div>

            <div className="flex gap-6">
              {/* Left: data sources */}
              <div className="w-[430px] flex-shrink-0 space-y-3">
                {/* Global debug data */}
                <div>
                  <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="radio" name="debugSourceMetric" className="w-3.5 h-3.5 accent-sky-500" defaultChecked />
                    <span className="text-sm text-slate-700">
                      {language === "en" ? "Global Debug Data" : "全局调试数据"}
                    </span>
                  </label>
                  <textarea
                    disabled
                    className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded resize bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={language === "en" ? "System loads shared debug data from current pipeline" : "系统将自动加载当前 Pipeline 的共享调试数据"}
                    readOnly
                  />
                </div>

                {/* Sample data */}
                {sampleDataList.map((sample) => (
                  <div key={sample.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="debugSourceMetric"
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
                      onChange={(e) => setSampleDataList(prev => prev.map(s => s.id === sample.id ? { ...s, content: e.target.value } : s))}
                      placeholder={language === "en" ? "Please enter sample data..." : "请输入样例数据..."}
                      className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded resize focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                ))}

                <button onClick={addSampleData} className="flex items-center gap-1 text-sm text-sky-500 hover:text-sky-600">
                  <span>+</span> {language === "en" ? "Add Sample Data" : "添加样例数据"}
                </button>
              </div>

              {/* Right: output */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{language === "en" ? "Output" : "输出结果"}:</span>
                    <button
                      onClick={handleExecuteDebug}
                      className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                    >
                      {language === "en" ? "Debug" : "调试"}
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">
                    {language === "en" ? "Time consumed" : "耗时"}: {executionTime != null ? `${executionTime} ms` : "-"}
                  </span>
                </div>

                <div className="border-b border-slate-200 pb-3">
                  {debugResult == null ? (
                    <p className="text-sm text-slate-400">
                      {language === "en" ? "No debug result yet" : "暂无调试结果"}
                    </p>
                  ) : (
                    <div className="flex items-start gap-2 text-sm">
                      <button onClick={() => setDebugExpanded(!debugExpanded)} className="mt-0.5 flex-shrink-0">
                        <ChevronDown className={cn("h-4 w-4 text-sky-500 transition-transform", !debugExpanded && "-rotate-90")} />
                      </button>
                      <div>
                        <span className="text-sky-500 font-medium">
                          {language === "en" ? "Transformation Result" : "转换结果"}:
                        </span>
                        {debugExpanded && (
                          <pre className="mt-2 text-xs text-slate-500 font-mono bg-slate-50 rounded px-3 py-2 border border-slate-200 whitespace-pre-wrap">
                            {debugResult}
                          </pre>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
            {language === "en" ? "Cancel" : "取消"}
          </button>
          <button className="px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600">
            {language === "en" ? "Confirm" : "确认"}
          </button>
        </div>
      </div>
    </>
  )
}
