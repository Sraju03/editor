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
import { useParams } from "next/navigation";
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
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";

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
  const { id } = useParams<{ id: string }>();
  const [viewByEstar, setViewByEstar] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );

  useEffect(() => {
    const fetchSubmissionData = async () => {
      if (!id) {
        setError("No submission ID provided");
        toast.error("No submission ID provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${id}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch submission ${id}`
          );
        }
        const data = await response.json();
        console.log("Fetched submission data:", JSON.stringify(data, null, 2));
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
                completed > 0 && completed < total
                  ? "in-progress"
                  : completed === total && total > 0
                  ? "complete"
                  : "pending",
              rtaRequired: s.required ?? true,
              progress: { completed, total },
              issues,
              lastUpdated: s.last_updated
                ? format(parseISO(s.last_updated), "MMM dd, yyyy")
                : data.last_updated
                ? format(parseISO(data.last_updated), "MMM dd, yyyy")
                : "—",
              href: `/submissions/${id}/${s.id || `section-${index + 1}`}`,
              estarOrder: index + 1,
            };
          }
        );
        setSections(mappedSections);
        if (!data.sections || data.sections.length === 0) {
          console.warn("No sections found for submission:", id);
          toast.info("No sections available for this submission.");
        }
      } catch (err: any) {
        setError(err.message || `Failed to load submission data for ${id}`);
        toast.error(err.message || "Failed to load submission data");
        console.error("Error fetching submission:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissionData();
  }, [id]);

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
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-100">
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
            className="text-xs bg-transparent border-slate-300"
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
            className="text-xs bg-transparent border-slate-300"
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
            className="text-xs bg-transparent border-slate-300"
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
    sections.filter((s) => s.status === "complete").length;
  const totalSections =
    submission?.sectionStatus?.totalSections ?? sections.length;
  const totalIssues =
    submission?.rtaStatus?.issues ??
    sections.reduce((sum, s) => sum + s.issues, 0);
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
      <div className="flex justify-center items-center min-h-screen text-slate-600">
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

  if (!submission) {
    return (
      <div className="flex justify-center items-center min-h-screen text-slate-600">
        No submission found for the provided ID.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <SidebarNavigation viewType={viewType} />
        <div className="flex-1 flex flex-col">
          <Header
            viewType={viewType}
            setViewType={setViewType}
            title={`510(k) Submission Overview – ${submission.submission_title}`}
            description={`${submission.submission_type} (${submission.predicate_device_name})`}
          />
          <div className="flex-1 p-4">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {completedSections} / {totalSections}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      Sections Completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <ClipboardCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {rtaCriticalComplete} / {rtaCriticalTotal}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      RTA-Critical Items Done
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                    <AlertTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {totalIssues}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      Unresolved Issues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 rounded-lg bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                    <GaugeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {rtaReadinessScore}%
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      Readiness Score
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  disabled={!estarReadiness}
                  aria-label="Export eSTAR Package"
                >
                  <PackageIcon className="h-4 w-4" />
                  Export eSTAR Package
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent border-slate-300"
                  aria-label="Download Submission ZIP"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download Submission ZIP
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent border-slate-300"
                  aria-label="Generate Reviewer PDF"
                >
                  <FileIcon className="h-4 w-4" />
                  Generate Reviewer PDF
                </Button>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <Switch
                  id="estar-view"
                  checked={viewByEstar}
                  onCheckedChange={setViewByEstar}
                  aria-label="Toggle eSTAR view"
                />
                <Label
                  htmlFor="estar-view"
                  className="text-sm font-medium text-slate-700"
                >
                  View by eSTAR Format
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircleIcon className="h-4 w-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white shadow-md">
                    <p className="max-w-xs">
                      Reorders sections to match FDA eSTAR electronic submission
                      structure with corresponding form IDs.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold text-slate-900">
                          Section Name
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          RTA Required
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          Progress
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          Issues
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          Last Updated
                        </TableHead>
                        <TableHead className="font-semibold text-slate-900">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displaySections.length > 0 ? (
                        displaySections.map((section) => (
                          <TableRow
                            key={section.id}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() =>
                              (window.location.href = section.href)
                            }
                            role="row"
                            aria-label={`Section ${section.name}`}
                          >
                            <TableCell className="font-medium text-slate-900">
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
                                  className="text-slate-600 border-slate-300 bg-slate-50"
                                >
                                  No
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">
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
                                  className="w-16 h-2 bg-slate-100 [&>div]:bg-blue-900"
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
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600">
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
                            className="text-center text-slate-600"
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
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
