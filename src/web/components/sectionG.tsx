"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeftIcon,
  EyeIcon,
  SettingsIcon,
  CheckIcon,
  AlertTriangleIcon,
  DownloadIcon,
  ChevronDownIcon,
  PaperclipIcon,
  Plus,
  Upload,
  HelpCircle,
  Search,
  Info,
  FileText,
  Bot,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
// Add to imports (around line 29)
import StatusCards from "@/components/section-navbar"; // Adjust path as needed
import { FDAExpectations } from "./Fda";

// Interfaces remain unchanged
interface AnalyticalTest {
  id?: string;
  test_name: string;
  method: string;
  sample_type: string;
  replicates: number;
  summary_result: string;
  attachment_url?: string;
  status: "complete" | "incomplete";
}

interface ClinicalStudy {
  id?: string;
  study_name: string;
  population: string;
  comparator: string;
  sample_size: number;
  ppa: string;
  npa: string;
  opa: string;
  summary_result: string;
  attachment_url?: string;
  status: "complete" | "incomplete";
}

interface SupportingDocument {
  id?: string;
  name: string;
  url: string;
  tag?: string;
  uploaded_at?: string;
}

interface Submission {
  id: string;
  submission_title: string;
  submission_type: string;
  device_class: string;
  internal_deadline: string;
  product_code: string;
  regulation_number: string;
  intended_use: string;
  device_category: string;
  predicate_device_name: string;
  device_name: string;
  is_follow_up: boolean;
  previous_k: string;
  predicate_k: string;
  clinical_setting: string;
  target_specimen: string;
  target_market: string;
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
  reviewer_notes: string;
  templateId: string;
}

interface SectionGProps {
  submission?: Submission;
}

export default function SectionG({ submission }: SectionGProps) {
  const { id } = useParams<{ id: string }>();
  const [showPreview, setShowPreview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showAddStudyModal, setShowAddStudyModal] = useState(false);
  const [showDeleteTestModal, setShowDeleteTestModal] = useState(false);
  const [showDeleteStudyModal, setShowDeleteStudyModal] = useState(false);
  const [showFetchTestsModal, setShowFetchTestsModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [studyToDelete, setStudyToDelete] = useState<string | null>(null);
  const [showClinicalSection, setShowClinicalSection] = useState(
    submission?.includes_clinical_testing ?? false
  );
  const [summaryTab, setSummaryTab] = useState("ai-generate");
  const [aiSummaryContent, setAiSummaryContent] = useState("");
  const [manualSummaryContent, setManualSummaryContent] = useState("");
  const [pasteSummaryContent, setPasteSummaryContent] = useState("");
  const [summaryLastUpdated, setSummaryLastUpdated] = useState<string | null>(
    null
  );
  const [isUserEdited, setIsUserEdited] = useState(false);
  const [viewSampleData, setViewSampleData] = useState(false);
  const [showSampleBanner, setShowSampleBanner] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTest, setNewTest] = useState({
    test_name: "",
    method: "",
    sample_type: submission?.target_specimen ?? "",
    replicates: "",
    summary_result: "",
  });

  const [newStudy, setNewStudy] = useState({
    study_name: "",
    population: "",
    comparator: "",
    sample_size: "",
    ppa: "",
    npa: "",
    opa: "",
    summary_result: "",
  });

  const [analyticalTests, setAnalyticalTests] = useState<AnalyticalTest[]>([]);
  const [clinicalStudies, setClinicalStudies] = useState<ClinicalStudy[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<
    SupportingDocument[]
  >([]);

  // Sample data remains unchanged
  const sampleAnalyticalTests: AnalyticalTest[] = [
    {
      test_name: "Limit of Detection (LoD)",
      method: "qPCR Serial Dilution",
      sample_type: submission?.target_specimen ?? "Whole Blood",
      replicates: 20,
      summary_result: "LoD achieved at 1.8 copies/mL with 95% detection rate",
      attachment_url: "/upload/LoD_Study_Results.pdf",
      status: "complete",
    },
    {
      test_name: "Precision (Repeatability)",
      method: "CV Analysis",
      sample_type: submission?.target_specimen ?? "Serum",
      replicates: 40,
      summary_result: "CV ≤ 2.1% across all tested concentrations",
      attachment_url: "/upload/Precision_Analysis.xlsx",
      status: "complete",
    },
  ];

  const sampleClinicalStudies: ClinicalStudy[] =
    submission?.includes_clinical_testing
      ? [
          {
            study_name: "Multi-site Clinical Validation",
            population: "Adult diabetic patients",
            comparator: "Reference Laboratory Method",
            sample_size: 324,
            ppa: "95.2% (CI: 91.8-97.4%)",
            npa: "98.1% (CI: 95.6-99.3%)",
            opa: "96.8% (CI: 94.2-98.5%)",
            summary_result: `Clinical performance demonstrates substantial equivalence to predicate device (${
              submission?.predicate_device_name ?? "unknown"
            })`,
            attachment_url: "/upload/Clinical_Study_Report.pdf",
            status: "complete",
          },
        ]
      : [];

  const sampleSummaryContent = submission
    ? `The analytical performance testing demonstrates that the ${
        submission.device_name
      } meets all required performance specifications for a ${
        submission.device_class
      } device. Limit of detection studies achieved an LoD of 1.8 copies/mL with 95% detection rate across 20 replicates using serial dilution methodology in ${
        submission.target_specimen
      } samples. Precision testing showed excellent repeatability with coefficient of variation (CV) ≤ 2.1% across all tested concentrations in ${
        submission.target_specimen
      } samples over 40 replicates.${
        submission.includes_clinical_testing
          ? ` Clinical validation was conducted at multiple sites with 324 patient samples compared against reference laboratory methods, achieving positive percent agreement (PPA) of 95.2% (CI: 91.8-97.4%), negative percent agreement (NPA) of 98.1% (CI: 95.6-99.3%), and overall percent agreement (OPA) of 96.8% (CI: 94.2-98.5%). These results demonstrate substantial equivalence to the predicate device (${submission.predicate_device_name}) and support the safety and effectiveness of the subject device for its intended use in ${submission.clinical_setting}.`
          : ""
      }`
    : "No performance summary available.";

  const sampleSupportingDocuments: SupportingDocument[] = [
    {
      name: "Performance Testing Protocol",
      url: "/upload/Performance_Protocol.pdf",
      tag: "Protocol",
      uploaded_at: "2024-01-15",
    },
    {
      name: "Clinical Study Data",
      url: submission?.includes_clinical_testing
        ? "/upload/Clinical_Data.pdf"
        : "/upload/Non_Clinical_Summary.pdf",
      tag: "Study Report",
      uploaded_at: "2024-01-15",
    },
  ];
  // Add rtaResults after getDocumentStatusCounts (around line 627, before the return statement)

  const getDisplayData = () => {
    if (viewSampleData) {
      return {
        tests: sampleAnalyticalTests,
        studies: sampleClinicalStudies,
        summary: sampleSummaryContent,
        documents: sampleSupportingDocuments,
      };
    }
    return {
      tests: analyticalTests,
      studies: clinicalStudies,
      summary:
        summaryTab === "ai-generate"
          ? aiSummaryContent
          : summaryTab === "manual-editor"
          ? manualSummaryContent
          : pasteSummaryContent,
      documents: supportingDocuments,
    };
  };

  const displayData = getDisplayData();

  // Modified useEffect to exclude automatic fetching of analytical tests
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!id || viewSampleData) {
        if (!id) toast.error("No submission ID provided");
        setAnalyticalTests([]);
        setClinicalStudies([]);
        setSupportingDocuments([]);
        setAiSummaryContent("");
        setManualSummaryContent("");
        setPasteSummaryContent("");
        setSummaryLastUpdated(null);
        setIsUserEdited(false);
        return;
      }
      setError(null);
      try {
        // Fetch G1 subsection data (summary) for AI Generate tab
        console.log("Fetching G1 subsection data for submission ID:", id);
        const g1Response = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/G/subsections/G1?_t=${Date.now()}`,
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );
        console.log(
          "G1 response status:",
          g1Response.status,
          "Response URL:",
          g1Response.url
        );
        if (!g1Response.ok) {
          if (g1Response.status === 404) {
            toast.warning(
              "Section G1 not found, initializing empty AI summary"
            );
            setAiSummaryContent("");
            setManualSummaryContent("");
            setPasteSummaryContent("");
            setSummaryLastUpdated(null);
            setIsUserEdited(false);
          } else {
            throw new Error(
              `HTTP ${g1Response.status}: Failed to fetch G1 subsection data`
            );
          }
        } else {
          const g1Data = await g1Response.json();
          setAiSummaryContent(g1Data.contentExtracted || "");
          setManualSummaryContent("");
          setPasteSummaryContent("");
          setSummaryLastUpdated(
            g1Data.last_updated
              ? format(
                  parseISO(g1Data.last_updated),
                  "MMM dd, yyyy 'at' HH:mm",
                  { locale: enGB }
                )
              : null
          );
          setIsUserEdited(g1Data.is_user_edited || false);
        }

        // Fetch clinical studies
        console.log("Fetching clinical studies for submission ID:", id);
        const queryParams = new URLSearchParams({
          status: "complete",
          sort_by: "study_name",
          sort_order: "asc",
        });
        const clinicalStudiesResponse = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/G/clinical-studies?${queryParams}&_t=${Date.now()}`,
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );
        console.log(
          "Clinical studies response status:",
          clinicalStudiesResponse.status,
          "Response URL:",
          clinicalStudiesResponse.url
        );
        if (!clinicalStudiesResponse.ok) {
          if (clinicalStudiesResponse.status === 404) {
            toast.warning("No clinical studies found, initializing empty list");
            setClinicalStudies([]);
          } else {
            throw new Error(
              `HTTP ${clinicalStudiesResponse.status}: Failed to fetch clinical studies`
            );
          }
        } else {
          const clinicalStudiesData: ClinicalStudy[] =
            await clinicalStudiesResponse.json();
          setClinicalStudies(clinicalStudiesData || []);
          setShowClinicalSection(
            submission?.includes_clinical_testing ||
              clinicalStudiesData?.length > 0
          );
        }

        // Fetch supporting documents
        console.log("Fetching supporting documents for submission ID:", id);
        const docsResponse = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/G/supporting-documents?_t=${Date.now()}`,
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );
        console.log(
          "Supporting documents response status:",
          docsResponse.status,
          "Response URL:",
          docsResponse.url
        );
        if (!docsResponse.ok) {
          if (docsResponse.status === 404) {
            toast.warning(
              "No supporting documents found, initializing empty list"
            );
            setSupportingDocuments([]);
          } else {
            throw new Error(
              `HTTP ${docsResponse.status}: Failed to fetch supporting documents`
            );
          }
        } else {
          const docsData: SupportingDocument[] = await docsResponse.json();
          setSupportingDocuments(docsData || []);
        }
      } catch (error: any) {
        console.error("Error fetching section data:", error);
        setError(
          error.message ||
            "Failed to fetch section data. Please check if the submission exists."
        );
        toast.error(error.message || "Failed to fetch section data");
      }
    };
    fetchSectionData();
  }, [id, viewSampleData, submission?.includes_clinical_testing]);

  // New function to handle fetching analytical tests with confirmation
  const handleFetchAnalyticalTests = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    setShowFetchTestsModal(true); // Show confirmation dialog
  };

  const confirmFetchAnalyticalTests = async () => {
    setShowFetchTestsModal(false); // Close the dialog
    setError(null);
    try {
      console.log("Fetching analytical tests for submission ID:", id);
      const testQueryParams = new URLSearchParams({
        status: "complete",
        sort_by: "test_name",
        sort_order: "asc",
      });
      const testsResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/analytical-tests?${testQueryParams}&_t=${Date.now()}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );
      console.log(
        "Tests response status:",
        testsResponse.status,
        "Response URL:",
        testsResponse.url
      );
      if (!testsResponse.ok) {
        if (testsResponse.status === 404) {
          toast.warning("No analytical tests found, initializing empty list");
          setAnalyticalTests([]);
        } else {
          throw new Error(
            `HTTP ${testsResponse.status}: Failed to fetch analytical tests`
          );
        }
      } else {
        const testsData: AnalyticalTest[] = await testsResponse.json();
        setAnalyticalTests(testsData || []);
        toast.success("Analytical tests fetched successfully");
      }
    } catch (error: any) {
      console.error("Error fetching analytical tests:", error);
      setError(error.message || "Failed to fetch analytical tests");
      toast.error(error.message || "Failed to fetch analytical tests");
    }
  };

  const handleViewSampleData = () => {
    setViewSampleData(!viewSampleData);
    setShowSampleBanner(!viewSampleData);
    if (!viewSampleData) {
      setShowClinicalSection(
        submission?.includes_clinical_testing || clinicalStudies.length > 0
      );
    }
  };

  const handleClearSampleData = () => {
    setViewSampleData(false);
    setShowSampleBanner(false);
  };

  const handleAddTest = async () => {
    if (
      !id ||
      !newTest.test_name ||
      !newTest.method ||
      !newTest.sample_type ||
      isNaN(parseInt(newTest.replicates))
    ) {
      toast.error(
        "Test Name, Method, Sample Type, and valid Replicates are required"
      );
      return;
    }
    const test: AnalyticalTest = {
      test_name: newTest.test_name,
      method: newTest.method,
      sample_type: newTest.sample_type,
      replicates: parseInt(newTest.replicates),
      summary_result: newTest.summary_result,
      status: newTest.summary_result ? "complete" : "incomplete",
    };
    try {
      console.log("Adding test for submission ID:", id, "Test:", test);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/add-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(test),
        }
      );
      console.log(
        "Add test response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(
            "Section C not found. Please ensure the submission and section exist."
          );
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to add test`);
      }
      const newTestData: AnalyticalTest = await response.json();
      setAnalyticalTests([...analyticalTests, newTestData]);
      setNewTest({
        test_name: "",
        method: "",
        sample_type: submission?.target_specimen ?? "",
        replicates: "",
        summary_result: "",
      });
      setShowAddTestModal(false);
      toast.success("Test added successfully");
    } catch (error: any) {
      console.error("Error adding test:", error);
      setError(error.message || "Failed to add analytical test");
      toast.error(error.message || "Failed to add analytical test");
    }
  };

  const handleAddStudy = async () => {
    if (
      !id ||
      !newStudy.study_name ||
      !newStudy.comparator ||
      !newStudy.sample_size
    ) {
      toast.error(
        "Study Name, Comparator Method, and Sample Size are required"
      );
      return;
    }
    const study: ClinicalStudy = {
      study_name: newStudy.study_name,
      population: newStudy.population,
      comparator: newStudy.comparator,
      sample_size: parseInt(newStudy.sample_size),
      ppa: newStudy.ppa,
      npa: newStudy.npa,
      opa: newStudy.opa,
      summary_result: newStudy.summary_result,
      status: newStudy.summary_result ? "complete" : "incomplete",
    };
    try {
      console.log("Adding study for submission ID:", id, "Study:", study);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G/add-study`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(study),
        }
      );
      console.log(
        "Add study response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(
            "Section G not found. Please ensure the submission and section exist."
          );
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to add study`);
      }
      const newStudyData: ClinicalStudy = await response.json();
      setClinicalStudies([...clinicalStudies, newStudyData]);
      setShowClinicalSection(true);
      setNewStudy({
        study_name: "",
        population: "",
        comparator: "",
        sample_size: "",
        ppa: "",
        npa: "",
        opa: "",
        summary_result: "",
      });
      setShowAddStudyModal(false);
      toast.success("Study added successfully");
    } catch (error: any) {
      console.error("Error adding study:", error);
      setError(error.message || "Failed to add clinical study");
      toast.error(error.message || "Failed to add clinical study");
    }
  };

  const handleDeleteTest = async (testId: string) => {
    setTestToDelete(testId);
    setShowDeleteTestModal(true);
  };

  const confirmDeleteTest = async () => {
    if (!id || !testToDelete) return;
    try {
      console.log(
        "Deleting test for submission ID:",
        id,
        "Test ID:",
        testToDelete
      );
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/test/${testToDelete}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(
        "Delete test response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Test not found. It may have already been deleted.");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to delete test`);
      }
      setAnalyticalTests(analyticalTests.filter((t) => t.id !== testToDelete));
      toast.success("Test deleted successfully");
    } catch (error: any) {
      console.error("Error deleting test:", error);
      setError(error.message || "Failed to delete analytical test");
      toast.error(error.message || "Failed to delete analytical test");
    } finally {
      setShowDeleteTestModal(false);
      setTestToDelete(null);
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    setStudyToDelete(studyId);
    setShowDeleteStudyModal(true);
  };

  const confirmDeleteStudy = async () => {
    if (!id || !studyToDelete) return;
    try {
      console.log(
        "Deleting study for submission ID:",
        id,
        "Study ID:",
        studyToDelete
      );
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G/study/${studyToDelete}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(
        "Delete study response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Study not found. It may have already been deleted.");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to delete study`);
      }
      setClinicalStudies(clinicalStudies.filter((s) => s.id !== studyToDelete));
      toast.success("Study deleted successfully");
    } catch (error: any) {
      console.error("Error deleting study:", error);
      setError(error.message || "Failed to delete clinical study");
      toast.error(error.message || "Failed to delete clinical study");
    } finally {
      setShowDeleteStudyModal(false);
      setStudyToDelete(null);
    }
  };

  const isValidWordCount = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    return wordCount >= 150 && wordCount <= 300;
  };

  const handleSummaryChange = async (value: string, tab: string) => {
    const timestamp = `Last updated by ${
      submission?.contact_name || "User"
    } on ${format(new Date(), "MMM dd, yyyy 'at' HH:mm", { locale: enGB })}`;
    setSummaryLastUpdated(timestamp);
    setIsUserEdited(true);

    if (tab === "ai-generate") {
      setAiSummaryContent(value);
    } else if (tab === "manual-editor") {
      setManualSummaryContent(value);
    } else if (tab === "paste-document") {
      setPasteSummaryContent(value);
    }

    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    if (!isValidWordCount(value)) {
      toast.error("Summary must be between 150 and 300 words");
      return;
    }
    try {
      console.log("Saving summary for submission ID:", id);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId: "G1",
            content: value,
            status: "ai-draft",
            last_updated: new Date().toISOString(),
            is_user_edited: true,
          }),
        }
      );
      console.log(
        "Save summary response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error details:", errorData);
        if (response.status === 404) {
          toast.error(
            "Section G not found. Please ensure the submission exists."
          );
          throw new Error("Section G not found");
        }
        throw new Error(
          `HTTP ${response.status}: ${
            errorData.detail || "Failed to save summary"
          }`
        );
      }
      toast.success("Summary saved successfully");
    } catch (error: any) {
      console.error("Error saving summary:", error);
      setError(error.message || "Failed to save summary");
      toast.error(error.message || "Failed to save summary");
    }
  };

  const handleGenerateAI = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    if (displayData.tests.length === 0) {
      toast.error(
        "At least one analytical test is required to generate a summary"
      );
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      console.log("Generating AI summary for submission ID:", id);
      const payload = {
        submission_id: id,
        subject_device: {
          name: submission?.device_name || "Unknown Device",
          intended_use: submission?.intended_use || "Not specified",
          technology: submission?.device_category || "Not specified",
          indications: submission?.intended_use || "Not specified",
        },
        analytical_tests: analyticalTests.map((test) => ({
          test_name: test.test_name,
          method: test.method,
          sample_type: test.sample_type,
          replicates: test.replicates,
          summary_result: test.summary_result,
          attachment_url: test.attachment_url,
          status: test.status,
        })),
        clinical_studies: clinicalStudies.map((study) => ({
          study_name: study.study_name,
          population: study.population,
          comparator: study.comparator,
          sample_size: study.sample_size,
          ppa: study.ppa,
          npa: study.npa,
          opa: study.opa,
          summary_result: study.summary_result,
          attachment_url: study.attachment_url,
          status: study.status,
        })),
      };
      const response = await fetch(
        `http://localhost:8000/api/ai/generate-performance-summary?submission_id=${id}&_t=${Date.now()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify(payload),
        }
      );
      console.log(
        "Generate AI response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error details:", errorData);
        if (response.status === 404) {
          toast.error("AI generation endpoint not found");
          throw new Error("AI generation endpoint not found");
        }
        throw new Error(
          `HTTP ${response.status}: ${
            errorData.detail || "Failed to generate summary"
          }`
        );
      }
      const { generated_summary } = await response.json();
      const wordCount = generated_summary
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length;
      console.log("Generated summary word count:", wordCount);
      if (wordCount < 150 || wordCount > 300) {
        toast.error("Generated summary must be between 150 and 300 words");
        throw new Error("Generated summary must be between 150 and 300 words");
      }
      setAiSummaryContent(generated_summary);
      const timestamp = `Generated by ${
        submission?.contact_name || "User"
      } on ${format(new Date(), "MMM dd, yyyy 'at' HH:mm", { locale: enGB })}`;
      setSummaryLastUpdated(timestamp);
      setIsUserEdited(false);
      const saveResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId: "G1",
            content: generated_summary,
            status: "ai-draft",
            last_updated: new Date().toISOString(),
            is_user_edited: false,
          }),
        }
      );
      console.log(
        "Save AI summary response status:",
        saveResponse.status,
        "Response URL:",
        saveResponse.url
      );
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error("Server error details:", errorData);
        if (saveResponse.status === 404) {
          toast.error("Section G not found for saving AI summary");
          throw new Error("Section G not found");
        }
        throw new Error(
          `HTTP ${saveResponse.status}: ${
            errorData.detail || "Failed to save AI summary"
          }`
        );
      }
      toast.success("AI summary generated and saved successfully");
    } catch (error: any) {
      console.error("Error generating AI summary:", error);
      setError(error.message || "Failed to generate AI summary");
      toast.error(error.message || "Failed to generate AI summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedDataFromSectionC = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    try {
      console.log("Feeding Section C data to Section G for submission ID:", id);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G/feed-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "C",
            analytical_tests: analyticalTests,
            supporting_documents: supportingDocuments,
            clinical_studies: clinicalStudies,
          }),
        }
      );
      console.log(
        "Feed data response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Section G or Section C not found");
          throw new Error("Section G or Section C not found");
        }
        throw new Error(
          `HTTP ${response.status}: Failed to feed data to Section G`
        );
      }
      toast.success("Data fed to Section G successfully");
    } catch (error: any) {
      console.error("Error feeding data to Section G:", error);
      setError(error.message || "Failed to feed data to Section G");
      toast.error(error.message || "Failed to feed data to Section G");
    }
  };

  const handleSaveProgress = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    try {
      console.log("Saving progress for submission ID:", id);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analytical_tests: analyticalTests,
            clinicalStudies: clinicalStudies,
            supporting_documents: supportingDocuments,
            summary: {
              ai_generated_text: aiSummaryContent,
              manual_text: manualSummaryContent,
              pasted_text: pasteSummaryContent,
              last_updated: summaryLastUpdated || new Date().toISOString(),
              is_user_edited: isUserEdited,
            },
          }),
        }
      );
      console.log(
        "Save progress response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Section G not found");
          throw new Error("Section G not found");
        }
        throw new Error(`HTTP ${response.status}: Failed to save progress`);
      }
      toast.success("Progress saved successfully");
    } catch (error: any) {
      console.error("Error saving progress:", error);
      setError(error.message || "Failed to save progress");
      toast.error(error.message || "Failed to save progress");
    }
  };

  const handleRunRTASimulation = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      return;
    }
    try {
      console.log("Running RTA simulation for submission ID:", id);
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G/rta-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analytical_tests: analyticalTests,
            clinical_studies: clinicalStudies,
            supporting_documents: supportingDocuments,
            summary: displayData.summary,
          }),
        }
      );
      console.log(
        "RTA review response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Section G not found for RTA review");
          throw new Error("Section G not found");
        }
        throw new Error(
          `HTTP ${response.status}: Failed to perform RTA review`
        );
      }
      const data = await response.json();
      toast.success(`RTA Review: ${data.readinessPercent.toFixed(2)}% ready`);
      if (data.rtaFailures.length > 0) {
        toast.warning(
          `Failures: ${data.rtaFailures.map((f: any) => f.reason).join(", ")}`
        );
      }
      setShowReviewModal(true);
    } catch (error: any) {
      console.error("Error running RTA simulation:", error);
      setError(error.message || "Failed to perform RTA review");
      toast.error(error.message || "Failed to perform RTA review");
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "complete" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckIcon className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <AlertTriangleIcon className="h-3 w-3 mr-1" />
        Incomplete
      </Badge>
    );
  };

  const calculateProgress = () => {
    const hasTests = displayData.tests.length > 0;
    const hasSummary = displayData.summary.length > 50;
    const hasClinical =
      !submission?.includes_clinical_testing || displayData.studies.length > 0;
    const completedItems = [hasTests, hasSummary, hasClinical].filter(
      Boolean
    ).length;
    return Math.round((completedItems / 3) * 100);
  };

  const calculateFDAReadiness = () => {
    const hasLoD = displayData.tests.some(
      (test) => test.test_name.includes("LoD") && test.status === "complete"
    );
    const allTestsComplete = displayData.tests.every(
      (test) => test.status === "complete" && test.attachment_url
    );
    const hasSummary = displayData.summary.length > 50;
    const clinicalComplete =
      !submission?.includes_clinical_testing ||
      displayData.studies.every((study) => study.status === "complete");
    const completedItems = [
      hasLoD,
      allTestsComplete,
      hasSummary,
      clinicalComplete,
    ].filter(Boolean).length;
    return Math.round((completedItems / 4) * 100);
  };

  const getRTAStatus = () => {
    const fdaScore = calculateFDAReadiness();
    if (fdaScore >= 90)
      return {
        label: "Complete",
        color: "bg-green-100 text-green-800 border-green-200",
      };
    if (fdaScore >= 70)
      return {
        label: "Needs Review",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    return {
      label: "Missing",
      color: "bg-red-100 text-red-800 border-red-200",
    };
  };

  const canMarkComplete = () => {
    return calculateFDAReadiness() >= 90;
  };

  const getDocumentStatusCounts = () => {
    const uploaded = displayData.documents.length;
    const total =
      uploaded +
      (displayData.tests.some((test) => !test.attachment_url) ? 1 : 0);
    const hasMissing =
      displayData.tests.some((test) => !test.attachment_url) || uploaded === 0;
    return { uploaded, total, hasMissing };
  };

  const getDropdownStatusIcon = () => {
    const { uploaded, total, hasMissing } = getDocumentStatusCounts();
    if (hasMissing) {
      return <AlertTriangleIcon className="h-4 w-4 text-red-600" />;
    }
    if (uploaded === total) {
      return <CheckIcon className="h-4 w-4 text-green-600" />;
    }
    return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />;
  };

  const getDropdownTooltip = () => {
    const { uploaded, total } = getDocumentStatusCounts();
    if (uploaded === total) {
      return `${uploaded} of ${total} uploaded`;
    }
    return "Missing required docs";
  };

  const progress = calculateProgress();
  const fdaReadiness = calculateFDAReadiness();
  const rtaStatus = getRTAStatus();
  const documentsCompleted = displayData.documents.length;
  // Add rtaResults after getDocumentStatusCounts (around line 627, before the return statement)
  const rtaResults = {
    readinessPercent: calculateFDAReadiness(),
  };

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <StatusCards
          authoringProgress={calculateProgress()}
          fieldsCompleted={{
            completed: [
              displayData.tests.length > 0,
              displayData.summary.length > 50,
              !submission?.includes_clinical_testing ||
                displayData.studies.length > 0,
            ].filter(Boolean).length,
            total: 3, // Tests, summary, clinical studies (if required)
          }}
          documentsUploaded={getDocumentStatusCounts()}
          fdaReadiness={rtaResults?.readinessPercent ?? 0}
          setShowDocumentsModal={() => setShowUploadModal(true)}
          setShowRTASectionModal={() => setShowReviewModal(true)}
        />

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-50 border-red-200 mb-8 mx-auto max-w-7xl px-6">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Sample Data Banner */}
        {showSampleBanner && (
          <Alert className="bg-yellow-50 border-yellow-200 mb-8">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-800">
                  ⚠️ You are viewing sample data.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSampleData}
                className="text-yellow-800 hover:text-yellow-900"
              >
                Clear Sample Data
              </Button>
            </AlertDescription>
          </Alert>
        )}

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

        <div className="space-y-8">
          {/* Performance Summary Block */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Performance Summary
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Comprehensive summary of analytical and{" "}
                    {submission?.includes_clinical_testing ? "clinical" : ""}{" "}
                    performance results for{" "}
                    {submission?.device_name ?? "device"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isUserEdited && (
                    <Badge className="bg-purple-100 text-purple-800">
                      Manually Edited
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Need help writing your Performance Summary?</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Performance data can be pulled from Section C –
                      Performance Testing.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/submissions/${id ?? ""}/C`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
                      >
                        View Section C
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
                      onClick={handleFetchAnalyticalTests}
                    >
                      Fetch Tests from Section C
                    </Button>
                  </div>
                </div>
              </div>

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
                    {aiSummaryContent || displayData.summary ? (
                      <Textarea
                        value={aiSummaryContent}
                        onChange={(e) =>
                          handleSummaryChange(e.target.value, "ai-generate")
                        }
                        className="min-h-[120px]"
                        placeholder="AI-generated performance summary will appear here..."
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-4">
                          Click 'Generate' to create a draft based on your test
                          results.
                        </p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleGenerateAI}
                      disabled={
                        displayData.tests.length === 0 ||
                        isGenerating ||
                        viewSampleData
                      }
                    >
                      {isGenerating ? (
                        <>
                          <span className="mr-2">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="mr-2 h-4 w-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="manual-editor" className="mt-4">
                  <Textarea
                    value={manualSummaryContent}
                    onChange={(e) =>
                      handleSummaryChange(e.target.value, "manual-editor")
                    }
                    className="min-h-[120px]"
                    placeholder="Write your performance summary here..."
                  />
                </TabsContent>
                <TabsContent value="paste-document" className="mt-4">
                  <Textarea
                    value={pasteSummaryContent}
                    onChange={(e) =>
                      handleSummaryChange(e.target.value, "paste-document")
                    }
                    className="min-h-[120px]"
                    placeholder="Paste your existing summary here."
                  />
                </TabsContent>
              </Tabs>
              {(summaryLastUpdated ||
                (viewSampleData && displayData.summary)) && (
                <div className="flex justify-end mt-4">
                  <p className="text-xs text-gray-500">
                    {summaryLastUpdated ||
                      `Last updated by ${
                        submission?.contact_name ?? "User"
                      } on ${format(new Date(), "MMM dd, yyyy 'at' HH:mm", {
                        locale: enGB,
                      })}`}
                  </p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Info className="h-4 w-4" />
                  <span>
                    Need help interpreting raw data?{" "}
                    <button className="text-blue-600 hover:text-blue-800 underline cursor-not-allowed">
                      Try our Performance Summary Generator Tool
                    </button>{" "}
                    <span className="text-gray-400">(Coming Soon)</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytical Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Analytical Performance Testing
              </CardTitle>
              <p className="text-sm text-gray-600">
                Laboratory validation tests demonstrating performance
                characteristics for {submission?.device_name ?? "device"}
              </p>
            </CardHeader>
            <CardContent>
              {displayData.tests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-6">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">
                      🔍 No analytical performance data added yet.
                    </p>
                    <p>
                      Add validation tests like LoD, Precision, or Interference
                      to begin.
                    </p>
                    <p className="text-sm mt-3 text-gray-600">
                      This section reflects test data from Section C. To enter
                      or edit tests, go to{" "}
                      <Link
                        href={`/submissions/${id ?? ""}/C`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Section C – Performance Testing
                      </Link>{" "}
                      or fetch tests below.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Link href={`/submissions/${id ?? ""}/C`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Edit Section C
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={handleFetchAnalyticalTests}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Fetch Tests from Section C
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTestModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTestModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Test Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Method
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Sample Type
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            # Replicates
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Summary Result
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Attachment
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayData.tests.map((test, index) => (
                          <tr
                            key={test.id ?? `test-${index}`}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {test.test_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {test.method}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {test.sample_type}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {test.replicates}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {test.summary_result}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {test.attachment_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {test.attachment_url.split("/").pop()}
                                </Button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(test.status)}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() =>
                                  test.id && handleDeleteTest(test.id)
                                }
                                disabled={!test.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Performance Table */}
          {(showClinicalSection || displayData.studies.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Clinical Performance Testing
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Real-world clinical validation studies for{" "}
                  {submission?.device_name ?? "device"} (if applicable)
                </p>
              </CardHeader>
              <CardContent>
                {displayData.studies.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-6">
                      <div className="text-lg mb-2">
                        📊 No clinical performance data provided.
                      </div>
                      <p>
                        Include real-world study results if applicable for your
                        device.
                      </p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={() => setShowAddStudyModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Study
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowAddStudyModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Study
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Study Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Population
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Comparator
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Sample Size
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              PPA
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              NPA
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              OPA
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Summary
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              File
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {displayData.studies.map((study, index) => (
                            <tr
                              key={study.id ?? `study-${index}`}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {study.study_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.population}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.comparator}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.sample_size}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.ppa}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.npa}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.opa}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                {study.summary_result}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {study.attachment_url ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    {study.attachment_url.split("/").pop()}
                                  </Button>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(study.status)}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    study.id && handleDeleteStudy(study.id)
                                  }
                                  disabled={!study.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Show Clinical Section Button */}
          {!showClinicalSection &&
            displayData.studies.length === 0 &&
            submission?.includes_clinical_testing && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowClinicalSection(true)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clinical Performance Section
                </Button>
              </div>
            )}

          {/* Supporting Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Supporting Documents
              </CardTitle>
              <p className="text-sm text-gray-600">
                Uploaded protocols and reports from Section C
              </p>
            </CardHeader>
            <CardContent>
              {displayData.documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No supporting documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayData.documents.map((doc) => (
                    <div
                      key={doc.id ?? `doc-${doc.name}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {doc.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.tag && `${doc.tag} • `}
                            {doc.uploaded_at &&
                              `Uploaded ${format(
                                parseISO(doc.uploaded_at),
                                "MMM dd, yyyy",
                                { locale: enGB }
                              )}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-300 bg-green-50"
                        >
                          ✅ Uploaded
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sticky Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-40">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSaveProgress}>
                Save Progress
              </Button>
              <Button variant="outline" onClick={handleFeedDataFromSectionC}>
                Feed Data from Section C
              </Button>
              <Button variant="outline" onClick={handleRunRTASimulation}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Run Simulated FDA Review
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                Preview Section
              </Button>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!canMarkComplete()}
            >
              Mark Section Complete
            </Button>
          </div>
        </div>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="text-xl font-semibold">
                Section G – Performance Summary Preview
              </div>
            </DialogHeader>
            <div className="mt-6 space-y-6 font-serif">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  1. Performance Summary
                </h3>
                <p className="text-gray-800 leading-relaxed">
                  {displayData.summary || "No performance summary provided."}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  2. Analytical Performance
                </h3>
                {displayData.tests.length > 0 ? (
                  <div className="space-y-3">
                    {displayData.tests.map((test) => (
                      <div
                        key={test.id ?? test.test_name}
                        className="border-l-4 border-blue-200 pl-4"
                      >
                        <h4 className="font-medium text-gray-900">
                          {test.test_name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Method:</strong> {test.method} |{" "}
                          <strong>Sample:</strong> {test.sample_type} |{" "}
                          <strong>Replicates:</strong> {test.replicates}
                        </p>
                        <p className="text-gray-800 mt-2">
                          {test.summary_result}
                        </p>
                        {test.attachment_url && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Supporting Document:</strong>{" "}
                            <a
                              href={test.attachment_url}
                              className="hover:underline"
                            >
                              {test.attachment_url.split("/").pop()}
                            </a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No analytical performance data provided.
                  </p>
                )}
              </div>
              {displayData.studies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    3. Clinical Performance
                  </h3>
                  <div className="space-y-3">
                    {displayData.studies.map((study) => (
                      <div
                        key={study.id ?? study.study_name}
                        className="border-l-4 border-green-200 pl-4"
                      >
                        <h4 className="font-medium text-gray-900">
                          {study.study_name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Population:</strong> {study.population} |{" "}
                          <strong>Comparator:</strong> {study.comparator} |{" "}
                          <strong>Sample Size:</strong> {study.sample_size}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>PPA:</strong> {study.ppa} |{" "}
                          <strong>NPA:</strong> {study.npa} |{" "}
                          <strong>OPA:</strong> {study.opa}
                        </p>
                        <p className="text-gray-800 mt-2">
                          {study.summary_result}
                        </p>
                        {study.attachment_url && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Supporting Document:</strong>{" "}
                            <a
                              href={study.attachment_url}
                              className="hover:underline"
                            >
                              {study.attachment_url.split("/").pop()}
                            </a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  4. Supporting Documentation
                </h3>
                <div className="space-y-2">
                  {displayData.documents.length > 0 ? (
                    displayData.documents.map((doc) => (
                      <div
                        key={doc.id ?? doc.name}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>{doc.name}</span>
                        {doc.tag && (
                          <Badge variant="outline" className="text-xs">
                            {doc.tag}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">
                      No supporting documents uploaded.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
              <Button variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download as PDF
              </Button>
              <Button variant="outline">Export to eSTAR</Button>
              <Button onClick={() => setShowPreview(false)}>
                Edit Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Supporting Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {displayData.documents.map((doc) => (
                <div
                  key={doc.id ?? doc.name}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.uploaded_at && (
                      <span className="text-xs text-gray-500">
                        Uploaded:{" "}
                        {format(parseISO(doc.uploaded_at), "MMM dd, yyyy", {
                          locale: enGB,
                        })}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Test Modal */}
        <Dialog open={showAddTestModal} onOpenChange={setShowAddTestModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Analytical Test</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Test Name
                </label>
                <Input
                  value={newTest.test_name}
                  onChange={(e) =>
                    setNewTest({ ...newTest, test_name: e.target.value })
                  }
                  placeholder="e.g., Limit of Detection"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Method
                </label>
                <Input
                  value={newTest.method}
                  onChange={(e) =>
                    setNewTest({ ...newTest, method: e.target.value })
                  }
                  placeholder="e.g., Serial Dilution"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Sample Type
                </label>
                <Input
                  value={newTest.sample_type}
                  onChange={(e) =>
                    setNewTest({ ...newTest, sample_type: e.target.value })
                  }
                  placeholder="e.g., Whole Blood"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Number of Replicates
                </label>
                <Input
                  value={newTest.replicates}
                  onChange={(e) =>
                    setNewTest({ ...newTest, replicates: e.target.value })
                  }
                  placeholder="e.g., 20"
                  type="number"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Summary Result
                </label>
                <Textarea
                  value={newTest.summary_result}
                  onChange={(e) =>
                    setNewTest({ ...newTest, summary_result: e.target.value })
                  }
                  placeholder="Describe the test results and conclusions..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddTestModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTest}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Study Modal */}
        <Dialog open={showAddStudyModal} onOpenChange={setShowAddStudyModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Clinical Study</DialogTitle>
              <DialogDescription>
                Add a new clinical study for{" "}
                {submission?.device_name ?? "device"}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Study Name
                </label>
                <Input
                  value={newStudy.study_name}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, study_name: e.target.value })
                  }
                  placeholder="e.g., Multi-site Clinical Validation"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Population
                </label>
                <Input
                  value={newStudy.population}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, population: e.target.value })
                  }
                  placeholder="e.g., Adult diabetic patients"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Comparator Method
                </label>
                <Input
                  value={newStudy.comparator}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, comparator: e.target.value })
                  }
                  placeholder="e.g., Reference Laboratory Method"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Sample Size
                </label>
                <Input
                  value={newStudy.sample_size}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, sample_size: e.target.value })
                  }
                  placeholder="e.g., 324"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  PPA (%)
                </label>
                <Input
                  value={newStudy.ppa}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, ppa: e.target.value })
                  }
                  placeholder="e.g., 95.2% (CI: 91.8-97.4%)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  NPA (%)
                </label>
                <Input
                  value={newStudy.npa}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, npa: e.target.value })
                  }
                  placeholder="e.g., 98.1% (CI: 95.6-99.3%)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  OPA (%)
                </label>
                <Input
                  value={newStudy.opa}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, opa: e.target.value })
                  }
                  placeholder="e.g., 96.8% (CI: 94.2-98.5%)"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Summary Result
                </label>
                <Textarea
                  value={newStudy.summary_result}
                  onChange={(e) =>
                    setNewStudy({ ...newStudy, summary_result: e.target.value })
                  }
                  placeholder="Describe the study results and conclusions..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddStudyModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddStudy}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Study
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Test Confirmation Modal */}
        <Dialog
          open={showDeleteTestModal}
          onOpenChange={setShowDeleteTestModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete Test</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this analytical test? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteTestModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteTest}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Study Confirmation Modal */}
        <Dialog
          open={showDeleteStudyModal}
          onOpenChange={setShowDeleteStudyModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete Study</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this clinical study? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteStudyModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteStudy}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Fetch Tests Confirmation Modal */}
        <Dialog
          open={showFetchTestsModal}
          onOpenChange={setShowFetchTestsModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Fetch Analytical Tests</DialogTitle>
              <DialogDescription>
                Do you want to fetch analytical tests from Section C? This will
                overwrite any existing analytical tests in this section.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowFetchTestsModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmFetchAnalyticalTests}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fetch Tests
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Simulated FDA RTA Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Results
                </h3>
                <p className="text-sm text-gray-600">
                  FDA Readiness Score: {fdaReadiness}%
                </p>
                <Progress value={fdaReadiness} className="mt-2 h-2" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">
                  Summary Status
                </h4>
                <p className="text-sm text-gray-600">
                  {displayData.summary.length > 50
                    ? "Present"
                    : "Missing or too short"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">
                  Analytical Tests
                </h4>
                <p className="text-sm text-gray-600">
                  {displayData.tests.length} test(s) included.{" "}
                  {displayData.tests.some((test) =>
                    test.test_name.includes("LoD")
                  )
                    ? "LoD test included."
                    : "LoD test missing."}
                </p>
              </div>
              {submission?.includes_clinical_testing && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Clinical Studies
                  </h4>
                  <p className="text-sm text-gray-600">
                    {displayData.studies.length} study(ies) included.
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-700">
                  Supporting Documents
                </h4>
                <p className="text-sm text-gray-600">
                  {displayData.documents.length} document(s) uploaded.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowReviewModal(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
