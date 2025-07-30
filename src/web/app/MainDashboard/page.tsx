"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Bell,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";

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

export default function MainDashboard() {
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );
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

            const statuses: Submission["status"][] = [
              "draft",
              "in-review",
              "submitted",
              "approved",
              "rejected",
            ];
            const status =
              submission.status || statuses[index % statuses.length];

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
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
            Draft
          </Badge>
        );
      case "in-review":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
            In Review
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
            Submitted
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNavigation viewType={viewType} />
      <div className="flex-1 flex flex-col">
        <Header
          viewType={viewType}
          setViewType={setViewType}
          title="Dashboard"
          description="510(k) Submission Management Overview"
        />
        <div className="flex-1 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {isLoading ? (
                <div className="col-span-full text-center text-slate-600">
                  Loading metrics...
                </div>
              ) : (
                [
                  {
                    title: "Active Submissions",
                    value: submissions
                      .filter((s) => ["draft", "in-review"].includes(s.status))
                      .length.toString(),
                    trend: "+12%",
                    trendDirection: "up",
                    icon: FileText,
                  },
                  {
                    title: "Pending Review",
                    value: submissions
                      .filter((s) => s.status === "in-review")
                      .length.toString(),
                    trend: "-5%",
                    trendDirection: "down",
                    icon: Clock,
                  },
                  {
                    title: "Approved",
                    value: submissions
                      .filter((s) => s.status === "approved")
                      .length.toString(),
                    trend: "+8%",
                    trendDirection: "up",
                    icon: CheckCircle,
                  },
                  {
                    title: "Action Required",
                    value: submissions
                      .filter((s) => {
                        let isOverdue = false;
                        try {
                          isOverdue =
                            s.deadline !== "Unknown" &&
                            parseISO(s.deadline) < new Date();
                        } catch (e) {
                          console.error(
                            `Invalid date format for deadline: ${s.deadline}`
                          );
                        }
                        return s.status === "rejected" || isOverdue;
                      })
                      .length.toString(),
                    trend: "0%",
                    trendDirection: "neutral",
                    icon: AlertTriangle,
                  },
                ].map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <Card
                      key={index}
                      className="bg-white border-slate-200 shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center">
                            <Icon className="w-5 h-5 text-slate-600" />
                          </div>
                          <Badge
                            className={`text-xs px-1.5 py-0.5 ${
                              metric.trendDirection === "up"
                                ? "bg-green-50 text-green-700"
                                : metric.trendDirection === "down"
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {metric.trend}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            {metric.value}
                          </div>
                          <p className="text-sm font-medium text-slate-600">
                            {metric.title}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">
                          Recent Submissions
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Latest 510(k) submission activities
                        </p>
                      </div>
                      <Link href="/submissions">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-slate-600 border-slate-200 hover:bg-slate-50 bg-transparent h-7"
                        >
                          View All
                          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pt-2 pb-4">
                    {isLoading ? (
                      <div className="text-center text-slate-600">
                        Loading submissions...
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="text-center text-slate-600">
                        No recent submissions found.
                      </div>
                    ) : (
                      submissions.slice(0, 4).map((submission) => (
                        <Card
                          key={submission.id}
                          className="bg-white border-slate-200 shadow-sm hover:shadow transition-shadow"
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900">
                                    {submission.deviceName}
                                  </h4>
                                  {getStatusBadge(submission.status)}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>ID: {submission.id}</span>
                                  <span>•</span>
                                  <span>{submission.deadline}</span>
                                </div>
                              </div>
                              <Link
                                href={`/submissions/${submission.id}/checklist`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Progress</span>
                                <span className="font-medium text-slate-900">
                                  {submission.progress}
                                </span>
                              </div>
                              <Progress
                                value={parseInt(submission.progress) || 0}
                                className="h-2 bg-slate-100 [&>div]:bg-blue-900"
                                aria-label={`Submission progress: ${submission.progress}`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-red-600" />
                      Compliance Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pt-2 pb-4">
                    <Alert className="bg-red-50 text-red-700 border-red-200 py-2 px-3">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <AlertDescription>
                        <div className="font-medium mb-0.5 text-sm">
                          FDA Response Overdue
                        </div>
                        <div className="text-xs">
                          K241234 - Response required by Jan 25, 2024
                        </div>
                      </AlertDescription>
                    </Alert>
                    <Alert className="bg-yellow-50 text-yellow-700 border-yellow-200 py-2 px-3">
                      <Clock className="h-3.5 w-3.5" />
                      <AlertDescription>
                        <div className="font-medium mb-0.5 text-sm">
                          Review Pending
                        </div>
                        <div className="text-xs">
                          3 submissions awaiting technical review
                        </div>
                      </AlertDescription>
                    </Alert>
                    <Alert className="bg-blue-50 text-blue-700 border-blue-200 py-2 px-3">
                      <Calendar className="h-3.5 w-3.5" />
                      <AlertDescription>
                        <div className="font-medium mb-0.5 text-sm">
                          Upcoming Audit
                        </div>
                        <div className="text-xs">
                          Quality audit scheduled for next week
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Regulatory Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pt-2 pb-4">
                    <div className="bg-blue-50 border-l-3 border-blue-500 p-3 rounded-r-md">
                      <h4 className="font-medium text-slate-900 mb-0.5 text-sm">
                        New FDA Guidance
                      </h4>
                      <p className="text-xs text-slate-700 mb-1">
                        Updated requirements for AI/ML medical devices
                      </p>
                      <p className="text-xs text-slate-500">
                        Published Jan 15, 2024
                      </p>
                    </div>
                    <div className="bg-green-50 border-l-3 border-green-500 p-3 rounded-r-md">
                      <h4 className="font-medium text-slate-900 mb-0.5 text-sm">
                        Regulatory Change
                      </h4>
                      <p className="text-xs text-slate-700 mb-1">
                        Streamlined review process for Class II devices
                      </p>
                      <p className="text-xs text-slate-500">
                        Published Jan 10, 2024
                      </p>
                    </div>
                    <div className="bg-yellow-50 border-l-3 border-yellow-500 p-3 rounded-r-md">
                      <h4 className="font-medium text-slate-900 mb-0.5 text-sm">
                        Deadline Extension
                      </h4>
                      <p className="text-xs text-slate-700 mb-1">
                        UDI compliance deadline moved to Q2 2024
                      </p>
                      <p className="text-xs text-slate-500">
                        Published Jan 8, 2024
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 bg-transparent h-7 text-sm"
                    >
                      View All Updates
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
