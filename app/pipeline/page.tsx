"use client"

import { useState } from "react"
import {
  Search,
  Download,
  Upload,
  Settings,
  Pencil,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"
import { TopNav } from "@/components/top-nav"
import { Sidebar } from "@/components/sidebar"
import { TabBar } from "@/components/tab-bar"
import { FilterSidebar } from "@/components/filter-sidebar"
import { ProcessorList } from "@/components/processor-list"
import { AddProcessorDrawer } from "@/components/add-processor-drawer"
import { BidirectionalMapperDrawer } from "@/components/bidirectional-mapper-drawer"
import { FieldRelationshipBuilderDrawer } from "@/components/field-relationship-builder-drawer"
import { MetricMappingDrawer } from "@/components/metric-mapping-drawer"
import { cn } from "@/lib/utils"

const tabsEn = [
  { id: "processing", label: "Data Processing", active: true },
  { id: "index", label: "Log Index" },
  { id: "metrics", label: "Log to Metrics" },
  { id: "forward", label: "Data Forwarding" },
]

const tabsZh = [
  { id: "processing", label: "数据处理", active: true },
  { id: "index", label: "日志索引" },
  { id: "metrics", label: "日志转指标" },
  { id: "forward", label: "数据转发" },
]

export default function DataProcessingPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const tabs = language === "en" ? tabsEn : tabsZh

  const [activeTab, setActiveTab] = useState("processing")
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bidirectionalMapperOpen, setBidirectionalMapperOpen] = useState(false)
  const [fieldRelationshipBuilderOpen, setFieldRelationshipBuilderOpen] = useState(false)
  const [metricMappingOpen, setMetricMappingOpen] = useState(false)
  const [currentPipeline, setCurrentPipeline] = useState("")

  const handleAddProcessor = (pipelineName: string) => {
    setCurrentPipeline(pipelineName)
    setDrawerOpen(true)
  }

  const handleSelectProcessor = (processorName: string) => {
    if (processorName === "Universal Bi-Directional Enricher") {
      setDrawerOpen(false)
      setBidirectionalMapperOpen(true)
    } else if (processorName === "Field Relationship Builder") {
      setDrawerOpen(false)
      setFieldRelationshipBuilderOpen(true)
    } else if (processorName === "Metric Model Mapping") {
      setDrawerOpen(false)
      setMetricMappingOpen(true)
    }
    // Handle other processors similarly in the future
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <TopNav />

      {/* Tab Bar */}
      <TabBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Sub tabs */}
          <div className="bg-white border-b border-slate-200 px-6 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === tab.id
                        ? "border-sky-500 text-sky-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button className="text-sm text-sky-500 hover:text-sky-600">
                {t.tabs.dataKanban}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Filter Sidebar */}
            <div className="p-6 overflow-y-auto">
              <FilterSidebar />
            </div>

            {/* Data Processing List */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Search and Actions Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.main.searchPipeline}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {t.main.pipelinesStats(9, 17, 26)}
                  </span>
                  <button className="px-4 py-2 bg-sky-500 text-white text-sm rounded-md hover:bg-sky-600 transition-colors">
                    {t.main.newPipeline}
                  </button>
                  <button className="px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-md hover:bg-slate-50 transition-colors">
                    {t.main.debug}
                  </button>
                  <button className="p-2 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="p-2 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors">
                    <Upload className="h-4 w-4" />
                  </button>
                  <button className="p-2 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Data Source Header */}
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-medium text-slate-700">
                  {t.main.dataSources} (9)
                </h2>
                <button className="p-1 hover:bg-slate-100 rounded">
                  <Pencil className="h-3 w-3 text-slate-400" />
                </button>
              </div>

              {/* Section Label */}
              <div className="bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 rounded-t-md">
                {t.main.dataProcessing}
              </div>

              {/* Processor List */}
              <div className="bg-white border border-slate-200 rounded-b-md flex-1 overflow-hidden">
                <ProcessorList onAddProcessor={handleAddProcessor} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Processor Drawer */}
      <AddProcessorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pipelineName={currentPipeline}
        onSelectProcessor={handleSelectProcessor}
      />

      {/* Bidirectional Mapper Configuration Drawer */}
      <BidirectionalMapperDrawer
        open={bidirectionalMapperOpen}
        onClose={() => setBidirectionalMapperOpen(false)}
        pipelineName={currentPipeline}
      />

      {/* Field Relationship Builder Drawer */}
      <FieldRelationshipBuilderDrawer
        open={fieldRelationshipBuilderOpen}
        onClose={() => setFieldRelationshipBuilderOpen(false)}
        pipelineName={currentPipeline}
      />

      {/* Metric Model Mapping Drawer */}
      <MetricMappingDrawer
        open={metricMappingOpen}
        onClose={() => setMetricMappingOpen(false)}
        pipelineName={currentPipeline}
      />
    </div>
  )
}
