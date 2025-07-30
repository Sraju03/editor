"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit3, GitBranch, GitCompare, FileText, X } from "lucide-react"

interface Tab {
  id: string
  label: string
  icon: string
}

interface MovableTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function MovableTabs({ tabs, activeTab, onTabChange }: MovableTabsProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [tabOrder, setTabOrder] = useState(tabs.map((tab) => tab.id))

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "edit":
        return <Edit3 className="h-4 w-4" />
      case "git-branch":
        return <GitBranch className="h-4 w-4" />
      case "git-compare":
        return <GitCompare className="h-4 w-4" />
      case "file-text":
        return <FileText className="h-4 w-4" />
      default:
        return <Edit3 className="h-4 w-4" />
    }
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    if (!draggedTab || draggedTab === targetTabId) return

    const newOrder = [...tabOrder]
    const draggedIndex = newOrder.indexOf(draggedTab)
    const targetIndex = newOrder.indexOf(targetTabId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedTab)

    setTabOrder(newOrder)
    setDraggedTab(null)
  }

  const orderedTabs = tabOrder.map((id) => tabs.find((tab) => tab.id === id)!).filter(Boolean)

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center">
        {orderedTabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
            className={`
              group relative flex items-center gap-2 px-4 py-3 cursor-pointer border-r border-gray-200
              transition-all duration-200 hover:bg-gray-50 select-none
              ${
                activeTab === tab.id
                  ? "bg-white border-b-2 border-b-blue-500 text-blue-600"
                  : "bg-gray-50 text-gray-600 hover:text-gray-900"
              }
              ${draggedTab === tab.id ? "opacity-50" : ""}
            `}
            onClick={() => onTabChange(tab.id)}
          >
            {getIcon(tab.icon)}
            <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>

            {/* Close button - appears on hover */}
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 ml-2 hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation()
                // Handle tab close logic here
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
