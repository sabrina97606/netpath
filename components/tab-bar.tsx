"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface Tab {
  id: string
  label: string
  active?: boolean
  icon?: "data" | "dashboard"
}

export function TabBar() {
  const { language } = useLanguage()
  const t = translations[language]

  const tabs: Tab[] = [
    { id: "1", label: t.tabs.dataProcessing, icon: "data", active: true },
    { id: "2", label: language === "en" ? "Unnamed dashboard" : "未命名仪表板", icon: "dashboard" },
    { id: "3", label: language === "en" ? "System Deploy..." : "系统部署..." },
    { id: "4", label: language === "en" ? "TransactionSummary" : "交易摘要" },
    { id: "5", label: language === "en" ? "Unnamed dashboard" : "未命名仪表板", icon: "dashboard" },
    { id: "6", label: "Pod" },
    { id: "7", label: language === "en" ? "New metric monitor..." : "新建指标监控..." },
    { id: "8", label: language === "en" ? "Transaction Succes..." : "交易成功..." },
    { id: "9", label: "GCP K8S Overview" },
    { id: "10", label: "default" },
  ]

  return (
    <div className="flex items-center gap-1 px-4 py-1 bg-white border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer whitespace-nowrap",
            tab.active
              ? "bg-sky-50 text-sky-600"
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          {tab.icon === "data" && (
            <span className="w-4 h-4 bg-sky-500 rounded-sm flex items-center justify-center text-white text-xs">
              D
            </span>
          )}
          {tab.icon === "dashboard" && (
            <span className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-white text-xs">
              D
            </span>
          )}
          <span>{tab.label}</span>
          <button className="p-0.5 hover:bg-slate-200 rounded">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
