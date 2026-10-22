"use client"

import { X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

interface EnricherUserGuideProps {
  open: boolean
  onClose: () => void
}

export function EnricherUserGuide({ open, onClose }: EnricherUserGuideProps) {
  const { language } = useLanguage()
  const isEnglish = language === "en"

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

      {/* Guide Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-all duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-medium text-slate-900">{isEnglish ? "User Guide" : "使用说明"}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Component Overview */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">{isEnglish ? "Component Overview" : "组件说明"}</h3>
            <p className="text-slate-600 leading-relaxed">
              {isEnglish
                ? "A universal enrichment operator that looks up field values against a configurable mapping table. Supports multiple match fields with priority ordering, optional pre-conditions for filtering, and writes the matched result as a new business tag."
                : "通用富化算子，根据可配置的映射表查找字段值。支持多个匹配字段的优先级排序、可选的前置条件过滤，并将匹配结果写入为新的业务标签。"}
            </p>
          </div>

          {/* Field Descriptions */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-3">{isEnglish ? "Field Reference" : "字段说明"}</h3>
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Match Rules" : "匹配规则配置"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "Define which fields to use for lookup and their priority order. The system tries P1 first; if no match is found, it falls back to P2, then P3, etc. E.g., dst_port (P1), src_port (P2)."
                    : "定义用于查找的字段及其优先级顺序。系统优先使用 P1 字段的值进行匹配；如果未命中，则尝试 P2、P3 等。例如：dst_port (P1)、src_port (P2)。"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Pre-conditions (Optional)" : "前置条件（可选）"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "Additional filter fields that narrow the match scope. When pre-conditions are added, they appear as extra columns in the Lookup Table. E.g., add 'protocol' field, then specify 'TCP' or 'UDP' per row."
                    : "用于缩小匹配范围的额外过滤字段。添加前置条件后，会在映射表中显示为额外的列。例如添加 'protocol' 字段后，可在每行指定 'TCP' 或 'UDP' 等值。"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Lookup Table" : "映射表"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "Defines the mapping from match values to output values. Each row specifies: pre-condition values (if any), the value to match, and the output result. Supports wildcard (*) for any-match."
                    : "定义从匹配值到输出值的映射关系。每行包含：前置条件值（如有）、待匹配的值、以及输出结果。支持通配符 (*) 表示任意匹配。"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Output Field" : "输出字段"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "The name of the new field written to each enriched record (e.g., app_name, service_type, category)."
                    : "写入每条富化记录的新字段名称（如 app_name、service_type、category）。"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Fallback Default" : "默认值"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "The value to use when no match is found in the lookup table. Leave empty to skip writing when unmatched."
                    : "当映射表中没有匹配项时使用的默认值。留空则在无匹配时不写入字段。"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Conflict Protection" : "冲突保护"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isEnglish
                    ? "When enabled, the operator will skip enrichment if the output field already contains a value, preventing unintended overwrites."
                    : "启用后，如果输出字段已有值，算子将跳过富化，防止意外覆盖。"}
                </p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">{isEnglish ? "Sample Data" : "样例数据"}</h3>
            <p className="text-slate-600 text-xs mb-2">{isEnglish ? "Network traffic identification scenario" : "网络流量识别场景"}</p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded-md text-xs font-mono overflow-x-auto space-y-2">
              <p className="text-sky-300">{isEnglish ? "Input:" : "输入:"}</p>
              <pre className="text-xs leading-relaxed">
{`{
  "proto": "TCP",
  "src_port": 54321,
  "dst_port": 3306
}`}
              </pre>
              <p className="text-sky-300">{isEnglish ? "Configuration:" : "配置:"}</p>
              <pre className="text-xs leading-relaxed text-slate-400">
{isEnglish
  ? `Match Rules: dst_port (P1), src_port (P2)
Pre-condition: protocol
Lookup Table:
  TCP | 3306 → MySQL
  TCP | 443  → HTTPS`
  : `匹配规则: dst_port (P1), src_port (P2)
前置条件: protocol
映射表:
  TCP | 3306 → MySQL
  TCP | 443  → HTTPS`}
              </pre>
              <p className="text-sky-300">{isEnglish ? "Output:" : "输出:"}</p>
              <pre className="text-xs leading-relaxed">
{`{
  "proto": "TCP",
  "src_port": 54321,
  "dst_port": 3306,
  "app_name": "MySQL"
}`}
              </pre>
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">{isEnglish ? "Typical Use Cases" : "典型应用场景"}</h3>
            <ul className="space-y-2">
              {isEnglish ? (
                <>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">Network Traffic Analysis</span> — Auto-identify application identity from port values with protocol filtering.</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">Microservice Tracing</span> — Resolve service IDs into human-readable module names with priority fallback.</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">Financial Reconciliation</span> — Map account numbers to business line or product category.</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">IT Asset Management</span> — Determine device roles from configurable lookup rules.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">网络流量分析</span> — 结合协议过滤，根据端口值自动识别应用身份。</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">微服务追踪</span> — 将服务 ID 解析为可读的模块名称，支持优先级回退。</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">财务对账</span> — 将账号映射到业务线或产品类别。</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">IT 资产管理</span> — 根据可配置的查找规则确定设备角色。</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">{isEnglish ? "Tips" : "提示"}</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {isEnglish ? (
                <>
                  <li>• Use P1/P2 priority to handle bidirectional traffic — try destination port first, fall back to source port.</li>
                  <li>• Add pre-condition fields like &apos;protocol&apos; to distinguish rules for TCP vs UDP services.</li>
                  <li>• The Lookup Table supports wildcard (*) for any-match scenarios.</li>
                  <li>• Enable Conflict Protection when integrating with DPI devices to avoid overwriting existing results.</li>
                </>
              ) : (
                <>
                  <li>• 使用 P1/P2 优先级处理双向流量 — 优先尝试目标端口，回退到源端口。</li>
                  <li>• 添加如 &apos;protocol&apos; 等前置条件字段，以区分 TCP 和 UDP 服务的规则。</li>
                  <li>• 映射表支持通配符 (*) 用于任意匹配场景。</li>
                  <li>• 与 DPI 设备集成时启用冲突保护，避免覆盖已有结果。</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
