// app/dashboard/page.tsx
"use client";

import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ClipboardCheckIcon,
  GaugeIcon,
  DownloadIcon,
  PackageIcon,
  FileIcon,
  HelpCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Section {
  id: string;
  name: string;
  estarId?: string;
  status: "complete" | "in-progress" | "pending";
  rtaRequired: boolean;
  progress: { completed: number; total: number };
  issues: number;
  lastUpdated: string;
  href: string;
  estarOrder?: number;
}

interface RtaStatus {
  completedCriticals: number;
  totalCriticals: number;
  issues: number;
}

interface SectionStatus {
  completedCount: number;
  totalSections: number;
}

interface Submission {
  id: string;
  submission_title: string;
  submission_type: string;
  regulatory_pathway: string;
  submissionType: string;
  submittedBy: string;
  predicate_device_name: string;
  device_name: string;
  device_class: string;
  product_code: string;
  regulation_number: string;
  intended_use: string;
  clinical_setting: string;
  target_specimen: string;
  target_market: string;
  is_follow_up: boolean;
  previous_k: string;
  predicate_k: string;
  includes_clinical_testing: boolean;
  includes_software: boolean;
  includes_sterile_packaging: boolean;
  major_predicate_changes: boolean;
  checklist_notes: string;
  submitter_org: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  reviewer_id: string;
  internal_deadline: string;
  reviewer_notes: string;
  device_category: string;
  last_updated: string;
  templateId: string;
  rtaStatus?: RtaStatus;
  sectionStatus?: SectionStatus;
  sections?: any[];
  readinessScore: number;
}

export default function Dashboard() {
  const [viewByEstar, setViewByEstar] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/submissions`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch submissions`
          );
        }
        const data = await response.json();
        console.log("Fetched submissions:", JSON.stringify(data, null, 2));
        setSubmissions(data);
        if (data.length > 0) {
          setSelectedSubmissionId(
            data.find((sub: Submission) => sub.id === "SUB-001")?.id ||
              data[0].id
          );
        } else {
          console.warn("No submissions found in API response");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load submissions");
        toast.error(err.message || "Failed to load submissions");
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (!selectedSubmissionId) return;

    const fetchSubmissionData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${selectedSubmissionId}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch submission ${selectedSubmissionId}`
          );
        }
        const data = await response.json();
        console.log(
          "Fetched submission data for SUB-001:",
          JSON.stringify(data, null, 2)
        );
        setSubmission(data);

        const mappedSections = (data.sections || []).map(
          (s: any, index: number) => {
            const completed =
              s.subsections?.reduce(
                (acc: number, sub: any) =>
                  acc +
                  (sub.checklistValidation?.filter(
                    (item: any) => item.validated === true
                  ).length || 0),
                0
              ) || 0;
            const total =
              s.subsections?.reduce(
                (acc: number, sub: any) => acc + (sub.checklist?.length || 0),
                0
              ) || 0;
            const issues =
              s.subsections?.reduce(
                (acc: number, sub: any) =>
                  acc +
                  (sub.checklistValidation?.filter(
                    (item: any) => !item.validated
                  ).length || 0),
                0
              ) || 0;
            console.log(
              `Section ${s.title || `Section ${index + 1}`}: id=${
                s.id
              }, completed=${completed}, total=${total}, issues=${issues}, last_updated=${
                s.last_updated
              }`
            );
            return {
              id: s.id || `section-${index + 1}`,
              name: s.title || `Section ${index + 1}`,
              estarId: `F3.${index + 1}`,
              status:
                completed === total && total > 0
                  ? "complete"
                  : completed > 0
                  ? "in-progress"
                  : "pending",
              rtaRequired: s.required ?? true,
              progress: { completed, total },
              issues,
              lastUpdated: s.last_updated
                ? format(parseISO(s.last_updated), "MMM dd, yyyy")
                : data.last_updated
                ? format(parseISO(data.last_updated), "MMM dd, yyyy")
                : "—",
              href: `/submissions/${selectedSubmissionId}/${
                s.id || `section-${index + 1}`
              }`,
              estarOrder: index + 1,
            };
          }
        );
        setSections(mappedSections);
        if (!data.sections || data.sections.length === 0) {
          console.warn(
            "No sections found for submission:",
            selectedSubmissionId
          );
          toast.info("No sections available for this submission.");
        }
      } catch (err: any) {
        setError(
          err.message ||
            `Failed to load submission data for ${selectedSubmissionId}`
        );
        toast.error(err.message || "Failed to load submission data");
        console.error("Error fetching submission:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissionData();
  }, [selectedSubmissionId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            Complete
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionButton = (section: Section) => {
    switch (section.status) {
      case "complete":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-transparent"
            aria-label={`Review ${section.name}`}
          >
            Review
          </Button>
        );
      case "in-progress":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-transparent"
            aria-label={`Continue ${section.name}`}
          >
            Continue
          </Button>
        );
      case "pending":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-transparent"
            aria-label={`Start ${section.name}`}
          >
            Start
          </Button>
        );
      default:
        return null;
    }
  };

  const completedSections =
    submission?.sectionStatus?.completedCount ??
    sections.filter((s: Section) => s.status === "complete").length;
  const totalSections =
    submission?.sectionStatus?.totalSections ?? sections.length;
  const totalIssues =
    submission?.rtaStatus?.issues ??
    sections.reduce((sum: number, s: Section) => sum + s.issues, 0);
  const rtaCriticalComplete = submission?.rtaStatus?.completedCriticals ?? 0;
  const rtaCriticalTotal = submission?.rtaStatus?.totalCriticals ?? 0;
  const rtaReadinessScore = submission?.readinessScore ?? 0;
  const estarReadiness =
    rtaCriticalComplete === rtaCriticalTotal && totalIssues === 0;

  useEffect(() => {
    if (submission && sections !== undefined) {
      console.log("Metrics:", {
        completedSections,
        totalSections,
        rtaCriticalComplete,
        rtaCriticalTotal,
        totalIssues,
        rtaReadinessScore,
        estarReadiness,
      });
    }
  }, [submission, sections]);

  const displaySections = viewByEstar
    ? [...sections].sort((a, b) => (a.estarOrder || 0) - (b.estarOrder || 0))
    : sections;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-600">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        No submissions found. Please create a submission.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="text-xl font-bold text-blue-900">Fignos</div>
                <div className="flex gap-6">
                  <Link
                    href="/submissions"
                    className="text-sm font-medium text-gray-700 hover:text-blue-900"
                  >
                    Submissions
                  </Link>
                  <Link
                    href="/"
                    className="text-sm font-medium text-blue-900 border-b-2 border-blue-900 pb-4"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/document-hub"
                    className="text-sm font-medium text-gray-700 hover:text-blue-900"
                  >
                    Document Hub (DHF)
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="bg-gray-100 border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                510(k) Submission Overview
              </h1>
              <div className="mt-4">
                <Label
                  htmlFor="submission-select"
                  className="text-sm font-medium text-gray-700"
                >
                  Select Submission
                </Label>
                <Select
                  value={selectedSubmissionId || ""}
                  onValueChange={setSelectedSubmissionId}
                >
                  <SelectTrigger
                    id="submission-select"
                    className="w-full max-w-md border-gray-300"
                  >
                    <SelectValue placeholder="Select a submission" />
                  </SelectTrigger>
                  <SelectContent>
                    {submissions.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.submission_title} – {sub.submission_type} (
                        {sub.predicate_device_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {submission && (
                <p className="mt-2 text-lg text-gray-500">
                  {submission.submission_title} – {submission.submission_type} (
                  {submission.predicate_device_name})
                </p>
              )}
            </div>

            {submission && (
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {completedSections} / {totalSections}
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      Sections Completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <ClipboardCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {rtaCriticalComplete} / {rtaCriticalTotal}
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      RTA-Critical Items Done
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                    <AlertTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {totalIssues}
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      Unresolved Issues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                    <GaugeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {rtaReadinessScore}%
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      Readiness Score
                    </p>
                  </div>
                </div>
              </div>
            )}

            {submission && (
              <div className="flex flex-wrap gap-3">
                <Button
                  className={`flex items-center gap-2 ${
                    estarReadiness
                      ? "bg-blue-900 hover:bg-blue-800"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!estarReadiness}
                  aria-label="Export eSTAR Package"
                >
                  <PackageIcon className="h-4 w-4" />
                  Export eSTAR Package
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                  aria-label="Download Submission ZIP"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download Submission ZIP
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                  aria-label="Generate Reviewer PDF"
                >
                  <FileIcon className="h-4 w-4" />
                  Generate Reviewer PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {submission && (
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center gap-3">
              <Switch
                id="estar-view"
                checked={viewByEstar}
                onCheckedChange={setViewByEstar}
                aria-label="Toggle eSTAR view"
              />
              <Label
                htmlFor="estar-view"
                className="text-sm font-medium text-gray-700"
              >
                View by eSTAR Format
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircleIcon className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Reorders sections to match FDA eSTAR electronic submission
                    structure with corresponding form IDs.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-900">
                        Section Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        RTA Required
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Progress
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Issues
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Last Updated
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displaySections.length > 0 ? (
                      displaySections.map((section) => (
                        <TableRow
                          key={section.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => (window.location.href = section.href)}
                          role="row"
                          aria-label={`Section ${section.name}`}
                        >
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{section.name}</span>
                              {viewByEstar && section.estarId && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-blue-700 border-blue-300 bg-blue-50"
                                >
                                  {section.estarId}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(section.status)}
                          </TableCell>
                          <TableCell>
                            {section.rtaRequired ? (
                              <Badge
                                variant="outline"
                                className="text-red-700 border-red-300 bg-red-50"
                              >
                                Yes
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-gray-600 border-gray-300 bg-gray-50"
                              >
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {section.progress.completed} /{" "}
                                {section.progress.total} items
                              </span>
                              <Progress
                                value={
                                  section.progress.total > 0
                                    ? (section.progress.completed /
                                        section.progress.total) *
                                      100
                                    : 0
                                }
                                className="w-16 h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {section.issues > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-red-700 border-red-300 bg-red-50"
                              >
                                {section.issues}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {section.lastUpdated}
                          </TableCell>
                          <TableCell>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Link href={section.href}>
                                {getActionButton(section)}
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-gray-600"
                        >
                          No sections available for this submission.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
