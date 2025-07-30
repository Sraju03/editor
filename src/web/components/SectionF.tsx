"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import StatusCards from "@/components/section-navbar"; // Adjust path as needed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronLeft,
  Eye,
  Upload,
  FileText,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { FDAExpectations } from "./Fda";

interface UploadedFile {
  name: string;
  size: string;
  uploadDate: string;
  type: string;
}

interface LanguageOption {
  code: string;
  name: string;
  checked: boolean;
}

interface Submission {
  id: string;
  device_name: string;
  intended_use: string;
  submitter_org: string;
  contact_name: string;
  contact_email: string;
}

interface SectionFData {
  ifu: { file_url: string; uploaded_at: string } | null;
  primary_label: { file_url: string; uploaded_at: string } | null;
  device_label: { file_url: string; uploaded_at: string } | null;
  additional_files: { file_url: string; label: string }[];
  languages_supported: string[];
  labeling_claims_summary: string;
  claim_review: { ai_notes: string; last_run_at: string } | null;
  reviewer_notes: string;
}

interface SectionHProps {
  submission: Submission | undefined;
}

export default function SectionH({ submission }: SectionHProps) {
  const [viewSampleData, setViewSampleData] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSampleBanner, setShowSampleBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [recentSubsection, setRecentSubsection] = useState<
    "F1" | "F2" | "F3" | null
  >(null);

  // Upload states
  const [ifuFile, setIfuFile] = useState<UploadedFile | null>(null);
  const [primaryLabelFile, setPrimaryLabelFile] = useState<UploadedFile | null>(
    null
  );
  const [deviceLabelFile, setDeviceLabelFile] = useState<UploadedFile | null>(
    null
  );

  // Claims and metadata
  const [claimsText, setClaimsText] = useState("");
  const [reviewingClaims, setReviewingClaims] = useState(false);
  const [claimsReview, setClaimsReview] = useState("");
  const [notesToReviewer, setNotesToReviewer] = useState("");

  // Add state declarations with existing ones (around line 68)
  const [activeTab, setActiveTab] = useState("labeling-claims");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Languages
  const [languages, setLanguages] = useState<LanguageOption[]>([
    { code: "en", name: "English", checked: false },
    { code: "es", name: "Spanish", checked: false },
    { code: "fr", name: "French", checked: false },
    { code: "de", name: "German", checked: false },
    { code: "it", name: "Italian", checked: false },
    { code: "pt", name: "Portuguese", checked: false },
    { code: "ar", name: "Arabic", checked: false },
    { code: "zh", name: "Chinese (Simplified)", checked: false },
    { code: "ja", name: "Japanese", checked: false },
    { code: "ko", name: "Korean", checked: false },
    { code: "ru", name: "Russian", checked: false },
    { code: "hi", name: "Hindi", checked: false },
    { code: "th", name: "Thai", checked: false },
    { code: "vi", name: "Vietnamese", checked: false },
    { code: "nl", name: "Dutch", checked: false },
    { code: "sv", name: "Swedish", checked: false },
  ]);

  // Supporting documents (static for now)
  const supportingDocs = [
    { name: "FDA Labeling Guidance", status: "uploaded", date: "Dec 10, 2024" },
    { name: "Label Design Specifications", status: "missing", date: "—" },
    { name: "Translation Certificates", status: "missing", date: "—" },
  ];

  // Fetch initial data for Section F
  useEffect(() => {
    if (submission?.id) {
      fetchSectionData(submission.id);
    }
  }, [submission?.id]);

  const fetchSectionData = async (submissionId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/submissions/${submissionId}`
      );
      if (!response.ok) throw new Error("Failed to fetch submission data");
      const data = await response.json();
      const sectionF = data.sections?.find((s: any) => s.id === "F");
      const subsectionF2 = sectionF?.subsections?.find(
        (s: any) => s.id === "F2"
      ); // IFU
      const subsectionF1 = sectionF?.subsections?.find(
        (s: any) => s.id === "F1"
      ); // Primary label
      const subsectionF3 = sectionF?.subsections?.find(
        (s: any) => s.id === "F3"
      ); // Device label

      // Merge languages from all subsections, prioritizing F2 for non-file data
      let mergedLanguages: string[] = [];
      let sectionFData: SectionFData | null = null;

      if (subsectionF2?.section_f_data) {
        sectionFData = subsectionF2.section_f_data;
        if (sectionFData) {
          mergedLanguages = [
            ...new Set([
              ...mergedLanguages,
              ...(sectionFData.languages_supported || []),
            ]),
          ];
          setClaimsText(sectionFData.labeling_claims_summary || "");
          setClaimsReview(sectionFData.claim_review?.ai_notes || "");
          setNotesToReviewer(sectionFData.reviewer_notes || "");
        }
      }
      if (subsectionF1?.section_f_data) {
        mergedLanguages = [
          ...new Set([
            ...mergedLanguages,
            ...(subsectionF1.section_f_data.languages_supported || []),
          ]),
        ];
        if (subsectionF1.section_f_data.primary_label) {
          setPrimaryLabelFile({
            name:
              subsectionF1.section_f_data.primary_label.file_url
                .split("/")
                .pop() || "",
            size: "—",
            uploadDate: new Date(
              subsectionF1.section_f_data.primary_label.uploaded_at
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            type: subsectionF1.section_f_data.primary_label.file_url.includes(
              ".pdf"
            )
              ? "pdf"
              : "image",
          });
        }
      }
      if (subsectionF3?.section_f_data) {
        mergedLanguages = [
          ...new Set([
            ...mergedLanguages,
            ...(subsectionF3.section_f_data.languages_supported || []),
          ]),
        ];
        if (subsectionF3.section_f_data.device_label) {
          setDeviceLabelFile({
            name:
              subsectionF3.section_f_data.device_label.file_url
                .split("/")
                .pop() || "",
            size: "—",
            uploadDate: new Date(
              subsectionF3.section_f_data.device_label.uploaded_at
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            type: subsectionF3.section_f_data.device_label.file_url.includes(
              ".pdf"
            )
              ? "pdf"
              : "image",
          });
        }
      }
      if (subsectionF2?.section_f_data?.ifu) {
        setIfuFile({
          name: subsectionF2.section_f_data.ifu.file_url.split("/").pop() || "",
          size: "—",
          uploadDate: new Date(
            subsectionF2.section_f_data.ifu.uploaded_at
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          type: subsectionF2.section_f_data.ifu.file_url.includes(".pdf")
            ? "pdf"
            : "image",
        });
      }

      setLanguages((prev) =>
        prev.map((lang) => ({
          ...lang,
          checked: mergedLanguages.includes(lang.name),
        }))
      );
    } catch (error) {
      console.error("Error fetching section data:", error);
    }
  };

  // Add helper functions after state declarations (around line 117, before useEffect)
  const calculateProgress = () => {
    const completedFields = [
      !!ifuFile,
      !!primaryLabelFile || !!deviceLabelFile,
      languages.some((lang) => lang.checked),
      !!claimsText.trim(),
      !!notesToReviewer.trim(),
    ].filter(Boolean).length;
    const totalFields = 5; // IFU, label (primary or device), languages, claims, notes
    return Math.round((completedFields / totalFields) * 100);
  };

  const getDocumentStatusCounts = () => {
    const uploaded = [ifuFile, primaryLabelFile, deviceLabelFile].filter(
      Boolean
    ).length;
    const total = 3; // IFU, Primary Label, Device Label
    return { uploaded, total };
  };

  const calculateRTAProgress = () => {
    const requiredComplete = [
      !!ifuFile,
      !!primaryLabelFile || !!deviceLabelFile,
      languages.some((lang) => lang.checked),
    ].filter(Boolean).length;
    const totalRequired = 3; // IFU, label (primary or device), languages
    return Math.round((requiredComplete / totalRequired) * 100);
  };

  // Add rtaResults, assuming claim_review provides readiness data
  const rtaResults = submission?.id
    ? {
        readinessPercent: claimsReview
          ? Math.round(
              (claimsReview.split("\n").filter((line) => line.startsWith("✅"))
                .length /
                claimsReview.split("\n").filter((line) => line.trim()).length) *
                100
            ) || calculateRTAProgress()
          : calculateRTAProgress(),
      }
    : null;

  const handleViewSampleData = () => {
    if (!viewSampleData) {
      // Populate sample data
      setIfuFile({
        name: "ACME_Glucose_Monitor_IFU_v2.1.pdf",
        size: "2.4 MB",
        uploadDate: "Dec 15, 2024",
        type: "pdf",
      });
      setPrimaryLabelFile({
        name: "Primary_Package_Label_Design.png",
        size: "1.8 MB",
        uploadDate: "Dec 14, 2024",
        type: "image",
      });
      setDeviceLabelFile({
        name: "Device_Unit_Label.jpg",
        size: "892 KB",
        uploadDate: "Dec 14, 2024",
        type: "image",
      });
      setClaimsText(
        "For professional use only. Detects glucose levels in whole blood samples. Results available in 5 seconds. Clinically proven accuracy of ±15% within the reportable range."
      );
      setClaimsReview(
        "⚠️ 'Clinically proven' may be flagged by FDA unless supported by clinical data in Section G.\n✅ 'For professional use only' is appropriate for this device class.\n⚠️ Consider specifying the reportable range (e.g., 20-600 mg/dL)."
      );
      setNotesToReviewer(
        "IFU and primary label are combined in a single PDF file as requested by marketing team. Device unit label is a separate adhesive label applied during manufacturing."
      );
      setLanguages((prev) =>
        prev.map((lang) => ({
          ...lang,
          checked: ["en", "es", "fr"].includes(lang.code),
        }))
      );
      setShowSampleBanner(true);
      setRecentSubsection(null);
    } else {
      // Clear sample data and refetch actual data
      setIfuFile(null);
      setPrimaryLabelFile(null);
      setDeviceLabelFile(null);
      setClaimsText("");
      setClaimsReview("");
      setNotesToReviewer("");
      setLanguages((prev) => prev.map((lang) => ({ ...lang, checked: false })));
      setShowSampleBanner(false);
      setRecentSubsection(null);
      if (submission?.id) fetchSectionData(submission.id);
    }
    setViewSampleData(!viewSampleData);
  };

  const handleFileUpload = async (
    type: "ifu" | "primary" | "device",
    file: File
  ) => {
    if (!submission?.id) return;
    if (viewSampleData) handleViewSampleData(); // Clear sample data if uploading real file

    setIsSaving(true);
    try {
      const subsectionId = { ifu: "F2", primary: "F1", device: "F3" }[type];
      setRecentSubsection(subsectionId as "F1" | "F2" | "F3");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subsection_id", subsectionId);
      formData.append(
        "languages_supported",
        languages
          .filter((l) => l.checked)
          .map((l) => l.name)
          .join(",")
      );
      if (subsectionId === "F2") {
        formData.append("labeling_claims_summary", claimsText);
        if (claimsReview) {
          formData.append(
            "claim_review",
            JSON.stringify({
              ai_notes: claimsReview,
              last_run_at: new Date().toISOString(),
            })
          );
        }
        formData.append("reviewer_notes", notesToReviewer);
      }

      const response = await fetch(
        `http://localhost:8000/api/submissions/${submission.id}/sections/F/update`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`Failed to upload file: ${response.statusText}`);

      const data = await response.json();
      const sectionFData: SectionFData = data.section_f_data;
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadDate: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        type: file.type.includes("image") ? "image" : "pdf",
      };

      switch (type) {
        case "ifu":
          setIfuFile(uploadedFile);
          break;
        case "primary":
          setPrimaryLabelFile(uploadedFile);
          break;
        case "device":
          setDeviceLabelFile(uploadedFile);
          break;
      }

      // Update other states only for F2
      if (subsectionId === "F2") {
        setClaimsText(sectionFData.labeling_claims_summary || "");
        setClaimsReview(sectionFData.claim_review?.ai_notes || "");
        setNotesToReviewer(sectionFData.reviewer_notes || "");
      }
      setLanguages((prev) =>
        prev.map((lang) => ({
          ...lang,
          checked: sectionFData.languages_supported.includes(lang.name),
        }))
      );
      setLastSaved(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFile = async (type: "ifu" | "primary" | "device") => {
    if (!submission?.id) return;
    if (viewSampleData) handleViewSampleData(); // Clear sample data if deleting

    setIsSaving(true);
    try {
      const subsectionId = { ifu: "F2", primary: "F1", device: "F3" }[type];
      setRecentSubsection(subsectionId as "F1" | "F2" | "F3");
      const formData = new FormData();
      formData.append("subsection_id", subsectionId);
      formData.append(
        "languages_supported",
        languages
          .filter((l) => l.checked)
          .map((l) => l.name)
          .join(",")
      );
      if (subsectionId === "F2") {
        formData.append("labeling_claims_summary", claimsText);
        if (claimsReview) {
          formData.append(
            "claim_review",
            JSON.stringify({
              ai_notes: claimsReview,
              last_run_at: new Date().toISOString(),
            })
          );
        }
        formData.append("reviewer_notes", notesToReviewer);
      }

      const response = await fetch(
        `http://localhost:8000/api/submissions/${submission.id}/sections/F/update`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`Failed to delete file: ${response.statusText}`);

      const data = await response.json();
      const sectionFData: SectionFData = data.section_f_data;

      switch (type) {
        case "ifu":
          setIfuFile(null);
          break;
        case "primary":
          setPrimaryLabelFile(null);
          break;
        case "device":
          setDeviceLabelFile(null);
          break;
      }

      // Update other states only for F2
      if (subsectionId === "F2") {
        setClaimsText(sectionFData.labeling_claims_summary || "");
        setClaimsReview(sectionFData.claim_review?.ai_notes || "");
        setNotesToReviewer(sectionFData.reviewer_notes || "");
      }
      setLanguages((prev) =>
        prev.map((lang) => ({
          ...lang,
          checked: sectionFData.languages_supported.includes(lang.name),
        }))
      );
      setLastSaved(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } catch (error) {
      console.error("Error deleting file:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async (subsectionId: "F1" | "F2" | "F3" = "F2") => {
    if (!submission?.id || viewSampleData) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("subsection_id", subsectionId);
      formData.append(
        "languages_supported",
        languages
          .filter((l) => l.checked)
          .map((l) => l.name)
          .join(",")
      );
      if (subsectionId === "F2") {
        formData.append("labeling_claims_summary", claimsText);
        if (claimsReview) {
          formData.append(
            "claim_review",
            JSON.stringify({
              ai_notes: claimsReview,
              last_run_at: new Date().toISOString(),
            })
          );
        }
        formData.append("reviewer_notes", notesToReviewer);
      }

      const response = await fetch(
        `http://localhost:8000/api/submissions/${submission.id}/sections/F/update`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`Failed to save draft: ${response.statusText}`);

      const data = await response.json();
      const sectionFData: SectionFData = data.section_f_data;

      // Update states only for F2
      if (subsectionId === "F2") {
        setClaimsText(sectionFData.labeling_claims_summary || "");
        setClaimsReview(sectionFData.claim_review?.ai_notes || "");
        setNotesToReviewer(sectionFData.reviewer_notes || "");
      }
      setLanguages((prev) =>
        prev.map((lang) => ({
          ...lang,
          checked: sectionFData.languages_supported.includes(lang.name),
        }))
      );
      setLastSaved(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } catch (error) {
      console.error("Error saving draft:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunClaimReview = async () => {
    if (!claimsText.trim() || !submission?.id || viewSampleData) return;

    setReviewingClaims(true);
    try {
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const reviewResult =
        "⚠️ 'Clinically proven' may be flagged by FDA unless supported by clinical data in Section G.\n✅ 'For professional use only' is appropriate for this device class.\n⚠️ Consider specifying the reportable range (e.g., 20-600 mg/dL).\n✅ '5 seconds' result time claim is acceptable for this device type.";
      setClaimsReview(reviewResult);

      // Save to backend (always F2 for claims)
      const formData = new FormData();
      formData.append("subsection_id", "F2");
      formData.append(
        "languages_supported",
        languages
          .filter((l) => l.checked)
          .map((l) => l.name)
          .join(",")
      );
      formData.append("labeling_claims_summary", claimsText);
      formData.append(
        "claim_review",
        JSON.stringify({
          ai_notes: reviewResult,
          last_run_at: new Date().toISOString(),
        })
      );
      formData.append("reviewer_notes", notesToReviewer);

      const response = await fetch(
        `http://localhost:8000/api/submissions/${submission.id}/sections/F/update`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`Failed to save claim review: ${response.statusText}`);

      setLastSaved(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } catch (error) {
      console.error("Error running claim review:", error);
      // TODO: Show error toast/notification
    } finally {
      setReviewingClaims(false);
    }
  };

  const handleLanguageChange = async (code: string, checked: boolean) => {
    if (viewSampleData) handleViewSampleData(); // Clear sample data if changing languages
    setLanguages((prev) =>
      prev.map((lang) => (lang.code === code ? { ...lang, checked } : lang))
    );
    // Use recentSubsection if set, otherwise default to F2
    await handleSaveDraft(recentSubsection || "F2");
  };

  const handleMarkComplete = async () => {
    if (!submission?.id || !isComplete || viewSampleData) return;

    setIsSaving(true);
    try {
      // Update section status to complete (use F2 as primary subsection)
      const response = await fetch(
        `http://localhost:8000/api/submissions/${submission.id}/sections/F/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subsection_id: "F2", status: "complete" }),
        }
      );

      if (!response.ok)
        throw new Error(
          `Failed to mark section complete: ${response.statusText}`
        );

      setLastSaved(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    } catch (error) {
      console.error("Error marking section complete:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate completion status
  const hasIFU = !!ifuFile;
  const hasLabel = !!(primaryLabelFile || deviceLabelFile);
  const hasLanguages = languages.some((lang) => lang.checked);
  const isComplete = hasIFU && hasLabel && hasLanguages;
  const documentsUploaded = [ifuFile, primaryLabelFile, deviceLabelFile].filter(
    Boolean
  ).length;
  const rtaProgress = Math.round(
    (((hasIFU ? 1 : 0) + (hasLabel ? 1 : 0) + (hasLanguages ? 1 : 0)) / 3) * 100
  );

  const UploadCard = ({
    title,
    description,
    file,
    onUpload,
    onDelete,
    acceptedTypes,
    tooltip,
  }: {
    title: string;
    description: string;
    file: UploadedFile | null;
    onUpload: (file: File) => void;
    onDelete: () => void;
    acceptedTypes: string;
    tooltip?: string;
  }) => {
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) onUpload(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) onUpload(selectedFile);
    };

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {file ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>

        <CardContent>
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {file.type === "image" ? (
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                ) : (
                  <FileText className="h-8 w-8 text-red-600" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.size} • {file.uploadDate}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() =>
                document
                  .getElementById(
                    `file-${title.replace(/\s+/g, "-").toLowerCase()}`
                  )
                  ?.click()
              }
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                Drop file here or click to upload
              </p>
              <p className="text-xs text-gray-500">{acceptedTypes}</p>
              <input
                id={`file-${title.replace(/\s+/g, "-").toLowerCase()}`}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <StatusCards
          authoringProgress={calculateProgress()}
          fieldsCompleted={{
            completed: [
              ifuFile,
              primaryLabelFile || deviceLabelFile,
              languages.some((lang) => lang.checked),
              claimsText.trim(),
              notesToReviewer.trim(),
            ].filter(Boolean).length,
            total: 5,
          }}
          documentsUploaded={getDocumentStatusCounts()}
          fdaReadiness={rtaResults?.readinessPercent ?? calculateRTAProgress()}
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

        {/* Sample Data Banner */}
        {showSampleBanner && (
          <Alert className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <Info className="h-4 w-4 text-blue-500" />
            <div className="flex items-center justify-between w-full">
              <AlertDescription>
                Showing sample data to demonstrate the interface.
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSampleBanner(false);
                  handleViewSampleData();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Sample
              </Button>
            </div>
          </Alert>
        )}

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Summary Cards */}

          {/* Upload Cards */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <UploadCard
              title="Instructions for Use (IFU)"
              description="FDA requires an IFU even for simple IVDs"
              file={ifuFile}
              onUpload={(file) => handleFileUpload("ifu", file)}
              onDelete={() => handleDeleteFile("ifu")}
              acceptedTypes=".pdf"
            />
            <UploadCard
              title="Primary Packaging Label"
              description="Upload image or PDF of outer packaging"
              file={primaryLabelFile}
              onUpload={(file) => handleFileUpload("primary", file)}
              onDelete={() => handleDeleteFile("primary")}
              acceptedTypes=".pdf,.png,.jpg,.jpeg"
              tooltip="This is the outer box or pouch label"
            />
            <UploadCard
              title="Device Unit Label"
              description="Upload image or PDF of device label"
              file={deviceLabelFile}
              onUpload={(file) => handleFileUpload("device", file)}
              onDelete={() => handleDeleteFile("device")}
              acceptedTypes=".pdf,.png,.jpg,.jpeg"
            />
          </div>

          {/* Claims Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Labeling Claims Summary</CardTitle>
              <CardDescription>
                Enter key claims from your labeling for FDA review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={claimsText}
                onChange={(e) => {
                  setClaimsText(e.target.value);
                  if (!viewSampleData) handleSaveDraft("F2");
                }}
                placeholder="E.g. 'For professional use only', 'Detects XYZ virus', 'Results in 5 seconds'"
                className="min-h-[100px]"
              />
              {claimsText.trim() && (
                <Button
                  onClick={handleRunClaimReview}
                  disabled={reviewingClaims || viewSampleData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {reviewingClaims ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reviewing Claims...
                    </>
                  ) : (
                    "Run Claim Review"
                  )}
                </Button>
              )}
              {claimsReview && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    AI Review Results:
                  </h4>
                  <div className="space-y-1">
                    {claimsReview.split("\n").map((line, index) => (
                      <p key={index} className="text-sm text-gray-700">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Metadata Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Additional Metadata</CardTitle>
              <CardDescription>
                Language support and reviewer notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Languages Supported
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {languages.map((language) => (
                      <div
                        key={language.code}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={language.code}
                          checked={language.checked}
                          onCheckedChange={(checked) => {
                            handleLanguageChange(
                              language.code,
                              checked as boolean
                            );
                          }}
                          disabled={viewSampleData}
                        />
                        <label
                          htmlFor={language.code}
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          {language.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Notes to Reviewer
                  </h4>
                  <Textarea
                    value={notesToReviewer}
                    onChange={(e) => {
                      setNotesToReviewer(e.target.value);
                    }}
                    onBlur={() => {
                      if (!viewSampleData) handleSaveDraft("F2");
                    }}
                    placeholder="e.g. 'Label combined with IFU in a single PDF'"
                    className="min-h-[120px]"
                    disabled={viewSampleData}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Section Status:{" "}
                  {isComplete ? (
                    <span className="text-green-600 font-medium">
                      Complete ✅
                    </span>
                  ) : (
                    <span className="text-gray-600">Incomplete</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Last saved: {lastSaved || "Not saved yet"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSaveDraft("F2")}
                  disabled={isSaving || viewSampleData}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 bg-transparent"
                  disabled={viewSampleData}
                >
                  Review Section
                </Button>
                <Button
                  className={
                    isComplete && !viewSampleData
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }
                  disabled={!isComplete || isSaving || viewSampleData}
                  onClick={handleMarkComplete}
                >
                  {isComplete && !viewSampleData
                    ? "Mark Complete"
                    : "Complete Required Fields"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
