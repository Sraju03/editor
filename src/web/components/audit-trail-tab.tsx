"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileDown, Calendar, User, Activity, Eye, Edit, Save, MessageSquare } from "lucide-react"

interface AuditEntry {
  id: string
  action: string
  user: string
  timestamp: string
  details: string
  type: "view" | "edit" | "save" | "comment" | "approve" | "request"
}

export function AuditTrailTab() {
  const [searchQuery, setSearchQuery] = useState("")

  const auditEntries: AuditEntry[] = [
    {
      id: "1",
      action: "Document Viewed",
      user: "Dr. Sarah Chen",
      timestamp: "2025-01-15 14:30:25",
      details: "Viewed Device Master Record v2.1",
      type: "view",
    },
    {
      id: "2",
      action: "Content Modified",
      user: "Dr. Sarah Chen",
      timestamp: "2025-01-15 14:25:10",
      details: "Updated safety protocol section",
      type: "edit",
    },
    {
      id: "3",
      action: "Version Saved",
      user: "Dr. Sarah Chen",
      timestamp: "2025-01-15 14:20:45",
      details: "Saved as version v2.1",
      type: "save",
    },
    {
      id: "4",
      action: "Comment Added",
      user: "Dr. Michael Rodriguez",
      timestamp: "2025-01-15 13:45:30",
      details: "Added review comment on compliance section",
      type: "comment",
    },
    {
      id: "5",
      action: "Document Approved",
      user: "Dr. Emily Johnson",
      timestamp: "2025-01-15 13:30:15",
      details: "Approved version v2.0 for publication",
      type: "approve",
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "view":
        return <Eye className="h-4 w-4" />
      case "edit":
        return <Edit className="h-4 w-4" />
      case "save":
        return <Save className="h-4 w-4" />
      case "comment":
        return <MessageSquare className="h-4 w-4" />
      case "approve":
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "view":
        return "bg-blue-50 text-blue-600"
      case "edit":
        return "bg-orange-50 text-orange-600"
      case "save":
        return "bg-green-50 text-green-600"
      case "comment":
        return "bg-purple-50 text-purple-600"
      case "approve":
        return "bg-emerald-50 text-emerald-600"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const filteredEntries = auditEntries.filter(
    (entry) =>
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <FileDown className="h-4 w-4 mr-2" />
            Export Audit Log
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search audit entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>
      </div>

      {/* Audit Entries */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getTypeColor(entry.type)}`}>{getIcon(entry.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{entry.action}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{entry.timestamp}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{entry.details}</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{entry.user}</span>
                  <Badge variant="outline" className="ml-2">
                    {entry.type}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
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
