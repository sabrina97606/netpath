export interface ProcessorStep {
  id: string
  type: string
  label: string
  enabled: boolean
}

export interface DataSource {
  id: string
  number: number
  name: string
  tag?: string
  filterCondition: string
  lastUpdated: string
  enabled: boolean
  expanded?: boolean
  steps?: ProcessorStep[]
}

export interface ProcessorOption {
  name: string
  description: string
}

export interface ProcessorCategory {
  title: string
  options: ProcessorOption[]
}

export const mockDataSources: DataSource[] = [
  {
    id: "1",
    number: 1,
    name: "clickhouse_log",
    tag: "Collection",
    filterCondition: 'source:"clickhouse"',
    lastUpdated: "2026-02-05 15:47",
    enabled: true,
  },
  {
    id: "2",
    number: 2,
    name: "nginx_log",
    tag: "Collection",
    filterCondition: 'source:"nginx"',
    lastUpdated: "2026-04-21 15:04",
    enabled: true,
  },
  {
    id: "3",
    number: 3,
    name: "DOCP Service Log Processing",
    filterCondition: 'topic:"cloudwise-doop-log-ingest" and (source:"DOUC" OR source:"DOOP" OR s...',
    lastUpdated: "2026-03-20 15:28",
    enabled: true,
    expanded: true,
    steps: [
      { id: "3-1", type: "Grok Parse", label: "Extract timestamp and log level", enabled: true },
      { id: "3-2", type: "Time Format", label: "Time format conversion", enabled: true },
      { id: "3-3", type: "Field Add", label: "Field addition", enabled: true },
    ],
  },
  {
    id: "4",
    number: 4,
    name: "doop Log Processing",
    filterCondition: 'source:"DOOP"',
    lastUpdated: "2026-03-20 15:28",
    enabled: true,
  },
  {
    id: "5",
    number: 5,
    name: "Frontend Link Info",
    filterCondition: 'source:"LCAP"',
    lastUpdated: "2026-03-16 14:30",
    enabled: true,
  },
  {
    id: "6",
    number: 4,
    name: "DOCP Middleware DB Log Processing",
    filterCondition: 'topic:"cloudwise-doop-log-ingest" and source:"docp"',
    lastUpdated: "2026-01-19 21:57",
    enabled: false,
  },
  {
    id: "7",
    number: 5,
    name: "clickhouse Log Processing",
    filterCondition: 'topic:"cloudwise-doop-log-ingest" and source:"docp" and service:"clickhouse"',
    lastUpdated: "2026-01-19 22:01",
    enabled: false,
  },
  {
    id: "8",
    number: 6,
    name: "windows_event_log",
    tag: "Collection",
    filterCondition: 'source:"windows_event_log"',
    lastUpdated: "2025-11-28 14:22",
    enabled: true,
  },
  {
    id: "9",
    number: 7,
    name: "elasticsearch_log",
    tag: "Collection",
    filterCondition: 'source:"elasticsearch"',
    lastUpdated: "2025-09-28 11:27",
    enabled: true,
  },
  {
    id: "10",
    number: 8,
    name: "sqlserver_log",
    tag: "Collection",
    filterCondition: 'source:"sqlserver"',
    lastUpdated: "2026-01-19 22:04",
    enabled: false,
  },
]

export const processorCategories: ProcessorCategory[] = [
  {
    title: "Common",
    options: [
      { name: "Grok Parse", description: "Custom grok rules to parse log text or extract specific fields" },
      { name: "Field Add", description: "Add fields and assign values" },
      { name: "Field Delete", description: "Delete specified fields" },
      { name: "Field Rename", description: "Rename field names" },
      { name: "Field Type Convert", description: "str to num; num to str" },
      { name: "JSON Build", description: "Concatenate multiple fields into JSON" },
      { name: "JSON Format Convert", description: "JSON string to object; or reverse conversion" },
      { name: "XML Parse", description: "Parse XML format fields" },
      { name: "CSV Parse", description: "Parse CSV format fields" },
      { name: "Math Operation", description: "Use mathematical formulas to calculate field values" },
      { name: "Data Assign", description: "Use logical judgment for field addition" },
      { name: "Data Filter", description: "Use logical judgment to discard or keep logs" },
      { name: "CMDB Enrich", description: "Enrich CMDB attribute data into the data" },
      { name: "Universal Bi-Directional Enricher", description: "Bi-directional field enrichment with context constraints and lookup table mapping" },
      { name: "Field Relationship Builder", description: "Combine multiple fields in a specific order to generate session IDs or bidirectional link labels" },
      { name: "Metric Model Mapping", description: "Transform raw telemetry data into standardized metrics with semantic tags and dimension expansion" },
    ],
  },
  {
    title: "List Operations",
    options: [
      { name: "List Field Add", description: "Add specific values to a list" },
      { name: "Row Convert", description: "Convert key:value format to foo:key, bar:value" },
      { name: "One to Many", description: "Split one log into multiple entries" },
    ],
  },
  {
    title: "Field Operations",
    options: [
      { name: "Field Extract", description: "Keep specified fields, delete other fields" },
      { name: "Regex Replace", description: "Use regular expressions to match field values and replace" },
      { name: "Field Value Extract", description: "Use specified delimiter to split field values into a list" },
      { name: "Key-Value Extract", description: "Extract key-value pair information from fields" },
      { name: "Dictionary Replace", description: "Add dictionary values to target fields" },
    ],
  },
]

export const sidebarFilters = {
  pipelineStatus: {
    title: "Pipeline Status",
    items: [
      { label: "Open", count: 9 },
      { label: "Closed", count: 17 },
    ],
  },
  pipelineContains: {
    title: "Pipeline Contains",
    items: [
      { label: "Grok Parse", count: 17 },
      { label: "Field Add", count: 16 },
      { label: "Time Format Convert", count: 15 },
      { label: "Field Rename", count: 14 },
      { label: "Field Type Convert", count: 14 },
      { label: "Dictionary Replace", count: 12 },
      { label: "Empty Pipeline", count: 8 },
      { label: "JSON Format Convert", count: 1 },
      { label: "Math Operation", count: 1 },
      { label: "Regex Replace", count: 1 },
    ],
  },
}
