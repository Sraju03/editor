"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  UploadIcon,
  BrainIcon,
  FileTextIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  LinkIcon,
  SettingsIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface RTAItem {
  name: string
  status: "complete" | "warning" | "missing"
  tooltip?: string
}

interface DocumentSection {
  id: string
  title: string
  description: string
  content: string
  isLinked?: boolean
  rtaItems: RTAItem[]
  aiConfidence?: number
}

export default function SectionDeviceDescription() {
  const [expandedDocument, setExpandedDocument] = useState<string>("executive-summary")
  const [showGuidance, setShowGuidance] = useState(true)
  const [comments, setComments] = useState<Array<{ id: string; author: string; content: string; timestamp: string }>>([
    {
      id: "1",
      author: "Sarah Chen",
      content: "The executive summary looks good, but we need to add more detail about the predicate comparison.",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      author: "Michael Rodriguez",
      content: "AI-generated content for intended use is ready for review.",
      timestamp: "1 day ago",
    },
  ])
  const [newComment, setNewComment] = useState("")
  const [showReviewModal, setShowReviewModal] = useState(false)

  const documents: DocumentSection[] = [
    {
      id: "executive-summary",
      title: "Executive Summary",
      description:
        "A comprehensive overview of your device, its intended use, and substantial equivalence to predicate devices.",
      content:
        "The ACME Glucose Monitor Pro is a Class II medical device intended for the quantitative measurement of glucose in human blood samples...",
      rtaItems: [
        { name: "Device Overview", status: "complete" },
        { name: "Intended Use", status: "complete" },
        { name: "Predicate Comparison", status: "missing", tooltip: "Include detailed comparison with K123456" },
        { name: "User Environment", status: "missing", tooltip: "Describe clinical laboratory setting" },
      ],
    },
    {
      id: "indications-for-use",
      title: "Indications for Use",
      description: "Clear statement of the medical conditions, purposes, or uses for which the device is intended.",
      content:
        "This device is intended for the quantitative measurement of glucose in human blood samples for the monitoring of glucose levels in patients with diabetes mellitus...",
      isLinked: true,
      aiConfidence: 92,
      rtaItems: [
        { name: "Target Population", status: "complete" },
        { name: "Clinical Setting", status: "complete" },
        { name: "Contraindications", status: "warning", tooltip: "Consider adding specific contraindications" },
      ],
    },
    {
      id: "device-specifications",
      title: "Device Specifications",
      description:
        "Technical specifications including dimensions, materials, operating principles, and performance characteristics.",
      content: "",
      rtaItems: [
        { name: "Dimensions", status: "complete" },
        { name: "Operating Principles", status: "complete" },
        { name: "Biocompatibility", status: "missing", tooltip: "Required for devices with patient contact" },
        { name: "Software Components", status: "warning", tooltip: "Include software version and validation" },
      ],
    },
  ]

  const reviewResults = [
    {
      sectionName: "A – Device Description",
      riskScore: 6.5,
      issueSummary: "Predicate not linked clearly",
      hasIssue: true,
      targetDocument: "executive-summary",
    },
    {
      sectionName: "C – Biocompatibility",
      riskScore: 4.2,
      issueSummary: "Missing testing justification",
      hasIssue: true,
      targetDocument: null,
    },
    {
      sectionName: "E – Bench Testing",
      riskScore: 8.1,
      issueSummary: "✅ Looks good",
      hasIssue: false,
      targetDocument: null,
    },
  ]

  const getRTAStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckIcon className="h-4 w-4 text-green-600" />
      case "warning":
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
      case "missing":
        return <XIcon className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getRTABadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️</Badge>
      case "missing":
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌</Badge>
      default:
        return null
    }
  }

  const calculateSectionProgress = () => {
    const totalItems = documents.reduce((acc, doc) => acc + doc.rtaItems.length, 0)
    const completeItems = documents.reduce(
      (acc, doc) => acc + doc.rtaItems.filter((item) => item.status === "complete").length,
      0,
    )
    return Math.round((completeItems / totalItems) * 100)
  }

  const addComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now().toString(),
        author: "You",
        content: newComment,
        timestamp: "Just now",
      }
      setComments([comment, ...comments])
      setNewComment("")
    }
  }

  const getRiskScoreChip = (score: number) => {
    if (score < 5.0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">{score}/10</Badge>
    } else if (score <= 7.5) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{score}/10</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">{score}/10</Badge>
    }
  }

  const handleFixNow = (targetDocument: string | null) => {
    setShowReviewModal(false)
    if (targetDocument) {
      setExpandedDocument(targetDocument)
      // Scroll to the document section
      setTimeout(() => {
        const element = document.getElementById(`document-${targetDocument}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  const sectionProgress = calculateSectionProgress()
  const documentsUploaded = documents.filter((doc) => doc.content.length > 0).length

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sticky Navigation */}
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="text-xl font-bold text-blue-900">Fignos</div>
                <div className="flex gap-6">
                  <Link href="/submissions" className="text-sm font-medium text-gray-700 hover:text-blue-900">
                    Submissions
                  </Link>
                  <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-900">
                    FDA Checklist
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Breadcrumb */}
        <div className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <Link href="/submissions" className="hover:text-gray-700">
                Submissions
              </Link>
              <span>›</span>
              <Link href="/" className="hover:text-gray-700">
                FDA Checklist
              </Link>
              <span>›</span>
              <span className="text-gray-900">Section A – Device Description</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/">
                    <Button variant="outline" size="sm">
                      <ChevronLeftIcon className="mr-2 h-4 w-4" />
                      Back to Checklist
                    </Button>
                  </Link>
                  <h1 className="text-2xl font-bold text-gray-900">Section A – Device Description</h1>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <BrainIcon className="mr-2 h-4 w-4" />
                    Auto-Fill with AI
                  </Button>
                  <Button variant="outline" size="sm">
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload All Documents
                  </Button>
                </div>
              </div>

              {/* Section Summary Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Section Summary</span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      FDA Readiness: {sectionProgress}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                    <div>
                      <div className="text-sm text-gray-500">Documents Required</div>
                      <div className="text-2xl font-bold text-gray-900">3</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Documents Uploaded</div>
                      <div className="text-2xl font-bold text-gray-900">{documentsUploaded} of 3</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Section Readiness</div>
                      <div className="flex items-center gap-2">
                        <Progress value={sectionProgress} className="flex-1" />
                        <span className="text-sm font-medium">{sectionProgress}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">RTA Summary Status</div>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Needs Review</Badge>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        Intended Use is reused in multiple sections. Keep consistent.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FDA Guidance Panel */}
              <Collapsible open={showGuidance} onOpenChange={setShowGuidance}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <span>What the FDA expects in this section</span>
                        {showGuidance ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600" />A clear Executive Summary that outlines device
                          purpose and substantial equivalence
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600" />A defined Indications for Use statement that
                          matches your intended patient population
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600" />
                          Technical Specifications including materials, dimensions, and operating principles
                        </li>
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <ExternalLinkIcon className="mr-2 h-4 w-4" />
                          FDA Guidance PDF
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileTextIcon className="mr-2 h-4 w-4" />
                          View Sample FDA-accepted Summary
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Required Documents Area */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Required Documents</h2>
                {documents.map((document) => (
                  <Card key={document.id} id={`document-${document.id}`}>
                    <Collapsible
                      open={expandedDocument === document.id}
                      onOpenChange={() => setExpandedDocument(expandedDocument === document.id ? "" : document.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedDocument === document.id ? (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                              )}
                              <span>{document.title}</span>
                              {document.isLinked && (
                                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                                  <LinkIcon className="mr-1 h-3 w-3" />
                                  Linked Field
                                </Badge>
                              )}
                              {document.aiConfidence && (
                                <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                                  AI: {document.aiConfidence}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {document.content ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">Complete</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200">Draft</Badge>
                              )}
                            </div>
                          </CardTitle>
                          <p className="text-sm text-gray-600 text-left">{document.description}</p>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <UploadIcon className="mr-2 h-4 w-4" />
                                Upload
                              </Button>
                              <Button variant="outline" size="sm">
                                <BrainIcon className="mr-2 h-4 w-4" />
                                AI Generate
                              </Button>
                              <Button variant="outline" size="sm">
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                Start from Template
                              </Button>
                            </div>

                            {/* Linked Field Toggle */}
                            {document.isLinked && (
                              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                                <Switch defaultChecked />
                                <Label className="text-sm text-blue-800">Linked Field – auto-updates everywhere</Label>
                              </div>
                            )}

                            {/* Content Editor */}
                            <div>
                              <Label htmlFor={`content-${document.id}`} className="text-sm font-medium">
                                Content
                              </Label>
                              <Textarea
                                id={`content-${document.id}`}
                                value={document.content}
                                placeholder="Enter document content..."
                                className="mt-1 min-h-[200px]"
                                readOnly
                              />
                            </div>

                            {/* RTA Status */}
                            <div>
                              <Label className="text-sm font-medium">RTA Status</Label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {document.rtaItems.map((item, index) => (
                                  <Tooltip key={index}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                                        {getRTAStatusIcon(item.status)}
                                        <span>{item.name}</span>
                                      </div>
                                    </TooltipTrigger>
                                    {item.tooltip && (
                                      <TooltipContent>
                                        <p>{item.tooltip}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>

              {/* Bottom Actions Bar */}
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex gap-2">
                    <Button variant="outline">Save Progress</Button>
                    <Button variant="outline" onClick={() => setShowReviewModal(true)}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Run Simulated FDA Review
                    </Button>
                  </div>
                  <Button className="bg-blue-900 hover:bg-blue-800" disabled={sectionProgress < 100}>
                    Mark Section Complete
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Comments */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareIcon className="h-5 w-5" />
                    Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment for discussion or review..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button onClick={addComment} size="sm" className="w-full">
                      Add Comment
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Simulated FDA Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Simulated FDA Review Results</DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Section Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Risk Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Issue Summary</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviewResults.map((result, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 animate-in fade-in duration-200"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{result.sectionName}</td>
                      <td className="px-4 py-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>{getRiskScoreChip(result.riskScore)}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Score is based on completeness, consistency, and FDA RTA criteria</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{result.issueSummary}</td>
                      <td className="px-4 py-4">
                        {result.hasIssue ? (
                          <Button
                            size="sm"
                            onClick={() => handleFixNow(result.targetDocument)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            🔧 Fix Now
                          </Button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Success Banner - shown when no major issues */}
            {reviewResults.every((result) => result.riskScore > 7.5) && (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    ✅ No major risks detected in this section. You're good to go!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline">⬇️ Download PDF Report</Button>
            <Button variant="ghost" onClick={() => setShowReviewModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
