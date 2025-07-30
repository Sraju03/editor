"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileDown, GitCompare, Plus, Minus, FileText } from "lucide-react"

export function CompareVersionTab() {
  const [leftVersion, setLeftVersion] = useState("v2.1")
  const [rightVersion, setRightVersion] = useState("v2.0")

  const versions = ["v2.1", "v2.0", "v1.9", "v1.8"]

  const changes = [
    {
      type: "added",
      line: 15,
      content: "Added new safety protocol section for device handling",
    },
    {
      type: "removed",
      line: 23,
      content: "Removed outdated compliance reference",
    },
    {
      type: "modified",
      line: 45,
      content: "Updated device specifications and technical parameters",
    },
  ]

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GitCompare className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Compare Versions</h2>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <FileDown className="h-4 w-4 mr-2" />
            Export Comparison
          </Button>
        </div>

        {/* Version Selectors */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Compare:</span>
            <Select value={leftVersion} onValueChange={setLeftVersion}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-gray-400">with</span>
          <div className="flex items-center gap-2">
            <Select value={rightVersion} onValueChange={setRightVersion}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Comparison View */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 h-[500px]">
          {/* Left Version */}
          <div className="border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{leftVersion}</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Current
                </Badge>
              </div>
            </div>
            <div className="p-4 h-full overflow-y-auto">
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-green-50 border-l-4 border-green-400">
                  <div className="flex items-center gap-2 text-green-800">
                    <Plus className="h-4 w-4" />
                    <span className="font-mono text-xs">Line 15</span>
                  </div>
                  <p className="mt-1">Added new safety protocol section for device handling</p>
                </div>
                <div className="p-2">
                  <p>
                    Device specifications and technical parameters have been updated to reflect the latest industry
                    standards and regulatory requirements.
                  </p>
                </div>
                <div className="p-2 bg-blue-50 border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 text-blue-800">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-xs">Line 45</span>
                  </div>
                  <p className="mt-1">Updated device specifications and technical parameters</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Version */}
          <div className="border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{rightVersion}</span>
                <Badge variant="secondary">Previous</Badge>
              </div>
            </div>
            <div className="p-4 h-full overflow-y-auto">
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-red-50 border-l-4 border-red-400">
                  <div className="flex items-center gap-2 text-red-800">
                    <Minus className="h-4 w-4" />
                    <span className="font-mono text-xs">Line 23</span>
                  </div>
                  <p className="mt-1">Removed outdated compliance reference</p>
                </div>
                <div className="p-2">
                  <p>Device specifications and technical parameters were based on previous industry standards.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Changes Summary */}
        <div className="mt-6 border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <h3 className="font-medium text-gray-900">Changes Summary</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {changes.map((change, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`p-1 rounded ${
                      change.type === "added"
                        ? "bg-green-100 text-green-600"
                        : change.type === "removed"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {change.type === "added" ? (
                      <Plus className="h-4 w-4" />
                    ) : change.type === "removed" ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">Line {change.line}</span>
                      <Badge
                        variant="outline"
                        className={
                          change.type === "added"
                            ? "text-green-600 border-green-200"
                            : change.type === "removed"
                              ? "text-red-600 border-red-200"
                              : "text-blue-600 border-blue-200"
                        }
                      >
                        {change.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{change.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              Request Acknowledgement
            </Button>
            <Button variant="outline" size="sm">
              Add Comment
            </Button>
            <Button variant="outline" size="sm">
              Save Draft
            </Button>
            <Button variant="outline" size="sm">
              Archive
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
              Request Changes
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">Approve</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
