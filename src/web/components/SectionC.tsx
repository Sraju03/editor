"use client";
import { useState, useEffect } from "react";
import type React from "react";
import {
  CheckIcon,
  EyeIcon,
  DownloadIcon,
  AlertTriangleIcon,
  Plus,
  Upload,
  FileText,
  Trash2,
  Edit3,
  SettingsIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import StatusCards from "./section-navbar";

// Define interfaces to match MongoDB schema
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

interface SupportingDocument {
  id?: string;
  name: string;
  url: string;
  tag?: string;
  uploaded_at?: string;
}

interface SectionCProps {
  submission: Submission | undefined;
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

interface RTAReviewResponse {
  readinessPercent: number;
  rtaFailures: { reason: string }[];
  canMarkComplete: boolean;
}

export default function SectionC({ submission }: SectionCProps) {
  const { id } = useParams<{ id: string }>();
  const [showPreview, setShowPreview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [showDocDeleteConfirmModal, setShowDocDeleteConfirmModal] =
    useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [viewSampleData, setViewSampleData] = useState(false);
  const [showSampleBanner, setShowSampleBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("analytical");
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rtaResults, setRtaResults] = useState<RTAReviewResponse | null>(null);
  const [newTest, setNewTest] = useState({
    test_name: "",
    method: "",
    sample_type: "",
    replicates: "",
    summary_result: "",
  });
  const [showEditTestModal, setShowEditTestModal] = useState(false);
  const [testToEdit, setTestToEdit] = useState<AnalyticalTest | null>(null);
  const [editTest, setEditTest] = useState({
    test_name: "",
    method: "",
    sample_type: "",
    replicates: "",
    summary_result: "",
  });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [analyticalTests, setAnalyticalTests] = useState<AnalyticalTest[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<
    SupportingDocument[]
  >([]);

  const handleRemoveDocument = (docId: string) => {
    setDocToDelete(docId);
    setShowDocDeleteConfirmModal(true);
  };

  const confirmRemoveDocument = async () => {
    if (!docToDelete) return;
    try {
      console.log("Deleting document for id:", id, "Doc ID:", docToDelete);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/document/${docToDelete}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(
        "Response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Document not found. It may have already been deleted.");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to delete document`);
      }
      setSupportingDocuments(
        supportingDocuments.filter((doc) => doc.id !== docToDelete)
      );
      toast.success("Document deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
      console.error("Delete document error:", error);
    } finally {
      setShowDocDeleteConfirmModal(false);
      setDocToDelete(null);
    }
  };

  const sampleAnalyticalTests: AnalyticalTest[] = [
    {
      test_name: "Limit of Detection (LoD)",
      method: "qPCR Serial Dilution",
      sample_type: "Nasopharyngeal Swab",
      replicates: 20,
      summary_result:
        "LoD achieved at 125 copies/mL with 95% detection rate across all replicates",
      attachment_url: "/upload/LoD_Study_Report_v2.pdf",
      status: "complete",
    },
    {
      test_name: "Precision (Repeatability)",
      method: "Intra-assay CV Analysis",
      sample_type: "Contrived Samples",
      replicates: 40,
      summary_result:
        "CV ≤ 3.2% across all tested concentrations, meeting FDA acceptance criteria",
      attachment_url: "/upload/Precision_Analysis_Final.xlsx",
      status: "complete",
    },
    {
      test_name: "Interference Study",
      method: "Spiked Sample Analysis",
      sample_type: "Clinical Specimens",
      replicates: 15,
      summary_result:
        "No significant interference observed from common respiratory pathogens",
      status: "incomplete",
    },
  ];

  useEffect(() => {
    const fetchSectionData = async () => {
      if (!id) {
        toast.error("No submission ID provided");
        setAnalyticalTests([]);
        setSupportingDocuments([]);
        return;
      }
      setIsLoading(true);
      try {
        console.log("Fetching analytical tests for id:", id);
        const queryParams = new URLSearchParams({
          status: activeTab === "analytical" ? "complete" : "",
          sort_by: "test_name",
          sort_order: "asc",
        });
        const testsResponse: Response = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/C/analytical-tests?${queryParams}`,
          {
            headers: { "Content-Type": "application/json" },
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
        }

        console.log("Fetching supporting documents for id:", id);
        const sectionResponse: Response = await fetch(
          `http://localhost:8000/api/submissions/${id}/sections/C`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        console.log(
          "Section response status:",
          sectionResponse.status,
          "Response URL:",
          sectionResponse.url
        );
        if (!sectionResponse.ok) {
          if (sectionResponse.status === 404) {
            toast.warning(
              "Section data not found, initializing empty documents"
            );
            setSupportingDocuments([]);
          } else {
            throw new Error(
              `HTTP ${sectionResponse.status}: Failed to fetch section data`
            );
          }
        } else {
          const sectionData = await sectionResponse.json();
          const subsection = sectionData.subsections?.find(
            (s: any) => s.id === "C"
          );
          const documents: SupportingDocument[] =
            subsection?.supporting_documents || [];
          setSupportingDocuments(documents);
          console.log("Fetched supportingDocuments:", documents);
        }
      } catch (error: any) {
        toast.error(
          error.message ||
            "Failed to fetch section data. Please check if the submission exists."
        );
        console.error("Fetch section data error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!viewSampleData) {
      fetchSectionData();
    }
  }, [id, viewSampleData, activeTab]);

  const handleViewSampleData = () => {
    setViewSampleData(!viewSampleData);
    setShowSampleBanner(!viewSampleData);
  };

  const handleClearSampleData = () => {
    setViewSampleData(false);
    setShowSampleBanner(false);
  };

  const handleAddTest = async () => {
    if (
      !newTest.test_name ||
      !newTest.method ||
      !newTest.sample_type ||
      isNaN(parseInt(newTest.replicates)) ||
      parseInt(newTest.replicates) <= 0
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
      console.log("Adding test for id:", id, "Test:", test);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/add-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(test),
        }
      );
      console.log(
        "Response status:",
        response.status,
        "Response URL:",
        response.url
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(
            "Section not found. Please ensure the submission and section exist."
          );
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to add test`);
      }
      const newTestData: AnalyticalTest = await response.json();
      setAnalyticalTests([...analyticalTests, newTestData]);

      if (selectedFile) {
        await handleUploadAttachment(newTestData.id!, selectedFile);
      }

      setNewTest({
        test_name: "",
        method: "",
        sample_type: "",
        replicates: "",
        summary_result: "",
      });
      setSelectedFile(null);
      setShowAddTestModal(false);
      toast.success(
        "Test added successfully" + (selectedFile ? " with attachment" : "")
      );
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to add test. Please check if the section exists."
      );
      console.error("Add test error:", error);
    }
  };

  const handleEditTest = async () => {
    if (!testToEdit || !testToEdit.id) {
      toast.error("No test selected for editing");
      return;
    }
    if (
      !editTest.test_name ||
      !editTest.method ||
      !editTest.sample_type ||
      isNaN(parseInt(editTest.replicates)) ||
      parseInt(editTest.replicates) <= 0
    ) {
      toast.error(
        "Test Name, Method, Sample Type, and valid Replicates are required"
      );
      return;
    }
    const updatedTest: AnalyticalTest = {
      id: testToEdit.id,
      test_name: editTest.test_name,
      method: editTest.method,
      sample_type: editTest.sample_type,
      replicates: parseInt(editTest.replicates),
      summary_result: editTest.summary_result,
      status: editTest.summary_result ? "complete" : "incomplete",
    };
    try {
      console.log("Updating test for id:", id, "Test:", updatedTest);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/test/${testToEdit.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTest),
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Test not found. Please ensure the test exists.");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to update test`);
      }
      const updatedTestData: AnalyticalTest = await response.json();
      setAnalyticalTests(
        analyticalTests.map((test) =>
          test.id === testToEdit.id ? updatedTestData : test
        )
      );
      if (editSelectedFile) {
        await handleUploadAttachment(testToEdit.id, editSelectedFile);
      }
      setEditTest({
        test_name: "",
        method: "",
        sample_type: "",
        replicates: "",
        summary_result: "",
      });
      setEditSelectedFile(null);
      setShowEditTestModal(false);
      setTestToEdit(null);
      toast.success(
        "Test updated successfully" +
          (editSelectedFile ? " with attachment" : "")
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update test");
      console.error("Update test error:", error);
    }
  };

  const handleDeleteTest = (testId: string) => {
    setTestToDelete(testId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    try {
      console.log("Deleting test for id:", id, "Test ID:", testToDelete);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/test/${testToDelete}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(
        "Response status:",
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
      setAnalyticalTests(
        analyticalTests.filter((test) => test.id !== testToDelete)
      );
      toast.success("Test deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete test");
      console.error("Delete test error:", error);
    } finally {
      setShowDeleteConfirmModal(false);
      setTestToDelete(null);
    }
  };

  const handleUploadAttachment = async (
    testId: string | undefined,
    file: File
  ) => {
    if (!testId) {
      toast.error("Invalid test ID. Please select a valid test.");
      console.error("Upload attachment error: Invalid testId", testId);
      return;
    }
    if (!id) {
      toast.error("No submission ID provided");
      console.error("Upload attachment error: No submission ID");
      return;
    }
    try {
      if (
        ![
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type)
      ) {
        throw new Error("Only .pdf, .doc, or .docx files are supported");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("test_id", testId);

      console.log("Uploading attachment for test_id:", testId);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/upload-test-attachment`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: Failed to upload attachment - ${errorText}`
        );
      }
      const { attachment_url }: { attachment_url: string } =
        await response.json();
      setAnalyticalTests((prevTests) =>
        prevTests.map((test) =>
          test.id === testId
            ? {
                ...test,
                attachment_url,
                status: test.summary_result ? "complete" : "incomplete",
              }
            : test
        )
      );
      toast.success(`Attachment uploaded successfully for test ${testId}`);
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to upload attachment. Please check the file and try again."
      );
      console.error("Upload attachment error:", error);
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (!id) {
      toast.error("No submission ID provided");
      console.error("Upload document error: No submission ID");
      return;
    }
    try {
      // Validate file type
      if (
        ![
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type)
      ) {
        throw new Error("Only .pdf, .doc, or .docx files are supported");
      }
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit");
      }

      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading document:", file.name);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/upload-supporting-document`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: Failed to upload document - ${errorText}`
        );
      }

      const newDoc: SupportingDocument = await response.json();
      if (!newDoc.id) {
        throw new Error("API response missing document ID");
      }

      setSupportingDocuments((prev) => {
        const updatedDocs = [...prev, newDoc];
        console.log("Updated supportingDocuments:", updatedDocs);
        return updatedDocs;
      });
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
      console.error("Upload document error:", error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadDocument(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadDocument(e.target.files[0]);
      e.target.value = ""; // Reset input to allow re-uploading the same file
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditSelectedFile(e.target.files[0]);
    }
  };

  const getDisplayData = () => {
    if (viewSampleData) {
      return { tests: sampleAnalyticalTests, documents: supportingDocuments };
    }
    return { tests: analyticalTests, documents: supportingDocuments };
  };

  const displayData = getDisplayData();

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
    const hasLoD = displayData.tests.some(
      (test) => test.test_name.includes("LoD") && test.status === "complete"
    );
    const hasTests = displayData.tests.length > 0;
    const allTestsComplete = displayData.tests.every(
      (test) => test.status === "complete" && test.attachment_url
    );
    const completedItems = [hasLoD, hasTests, allTestsComplete].filter(
      Boolean
    ).length;
    return Math.round((completedItems / 3) * 100);
  };

  const calculateRTAProgress = () => {
    const totalTests = displayData.tests.length;
    const completedTests = displayData.tests.filter(
      (test) => test.status === "complete"
    ).length;
    return totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
  };

  const getCompletionStatus = () => {
    const hasLoD = displayData.tests.some((test) =>
      test.test_name.includes("LoD")
    );
    const hasTests = displayData.tests.length > 0;
    const allTestsComplete = displayData.tests.every(
      (test) => test.status === "complete" && test.attachment_url
    );
    if (!hasLoD) {
      return {
        status: "LoD Missing",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    }
    if (hasTests && allTestsComplete) {
      return {
        status: "Complete",
        color: "bg-green-100 text-green-800 border-green-200",
      };
    }
    return {
      status: "Incomplete",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
  };

  const canMarkComplete = () => {
    const hasLoD = displayData.tests.some((test) =>
      test.test_name.includes("LoD")
    );
    const hasTests = displayData.tests.length > 0;
    const allTestsComplete = displayData.tests.every(
      (test) => test.status === "complete" && test.attachment_url
    );
    return hasLoD && hasTests && allTestsComplete;
  };

  const getDocumentStatusCounts = () => {
    const uploaded = supportingDocuments.length;
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

  const handleRunRTASimulation = async () => {
    if (!id) {
      toast.error("No submission ID provided");
      console.error("RTA review error: No submission ID");
      return;
    }
    try {
      console.log("Running RTA simulation for submission ID:", id);
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C/rta-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tests: analyticalTests,
            documents: supportingDocuments,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to perform RTA review`
        );
      }
      const data: RTAReviewResponse = await response.json();
      setRtaResults(data);
      toast.success(`RTA Review: ${data.readinessPercent.toFixed(2)}% ready`);
      if (data.rtaFailures.length > 0) {
        toast.warning(
          `Failures: ${data.rtaFailures.map((f) => f.reason).join(", ")}`
        );
      }
      setShowReviewModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to perform RTA review");
      console.error("RTA review error:", error);
    }
  };

  const handleSaveProgress = async () => {
    try {
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/C`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analytical_tests: analyticalTests,
            supporting_documents: supportingDocuments,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to save progress`);
      }
      toast.success("Progress saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save progress");
      console.error("Save progress error:", error);
    }
  };

  const feedDataToSectionG = async () => {
    try {
      const response: Response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/G/feed-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "C",
            analytical_tests: analyticalTests,
            supporting_documents: supportingDocuments,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to feed data to Section G`
        );
      }
      toast.success("Data fed to Section G for AI summary");
    } catch (error: any) {
      toast.error(error.message || "Failed to feed data to Section G");
      console.error("Feed data error:", error);
    }
  };

  const renderRTAResults = () => {
    if (!rtaResults) {
      return (
        <p className="text-sm text-gray-600">
          No RTA review results available.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Readiness Percent
          </Label>
          <Progress value={rtaResults.readinessPercent} className="mt-2 h-2" />
          <p className="text-sm text-gray-600 mt-1">
            {rtaResults.readinessPercent.toFixed(2)}% complete
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Issues Found
          </Label>
          {rtaResults.rtaFailures.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-red-600">
              {rtaResults.rtaFailures.map((failure, index) => (
                <li key={index}>{failure.reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600">No issues found.</p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Completion Status
          </Label>
          <p
            className={`text-sm ${
              rtaResults.canMarkComplete ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {rtaResults.canMarkComplete
              ? "Ready to mark complete"
              : "Incomplete, address issues above"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-6 py-8">
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

            <StatusCards
              authoringProgress={calculateProgress()}
              fieldsCompleted={{
                completed: displayData.tests.filter(
                  (test) => test.status === "complete"
                ).length,
                total: displayData.tests.length,
              }}
              documentsUploaded={getDocumentStatusCounts()}
              fdaReadiness={
                rtaResults
                  ? rtaResults.readinessPercent
                  : calculateRTAProgress()
              }
              setShowDocumentsModal={setActiveTab.bind(null, "documents")}
              setShowRTASectionModal={setShowReviewModal}
            />

            <Card className="bg-gray-50 border-gray-200 mb-8">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  What the FDA Expects in this Section
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  The FDA expects a comprehensive Performance Testing section
                  (C) to provide detailed analytical validation data for in
                  vitro diagnostic (IVD) devices, including test results,
                  methods, and supporting documentation to demonstrate device
                  performance.
                </p>
                <ul className="list-none space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Detailed description of analytical tests, including Limit
                      of Detection (LoD), precision, and interference studies.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Test methods, sample types, and number of replicates
                      clearly specified.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Summary of test results with acceptance criteria and
                      conclusions.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Supporting documentation, such as test protocols and
                      reports, uploaded and labeled appropriately.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Compliance with FDA guidance for IVD performance testing
                      requirements.
                    </span>
                  </li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <a
                    href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents#guidancesearch"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-700 border-blue-300"
                    >
                      FDA Guidance PDF
                    </Button>
                  </a>
                  <a
                    href="https://www.fda.gov/media/82395/download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-700 border-blue-300"
                    >
                      FDA 510(k) Guidance
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Dialog open={showAddTestModal} onOpenChange={setShowAddTestModal}>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="analytical">Analytical Tests</TabsTrigger>
                  <TabsTrigger value="documents">
                    Supporting Documents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analytical" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            Analytical Performance Tests
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Core analytical validation tests required for IVD
                            device performance demonstration
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleViewSampleData}
                          >
                            {viewSampleData
                              ? "View Real Data"
                              : "View Sample Data"}
                          </Button>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Analytical Test
                            </Button>
                          </DialogTrigger>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {displayData.tests.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg mb-2">
                            📄 No analytical performance tests added yet.
                          </p>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Analytical Test
                            </Button>
                          </DialogTrigger>
                        </div>
                      ) : (
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
                                  Replicates
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                  Result Summary
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
                              {displayData.tests.map(
                                (test: AnalyticalTest, index: number) => (
                                  <tr
                                    key={test.id ?? `test-${index}`}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50"
                                    }
                                  >
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {test.test_name}
                                    </td>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer">
                                          {test.method}
                                        </td>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem>
                                          Edit Method
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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
                                        <div className="flex items-center gap-1">
                                          <FileText className="h-4 w-4 text-blue-600" />
                                          <a
                                            href={test.attachment_url}
                                            className="text-blue-600 hover:underline"
                                          >
                                            {test.attachment_url
                                              .split("/")
                                              .pop()}
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <label
                                            htmlFor={`file-upload-${
                                              test.id ?? index
                                            }`}
                                            className="cursor-pointer"
                                          >
                                            <span className="text-sm text-red-600 inline-flex items-center justify-center w-full px-3 py-1 border border-red-600 rounded-md bg-white hover:bg-red-50 cursor-default">
                                              Upload
                                            </span>
                                          </label>
                                          <Input
                                            id={`file-upload-${
                                              test.id ?? index
                                            }`}
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) =>
                                              e.target.files &&
                                              handleUploadAttachment(
                                                test.id ?? `test-${index}`,
                                                e.target.files[0]
                                              )
                                            }
                                            className="hidden"
                                            disabled={
                                              viewSampleData || !test.id
                                            }
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {getStatusBadge(test.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-blue-600 hover:text-blue-800"
                                          onClick={() => {
                                            setTestToEdit(test);
                                            setEditTest({
                                              test_name: test.test_name,
                                              method: test.method,
                                              sample_type: test.sample_type,
                                              replicates:
                                                test.replicates.toString(),
                                              summary_result:
                                                test.summary_result,
                                            });
                                            setShowEditTestModal(true);
                                          }}
                                          disabled={viewSampleData}
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() =>
                                            test.id && handleDeleteTest(test.id)
                                          }
                                          disabled={viewSampleData || !test.id}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Supporting Documents
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Upload protocol files, study reports, and other
                        supporting documentation
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            dragActive
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-900">
                              Drop files here or click to upload
                            </p>
                            <p className="text-sm text-gray-500">
                              Supports PDF, Word (.doc, .docx) files up to 10MB
                            </p>
                          </div>
                          <div className="mt-4">
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Choose File
                            </label>
                            <Input
                              id="file-upload"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleFileInput}
                              className="hidden"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-medium text-gray-900">
                              Uploaded Documents ({supportingDocuments.length})
                            </h3>
                            <p className="text-sm text-gray-600">
                              {supportingDocuments.length} documents uploaded
                            </p>
                          </div>
                          {supportingDocuments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                              <p>No documents uploaded yet</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {supportingDocuments.map(
                                (doc: SupportingDocument) => (
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
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() =>
                                            doc.id &&
                                            handleRemoveDocument(doc.id)
                                          }
                                          disabled={!doc.id}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Analytical Test</DialogTitle>
                  <DialogDescription>
                    Enter details for a new analytical performance test,
                    including test name, method, sample type, and results.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Test Name
                    </label>
                    <Select
                      value={newTest.test_name}
                      onValueChange={(value: string) =>
                        setNewTest({ ...newTest, test_name: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Limit of Detection (LoD)">
                          Limit of Detection (LoD)
                        </SelectItem>
                        <SelectItem value="Precision (Repeatability)">
                          Precision (Repeatability)
                        </SelectItem>
                        <SelectItem value="Precision (Reproducibility)">
                          Precision (Reproducibility)
                        </SelectItem>
                        <SelectItem value="Interference Study">
                          Interference Study
                        </SelectItem>
                        <SelectItem value="Carryover/Contamination">
                          Carryover/Contamination
                        </SelectItem>
                        <SelectItem value="Stability Testing">
                          Stability Testing
                        </SelectItem>
                        <SelectItem value="Linearity">Linearity</SelectItem>
                        <SelectItem value="Cross-Reactivity">
                          Cross-Reactivity
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Method
                    </label>
                    <Input
                      value={newTest.method}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewTest({ ...newTest, method: e.target.value })
                      }
                      placeholder="e.g., qPCR, RT-PCR, LAMP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Sample Type
                    </label>
                    <Select
                      value={newTest.sample_type}
                      onValueChange={(value: string) =>
                        setNewTest({ ...newTest, sample_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sample type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nasopharyngeal Swab">
                          Nasopharyngeal Swab
                        </SelectItem>
                        <SelectItem value="Oropharyngeal Swab">
                          Oropharyngeal Swab
                        </SelectItem>
                        <SelectItem value="Saliva">Saliva</SelectItem>
                        <SelectItem value="Contrived Samples">
                          Contrived Samples
                        </SelectItem>
                        <SelectItem value="Clinical Specimens">
                          Clinical Specimens
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Number of Replicates
                    </label>
                    <Input
                      value={newTest.replicates}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setNewTest({
                          ...newTest,
                          summary_result: e.target.value,
                        })
                      }
                      placeholder="Describe the test results, acceptance criteria, and conclusions..."
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Attachment
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {selectedFile
                            ? `Selected: ${selectedFile.name}`
                            : "Upload test report or protocol (.pdf, .doc, .docx)"}
                        </span>
                      </div>
                      <input
                        id="test-file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="test-file-upload"
                        className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddTestModal(false);
                      setSelectedFile(null);
                    }}
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

            <Dialog
              open={showEditTestModal}
              onOpenChange={setShowEditTestModal}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Analytical Test</DialogTitle>
                  <DialogDescription>
                    Update details for the analytical performance test.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Test Name
                    </label>
                    <Select
                      value={editTest.test_name}
                      onValueChange={(value: string) =>
                        setEditTest({ ...editTest, test_name: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Limit of Detection (LoD)">
                          Limit of Detection (LoD)
                        </SelectItem>
                        <SelectItem value="Precision (Repeatability)">
                          Precision (Repeatability)
                        </SelectItem>
                        <SelectItem value="Precision (Reproducibility)">
                          Precision (Reproducibility)
                        </SelectItem>
                        <SelectItem value="Interference Study">
                          Interference Study
                        </SelectItem>
                        <SelectItem value="Carryover/Contamination">
                          Carryover/Contamination
                        </SelectItem>
                        <SelectItem value="Stability Testing">
                          Stability Testing
                        </SelectItem>
                        <SelectItem value="Linearity">Linearity</SelectItem>
                        <SelectItem value="Cross-Reactivity">
                          Cross-Reactivity
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Method
                    </label>
                    <Input
                      value={editTest.method}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditTest({ ...editTest, method: e.target.value })
                      }
                      placeholder="e.g., qPCR, RT-PCR, LAMP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Sample Type
                    </label>
                    <Select
                      value={editTest.sample_type}
                      onValueChange={(value: string) =>
                        setEditTest({ ...editTest, sample_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sample type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nasopharyngeal Swab">
                          Nasopharyngeal Swab
                        </SelectItem>
                        <SelectItem value="Oropharyngeal Swab">
                          Oropharyngeal Swab
                        </SelectItem>
                        <SelectItem value="Saliva">Saliva</SelectItem>
                        <SelectItem value="Contrived Samples">
                          Contrived Samples
                        </SelectItem>
                        <SelectItem value="Clinical Specimens">
                          Clinical Specimens
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Number of Replicates
                    </label>
                    <Input
                      value={editTest.replicates}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditTest({ ...editTest, replicates: e.target.value })
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
                      value={editTest.summary_result}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEditTest({
                          ...editTest,
                          summary_result: e.target.value,
                        })
                      }
                      placeholder="Describe the test results, acceptance criteria, and conclusions..."
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Attachment
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {editSelectedFile
                            ? `Selected: ${editSelectedFile.name}`
                            : "Upload test report or protocol (.pdf, .doc, .docx)"}
                        </span>
                      </div>
                      <input
                        id="edit-test-file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleEditFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-test-file-upload"
                        className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditTestModal(false);
                      setEditSelectedFile(null);
                      setTestToEdit(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditTest}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Update Test
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showDeleteConfirmModal}
              onOpenChange={setShowDeleteConfirmModal}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Test Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this analytical test?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setTestToDelete(null);
                    }}
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

            <Dialog
              open={showDocDeleteConfirmModal}
              onOpenChange={setShowDocDeleteConfirmModal}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Document Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this supporting document?
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDocDeleteConfirmModal(false);
                      setDocToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmRemoveDocument}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-40">
              <div className="mx-auto max-w-7xl flex items-center justify-between">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSaveProgress}>
                    Save Progress
                  </Button>
                  <Button variant="outline" onClick={handleRunRTASimulation}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Run Simulated FDA Review
                  </Button>
                  <Button variant="outline" onClick={feedDataToSectionG}>
                    Feed Data to Section G
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

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Section C Preview</DialogTitle>
                  <DialogDescription>
                    Preview the analytical performance tests and supporting
                    documents for this section.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 space-y-6 font-serif">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Analytical Performance Testing
                    </h3>
                    {displayData.tests.length > 0 ? (
                      <div className="space-y-4">
                        {displayData.tests.map((test: AnalyticalTest) => (
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
                        No analytical performance tests provided.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Supporting Documentation
                    </h3>
                    <div className="space-y-2">
                      {supportingDocuments.length > 0 ? (
                        supportingDocuments.map((doc: SupportingDocument) => (
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

            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Simulated FDA RTA Review Results</DialogTitle>
                  <DialogDescription>
                    Results of the simulated FDA Refuse to Accept (RTA) review
                    for Section C.
                  </DialogDescription>
                </DialogHeader>
                {renderRTAResults()}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
