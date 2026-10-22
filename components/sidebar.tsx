"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Search,
  Server,
  Activity,
  Database,
  LineChart,
  Eye,
  MonitorDot,
  Settings,
  Radar,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  hasChildren?: boolean
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}

function NavItem({
  icon,
  label,
  active,
  hasChildren,
  expanded,
  onToggle,
  children,
}: NavItemProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
          active
            ? "text-sky-500 bg-sky-50"
            : "text-slate-600 hover:bg-slate-100"
        )}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {hasChildren && (
          <span className="text-slate-400">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </button>
      {hasChildren && expanded && children}
    </div>
  )
}

interface SubNavItemProps {
  label: string
  active?: boolean
}

function SubNavItem({ label, active }: SubNavItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left pl-9 pr-3 py-2 text-sm transition-colors",
        active ? "text-sky-500" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  )
}

export function Sidebar() {
  const { language } = useLanguage()
  const t = translations[language].sidebar

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    dataGovernance: true,
  })

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className="w-56 h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-0.5 px-2">
          <NavItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            label={t.eventCenter}
            hasChildren
            expanded={expandedItems.eventCenter}
            onToggle={() => toggleItem("eventCenter")}
          />
          <NavItem
            icon={<Search className="h-4 w-4" />}
            label={t.inspection}
          />
          <NavItem
            icon={<Server className="h-4 w-4" />}
            label={t.systemMonitor}
            hasChildren
            expanded={expandedItems.systemMonitor}
            onToggle={() => toggleItem("systemMonitor")}
          />
          <NavItem
            icon={<Activity className="h-4 w-4" />}
            label={t.serviceMonitor}
            hasChildren
            expanded={expandedItems.serviceMonitor}
            onToggle={() => toggleItem("serviceMonitor")}
          />
          <NavItem
            icon={<Database className="h-4 w-4" />}
            label={t.infraMonitor}
            hasChildren
            expanded={expandedItems.infraMonitor}
            onToggle={() => toggleItem("infraMonitor")}
          />
          <NavItem
            icon={<LineChart className="h-4 w-4" />}
            label={t.transactionMonitor}
          />
          <NavItem
            icon={<MonitorDot className="h-4 w-4" />}
            label={t.llmMonitor}
            hasChildren
            expanded={expandedItems.llmMonitor}
            onToggle={() => toggleItem("llmMonitor")}
          />
          <NavItem
            icon={<Database className="h-4 w-4" />}
            label={t.dataQueryService}
            hasChildren
            expanded={expandedItems.dataQuery}
            onToggle={() => toggleItem("dataQuery")}
          />
          <NavItem
            icon={<Eye className="h-4 w-4" />}
            label={t.visualizationConfig}
            hasChildren
            expanded={expandedItems.visualization}
            onToggle={() => toggleItem("visualization")}
          />
          <NavItem
            icon={<MonitorDot className="h-4 w-4" />}
            label={t.monitorConfig}
            hasChildren
            expanded={expandedItems.monitorConfig}
            onToggle={() => toggleItem("monitorConfig")}
          />
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            label={t.dataGovernance}
            active
            hasChildren
            expanded={expandedItems.dataGovernance}
            onToggle={() => toggleItem("dataGovernance")}
          >
            <div className="mt-0.5">
              <SubNavItem label={translations[language].tabs.dataProcessing} active />
              <SubNavItem label={t.logRuleConfig} />
              <SubNavItem label={t.categoryManagement} />
            </div>
          </NavItem>
          <NavItem
            icon={<Radar className="h-4 w-4" />}
            label={t.discoveryCollection}
            hasChildren
            expanded={expandedItems.discovery}
            onToggle={() => toggleItem("discovery")}
          />
          <NavItem
            icon={<Settings className="h-4 w-4" />}
            label={t.systemSettings}
            hasChildren
            expanded={expandedItems.systemSettings}
            onToggle={() => toggleItem("systemSettings")}
          />
        </nav>
      </div>
      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        7.1.0
      </div>
    </aside>
  )
}
