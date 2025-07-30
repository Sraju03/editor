"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  Clock,
  GitCompare,
  ClipboardList,
  Copy,
  Download,
  AlertTriangle,
  Shield,
  Bot,
  X,
  RefreshCw,
  Eye,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  Archive,
  XCircle,
  CheckCircle2,
  Award,
  AlertCircle,
  Lightbulb,
  Check,
  UserCheck,
  Sparkles,
  Zap,
  Send,
  UserCircle2,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RichTextToolbar from "@/components/ui/RichTextToolbar";
import { Progress } from "@radix-ui/react-progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Subsection {
  id: string;
  title: string;
  contentExtracted: string;
  status: string;
  file: { fileId: string; fileName: string } | null;
  checklistValidation: any[];
  description: string;
  version: string;
  lastUpdated: { date: string };
  trustScore: number;
  aiSuggestions: number;
}

function EditPage() {
  const { id } = useParams(); // Submission ID
  const searchParams = useSearchParams();
  const subsectionId = searchParams.get("subsectionId"); // Subsection ID from query param
  const [trackChanges, setTrackChanges] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [documentContent, setDocumentContent] = useState("");
  const [showEditModal, setShowEditModal] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState({
    name: "Device Description",
    version: "v1.0",
    lastUpdated: { date: "2025-07-10" },
    trustScore: 87,
    aiSuggestions: 3,
    id: "doc-1234",
  });

  const [aiChat, setAiChat] = useState([
    {
      type: "ai",
      message:
        "Hi! I'm here to help you improve your documents. I can check compliance, suggest improvements, and answer questions.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [aiMessage, setAiMessage] = useState("");

  // Fetch subsection content
  useEffect(() => {
    const fetchSubsectionContent = async () => {
      if (!id || !subsectionId) {
        toast.error("Missing submission ID or subsection ID");
        setError("Missing submission ID or subsection ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/A/subsections/${subsectionId}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch subsection: ${response.status}`);
        }
        const data: Subsection = await response.json();
        setDocumentContent(
          data.contentExtracted || "# Sample Document\n\nStart writing here..."
        );
        setSelectedDocument({
          ...selectedDocument,
          name: data.title,
          version: data.version,
          lastUpdated: { date: data.lastUpdated.date },
          trustScore: data.trustScore,
          aiSuggestions: data.aiSuggestions,
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch document content");
        setError(err.message || "Failed to fetch document content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubsectionContent();
  }, [id, subsectionId]);

  // Save changes to the database
  const handleSaveChanges = async () => {
    if (!id || !subsectionId) {
      toast.error("Missing submission ID or subsection ID");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/A`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId,
            content: documentContent,
            status: "draft",
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to save changes: ${response.status}`);
      }
      toast.success("Changes saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    }
  };

  const handleSendAIMessage = () => {
    if (!aiMessage.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage = {
      type: "user",
      message: aiMessage,
      timestamp,
    };

    setAiChat((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const aiResponse = {
        type: "ai",
        message:
          "Thanks for your message! Here's an AI-generated response tailored to your document.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setAiChat((prev) => [...prev, aiResponse]);
    }, 800);

    setAiMessage("");
  };

  const handleToggleSidebar = () => {
    setShowSidebar((prev) => {
      const newState = !prev;
      setSidebarOrder((order) => {
        const without = order.filter((id) => id !== "sidebar");
        return newState ? [...without, "sidebar"] : without;
      });
      return newState;
    });
  };

  const handleToggleAIAssistant = () => {
    setShowAIAssistant((prev) => {
      const newState = !prev;
      setSidebarOrder((order) => {
        const without = order.filter((id) => id !== "ai");
        return newState ? [...without, "ai"] : without;
      });
      return newState;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent
          className={`w-screen h-screen max-w-full max-h-screen p-0 flex flex-col transition-all duration-300 ${
            showSidebar && showAIAssistant
              ? "pr-[800px]"
              : showSidebar || showAIAssistant
              ? "pr-[400px]"
              : "pr-0"
          }`}
        >
          <DialogHeader className="p-4 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {selectedDocument?.name}
                </DialogTitle>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-gray-500">
                    Version {selectedDocument?.version} • Last updated{" "}
                    {selectedDocument?.lastUpdated.date}
                  </p>
                  {selectedDocument?.trustScore && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Trust Score: {selectedDocument.trustScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="track-changes"
                    checked={trackChanges}
                    onCheckedChange={setTrackChanges}
                  />
                  <label
                    htmlFor="track-changes"
                    className="text-sm font-medium text-gray-700"
                  >
                    Track Changes
                  </label>
                </div>
                <Button
                  variant="outline"
                  onClick={handleToggleSidebar}
                  className="ml-4 bg-blue-900 text-white hover:bg-blue-800 hover:text-white"
                >
                  Details
                </Button>
                <Button
                  variant="outline"
                  onClick={handleToggleAIAssistant}
                  className="ml-4"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI Assistant
                  {selectedDocument?.aiSuggestions > 0 && (
                    <Badge className="ml-2 bg-purple-100 text-purple-700 text-xs">
                      {selectedDocument.aiSuggestions}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="editor" className="flex flex-col min-h-full">
              <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="editor"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Version History
                </TabsTrigger>
                <TabsTrigger
                  value="compare"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare Versions
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Audit Trail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between border-t-2 border-black bg-slate-200 p-5 rounded-lg">
                  <RichTextToolbar />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {documentContent.length} characters
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(documentContent)
                      }
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([documentContent], {
                          type: "text/markdown",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${
                          selectedDocument?.name || "document"
                        }.md`;
                        a.click();
                      }}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      onClick={handleSaveChanges}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>

                {trackChanges && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Track Changes is enabled
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      All edits will be highlighted and tracked for review.
                    </p>
                  </div>
                )}

                <div className="flex-1 mt-4">
                  <Textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full h-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg font-mono text-sm resize-none"
                    placeholder="Start writing your document content..."
                    style={{ minHeight: "400px" }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="p-4 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-t-2 border-black bg-slate-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Version History
                    </h3>
                    <Button
                      className="text-white bg-blue-900 hover:bg-blue-800 hover:text-white"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const historyData = [
                          {
                            version: "v1.0",
                            date: "2025-07-10",
                            user: "Dr. Sarah Chen",
                            changes: "Initial device description draft",
                          },
                        ];
                        const csv =
                          "Version,Date,User,Changes\n" +
                          historyData
                            .map(
                              (row) =>
                                `${row.version},${row.date},${row.user},"${row.changes}"`
                            )
                            .join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "version-history.csv";
                        a.click();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export History
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        version: "v1.0",
                        date: "2025-07-10",
                        user: "Dr. Sarah Chen",
                        changes: "Initial device description draft",
                        status: "current",
                      },
                    ].map((version, index) => (
                      <Card
                        key={index}
                        className="p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {version.version}
                                </span>
                                {version.status === "current" && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {version.date} by {version.user}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                {version.changes}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                alert(
                                  `Viewing ${version.version} - ${version.changes}`
                                );
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            {version.status !== "current" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(`Restore to ${version.version}?`)
                                  ) {
                                    setDocumentContent(
                                      `# ${selectedDocument?.name} - ${version.version}\n\nRestored from ${version.date}\n\n${version.changes}`
                                    );
                                  }
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compare" className="p-4 mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-t-2 border-black bg-slate-200 p-5">
                    Compare Versions
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Version A
                      </label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v1.0">v1.0 (Current)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Version B
                      </label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v0.9">v0.9</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Select two versions to see a side-by-side comparison
                        with highlighted changes.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          alert(
                            "Comparison feature would show diff between selected versions"
                          );
                        }}
                      >
                        Start Comparison
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audit" className="p-4 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-t-2 border-black bg-slate-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Audit Trail
                    </h3>
                    <Button
                      className="text-white bg-blue-900 hover:bg-blue-800 hover:text-white"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const auditData = [
                          {
                            action: "Created",
                            user: "Dr. Sarah Chen",
                            date: "2025-07-10 14:30",
                            details: "Initial draft created",
                          },
                        ];
                        const csv =
                          "Action,User,Date,Details\n" +
                          auditData
                            .map(
                              (row) =>
                                `${row.action},${row.user},${row.date},"${row.details}"`
                            )
                            .join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "audit-trail.csv";
                        a.click();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Log
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        action: "Created",
                        user: "Dr. Sarah Chen",
                        date: "2025-07-10 14:30",
                        details: "Initial draft created",
                        type: "edit",
                      },
                    ].map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            entry.type === "edit"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {entry.user}
                            </span>
                            <span className="text-gray-600">
                              {entry.action.toLowerCase()}
                            </span>
                            <span className="text-sm text-gray-500">
                              {entry.date}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {entry.details}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 bg-white">
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  const blob = new Blob([documentContent], {
                    type: "text/markdown",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selectedDocument?.name || "document"}.md`;
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  setShowAckModal(true);
                  setShowEditModal(false);
                }}
              >
                <Users className="h-4 w-4" />
                Request Acknowledgement
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  const comment = prompt("Add a comment:");
                  if (comment) alert(`Comment added: ${comment}`);
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Add Comment
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  localStorage.setItem(
                    `draft-${selectedDocument?.id}`,
                    documentContent
                  );
                  alert("Draft saved successfully!");
                }}
              >
                <Calendar className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  if (confirm("Archive this document?")) {
                    alert("Document archived successfully!");
                    setShowEditModal(false);
                  }
                }}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
              <Button
                variant="ghost"
                className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent flex items-center gap-2"
                onClick={() => {
                  const changes = prompt("What changes are needed?");
                  if (changes) alert(`Change request submitted: ${changes}`);
                }}
              >
                <XCircle className="h-4 w-4" />
                Request Changes
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                onClick={() => {
                  if (confirm("Approve this document?")) {
                    alert("Document approved successfully!");
                    setShowEditModal(false);
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>

          <Dialog open={showAckModal} onOpenChange={setShowAckModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Acknowledgement</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-sm text-gray-600">
                  Request sent for acknowledgment.
                </p>
                <Button className="mt-4" onClick={() => setShowAckModal(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {showSidebar && (
            <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg border-l border-gray-200 z-50 overflow-y-auto p-4 space-y-4 transition-all duration-300">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Document Details
                      </h3>
                      <p className="text-xs text-gray-600">
                        Insights & Compliance Info
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                <div className="flex justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Trust Score</h4>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-green-700">
                      {selectedDocument?.trustScore || 85}%
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Section Completeness</span>
                      <span>95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Regulatory Alignment</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Clarity Score</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Add a data retention section to reach 100% compliance.
                </p>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Compliance Intelligence
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          Missing GDPR Section
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          This SOP requires a data retention policy section.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs h-7 bg-transparent"
                          onClick={() => {
                            setDocumentContent(
                              (prev) =>
                                prev +
                                "\n\n## Data Retention Policy\n\nPersonal data shall be retained only for as long as necessary to fulfill the purposes for which it was collected.\n\n"
                            );
                          }}
                        >
                          Add Section
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          ISO 13485 Compliant
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          All required sections are present.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  Smart Suggestions
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Consider rephrasing "data should be stored" to "data must
                      be stored" for stronger compliance language.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setDocumentContent((prev) =>
                            prev.replace(
                              /data should be stored/gi,
                              "data must be stored"
                            )
                          );
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Accept CONTROL OR COMMAND + S TO SAVE
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-transparent"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Add a review cycle clause: "This document shall be
                      reviewed annually."
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          setDocumentContent(
                            (prev) =>
                              prev +
                              "\n\n## Review Cycle\n\nThis document shall be reviewed annually to ensure continued relevance and compliance.\n\n"
                          );
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-transparent"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  Your Tasks
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-sm">Documents to approve</span>
                    <Badge className="bg-yellow-100 text-yellow-700">2</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">Acknowledgments pending</span>
                    <Badge className="bg-blue-100 text-blue-700">1</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">Reviews completed</span>
                    <Badge className="bg-green-100 text-green-700">5</Badge>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 bg-transparent"
                  onClick={() => {
                    const summary = `# Summary of ${selectedDocument?.name}\n\nThis document covers key aspects of procedures and compliance requirements.`;
                    alert(`Document Summary:\n\n${summary}`);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Summarize Document
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 bg-transparent"
                  onClick={() => {
                    navigator.clipboard.writeText(documentContent);
                    alert("Document content copied to clipboard!");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 bg-transparent"
                  onClick={() => {
                    const comment = prompt("Add a comment to this document:");
                    if (comment) {
                      alert(`Comment added: ${comment}`);
                    }
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add Comments
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 bg-transparent"
                  onClick={() => {
                    setDocumentContent((prev) =>
                      prev
                        .replace(/\b(should|could|might)\b/gi, "must")
                        .replace(/\s+/g, " ")
                        .trim()
                    );
                    alert("Auto-fixed compliance language issues!");
                  }}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Auto-Fix Issues
                </Button>
              </div>
            </div>
          )}

          {showAIAssistant && (
            <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg border-l border-gray-200 z-50 flex flex-col transition-all duration-300">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        AI Assistant
                      </h3>
                      <p className="text-xs text-gray-600">
                        Compliance & Writing Helper
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAIAssistant(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fb]">
                {aiChat.map((message, i) => (
                  <div
                    key={i}
                    className={`mb-5 flex items-end ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.type === "bot" && (
                      <div className="mr-2 text-purple-600">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-4 py-2 max-w-xs whitespace-pre-wrap shadow-sm text-sm ${
                        message.type === "user"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-[#5e50ee] text-white"
                      }`}
                    >
                      {message.message}
                      <div
                        className={`mt-1 text-[11px] flex justify-end items-center ${
                          message.type === "user"
                            ? "text-gray-500"
                            : "text-white/80"
                        }`}
                      >
                        {message.timestamp}
                      </div>
                    </div>
                    {message.type === "user" && (
                      <div className="ml-2">
                        <UserCircle2 className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 h-9 text-sm"
                    onKeyDown={(e) =>
                      e.key === "Enter" ? handleSendAIMessage() : null
                    }
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleSendAIMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "What’s missing?",
                    "Is this compliant?",
                    "Improve clarity",
                    "Add review cycle",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setAiMessage(suggestion)}
                      className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EditPage;
