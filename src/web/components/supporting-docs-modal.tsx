"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Download, Eye, Trash2, Plus } from "lucide-react"

interface SupportingDocument {
  id: string
  name: string
  type: string
  size: string
  uploadDate: string
  status: "uploaded" | "pending" | "error"
  category: string
}

interface SupportingDocsModalProps {
  isOpen: boolean
  onClose: () => void
  sectionTitle: string
}

export default function SupportingDocsModal({ isOpen, onClose, sectionTitle }: SupportingDocsModalProps) {
  const [documents, setDocuments] = useState<SupportingDocument[]>([
    {
      id: "1",
      name: "Clinical Performance Study Report.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadDate: "2024-01-15",
      status: "uploaded",
      category: "Clinical Data",
    },
    {
      id: "2",
      name: "Predicate Device Comparison Table.xlsx",
      type: "Excel",
      size: "156 KB",
      uploadDate: "2024-01-14",
      status: "uploaded",
      category: "Comparison Data",
    },
    {
      id: "3",
      name: "FDA Guidance References.docx",
      type: "Word",
      size: "89 KB",
      uploadDate: "2024-01-13",
      status: "uploaded",
      category: "Regulatory",
    },
  ])

  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const newDoc: SupportingDocument = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type.split("/")[1]?.toUpperCase() || "Unknown",
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadDate: new Date().toISOString().split("T")[0],
        status: "uploaded",
        category: "General",
      }
      setDocuments((prev) => [...prev, newDoc])
    })
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Clinical Data":
        return "bg-blue-100 text-blue-800"
      case "Comparison Data":
        return "bg-purple-100 text-purple-800"
      case "Regulatory":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Supporting Documents - {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors ${
              dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 pointer-events-none"></div>
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <div className="space-y-1">
              <p className="text-lg font-medium text-gray-900">Drop files here or click to upload</p>
              <p className="text-sm text-gray-500">Supports PDF, Word, Excel, PowerPoint, and image files up to 10MB</p>
            </div>
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button type="button" className="bg-blue-800 hover:bg-blue-900">
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              />
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            <div className="md:flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900">Uploaded Documents ({documents.length})</h3>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{doc.name}</div>
                        <div className="text-sm text-gray-500">
                          {doc.type} • {doc.size} • Uploaded {doc.uploadDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className={getCategoryColor(doc.category)}>
                        {doc.category}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>

                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 mb-2 md:mb-0">
              {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
            </div>
            <div className="space-x-2 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button className="bg-blue-800 hover:bg-blue-900">Save & Continue</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
