"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentItem {
  name: string;
  status: "uploaded" | "ai-draft" | "missing";
}

interface ChecklistSection {
  id: string;
  title: string;
  summary: string;
  documents?: DocumentItem[];
}

interface Submission {
  id: string;
  submission_title: string;
  product_code: string;
  device_category: string;
  predicate_device: string;
  intended_use: string;
  submission_type: string;
  device_class: string;
  target_market: string;
  regulatory_pathway: string;
  internal_deadline: string;
  reviewer_id: string;
  notes: string;
}

export default function FDASubmissionChecklist() {
  const { id } = useParams(); // Get the submission ID from the URL
  const [expandedSection, setExpandedSection] = useState("section-a");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock checklist data (replace with API call in the future)
  const summaryStats = [
    { label: "Total Sections", value: "9" },
    { label: "Docs Uploaded", value: "3 of 27" },
    {
      label: "Internal Deadline",
      value: submission?.internal_deadline || "July 31, 2025",
    },
    { label: "Time Remaining", value: "22 days" },
  ];

  const sections: ChecklistSection[] = [
    {
      id: "section-a",
      title: "Section A – Device Description",
      summary: "2 of 3 Completed",
      documents: [
        { name: "Executive Summary", status: "uploaded" },
        { name: "Indications for Use", status: "ai-draft" },
        { name: "Device Specifications", status: "missing" },
      ],
    },
    {
      id: "section-b",
      title: "Section B – Substantial Equivalence",
      summary: "1 of 4 Completed",
    },
    {
      id: "section-c",
      title: "Section C – Software and Cybersecurity",
      summary: "0 of 3",
    },
    {
      id: "section-d",
      title: "Section D – Biocompatibility",
      summary: "AI Suggested",
    },
    {
      id: "section-e",
      title: "Section E – Bench Testing",
      summary: "0 of 5",
    },
    {
      id: "section-f",
      title: "Section F – Labeling and IFU",
      summary: "1 of 3",
    },
    {
      id: "section-g",
      title: "Section G – Clinical Performance",
      summary: "0 of 4",
    },
    {
      id: "section-h",
      title: "Section H – Risk Analysis and Mitigation",
      summary: "0 of 2",
    },
    {
      id: "section-i",
      title: "Section I – Summary & Attachments",
      summary: "0 of 3",
    },
  ];

  // Fetch submission data
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id) {
        toast.error("No submission ID provided");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${id}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch submission`
          );
        }
        const data = await response.json();
        setSubmission(data);
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch submission data");
        console.error("Fetch submission error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmission();
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <Badge
            variant="outline"
            className="text-green-700 border-green-300 bg-green-50"
          >
            ✅ Uploaded
          </Badge>
        );
      case "ai-draft":
        return (
          <Badge
            variant="outline"
            className="text-blue-700 border-blue-300 bg-blue-50"
          >
            🧠 AI Draft
          </Badge>
        );
      case "missing":
        return (
          <Badge
            variant="outline"
            className="text-gray-600 border-gray-300 bg-gray-50"
          >
            ❌ Missing
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionButtons = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-transparent"
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-transparent"
            >
              Replace
            </Button>
          </div>
        );
      case "ai-draft":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-transparent"
          >
            Review Draft
          </Button>
        );
      case "missing":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-transparent"
            >
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-transparent"
            >
              View Requirements
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Page Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                FDA Submission Checklist{" "}
                {submission
                  ? `for ${submission.submission_title}`
                  : `(ID: ${id})`}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {isLoading
                  ? "Loading submission data..."
                  : submission
                  ? `Auto-generated based on submission type: ${submission.submission_type}, device: ${submission.device_category}`
                  : "Submission data not found"}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-sm font-medium text-gray-700 border-gray-300"
                >
                  {submission
                    ? `${submission.submission_type} - ${submission.device_class}`
                    : "Loading..."}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Checklist based on submission type and device classification.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Summary Grid */}
          <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {summaryStats.map((stat, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Checklist Sections */}
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg"
              >
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === section.id ? "" : section.id
                    )
                  }
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {expandedSection === section.id ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="text-gray-600 border-gray-300"
                    >
                      {section.summary}
                    </Badge>
                    {section.id === "section-a" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-blue-700 border-blue-300 bg-blue-50"
                          >
                            AI Drafted
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>1 of 3 items drafted using earlier input</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </button>

                {expandedSection === section.id && section.documents && (
                  <div className="border-t border-gray-200 p-4">
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="pb-3 text-left text-sm font-medium text-gray-700">
                              Document Item
                            </th>
                            <th className="pb-3 text-left text-sm font-medium text-gray-700">
                              Status
                            </th>
                            <th className="pb-3 text-left text-sm font-medium text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {section.documents.map((doc, index) => (
                            <tr key={index} className="py-3">
                              <td className="py-3 text-sm text-gray-900">
                                {doc.name}
                              </td>
                              <td className="py-3">
                                {getStatusBadge(doc.status)}
                              </td>
                              <td className="py-3">
                                {getActionButtons(doc.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Notes Section */}
                    <div className="mt-6 border-t border-gray-100 pt-4">
                      <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Notes for Reviewer
                      </button>
                      {showNotes && (
                        <div className="mt-3">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes or instructions for the reviewer..."
                            className="min-h-[80px] resize-none border-gray-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA Area */}
          <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
            <Button variant="ghost" className="text-gray-600" asChild>
              <a href={`/submissions/${id}`}>Back to Submission Details</a>
            </Button>
            <Button className="bg-blue-800 hover:bg-blue-900">
              Continue to Section Uploads
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
