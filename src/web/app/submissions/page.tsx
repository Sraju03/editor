// app/submissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";

interface Submission {
  id: string;
  deviceName: string;
  submissionType: string;
  status: "draft" | "in-review" | "submitted" | "approved" | "rejected";
  progress: string;
  deadline: string;
  assignee: string;
  lastUpdated: string;
}

export default function SubmissionsPage() {
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:8000/api/submissions", {
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch submissions`
          );
        }
        const data = await response.json();
        // Map backend data to frontend Submission interface, aligning with MainDashboard
        const mappedSubmissions: Submission[] = data.map(
          (submission: any, index: number) => {
            let deadline = "Unknown";
            try {
              deadline = submission.internal_deadline
                ? format(
                    new Date(submission.internal_deadline),
                    "MMMM dd, yyyy"
                  )
                : "Unknown";
            } catch (e) {
              console.error(
                `Invalid date format for internal_deadline: ${submission.internal_deadline}`
              );
            }

            let lastUpdated = "Unknown";
            try {
              lastUpdated = submission.last_updated
                ? formatDistanceToNowStrict(parseISO(submission.last_updated), {
                    addSuffix: true,
                  })
                : "Unknown";
            } catch (e) {
              console.error(
                `Invalid date format for last_updated: ${submission.last_updated}`
              );
            }

            // Use backend status or cycle through statuses for variety (same as MainDashboard)
            const statuses: Submission["status"][] = [
              "draft",
              "in-review",
              "submitted",
              "approved",
              "rejected",
            ];
            const status =
              submission.status || statuses[index % statuses.length];

            // Convert progress to percentage string (same as MainDashboard)
            let progress = "0%";
            try {
              if (
                submission.progress &&
                typeof submission.progress === "string"
              ) {
                const [completed, total] = submission.progress
                  .split(" of ")
                  .map(Number);
                progress = total
                  ? `${Math.round((completed / total) * 100)}%`
                  : "0%";
              } else if (
                submission.progress &&
                typeof submission.progress === "number"
              ) {
                progress = `${submission.progress}%`;
              }
            } catch (e) {
              console.error(`Invalid progress format: ${submission.progress}`);
            }

            return {
              id: submission.id,
              deviceName:
                submission.submission_title ||
                submission.device_category ||
                "Untitled Submission",
              submissionType:
                submission.submission_type === "traditional"
                  ? "Traditional 510(k)"
                  : submission.submission_type === "special"
                  ? "Special 510(k)"
                  : submission.submission_type === "abbreviated"
                  ? "Abbreviated 510(k)"
                  : submission.submission_type || "Unknown",
              status,
              progress,
              deadline,
              assignee: submission.reviewer_id || "Unassigned",
              lastUpdated,
            };
          }
        );
        setSubmissions(mappedSubmissions);
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch submissions");
        console.error("Fetch submissions error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Draft
          </Badge>
        );
      case "in-review":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            In Review
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Submitted
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <SidebarNavigation viewType={viewType} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          viewType={viewType}
          setViewType={setViewType}
          title="Submissions"
          description="Manage your FDA 510(k) submissions and track their progress."
        />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {/* Filters and New Submission Button */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Link href="/create">
                  <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Submission
                  </Button>
                </Link>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {isLoading ? (
                <div className="p-6 text-center text-gray-600">
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  No submissions found in the database.
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Submission
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Progress
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Deadline
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Assignee
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Last Updated
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {submission.deviceName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {submission.submissionType}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(submission.status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {submission.progress}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {submission.deadline}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {submission.assignee}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {submission.lastUpdated}
                          </td>
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link
                                    href={`/submissions/${submission.id}/checklist`}
                                    className="w-full"
                                  >
                                    View Checklist
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link
                                    href={`/submissions/${submission.id}/edit`}
                                    className="w-full"
                                  >
                                    Edit Details
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {filteredSubmissions.length === 0 &&
              !isLoading &&
              submissions.length > 0 && (
                <div className="mt-8 text-center">
                  <div className="text-gray-500">
                    No submissions found matching your criteria.
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
