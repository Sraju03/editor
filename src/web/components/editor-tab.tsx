"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Undo,
  Redo,
  Printer,
  Download,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Link,
  ImageIcon,
  Save,
  FileDown,
  Archive,
  MessageSquare,
  FileEdit,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EditorTab() {
  const [content, setContent] = useState("")

  return (
    <div className="bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom */}
          <Select defaultValue="100">
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Style */}
          <Select defaultValue="paragraph">
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph text</SelectItem>
              <SelectItem value="heading1">Heading 1</SelectItem>
              <SelectItem value="heading2">Heading 2</SelectItem>
              <SelectItem value="heading3">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          {/* Font */}
          <Select defaultValue="arial">
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="times">Times</SelectItem>
              <SelectItem value="courier">Courier</SelectItem>
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select defaultValue="12">
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Formatting */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Strikethrough className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Outdent className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Indent className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Insert */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Save className="h-4 w-4 mr-2" />
              Save Version
            </Button>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-6">
        <div className="min-h-[500px] bg-white border border-gray-200 rounded-lg p-6 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <textarea
            className="w-full h-full min-h-[450px] resize-none border-none outline-none text-gray-900"
            placeholder="Start typing your document content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
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
              <MessageSquare className="h-4 w-4 mr-2" />
              Request Acknowledgement
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
            <Button variant="outline" size="sm">
              <FileEdit className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
              <XCircle className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
