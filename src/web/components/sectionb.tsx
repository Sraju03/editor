"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FDAExpectations } from "@/components/Fda";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

import StatusCards from "@/components/section-navbar"; // Adjust path as needed

import {
  Plus,
  Edit3,
  Check,
  HelpCircle,
  Upload,
  ArrowUpDown,
  Search,
  Info,
  X,
  Download,
  FileText,
  Loader2,
} from "lucide-react";

interface Submission {
  id: string;
  submission_title: string;
  submission_type: string;
  regulatory_pathway?: string;
  is_follow_up?: boolean;
  previous_k?: string;
  device_name: string;
  product_code: string;
  regulation_number?: string;
  device_class: string;
  predicate_device_name: string;
  predicate_k: string;
  intended_use: string;
  clinical_setting: string;
  target_specimen: string;
  target_market: string;
  includes_clinical_testing?: boolean;
  includes_software?: boolean;
  includes_sterile_packaging?: boolean;
  major_predicate_changes?: boolean;
  checklist_notes?: string;
  submitter_org: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  reviewer_id: string;
  internal_deadline: string;
  reviewer_notes?: string;
  last_updated?: string;
  templateId?: string;
  submissionType?: string;
  submittedBy?: string;
  sections?: Array<{
    id: string;
    title: string;
    status: string;
    subsections?: Array<{
      id: string;
      title: string;
      status: string;
      contentExtracted?: string;
      performanceMetrics?: PerformanceMetric[];
      predicateDevices?: PredicateDevice[];
      file?: any;
      rtaResults?: { readinessPercent: number } | null; // Added rtaResults
    }>;
  }>;
}

interface PerformanceMetric {
  id: string;
  metricName: string;
  subjectValue: string;
  predicateValue: string;
  difference: string;
  evaluation: string;
  confidence: "High" | "Medium" | "Low";
  justification?: string;
  sampleVolume: string;
  testType: string;
}

interface PredicateDevice {
  id: string;
  deviceName: string;
  kNumber: string;
  manufacturer: string;
  clearanceDate: string;
  indication: string;
  classification: string;
  comparison: "Same" | "Minor Change" | "Major Difference";
  productCode?: string;
  intendedUse?: string;
  comparisonDetails?: {
    intendedUse: "Same" | "Minor Change" | "Major Difference";
    design: "Same" | "Minor Change" | "Major Difference";
    technology: "Same" | "Minor Change" | "Major Difference";
    safetyEffectiveness: "Same" | "Minor Change" | "Major Difference";
    designNote?: string;
  };
  linkedFiles?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
  }>;
}

export default function SubstantialEquivalenceSection({
  submission,
}: {
  submission?: Submission | null | undefined;
}) {
  console.log("SubstantialEquivalenceSection received submission:", submission);

  const [showAddMetricModal, setShowAddMetricModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [showAddPredicateModal, setShowAddPredicateModal] = useState(false);
  const [showPredicateDetailModal, setShowPredicateDetailModal] =
    useState(false);
  const [showPredicateChoiceModal, setShowPredicateChoiceModal] =
    useState(false);
  const [selectedPredicate, setSelectedPredicate] =
    useState<PredicateDevice | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<PerformanceMetric | null>(null);
  const [editingPredicate, setEditingPredicate] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState("");
  const [autoSaved, setAutoSaved] = useState(false);
  const [summaryTab, setSummaryTab] = useState("ai-generate");
  const [aiSummaryContent, setAiSummaryContent] = useState("");
  const [manualSummaryContent, setManualSummaryContent] = useState("");
  const [pasteSummaryContent, setPasteSummaryContent] = useState("");
  const [summaryLastUpdated, setSummaryLastUpdated] = useState<string | null>(
    null
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [previousSubmissionId, setPreviousSubmissionId] = useState<
    string | null
  >(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [newMetric, setNewMetric] = useState({
    metricName: "",
    subjectValue: "",
    predicateValue: "",
    sampleVolume: "",
    testType: "",
  });
  const [newPredicate, setNewPredicate] = useState({
    deviceName: "",
    kNumber: "",
    manufacturer: "",
    clearanceDate: "",
    indication: "",
    classification: "",
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetric[]
  >([]);
  const [predicateDevices, setPredicateDevices] = useState<PredicateDevice[]>(
    []
  );

  // Memoized API base URL
  const API_BASE_URL = "http://localhost:8000";

  // Debounce function for API calls
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Memoized fetch function to load summary, metrics, and predicates
  const fetchSummaryContent = useCallback(
    debounce(async (submissionId: string) => {
      if (fetchAttempted) return;
      setIsLoadingSummary(true);
      setFetchAttempted(true);
      try {
        console.log(
          `Fetching submission data for submission.id: ${submissionId}`
        );
        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${submissionId}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch submission: ${response.status} - ${response.statusText}`
          );
        }
        const data = await response.json();
        console.log("Fetched submission data:", data);

        const substantialEquivalenceSection = data.sections?.find(
          (section: any) => section.id === "B"
        );
        const summarySubsection =
          substantialEquivalenceSection?.subsections?.find(
            (subsection: any) => subsection.id === "B2"
          );

        if (summarySubsection?.contentExtracted) {
          setAiSummaryContent(summarySubsection.contentExtracted);
          setSummaryLastUpdated(
            `Last loaded from database on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
          );
          console.log(
            "Loaded contentExtracted from database:",
            summarySubsection.contentExtracted
          );
        } else {
          console.warn("No contentExtracted found for subsection B2");
          setAiSummaryContent("");
          setSummaryLastUpdated(null);
          toast.error(
            "No summary content found in database for this submission"
          );
        }

        if (summarySubsection?.performanceMetrics) {
          setPerformanceMetrics(summarySubsection.performanceMetrics);
          console.log(
            "Loaded performanceMetrics from database:",
            summarySubsection.performanceMetrics
          );
        } else {
          console.warn("No performanceMetrics found for subsection B2");
          setPerformanceMetrics([]);
        }

        if (summarySubsection?.predicateDevices) {
          setPredicateDevices(summarySubsection.predicateDevices);
          console.log(
            "Loaded predicateDevices from database:",
            summarySubsection.predicateDevices
          );
        } else {
          console.warn("No predicateDevices found for subsection B2");
          setPredicateDevices([]);
        }
      } catch (error: unknown) {
        console.error("Error fetching submission data from database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.includes("404")) {
          toast.error(
            "Submission not found in database. Please ensure the submission ID is correct."
          );
        } else {
          toast.error(
            `Failed to load summary and metrics: ${errorMessage}. Please check if the backend server is running.`
          );
        }
        setAiSummaryContent("");
        setPerformanceMetrics([]);
        setPredicateDevices([]);
        setSummaryLastUpdated(null);
      } finally {
        setIsLoadingSummary(false);
      }
    }, 500),
    [fetchAttempted]
  );

  // Memoized save function for performance metrics
  const savePerformanceMetricsToDatabase = useCallback(
    debounce(async (submissionId: string, metrics: PerformanceMetric[]) => {
      try {
        console.log(
          "Saving performance metrics to database for submission:",
          submissionId,
          metrics
        );
        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${submissionId}/sections/B`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subsectionId: "B2",
              performanceMetrics: metrics,
              status: "in_progress",
              last_updated: new Date().toISOString(),
            }),
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to save performance metrics: ${response.status} - ${response.statusText}`
          );
        }
        console.log(
          "Successfully saved performance metrics to database:",
          metrics
        );
        toast.success("Performance metrics saved to database");
      } catch (error: unknown) {
        console.error("Error saving performance metrics to database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to save performance metrics: ${errorMessage}`);
      }
    }, 500),
    []
  );

  // Save function for predicate devices
  const savePredicateDevicesToDatabase = useCallback(
    debounce(async (submissionId: string, predicates: PredicateDevice[]) => {
      try {
        console.log(
          "Saving predicate devices to database for submission:",
          submissionId,
          predicates
        );
        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${submissionId}/sections/B`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subsectionId: "B2",
              predicateDevices: predicates,
              status: "in_progress",
              last_updated: new Date().toISOString(),
            }),
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to save predicate devices: ${response.status} - ${response.statusText}`
          );
        }
        console.log(
          "Successfully saved predicate devices to database:",
          predicates
        );
        toast.success("Predicate devices saved to database");
      } catch (error: unknown) {
        console.error("Error saving predicate devices to database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to save predicate devices: ${errorMessage}`);
      }
    }, 500),
    []
  );

  // Memoize submission to prevent unnecessary useEffect triggers
  const memoizedSubmission = useMemo(() => submission, [submission?.id]);

  // Load submission data
  useEffect(() => {
    console.log(
      "useEffect for submission change triggered with submission.id:",
      memoizedSubmission?.id
    );

    if (!memoizedSubmission?.id) {
      console.warn("No submission ID provided, resetting states");
      setAiSummaryContent("");
      setManualSummaryContent("");
      setPasteSummaryContent("");
      setPerformanceMetrics([]);
      setPredicateDevices([]);
      setSummaryLastUpdated(null);
      setPreviousSubmissionId(null);
      setFetchAttempted(false);
      return;
    }

    if (memoizedSubmission.id !== previousSubmissionId) {
      console.log(
        "Submission ID changed from",
        previousSubmissionId,
        "to",
        memoizedSubmission.id
      );
      setPreviousSubmissionId(memoizedSubmission.id);
      setFetchAttempted(false);

      // Reset states
      setAiSummaryContent("");
      setManualSummaryContent("");
      setPasteSummaryContent("");
      setPerformanceMetrics([]);
      setPredicateDevices([]);
      setSummaryLastUpdated(null);

      // Fetch summary, metrics, and predicates
      fetchSummaryContent(memoizedSubmission.id);
    }
  }, [memoizedSubmission?.id, previousSubmissionId, fetchSummaryContent]);

  // Save performance metrics to database when they change
  useEffect(() => {
    if (memoizedSubmission?.id && performanceMetrics.length > 0) {
      savePerformanceMetricsToDatabase(
        memoizedSubmission.id,
        performanceMetrics
      );
    }
  }, [
    performanceMetrics,
    memoizedSubmission?.id,
    savePerformanceMetricsToDatabase,
  ]);

  // Save predicate devices to database when they change
  useEffect(() => {
    if (memoizedSubmission?.id && predicateDevices.length > 0) {
      savePredicateDevicesToDatabase(memoizedSubmission.id, predicateDevices);
    }
  }, [
    predicateDevices,
    memoizedSubmission?.id,
    savePredicateDevicesToDatabase,
  ]);

  // Fetch predicate suggestions for product code lookup
  const fetchPredicateSuggestions = async () => {
    if (!memoizedSubmission?.product_code) {
      console.warn("Submission product code is missing");
      toast.error("Submission product code is missing");
      return;
    }
    try {
      console.log(
        "Fetching predicate suggestions for product_code:",
        memoizedSubmission.product_code
      );
      const response = await fetch(`${API_BASE_URL}/api/ai/predicate-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_code: memoizedSubmission.product_code }),
      });
      if (!response.ok)
        throw new Error(
          `Failed to fetch predicate suggestions: ${response.statusText}`
        );
      const { devices } = await response.json();
      const newPredicates = devices.map((device: any) => ({
        id: Date.now().toString() + Math.random(),
        deviceName: device.name,
        kNumber: device.k_number,
        manufacturer: device.manufacturer,
        clearanceDate: device.clearance_date,
        indication: device.intended_use || "Not specified",
        classification: "Class II",
        comparison: "Same",
        productCode: memoizedSubmission.product_code,
        intendedUse: device.intended_use,
        comparisonDetails: {
          intendedUse: "Same",
          design: "Same",
          technology: "Same",
          safetyEffectiveness: "Same",
        },
      }));
      setPredicateDevices(newPredicates);
      savePredicateDevicesToDatabase(memoizedSubmission.id, newPredicates);
      console.log("Predicate suggestions loaded:", devices);
      toast.success("Predicate devices loaded successfully");
    } catch (error: unknown) {
      console.error("Error fetching predicate suggestions:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load predicate suggestions: ${errorMessage}`);
    }
    setShowPredicateChoiceModal(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setAiSummaryContent("");
      setManualSummaryContent("");
      setPasteSummaryContent("");
      setPerformanceMetrics([]);
      setPredicateDevices([]);
      setSummaryLastUpdated(null);
      setPreviousSubmissionId(null);
      setFetchAttempted(false);
    };
  }, []);

  const handleViewPredicateDetails = (predicate: PredicateDevice) => {
    setSelectedPredicate(predicate);
    setShowPredicateDetailModal(true);
  };

  const handleAddMetric = () => {
    if (
      newMetric.metricName &&
      newMetric.subjectValue &&
      newMetric.predicateValue
    ) {
      const difference = calculateDifference(
        newMetric.subjectValue,
        newMetric.predicateValue
      );
      const evaluation = determineEvaluation(difference);

      const metric: PerformanceMetric = {
        id: Date.now().toString(),
        metricName: newMetric.metricName,
        subjectValue: newMetric.subjectValue,
        predicateValue: newMetric.predicateValue,
        difference,
        evaluation,
        confidence: "Medium",
        sampleVolume: newMetric.sampleVolume,
        testType: newMetric.testType,
      };

      setPerformanceMetrics([...performanceMetrics, metric]);
      setNewMetric({
        metricName: "",
        subjectValue: "",
        predicateValue: "",
        sampleVolume: "",
        testType: "",
      });
      setShowAddMetricModal(false);
      toast.success("Performance metric added successfully");
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleAddPredicate = () => {
    if (
      newPredicate.deviceName &&
      newPredicate.kNumber &&
      newPredicate.manufacturer
    ) {
      const predicate: PredicateDevice = {
        id: Date.now().toString(),
        deviceName: newPredicate.deviceName,
        kNumber: newPredicate.kNumber,
        manufacturer: newPredicate.manufacturer,
        clearanceDate: newPredicate.clearanceDate,
        indication: newPredicate.indication,
        classification: newPredicate.classification || "Class II",
        comparison: "Same",
        productCode: memoizedSubmission?.product_code || "TBD",
        intendedUse:
          newPredicate.indication ||
          "To be determined based on device analysis",
        comparisonDetails: {
          intendedUse: "Same",
          design: "Same",
          technology: "Same",
          safetyEffectiveness: "Same",
        },
      };

      setPredicateDevices([...predicateDevices, predicate]);
      setNewPredicate({
        deviceName: "",
        kNumber: "",
        manufacturer: "",
        clearanceDate: "",
        indication: "",
        classification: "",
      });
      setShowAddPredicateModal(false);
      setShowPredicateChoiceModal(false);
      toast.success("Predicate device added successfully");
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const calculateDifference = (subject: string, predicate: string): string => {
    const subjectNum = Number.parseFloat(subject.replace(/[^\d.-]/g, ""));
    const predicateNum = Number.parseFloat(predicate.replace(/[^\d.-]/g, ""));
    if (!isNaN(subjectNum) && !isNaN(predicateNum)) {
      const diff = subjectNum - predicateNum;
      const sign = diff >= 0 ? "+" : "";
      return `${sign}${diff.toFixed(1)}${
        subject.includes("%")
          ? "%"
          : subject.includes("μL")
          ? " μL"
          : subject.includes("copies/mL")
          ? " copies/mL"
          : ""
      }`;
    }
    return "N/A";
  };

  const determineEvaluation = (difference: string): string => {
    const num = Number.parseFloat(difference.replace(/[^\d.-]/g, ""));
    if (Math.abs(num) < 0.5) return "Match";
    if (Math.abs(num) < 2.0) return "Minor Diff";
    return "Major Diff";
  };

  const handleEditPredicate = (
    id: string,
    field: keyof PredicateDevice,
    value: string
  ) => {
    setPredicateDevices((devices) =>
      devices.map((device) =>
        device.id === id ? { ...device, [field]: value } : device
      )
    );
  };

  const handleJustifyMetric = (metric: PerformanceMetric) => {
    setSelectedMetric(metric);
    setJustificationText(metric.justification || "");
    setAutoSaved(false);
    setShowJustificationModal(true);
  };

  const handleSaveJustification = () => {
    if (selectedMetric && justificationText.trim().split(" ").length >= 20) {
      setPerformanceMetrics((metrics) =>
        metrics.map((metric) =>
          metric.id === selectedMetric.id
            ? { ...metric, justification: justificationText }
            : metric
        )
      );
      setShowJustificationModal(false);
      setSelectedMetric(null);
      setJustificationText("");
      toast.success("Justification saved successfully");
    } else {
      toast.error("Justification must be at least 20 words");
    }
  };

  const getGuidanceSuggestion = (metricName: string): string => {
    const suggestions: Record<string, string> = {
      Sensitivity:
        "Reference FDA Guidance on Clinical Performance Studies. Justify any differences >5% with clinical significance data.",
      Specificity:
        "Cite 21 CFR 820.30 for design controls. Document statistical significance of performance differences.",
      Precision:
        "Reference CLSI EP05-A3 guidelines. Lower CV% indicates superior precision - highlight this advantage.",
      "Sample Volume":
        "Reduced sample volume improves patient comfort and reduces collection errors. Cite clinical benefits.",
      LoD: "Reference CLSI EP17-A2 for limit of detection validation. Lower LoD indicates superior analytical sensitivity.",
      default:
        "Reference relevant FDA guidance documents and provide clinical justification for performance differences.",
    };
    return suggestions[metricName] || suggestions.default;
  };

  const handleJustificationChange = (value: string) => {
    setJustificationText(value);
    setAutoSaved(false);
    setTimeout(() => {
      if (value.trim()) setAutoSaved(true);
    }, 2000);
  };

  const handleAiSummaryChange = async (value: string) => {
    setAiSummaryContent(value);
    setSummaryLastUpdated(
      `Last updated by user on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
    );
    if (memoizedSubmission?.id) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${memoizedSubmission.id}/sections/B`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subsectionId: "B2",
              content: value,
              status: "in_progress",
              last_updated: new Date().toISOString(),
            }),
          }
        );
        if (!response.ok)
          throw new Error(`Failed to update summary: ${response.statusText}`);
        console.log("Updated AI summary content in database:", value);
        toast.success("Summary saved to database");
      } catch (error) {
        console.error("Error updating AI summary content in database:", error);
        toast.error("Failed to save AI summary to database");
      }
    }
  };

  const handleManualSummaryChange = (value: string) => {
    setManualSummaryContent(value);
  };

  const handlePasteSummaryChange = (value: string) => {
    setPasteSummaryContent(value);
  };

  const handleGenerateAI = async () => {
    console.log("handleGenerateAI triggered at", new Date().toISOString());
    console.log("Submission:", memoizedSubmission);
    console.log("Predicate Devices:", predicateDevices);
    console.log("Performance Metrics:", performanceMetrics);

    if (!memoizedSubmission?.id) {
      console.warn("Submission ID is missing");
      toast.error("Cannot generate summary: Submission ID is missing");
      return;
    }

    if (predicateDevices.length === 0) {
      console.warn("No predicate devices added");
      toast.error(
        "Please add at least one predicate device before generating the summary"
      );
      return;
    }

    if (performanceMetrics.length === 0) {
      console.warn("No performance metrics added");
      toast.error(
        "Please add at least one performance metric before generating the summary"
      );
      return;
    }

    if (isGenerating) {
      console.warn("Generation already in progress");
      toast.error("Generation already in progress. Please wait.");
      return;
    }

    setIsGenerating(true);
    console.log("Setting isGenerating to true");

    try {
      const payload = {
        subject_device: {
          name: memoizedSubmission.device_name || "Unknown Device",
          intended_use: memoizedSubmission.intended_use || "Not specified",
          technology: memoizedSubmission.device_class || "Not specified",
          indications: memoizedSubmission.intended_use || "Not specified",
        },
        predicates: predicateDevices.map((p) => ({
          name: p.deviceName,
          k_number: p.kNumber,
          manufacturer: p.manufacturer,
          clearance_date: p.clearanceDate,
          intended_use: p.intendedUse || p.indication,
          technology: p.comparisonDetails?.technology || "Not specified",
          comparison: {
            intended_use: p.comparisonDetails?.intendedUse || "Same",
            technology: p.comparisonDetails?.technology || "Same",
            design: p.comparisonDetails?.design || "Same",
            safety: p.comparisonDetails?.safetyEffectiveness || "Same",
          },
        })),
        performance_summary: {
          tests: performanceMetrics.map((m) => m.metricName),
          outcome: performanceMetrics.every((m) => m.evaluation === "Match")
            ? "Subject met or exceeded predicate performance"
            : "Subject has differences in performance metrics",
        },
      };

      console.log("Sending AI generation request with payload:", payload);
      const response = await fetch(
        `${API_BASE_URL}/api/ai/generate-substantial-equivalence?submission_id=${memoizedSubmission.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      console.log("AI generation response status:", response.status);
      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("AI generation response data:", data);

      if (!data.generated_summary) {
        throw new Error("No generated summary returned from API");
      }

      setAiSummaryContent(data.generated_summary);
      setSummaryLastUpdated(
        `Last generated by AI on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
      );

      try {
        const updateResponse = await fetch(
          `${API_BASE_URL}/api/submissions/${memoizedSubmission.id}/sections/B`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subsectionId: "B2",
              content: data.generated_summary,
              status: "in_progress",
              last_updated: new Date().toISOString(),
            }),
          }
        );
        if (!updateResponse.ok)
          throw new Error(
            `Failed to save summary to database: ${updateResponse.statusText}`
          );
        console.log(
          "Saved generated AI summary to database:",
          data.generated_summary
        );
        toast.success("AI summary generated and saved successfully");
      } catch (error) {
        console.error("Error saving generated AI summary to database:", error);
        toast.error("Failed to save generated AI summary to database");
      }
    } catch (error: unknown) {
      console.error("Error in handleGenerateAI:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to generate summary: ${errorMessage}`);
    } finally {
      console.log("Setting isGenerating to false");
      setIsGenerating(false);
    }
  };

  const getComparisonChip = (comparison: string) => {
    switch (comparison) {
      case "Same":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            Same
          </Badge>
        );
      case "Minor Change":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            ⚠️ Minor Change
          </Badge>
        );
      case "Major Difference":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            ❌ Major Difference
          </Badge>
        );
      default:
        return <Badge variant="outline">{comparison}</Badge>;
    }
  };

  const getEvaluationChip = (evaluation: string) => {
    switch (evaluation) {
      case "Match":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            Match
          </Badge>
        );
      case "Minor Diff":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            ⚠️ Minor Diff
          </Badge>
        );
      case "Major Diff":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            ❌ Major Diff
          </Badge>
        );
      default:
        return <Badge variant="outline">{evaluation}</Badge>;
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedMetrics = [...performanceMetrics].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key as keyof PerformanceMetric] as string;
    const bValue = b[sortConfig.key as keyof PerformanceMetric] as string;
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const wordCount = justificationText
    .trim()
    .split(" ")
    .filter((word) => word.length > 0).length;
  const isValidWordCount = wordCount >= 20;

  if (!memoizedSubmission) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>
          No submission data available. Please select a submission to view its
          substantial equivalence details.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("ai-generate");
  const [showReviewModal, setShowReviewModal] = useState(false);

  const calculateProgress = () => {
    const sectionB = submission?.sections?.find(
      (section) => section.id === "B"
    );
    const completedSubsections =
      sectionB?.subsections?.filter((sub) => sub.status === "complete")
        .length || 0;
    const totalSubsections = sectionB?.subsections?.length || 1;
    return Math.round((completedSubsections / totalSubsections) * 100);
  };

  const getDocumentStatusCounts = () => {
    const sectionB = submission?.sections?.find(
      (section) => section.id === "B"
    );
    const uploaded =
      sectionB?.subsections?.filter((sub) => sub.file).length || 0;
    const total = sectionB?.subsections?.length || 1;
    return { uploaded, total };
  };

  const calculateRTAProgress = () => {
    const sectionB = submission?.sections?.find(
      (section) => section.id === "B"
    );
    const passedChecks =
      sectionB?.subsections?.filter(
        (sub) =>
          sub.status === "complete" &&
          sub.performanceMetrics?.every((m) => m.evaluation === "Match")
      ).length || 0;
    const totalChecks = sectionB?.subsections?.length || 1;
    return Math.round((passedChecks / totalChecks) * 100);
  };

  const rtaResults =
    submission?.sections
      ?.find((section) => section.id === "B")
      ?.subsections?.find((sub) => sub.id === "B2")?.rtaResults || null;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <StatusCards
          authoringProgress={calculateProgress()}
          fieldsCompleted={{
            completed:
              submission?.sections
                ?.find((section) => section.id === "B")
                ?.subsections?.filter((sub) => sub.status === "complete")
                .length || 0,
            total:
              submission?.sections?.find((section) => section.id === "B")
                ?.subsections?.length || 1,
          }}
          documentsUploaded={getDocumentStatusCounts()}
          fdaReadiness={
            rtaResults ? rtaResults.readinessPercent : calculateRTAProgress()
          }
          setShowDocumentsModal={setActiveTab.bind(null, "documents")}
          setShowRTASectionModal={setShowReviewModal}
        />

        <FDAExpectations
          title="What the FDA Expects in this Section"
          description="The FDA expects detailed documentation including device description, intended use, performance data, and compliance with 510(k) requirements. Ensure all subsections are complete and validated."
          checklistItems={[
            {
              text: "A clear Executive Summary that outlines device purpose and substantial equivalence",
            },
            {
              text: "A defined Indications for Use statement that matches your intended patient population",
            },
            {
              text: "Technical Specifications including materials, dimensions, and operating principles",
            },
          ]}
          guidanceLinks={[
            {
              label: "FDA Guidance PDF",
              url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents#guidancesearch",
            },
            {
              label: "FDA Sample Summary",
              url: "https://www.fda.gov/media/132614/download",
            },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Substantial Equivalence Summary
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Overall assessment of substantial equivalence to predicate
                  devices
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <HelpCircle className="h-4 w-4 text-gray-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Need help writing your Substantial Equivalence Summary?</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              value={summaryTab}
              onValueChange={setSummaryTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ai-generate">AI Generate</TabsTrigger>
                <TabsTrigger value="manual-editor">Manual Editor</TabsTrigger>
                <TabsTrigger value="paste-document">
                  Paste from Document
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ai-generate" className="mt-4">
                <div className="space-y-4">
                  {memoizedSubmission?.id && isLoadingSummary ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">Loading summary content...</p>
                      <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                    </div>
                  ) : aiSummaryContent ? (
                    <Textarea
                      value={aiSummaryContent}
                      onChange={(e) => handleAiSummaryChange(e.target.value)}
                      className="min-h-[120px]"
                      placeholder="AI-generated substantial equivalence summary will appear here..."
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">
                        Click 'Generate' to create a draft based on your
                        intended use and selected predicates.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        console.log("Generate with AI button clicked");
                        handleGenerateAI();
                      }}
                      disabled={
                        predicateDevices.length === 0 ||
                        performanceMetrics.length === 0 ||
                        isGenerating
                      }
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate with AI"
                      )}
                    </Button>
                    {(predicateDevices.length === 0 ||
                      performanceMetrics.length === 0) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-gray-500">
                            <Info className="h-4 w-4 inline mr-1" />
                            Add at least one predicate device and one
                            performance metric to enable generation
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            AI generation requires predicate devices and
                            performance metrics to compare against.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="manual-editor" className="mt-4">
                <Textarea
                  value={manualSummaryContent}
                  onChange={(e) => handleManualSummaryChange(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Write your substantial equivalence summary here..."
                />
              </TabsContent>
              <TabsContent value="paste-document" className="mt-4">
                <Textarea
                  value={pasteSummaryContent}
                  onChange={(e) => handlePasteSummaryChange(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Paste your existing summary here."
                />
              </TabsContent>
            </Tabs>
            {summaryLastUpdated && aiSummaryContent && (
              <div className="flex justify-end mt-4">
                <p className="text-xs text-gray-500">{summaryLastUpdated}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Predicate Checklist
            </CardTitle>
            <p className="text-sm text-gray-600">
              FDA-cleared devices used as comparison for substantial equivalence
            </p>
          </CardHeader>
          <CardContent>
            {predicateDevices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-6">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">
                    🔍 No predicate devices added yet.
                  </p>
                  <p>
                    Click "+ Add Predicate" to start comparing against legally
                    marketed devices.
                  </p>
                </div>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => setShowPredicateChoiceModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Predicate
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Info className="h-4 w-4" />
                    <span>
                      Need help finding a predicate?{" "}
                      <button
                        className="text-blue-600 hover:text-blue-800 underline"
                        onClick={() =>
                          toast("Predicate Finder App coming soon!")
                        }
                      >
                        Try our Predicate Finder App
                      </button>{" "}
                      <span className="text-gray-400">(Coming Soon)</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Device Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        K-Number
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Manufacturer
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Clearance Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Indication
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Classification
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Comparison
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predicateDevices.map((device, index) => (
                      <tr
                        key={device.id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50 transition-colors`}
                      >
                        <td className="px-4 py-3">
                          {editingPredicate === `${device.id}-deviceName` ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={device.deviceName}
                                onChange={(e) =>
                                  handleEditPredicate(
                                    device.id,
                                    "deviceName",
                                    e.target.value
                                  )
                                }
                                className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPredicate(null)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {device.deviceName}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setEditingPredicate(`${device.id}-deviceName`)
                                }
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {device.kNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {device.manufacturer}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {device.clearanceDate}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {device.indication}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {device.classification}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getComparisonChip(device.comparison)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => handleViewPredicateDetails(device)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Performance Comparison
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Compare key performance metrics between your device and
                predicate devices
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Table
              </Button>
              <Dialog
                open={showAddMetricModal}
                onOpenChange={setShowAddMetricModal}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Performance Metric</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Metric Name
                      </label>
                      <Input
                        value={newMetric.metricName}
                        onChange={(e) =>
                          setNewMetric({
                            ...newMetric,
                            metricName: e.target.value,
                          })
                        }
                        placeholder="e.g., Sensitivity, Specificity"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Subject Device Value
                      </label>
                      <Input
                        value={newMetric.subjectValue}
                        onChange={(e) =>
                          setNewMetric({
                            ...newMetric,
                            subjectValue: e.target.value,
                          })
                        }
                        placeholder="e.g., 95.2%"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Predicate Device Value
                      </label>
                      <Input
                        value={newMetric.predicateValue}
                        onChange={(e) =>
                          setNewMetric({
                            ...newMetric,
                            predicateValue: e.target.value,
                          })
                        }
                        placeholder="e.g., 94.8%"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Sample Volume
                      </label>
                      <Input
                        value={newMetric.sampleVolume}
                        onChange={(e) =>
                          setNewMetric({
                            ...newMetric,
                            sampleVolume: e.target.value,
                          })
                        }
                        placeholder="e.g., 10 μL"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Test Type
                      </label>
                      <Input
                        value={newMetric.testType}
                        onChange={(e) =>
                          setNewMetric({
                            ...newMetric,
                            testType: e.target.value,
                          })
                        }
                        placeholder="e.g., Immunoassay"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddMetricModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMetric}
                      className="bg-blue-800 hover:bg-blue-900"
                    >
                      Add Metric
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {performanceMetrics.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-6">
                  <div className="text-lg mb-2">
                    🧪 Add performance metrics to demonstrate equivalence.
                  </div>
                  <p>
                    You can start by uploading a table or adding rows manually.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Table
                    </Button>
                    <Dialog
                      open={showAddMetricModal}
                      onOpenChange={setShowAddMetricModal}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                  <div className="mt-6 text-sm text-gray-500">
                    <p className="mb-2">
                      Below the message, display a muted sample row to indicate
                      the expected structure:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 max-w-2xl mx-auto">
                      <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-600">
                        <div>Test Name</div>
                        <div>Sample Volume</div>
                        <div>Test Type</div>
                        <div>Predicate Value</div>
                        <div>Subject Value</div>
                        <div>Comparison</div>
                      </div>
                      <div className="grid grid-cols-6 gap-2 text-xs text-gray-500 mt-1">
                        <div>LoD</div>
                        <div>200 µL</div>
                        <div>RT-PCR</div>
                        <div>2.0 copies/mL</div>
                        <div>1.8 copies/mL</div>
                        <div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            <Check className="h-2 w-2 mr-1" />
                            Match
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Performance Metric
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Subject Device
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Predicate Device
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Difference
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Comparison
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Confidence
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("sampleVolume")}
                      >
                        <div className="flex items-center gap-1">
                          Sample Volume
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("testType")}
                      >
                        <div className="flex items-center gap-1">
                          Test Type
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedMetrics.map((metric, index) => (
                      <tr
                        key={metric.id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50 transition-colors`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {metric.metricName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.subjectValue}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.predicateValue}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.difference}
                        </td>
                        <td className="px-4 py-3">
                          {getEvaluationChip(metric.evaluation)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              metric.confidence === "High"
                                ? "border-green-300 text-green-700"
                                : metric.confidence === "Medium"
                                ? "border-yellow-300 text-yellow-700"
                                : "border-red-300 text-red-700"
                            }
                          >
                            {metric.confidence}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.sampleVolume}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {metric.testType}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJustifyMetric(metric)}
                            className="text-xs"
                          >
                            Justify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predicate Choice Modal */}
        <Dialog
          open={showPredicateChoiceModal}
          onOpenChange={setShowPredicateChoiceModal}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Predicate Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Would you like to add a predicate device manually or look up
                predicates using the product code{" "}
                <strong>{memoizedSubmission?.product_code || "N/A"}</strong>?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setShowAddPredicateModal(true);
                    setShowPredicateChoiceModal(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Manually
                </Button>
                <Button
                  onClick={fetchPredicateSuggestions}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!memoizedSubmission?.product_code}
                >
                  Lookup by Product Code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Predicate Modal */}
        <Dialog
          open={showAddPredicateModal}
          onOpenChange={setShowAddPredicateModal}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Predicate Device</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Device Name
                </label>
                <Input
                  value={newPredicate.deviceName}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      deviceName: e.target.value,
                    })
                  }
                  placeholder="e.g., handLITE (TN19S)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  K-Number
                </label>
                <Input
                  value={newPredicate.kNumber}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      kNumber: e.target.value,
                    })
                  }
                  placeholder="e.g., K250224"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Manufacturer
                </label>
                <Input
                  value={newPredicate.manufacturer}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      manufacturer: e.target.value,
                    })
                  }
                  placeholder="e.g., Unknown Manufacturer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Clearance Date
                </label>
                <Input
                  type="date"
                  value={newPredicate.clearanceDate}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      clearanceDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Indication
                </label>
                <Input
                  value={newPredicate.indication}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      indication: e.target.value,
                    })
                  }
                  placeholder="e.g., Pulse oximetry"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Classification
                </label>
                <Input
                  value={newPredicate.classification}
                  onChange={(e) =>
                    setNewPredicate({
                      ...newPredicate,
                      classification: e.target.value,
                    })
                  }
                  placeholder="e.g., Class II"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddPredicateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPredicate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Predicate
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showPredicateDetailModal}
          onOpenChange={setShowPredicateDetailModal}
        >
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Predicate Device Details
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPredicateDetailModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            {selectedPredicate && (
              <ScrollArea className="max-h-[calc(90vh-120px)]">
                <div className="space-y-6 pr-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Predicate Summary Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Device Name
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.deviceName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          K-Number
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.kNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Manufacturer
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.manufacturer}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Clearance Date
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.clearanceDate}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Product Code
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.productCode || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Classification
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.classification}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          Intended Use
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedPredicate.intendedUse ||
                            selectedPredicate.indication}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Substantial Equivalence Comparison
                    </h3>
                    {selectedPredicate.comparisonDetails && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">
                            Intended Use
                          </span>
                          {getComparisonChip(
                            selectedPredicate.comparisonDetails.intendedUse
                          )}
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">
                            Design
                          </span>
                          <div className="flex items-center gap-2">
                            {getComparisonChip(
                              selectedPredicate.comparisonDetails.design
                            )}
                            {selectedPredicate.comparisonDetails.designNote && (
                              <span className="text-xs text-gray-500">
                                (
                                {selectedPredicate.comparisonDetails.designNote}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">
                            Technology
                          </span>
                          {getComparisonChip(
                            selectedPredicate.comparisonDetails.technology
                          )}
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-700">
                            Safety & Effectiveness
                          </span>
                          {getComparisonChip(
                            selectedPredicate.comparisonDetails
                              .safetyEffectiveness
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Linked Files / References
                    </h3>
                    {selectedPredicate.linkedFiles &&
                    selectedPredicate.linkedFiles.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPredicate.linkedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.type} • {file.size}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No linked files available.
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={showJustificationModal}
          onOpenChange={setShowJustificationModal}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Justify Performance Metric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Metric Name
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedMetric?.metricName}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Subject Device
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedMetric?.subjectValue}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Predicate Device
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedMetric?.predicateValue}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Difference
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedMetric?.difference}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Guidance Suggestion
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedMetric
                    ? getGuidanceSuggestion(selectedMetric.metricName)
                    : "Select a metric to see guidance."}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Justification (min. 20 words)
                </label>
                <Textarea
                  value={justificationText}
                  onChange={(e) => handleJustificationChange(e.target.value)}
                  placeholder="Provide regulatory justification for this performance metric difference. Include references to FDA guidance documents, clinical significance, and statistical analysis..."
                  className="min-h-[120px] mt-1"
                />
                <div className="flex justify-between items-center mt-2">
                  <p
                    className={`text-xs ${
                      isValidWordCount ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    Word count: {wordCount}{" "}
                    {isValidWordCount ? "✓" : "(minimum 20 words)"}
                  </p>
                  {autoSaved && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Auto-saved
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowJustificationModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveJustification}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!isValidWordCount}
                >
                  Save Justification
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
