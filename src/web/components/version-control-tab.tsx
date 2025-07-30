"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileDown, Eye, FileText, Calendar, User } from "lucide-react"

interface Version {
  id: string
  version: string
  date: string
  author: string
  description: string
  status: "current" | "draft" | "archived"
}

export function VersionControlTab() {
  const [searchQuery, setSearchQuery] = useState("")

  const versions: Version[] = [
    {
      id: "1",
      version: "v1.0",
      date: "2025-07-10",
      author: "Dr. Sarah Chen",
      description: "Initial device description draft",
      status: "current",
    },
    {
      id: "2",
      version: "v2.0",
      date: "2025-07-10",
      author: "Dr. Sarah Chen",
      description: "Initial device description draft",
      status: "current",
    },
    {
      id: "3",
      version: "v22.0",
      date: "2025-07-10",
      author: "Dr. Sarah Chen",
      description: "Initial device description draft",
      status: "current",
    },
  ]

  const filteredVersions = versions.filter(
    (version) =>
      version.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      version.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      version.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Version History of Device Master Record (DMR)</h2>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Date,Version,Docs Name, etc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>
      </div>

      {/* Version List */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredVersions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{version.version}</span>
                    <Badge
                      variant={version.status === "current" ? "default" : "secondary"}
                      className={version.status === "current" ? "bg-green-100 text-green-800" : ""}
                    >
                      {version.status === "current" ? "Current" : version.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{version.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>by {version.author}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          ))}
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
