"use client"

import { Bell, ChevronDown, Globe, Search, Users } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useState } from "react"

export function TopNav() {
  const { language, setLanguage } = useLanguage()
  const [languageDropdown, setLanguageDropdown] = useState(false)

  return (
    <header className="h-12 bg-slate-800 text-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="font-medium">Intelligent AIOps</span>
        </div>
        <button className="flex items-center gap-1 px-3 py-1 rounded hover:bg-slate-700 text-sm">
          <span className="w-5 h-5 rounded bg-slate-600 flex items-center justify-center">
            <Globe className="h-3 w-3" />
          </span>
          All Products
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-slate-600" />
        <span className="text-sm text-slate-300">Full Chain Observability</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-slate-700 rounded">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative p-2 hover:bg-slate-700 rounded">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full text-xs flex items-center justify-center">
            44
          </span>
        </button>
        <button className="p-2 hover:bg-slate-700 rounded">
          <Users className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-slate-600" />
        
        {/* Language Switcher */}
        <div className="relative">
          <button 
            onClick={() => setLanguageDropdown(!languageDropdown)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded text-sm"
          >
            <Globe className="h-4 w-4" />
            {language === "en" ? "English" : "简体中文"}
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {languageDropdown && (
            <div className="absolute right-0 mt-1 bg-slate-700 rounded shadow-lg z-50 min-w-[120px]">
              <button
                onClick={() => {
                  setLanguage("en")
                  setLanguageDropdown(false)
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-600 rounded-t ${
                  language === "en" ? "bg-slate-600 text-sky-300" : ""
                }`}
              >
                English
              </button>
              <button
                onClick={() => {
                  setLanguage("zh")
                  setLanguageDropdown(false)
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-600 rounded-b ${
                  language === "zh" ? "bg-slate-600 text-sky-300" : ""
                }`}
              >
                简体中文
              </button>
            </div>
          )}
        </div>

        <button className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700 rounded text-sm">
          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-xs">
            S
          </div>
          sabrina.wang
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
