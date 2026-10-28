"use client"

import { X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface RelationshipBuilderUserGuideProps {
  open: boolean
  onClose: () => void
}

export function RelationshipBuilderUserGuide({ open, onClose }: RelationshipBuilderUserGuideProps) {
  const { language } = useLanguage()
  const t = translations[language]

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
              {t.fieldRelationshipBuilder.description}
            </p>
          </div>

          {/* Field Descriptions */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-3">{isEnglish ? "Field Reference" : "字段说明"}</h3>
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Source Fields" : "参与维度的字段"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{t.fieldRelationshipBuilder.fieldDesc}</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Sort Rule" : "排序类型"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{t.fieldRelationshipBuilder.sortDesc}</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Separator" : "连接符"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{t.fieldRelationshipBuilder.separatorDesc}</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Output Field" : "目标字段"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{t.fieldRelationshipBuilder.targetFieldDesc}</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-slate-700 font-medium text-xs mb-1">{isEnglish ? "Conflict Protection" : "冲突保护"}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{t.fieldRelationshipBuilder.conflictProtectionDesc}</p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">{t.fieldRelationshipBuilder.example}</h3>
            <p className="text-slate-600 text-xs mb-2">{isEnglish ? "Network traffic identification scenario" : "网络流量标识场景"}</p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded-md text-xs font-mono overflow-x-auto space-y-2">
              <p className="text-sky-300">{isEnglish ? "Input:" : "输入:"}</p>
              <pre className="text-xs leading-relaxed">
{`{
  "src_addr": "192.168.1.10",
  "dst_addr": "10.0.0.5",
  "dst_port": 443,
  "protocol": "TCP"
}`}
              </pre>
              <p className="text-sky-300">{isEnglish ? "Output (lexicographical, separator ↔):" : "输出 (字典序, 连接符 ↔):"}</p>
              <pre className="text-xs leading-relaxed">
{`{
  "src_addr": "192.168.1.10",
  "dst_addr": "10.0.0.5",
  "dst_port": 443,
  "protocol": "TCP",
  "conversation": "10.0.0.5↔192.168.1.10"
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
                    <span><span className="font-medium text-slate-700">Network Session Tracking</span> — Generate consistent session IDs for bidirectional flows regardless of packet direction.</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">Microservice Linking</span> — Create stable correlation IDs between caller and callee services.</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">Transaction Reconciliation</span> — Generate unique transaction fingerprints from multi-field combinations.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">网络会话追踪</span> — 为双向流生成一致的会话ID，不受数据包方向影响。</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">微服务关联</span> — 在调用方和被调用方服务之间创建稳定的相关性ID。</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 text-xs">
                    <ChevronRight className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium text-slate-700">交易对账</span> — 从多字段组合生成唯一的交易指纹。</span>
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
                  <li>• Use lexicographical sort for bidirectional data to ensure consistent output regardless of field order.</li>
                  <li>• Numerical sort is ideal for port numbers, amounts, or other numeric identifiers.</li>
                  <li>• Common separators: "↔" (bidirectional), "-" (hyphen), "_" (underscore), "|" (pipe).</li>
                  <li>• Enable conflict protection when output field may already contain values to prevent overwrites.</li>
                </>
              ) : (
                <>
                  <li>• 对于双向数据，使用字典序可确保输出一致，不受字段顺序影响。</li>
                  <li>• 数值序适用于端口号、金额或其他数值标识符。</li>
                  <li>• 常见连接符："↔"（双向）、"-"（连字符）、"_"（下划线）、"|"（竖线）。</li>
                  <li>• 当目标字段可能已包含值时启用冲突保护，以防止被覆盖。</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
