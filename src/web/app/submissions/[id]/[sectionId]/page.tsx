"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeftIcon,
  BrainIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  EyeIcon,
  DownloadIcon,
  SendIcon,
  InfoIcon,
  FileTextIcon,
  SettingsIcon,
  FolderOpenIcon,
  PenIcon,
  MessageSquareIcon,
  Loader2,
  UserIcon,
  UsersIcon,
  HomeIcon,
  ChevronRightIcon,
  UploadIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import StatusCards from "@/components/section-navbar"; // Adjust path as needed
import DeviceSpecifications from "@/components/deviceSpecification";
import SuggestedUploadMenu from "@/components/SuggestedUploadMenu";
import SubstantialEquivalenceSection from "@/components/sectionb";

import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import SectionC from "@/components/SectionC";
import SectionG from "@/components/sectionG";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";
import SectionH from "@/components/SectionF";
// Interfaces remain unchanged
interface ChecklistItem {
  id: string;
  question: string;
  validated?: boolean;
  comments?: string;
  status?: "complete" | "warning" | "missing";
  tooltip?: string;
  suggestion?: string;
}

interface DeviceInfo {
  deviceName: string;
  regulatoryClass: string;
  indications: string;
  mechanism: string;
  productCode: string;
  regulationNumber: string;
}

interface Subsection {
  id: string;
  title: string;
  description?: string;
  content?: string;
  isLinked?: boolean;
  aiConfidence?: number;
  required: boolean;
  status?: "uploaded" | "ai-draft" | "missing";
  checklist: ChecklistItem[];
  deviceInfo?: DeviceInfo;
  last_updated?: string;
  fileId?: string;
}

interface Section {
  id: string;
  title: string;
  required: boolean;
  subsections: Subsection[];
  status?: "uploaded" | "ai-draft" | "missing";
  checklistValidation?: ChecklistItem[];
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

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface ReviewResult {
  sectionName: string;
  riskScore: number;
  issueSummary: string;
  hasIssue: boolean;
  targetDocument: string | null;
}

interface ValidationItem {
  id: string;
  question?: string;
  validated?: boolean;
  comments?: string;
  status?: "complete" | "warning" | "missing";
  tooltip?: string;
  suggestion?: string;
}

// Helper functions remain unchanged
const mapDeviceClassToSelectValue = (deviceClass: string): string => {
  switch (deviceClass.toLowerCase()) {
    case "class i":
      return "I";
    case "class ii":
      return "II";
    case "class iii":
      return "III";
    default:
      return "";
  }
};

const mapSelectValueToDeviceClass = (selectValue: string): string => {
  switch (selectValue) {
    case "I":
      return "Class I";
    case "II":
      return "Class II";
    case "III":
      return "Class III";
    default:
      return "";
  }
};

const mapChecklistValidation = (
  checklist: ChecklistItem[],
  checklistValidation: ValidationItem[],
  templateChecklist: ChecklistItem[]
): ChecklistItem[] => {
  const sourceChecklist = checklist.length > 0 ? checklist : templateChecklist;
  if (sourceChecklist.length === 0) {
    return [
      {
        id: "default",
        question: "No checklist items available. Contact support.",
        status: "missing",
        validated: false,
      },
    ];
  }
  return sourceChecklist.map((item) => {
    const validationItem = checklistValidation.find((v) => v.id === item.id);
    if (!validationItem) {
      return { ...item, status: item.status || "missing", validated: false };
    }
    return {
      ...item,
      validated: validationItem.validated ?? false,
      comments: validationItem.comments,
      status: validationItem.status ?? "missing",
      tooltip:
        validationItem.tooltip || validationItem.comments || item.question,
      suggestion: validationItem.suggestion,
    };
  });
};

const formatTimestamp = (isoTimestamp?: string): string => {
  if (!isoTimestamp) return "Not saved yet";
  try {
    const date = parseISO(isoTimestamp);
    return format(date, "MMM dd, yyyy, h:mm a", { locale: enGB });
  } catch (error) {
    console.warn(`Invalid timestamp: ${isoTimestamp}`, error);
    return isoTimestamp ?? "Invalid timestamp";
  }
};

export default function DynamicFDASubmissionSection() {
  const { id, sectionId } = useParams<{ id: string; sectionId?: string }>();
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [showDocumentTray, setShowDocumentTray] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState<string | null>(null);
  const [isDeviceInfoLoading, setIsDeviceInfoLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showFixSuggestion, setShowFixSuggestion] = useState<{
    subsectionId: string;
    index: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceName: "",
    regulatoryClass: "",
    indications: "",
    mechanism: "",
    productCode: "",
    regulationNumber: "",
  });
  const [editContent, setEditContent] = useState<{ [key: string]: string }>({});
  const [lastUpdated, setLastUpdated] = useState<{ [key: string]: string }>({});
  const [useContext, setUseContext] = useState({
    targetPopulation: "",
    clinicalSetting: "",
    contraindications: "",
  });
  const [showUseContextModal, setShowUseContextModal] = useState(false);
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast.error("No submission ID provided");
        router.push("/submissions");
        return;
      }
      setIsLoading(true);
      try {
        const submissionResponse = await fetch(
          `http://localhost:8000/api/submissions/${id}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!submissionResponse.ok) {
          throw new Error(
            `HTTP ${submissionResponse.status}: Failed to fetch submission`
          );
        }
        const submissionData = await submissionResponse.json();
        setSubmission(submissionData);
        setSections(submissionData.sections || []);

        if (sectionId && sectionId !== "B" && sectionId !== "G") {
          const sectionResponse = await fetch(
            `http://localhost:8000/api/submissions/${id}/sections/${sectionId}`,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!sectionResponse.ok) {
            throw new Error(
              `HTTP ${sectionResponse.status}: Failed to fetch section ${sectionId}`
            );
          }
          const sectionData = await sectionResponse.json();

          const templateResponse = await fetch(
            `http://localhost:8000/api/templates/${submissionData.templateId}`,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!templateResponse.ok) {
            throw new Error(
              `HTTP ${templateResponse.status}: Failed to fetch template`
            );
          }
          const templateData = await templateResponse.json();

          const templateSection = templateData.sections.find(
            (s: any) => s.id === sectionId
          );
          if (!templateSection) {
            throw new Error(`Section ${sectionId} not found in template`);
          }

          const fetchedSection: Section = {
            id: templateSection.id,
            title: templateSection.title,
            required: templateSection.required,
            subsections: templateSection.subsections.map((sub: any) => {
              const subsectionData = sectionData.subsections?.find(
                (s: any) => s.id === sub.id
              );
              const mappedChecklist = mapChecklistValidation(
                subsectionData?.checklist || sub.checklist || [],
                subsectionData?.checklistValidation || [],
                sub.checklist || []
              );
              return {
                id: sub.id,
                title: sub.title,
                description: sub.description || "No description available",
                content: subsectionData?.contentExtracted || "",
                isLinked: sub.title === "Intended Use Statement",
                aiConfidence: subsectionData?.aiConfidence,
                required: sub.required,
                status: subsectionData?.status || "missing",
                deviceInfo: subsectionData?.deviceInfo || undefined,
                last_updated: subsectionData?.last_updated,
                checklist: mappedChecklist,
                fileId: subsectionData?.fileId,
              };
            }),
            status: sectionData.status || "missing",
            checklistValidation: sectionData.checklistValidation || [],
          };

          setCurrentSection(fetchedSection);
          setComments([
            {
              id: "1",
              author: "Sarah Chen",
              content: `Please ensure the ${templateSection.title} includes all required subsections.`,
              timestamp: "2025-07-14T19:14:00+05:30",
            },
          ]);
          const initialLastUpdated = fetchedSection.subsections.reduce(
            (acc, sub) => {
              if (sub.last_updated) {
                acc[sub.id] = formatTimestamp(sub.last_updated);
              }
              return acc;
            },
            {} as { [key: string]: string }
          );
          setLastUpdated(initialLastUpdated);
          setEditContent(
            fetchedSection.subsections.reduce((acc, sub) => {
              if (sub.content) {
                acc[sub.id] = sub.content;
              }
              return acc;
            }, {} as { [key: string]: string })
          );
        } else if (sectionId === "B") {
          setCurrentSection({
            id: "B",
            title: "Substantial Equivalence Discussion",
            required: true,
            subsections: [],
            status: "missing",
          });
        } else if (sectionId === "G") {
          setCurrentSection({
            id: "G",
            title: "Performance Testing",
            required: true,
            subsections: [],
            status: "missing",
          });
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch data");
        console.error("Fetch error:", error);
        router.push("/submissions");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, sectionId, router]);

  const fetchDeviceInfo = async (subsectionId: string) => {
    if (
      currentSection?.subsections.find((sub) => sub.id === subsectionId)
        ?.title === "Intended Use Statement"
    ) {
      return;
    }
    setIsDeviceInfoLoading(true);
    try {
      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (subsection?.deviceInfo) {
        setDeviceInfo({
          deviceName: subsection.deviceInfo.deviceName || "",
          regulatoryClass: mapDeviceClassToSelectValue(
            subsection.deviceInfo.regulatoryClass || ""
          ),
          indications: subsection.deviceInfo.indications || "",
          mechanism: subsection.deviceInfo.mechanism || "",
          productCode: subsection.deviceInfo.productCode || "",
          regulationNumber: subsection.deviceInfo.regulationNumber || "",
        });
        return;
      }

      setDeviceInfo({
        deviceName: submission?.device_name || "",
        regulatoryClass: mapDeviceClassToSelectValue(
          submission?.device_class || ""
        ),
        indications: submission?.intended_use || "",
        mechanism: submission?.device_category || "",
        productCode: submission?.product_code || "",
        regulationNumber: submission?.regulation_number || "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch device info");
      console.error("Fetch device info error:", error);
      setDeviceInfo({
        deviceName: "",
        regulatoryClass: "",
        indications: "",
        mechanism: "",
        productCode: "",
        regulationNumber: "",
      });
    } finally {
      setIsDeviceInfoLoading(false);
    }
  };

  const handleFileUpload = async (subsectionId: string, file: File) => {
    setUploading(subsectionId);
    try {
      if (
        ![
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type)
      ) {
        throw new Error("Only .pdf, .doc, or .docx files are supported.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("subsection_id", subsectionId);
      formData.append("submission_id", id);
      formData.append("section_id", sectionId || "");

      const uploadResponse = await fetch(
        `http://localhost:8000/api/files/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${uploadResponse.status}: Failed to upload file`
        );
      }
      const { fileId, contentExtracted, checklistValidation } =
        await uploadResponse.json();

      const now = new Date();
      const formattedTimestamp = formatTimestamp(now.toISOString());

      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (!subsection) {
        throw new Error("Subsection not found");
      }
      const updatedChecklist = mapChecklistValidation(
        subsection.checklist || [],
        checklistValidation || [],
        subsection.checklist || []
      );

      setCurrentSection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subsections: prev.subsections.map((sub) =>
            sub.id === subsectionId
              ? {
                  ...sub,
                  content: contentExtracted || "",
                  status: "uploaded",
                  checklist: updatedChecklist,
                  last_updated: formattedTimestamp,
                  fileId,
                }
              : sub
          ),
        };
      });
      setEditContent((prev) => ({
        ...prev,
        [subsectionId]: contentExtracted || "",
      }));
      setLastUpdated((prev) => ({
        ...prev,
        [subsectionId]: formattedTimestamp,
      }));
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setUploading(null);
    }
  };
  // Add before the return statement (around line 614, before `return` in DynamicFDASubmissionSection)
  const getDocumentsUploaded = () => ({
    uploaded:
      currentSection?.subsections.filter((sub) => sub.fileId).length || 0,
    total: currentSection?.subsections.length || 0,
  });

  const getFieldsCompleted = () => ({
    completed:
      currentSection?.subsections.reduce(
        (acc, sub) =>
          acc +
          (sub.checklist?.filter((item) => item.status === "complete").length ||
            0),
        0
      ) || 0,
    total:
      currentSection?.subsections.reduce(
        (acc, sub) => acc + (sub.checklist?.length || 0),
        0
      ) || 0,
  });
  const handleSaveEditedContent = async (
    subsectionId: string,
    newContent: string
  ) => {
    try {
      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (!subsection) {
        throw new Error("Subsection not found");
      }
      const checklistIds = subsection.checklist?.map((item) => item.id) || [];

      const validationResponse = await fetch(`http://localhost:8000/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          checklist_ids: checklistIds,
          subsection_id: subsectionId,
        }),
      });
      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${validationResponse.status}: Failed to validate content`
        );
      }
      const { validation: checklistValidation } =
        (await validationResponse.json()) as { validation: ValidationItem[] };

      const now = new Date();
      const formattedTimestamp = formatTimestamp(now.toISOString());

      const patchResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId,
            content: newContent,
            status: "uploaded",
            checklistValidation,
            last_updated: now.toISOString(),
          }),
        }
      );
      if (!patchResponse.ok) {
        const errorData = await patchResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${patchResponse.status}: Failed to update subsection`
        );
      }

      const updatedChecklist = mapChecklistValidation(
        subsection.checklist,
        checklistValidation,
        subsection.checklist
      );

      setCurrentSection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subsections: prev.subsections.map((sub) =>
            sub.id === subsectionId
              ? {
                  ...sub,
                  content: newContent,
                  status: "uploaded",
                  checklist: updatedChecklist,
                  last_updated: formattedTimestamp,
                }
              : sub
          ),
        };
      });
      setEditContent((prev) => ({ ...prev, [subsectionId]: newContent }));
      setLastUpdated((prev) => ({
        ...prev,
        [subsectionId]: formattedTimestamp,
      }));
      toast.success("Content saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save content");
      console.error("Save content error:", error);
    }
  };

  const handleSaveDeviceInfo = async (subsectionId: string) => {
    if (
      currentSection?.subsections.find((sub) => sub.id === subsectionId)
        ?.title === "Intended Use Statement"
    ) {
      setShowDeviceModal(null);
      return;
    }

    try {
      // Validate required fields
      if (
        !deviceInfo.deviceName ||
        !deviceInfo.regulatoryClass ||
        !deviceInfo.indications
      ) {
        throw new Error(
          "Device Name, Regulatory Class, and Indications for Use are required fields."
        );
      }

      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (!subsection) {
        throw new Error("Subsection not found");
      }

      const checklistIds = subsection.checklist?.map((item) => item.id) || [];
      if (checklistIds.length === 0) {
        throw new Error("No checklist items available for this subsection");
      }

      const systemPrompt = `
Generate a comprehensive overview for the ${
        subsection.title
      } subsection of a 510(k) submission, describing the device purpose, technology, and target population.
Adhere to the following checklist:
${subsection.checklist.map((item) => `- ${item.question}`).join("\n")}
`;

      const inputData = {
        deviceName: deviceInfo.deviceName,
        regulatoryClass: mapSelectValueToDeviceClass(
          deviceInfo.regulatoryClass
        ),
        indications: deviceInfo.indications,
        mechanism: deviceInfo.mechanism || "Not specified",
        productCode: deviceInfo.productCode || "Not specified",
        regulationNumber: deviceInfo.regulationNumber || "Not specified",
        targetPopulation: "adult patients in clinical settings", // Default value, can be customized
      };

      const generateResponse = await fetch(`http://localhost:8000/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_data: inputData,
          system_prompt: systemPrompt,
          checklist_ids: checklistIds,
          subsection_id: subsectionId,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${generateResponse.status}: Failed to generate content`
        );
      }

      const { content: newContent, checklistValidation } =
        (await generateResponse.json()) as {
          content: string;
          checklistValidation: ValidationItem[];
        };

      const now = new Date();
      const formattedTimestamp = formatTimestamp(now.toISOString());

      const patchResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId,
            content: newContent,
            status: "ai-draft",
            checklistValidation,
            last_updated: now.toISOString(),
            deviceInfo: {
              ...deviceInfo,
              regulatoryClass: mapSelectValueToDeviceClass(
                deviceInfo.regulatoryClass
              ),
            },
          }),
        }
      );

      if (!patchResponse.ok) {
        const errorData = await patchResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${patchResponse.status}: Failed to update subsection`
        );
      }

      const updatedChecklist = mapChecklistValidation(
        subsection.checklist,
        checklistValidation.map((v) => ({
          ...v,
          question:
            subsection.checklist.find((item) => item.id === v.id)?.question ||
            v.question ||
            "Unknown",
        })),
        subsection.checklist
      );

      setCurrentSection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subsections: prev.subsections.map((sub) =>
            sub.id === subsectionId
              ? {
                  ...sub,
                  content: newContent,
                  status: "ai-draft",
                  checklist: updatedChecklist,
                  last_updated: formattedTimestamp,
                  deviceInfo: {
                    ...deviceInfo,
                    regulatoryClass: mapSelectValueToDeviceClass(
                      deviceInfo.regulatoryClass
                    ),
                  },
                }
              : sub
          ),
        };
      });

      setEditContent((prev) => ({ ...prev, [subsectionId]: newContent }));
      setLastUpdated((prev) => ({
        ...prev,
        [subsectionId]: formattedTimestamp,
      }));
      setShowDeviceModal(null);
      setDeviceInfo({
        deviceName: "",
        regulatoryClass: "",
        indications: "",
        mechanism: "",
        productCode: "",
        regulationNumber: "",
      });
      toast.success("Device info saved and content generated");
    } catch (error: any) {
      toast.error(
        error.message || "Failed to save device info and generate content"
      );
      console.error("Save device info error:", error);
    }
  };

  const handleSaveUseContext = async (subsectionId: string) => {
    try {
      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (!subsection) {
        throw new Error("Subsection not found");
      }

      const checklistIds = subsection.checklist?.map((item) => item.id) || [];
      const systemPrompt = `
You are an expert in drafting FDA 510(k) submissions. Generate a clear and concise Intended Use Statement based on the provided input data.
The statement should include the device name, purpose, target population, clinical setting, and any contraindications.
Adhere to the following checklist:
${subsection.checklist.map((item) => `- ${item.question}`).join("\n")}
`;

      const inputData = {
        deviceName: submission?.device_name || "Unknown Device",
        targetPopulation: useContext.targetPopulation || "adult patients",
        clinicalSetting: useContext.clinicalSetting || "clinical settings",
        contraindications: useContext.contraindications || "none specified",
        intended_use:
          submission?.intended_use || "monitor radiographic parameters",
      };

      const generateResponse = await fetch(`http://localhost:8000/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_data: inputData,
          system_prompt: systemPrompt,
          checklist_ids: checklistIds,
          subsection_id: subsectionId,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${generateResponse.status}: Failed to generate content`
        );
      }

      const { content: newContent, checklistValidation } =
        (await generateResponse.json()) as {
          content: string;
          checklistValidation: ValidationItem[];
        };

      const now = new Date();
      const formattedTimestamp = formatTimestamp(now.toISOString());

      const patchResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId,
            content: newContent,
            status: "ai-draft",
            checklistValidation,
            last_updated: now.toISOString(),
          }),
        }
      );

      if (!patchResponse.ok) {
        const errorData = await patchResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${patchResponse.status}: Failed to update subsection`
        );
      }

      const updatedChecklist = mapChecklistValidation(
        subsection.checklist,
        checklistValidation,
        subsection.checklist
      );

      setCurrentSection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subsections: prev.subsections.map((sub) =>
            sub.id === subsectionId
              ? {
                  ...sub,
                  content: newContent,
                  status: "ai-draft",
                  checklist: updatedChecklist,
                  last_updated: formattedTimestamp,
                }
              : sub
          ),
        };
      });

      setEditContent((prev) => ({ ...prev, [subsectionId]: newContent }));
      setLastUpdated((prev) => ({
        ...prev,
        [subsectionId]: formattedTimestamp,
      }));
      setShowUseContextModal(false);
      setUseContext({
        targetPopulation: "",
        clinicalSetting: "",
        contraindications: "",
      });
      toast.success("Intended use statement generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate intended use statement");
      console.error("Generate intended use error:", error);
    }
  };

  const handleRegenerateContent = async (subsectionId: string) => {
    try {
      const subsection = currentSection?.subsections.find(
        (sub) => sub.id === subsectionId
      );
      if (!subsection) {
        throw new Error("Subsection not found");
      }

      const checklistIds = subsection.checklist?.map((item) => item.id) || [];
      if (checklistIds.length === 0) {
        throw new Error("No checklist items available for this subsection");
      }

      const isIntendedUse = subsection.title === "Intended Use Statement";
      const systemPrompt = isIntendedUse
        ? `
You are an expert in drafting FDA 510(k) submissions. Generate a clear and concise Intended Use Statement based on the provided input data.
The statement should include the device name, purpose, target population, clinical setting, and any contraindications.
Adhere to the following checklist:
${subsection.checklist.map((item) => `- ${item.question}`).join("\n")}
`
        : `
Generate a comprehensive overview for the ${
            subsection.title
          } subsection of a 510(k) submission, describing the device purpose, technology, and target population.
Adhere to the following checklist:
${subsection.checklist.map((item) => `- ${item.question}`).join("\n")}
`;

      const inputData = isIntendedUse
        ? {
            deviceName: submission?.device_name || "Unknown Device",
            targetPopulation: useContext.targetPopulation || "adult patients",
            clinicalSetting: useContext.clinicalSetting || "clinical settings",
            contraindications: useContext.contraindications || "none specified",
            intended_use:
              submission?.intended_use || "monitor radiographic parameters",
          }
        : {
            deviceName: submission?.device_name || "Unknown Device",
            regulatoryClass: submission?.device_class || "Class II",
            indications: submission?.intended_use || "Not specified",
            mechanism: submission?.device_category || "Not specified",
            productCode: submission?.product_code || "Not specified",
            regulationNumber: submission?.regulation_number || "Not specified",
            targetPopulation: "adult patients in clinical settings",
          };

      const generateResponse = await fetch(`http://localhost:8000/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_data: inputData,
          system_prompt: systemPrompt,
          checklist_ids: checklistIds,
          subsection_id: subsectionId,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${generateResponse.status}: Failed to generate content`
        );
      }

      const { content: newContent, checklistValidation } =
        (await generateResponse.json()) as {
          content: string;
          checklistValidation: ValidationItem[];
        };

      const now = new Date();
      const formattedTimestamp = formatTimestamp(now.toISOString());

      const patchResponse = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subsectionId,
            content: newContent,
            status: "ai-draft",
            checklistValidation,
            last_updated: now.toISOString(),
          }),
        }
      );

      if (!patchResponse.ok) {
        const errorData = await patchResponse.json();
        throw new Error(
          errorData.detail ||
            `HTTP ${patchResponse.status}: Failed to update subsection`
        );
      }

      const updatedChecklist = mapChecklistValidation(
        subsection.checklist,
        checklistValidation.map((v) => ({
          ...v,
          question:
            subsection.checklist.find((item) => item.id === v.id)?.question ||
            v.question ||
            "Unknown",
        })),
        subsection.checklist
      );

      setCurrentSection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subsections: prev.subsections.map((sub) =>
            sub.id === subsectionId
              ? {
                  ...sub,
                  content: newContent,
                  status: "ai-draft",
                  checklist: updatedChecklist,
                  last_updated: formattedTimestamp,
                  aiConfidence: 85,
                }
              : sub
          ),
        };
      });

      setEditContent((prev) => ({ ...prev, [subsectionId]: newContent }));
      setLastUpdated((prev) => ({
        ...prev,
        [subsectionId]: formattedTimestamp,
      }));
      toast.success("Content regenerated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate content");
      console.error("Regenerate content error:", error);
    }
  };

  const handleRTAReview = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/submissions/${id}/sections/${sectionId}/rta-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to perform RTA review`
        );
      }
      const data = await response.json();
      setReviewResults(
        data.sections?.map((section: any) => ({
          sectionName: section.sectionName || `Subsection ${section.id}`,
          riskScore: section.readinessPercent / 10 || 0,
          issueSummary:
            section.rtaFailures?.length > 0
              ? section.rtaFailures.map((f: any) => f.question).join(", ")
              : "Looks good",
          hasIssue: section.rtaFailures?.length > 0,
          targetDocument: section.targetDocument || null,
        })) || []
      );

      // Update currentSection with checklist validation from RTA review
      setCurrentSection((prev) => {
        if (!prev) return prev;
        const updatedSubsections = prev.subsections.map((sub) => {
          const sectionData = data.sections?.find((s: any) => s.id === sub.id);
          if (!sectionData) return sub;
          const updatedChecklist = mapChecklistValidation(
            sub.checklist || [],
            sectionData.checklistValidation || [],
            sub.checklist || []
          );
          return {
            ...sub,
            checklist: updatedChecklist,
            status: sectionData.status || sub.status,
            last_updated: sectionData.last_updated || sub.last_updated,
          };
        });

        // Update section status based on checklist completion
        const totalItems = updatedSubsections.reduce(
          (acc, sub) => acc + (sub.checklist?.length || 0),
          0
        );
        const completeItems = updatedSubsections.reduce(
          (acc, sub) =>
            acc +
            (sub.checklist?.filter((item) => item.status === "complete")
              .length || 0),
          0
        );
        const readinessScore =
          totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
        const sectionStatus =
          readinessScore >= 90
            ? "uploaded"
            : readinessScore >= 70
            ? "ai-draft"
            : "missing";

        return {
          ...prev,
          subsections: updatedSubsections,
          status: sectionStatus,
        };
      });

      toast.success(`RTA Review: ${data.readinessPercent?.toFixed(2)}% ready`);
      if (data.rtaFailures?.length > 0) {
        toast.warning(
          `Failures: ${data.rtaFailures.map((f: any) => f.question).join(", ")}`
        );
      }
      setShowReviewModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to perform RTA review");
      console.error("RTA review error:", error);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const newCommentData: Comment = {
      id: uuidv4(),
      author: "You",
      content: newComment,
      timestamp: new Date().toISOString(),
    };
    setComments([newCommentData, ...comments]);
    setNewComment("");
    toast.success("Comment added successfully");
  };

  const applySuggestion = (
    subsectionId: string,
    index: number,
    suggestion: string
  ) => {
    const now = new Date();
    const formattedTimestamp = formatTimestamp(now.toISOString());

    const subsection = currentSection?.subsections.find(
      (sub) => sub.id === subsectionId
    );
    if (!subsection) return;

    const checklistId = subsection.checklist[index].id;

    fetch(`http://localhost:8000/api/submissions/${id}/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subsectionId,
        checklistValidation: [
          {
            id: checklistId,
            status: "complete",
            validated: true,
            comments: `Applied suggestion: ${suggestion}`,
            suggestion: "",
            tooltip: `Checklist item '${subsection.checklist[index].question}' addressed.`,
          },
        ],
        last_updated: now.toISOString(),
      }),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error("Failed to update checklist validation");
        return response.json();
      })
      .catch((error) => {
        toast.error(error.message || "Failed to save checklist update");
        console.error("Checklist update error:", error);
      });

    setCurrentSection((prev) =>
      prev
        ? {
            ...prev,
            subsections: prev.subsections.map((sub) =>
              sub.id === subsectionId
                ? {
                    ...sub,
                    content: sub.content
                      ? `${sub.content} ${suggestion}`
                      : suggestion,
                    checklist: sub.checklist.map(
                      (item: ChecklistItem, i: number) =>
                        i === index
                          ? {
                              ...item,
                              status: "complete",
                              validated: true,
                              comments: `Applied suggestion: ${suggestion}`,
                              suggestion: "",
                              tooltip: `Checklist item '${item.question}' addressed.`,
                            }
                          : item
                    ),
                    last_updated: formattedTimestamp,
                  }
                : sub
            ),
          }
        : null
    );
    setEditContent((prev) => ({
      ...prev,
      [subsectionId]: prev[subsectionId]
        ? `${prev[subsectionId]} ${suggestion}`
        : suggestion,
    }));
    setLastUpdated((prev) => ({ ...prev, [subsectionId]: formattedTimestamp }));
    setShowFixSuggestion(null);
    toast.success("Suggestion applied successfully");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Complete
          </Badge>
        );
      case "ai-draft":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Generated
          </Badge>
        );
      case "missing":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Missing
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRTAStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckIcon className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case "missing":
        return <XIcon className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const calculateSectionProgress = (section: Section) => {
    const totalItems = section.subsections.reduce(
      (acc, sub) => acc + (sub.checklist?.length || 0),
      0
    );
    const completeItems = section.subsections.reduce(
      (acc, sub) =>
        acc +
        (sub.checklist?.filter((item) => item.status === "complete").length ||
          0),
      0
    );
    return totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
  };

  const calculateFDAReadiness = (section: Section) => {
    const totalItems = section.subsections.reduce(
      (acc, sub) => acc + (sub.checklist?.length || 0),
      0
    );
    const completeItems = section.subsections.reduce(
      (acc, sub) =>
        acc +
        (sub.checklist?.filter((item) => item.status === "complete").length ||
          0),
      0
    );
    return totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
  };

  const getSectionStatus = (section: Section) => {
    const fdaScore = calculateFDAReadiness(section);
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

  const canMarkComplete = (section: Section) => {
    const allSubsectionsComplete = section.subsections.every(
      (sub) =>
        sub.content &&
        sub.content.length > 50 &&
        sub.checklist?.every((item) => item.status === "complete")
    );
    const fdaReadiness = calculateFDAReadiness(section);
    return allSubsectionsComplete && fdaReadiness >= 75;
  };

  const handleEditUseContext = (subsectionId: string) => {
    const subsection = currentSection?.subsections.find(
      (sub) => sub.id === subsectionId
    );
    if (subsection) {
      const targetPop =
        submission?.intended_use ||
        subsection.checklist.find((item) => item.id === "chk_a1686692")
          ?.comments ||
        "";
      const clinicalSet =
        submission?.clinical_setting ||
        subsection.checklist.find((item) => item.id === "chk_768460c9")
          ?.comments ||
        "";
      const contraind =
        subsection.checklist.find((item) => item.id === "chk_e8d85a55")
          ?.comments || "";
      setUseContext({
        targetPopulation: targetPop,
        clinicalSetting: clinicalSet,
        contraindications: contraind,
      });
      setShowUseContextModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-gray-50">
        <SidebarNavigation viewType={viewType} />
        <div className="flex-1 flex flex-col">
          <Header
            viewType={viewType}
            setViewType={setViewType}
            title={
              sectionId && currentSection
                ? `${submission?.submission_title} – ${currentSection.title}`
                : "FDA Submission Checklist"
            }
            description={
              submission
                ? `Auto-generated based on submission type: ${submission.submission_type}, device: ${submission.device_class}`
                : "Submission data not found"
            }
          />
          <div className="flex-1 p-4">
            <div className="mx-auto max-w-7xl px-6 py-8">
              {isLoading ? (
                <div className="flex justify-center items-center min-h-screen">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sectionId && currentSection ? (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/submissions/${id}/checklist`)
                          }
                          className="mr-4"
                        >
                          <ChevronLeftIcon className="mr-2 h-4 w-4" />
                          Back to Checklist
                        </Button>
                        <h1 className="text-2xl font-semibold text-gray-900">
                          {submission?.submission_title} –{" "}
                          {submission?.submission_type} (
                          {submission?.predicate_device_name})
                        </h1>
                      </div>
                      <div className="flex gap-2">
                        <SuggestedUploadMenu />
                        <Button
                          onClick={() => setShowPreview(true)}
                          variant="outline"
                        >
                          <EyeIcon className="mr-2 h-4 w-4" />
                          Preview Section
                        </Button>
                      </div>
                    </div>

                    {sectionId === "A" && (
                      <StatusCards
                        authoringProgress={
                          currentSection
                            ? calculateSectionProgress(currentSection)
                            : 0
                        }
                        fieldsCompleted={getFieldsCompleted()}
                        documentsUploaded={getDocumentsUploaded()}
                        fdaReadiness={
                          currentSection
                            ? calculateFDAReadiness(currentSection)
                            : 0
                        }
                        setShowDocumentsModal={() => setShowDocumentTray(true)}
                        setShowRTASectionModal={() => setShowReviewModal(true)}
                      />
                    )}

                    {sectionId === "B" ? (
                      <>
                        <SubstantialEquivalenceSection
                          submission={submission ?? undefined}
                        />
                      </>
                    ) : sectionId === "C" ? (
                      <>
                        <SectionC submission={submission ?? undefined} />
                      </>
                    ) : sectionId === "F" ? (
                      <>
                        <SectionH submission={submission ?? undefined} />
                      </>
                    ) : sectionId === "G" ? (
                      <>
                        <SectionG submission={submission ?? undefined} />
                      </>
                    ) : (
                      <>
                        <Card className="bg-gray-50 border-gray-200">
                          <CardContent className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                              What the FDA expects in this section
                            </h2>
                            <p className="text-sm text-gray-700 mb-4">
                              The FDA expects detailed documentation including
                              device description, intended use, performance
                              data, and compliance with 510(k) requirements.
                              Ensure all subsections are complete and validated.
                            </p>
                            <ul className="list-none space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>
                                  A clear Executive Summary that outlines device
                                  purpose and substantial equivalence
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>
                                  A defined Indications for Use statement that
                                  matches your intended patient population
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>
                                  Technical Specifications including materials,
                                  dimensions, and operating principles
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
                                href="https://www.fda.gov/media/132614/download"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-700 border-blue-300"
                                >
                                  FDA Sample Summary
                                </Button>
                              </a>
                            </div>
                          </CardContent>
                        </Card>

                        {currentSection.subsections.map((sub) => (
                          <Card key={sub.id}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-medium">
                                  {sub.title}
                                </CardTitle>
                                {getStatusBadge(sub.status || "missing")}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (
                                      sub.title === "Intended Use Statement"
                                    ) {
                                      handleEditUseContext(sub.id);
                                    } else {
                                      setIsDeviceInfoLoading(true);
                                      fetchDeviceInfo(sub.id).then(() =>
                                        setShowDeviceModal(sub.id)
                                      );
                                    }
                                  }}
                                  disabled={isDeviceInfoLoading}
                                >
                                  {isDeviceInfoLoading &&
                                  sub.title !== "Intended Use Statement" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : sub.title === "Intended Use Statement" ? (
                                    <UserIcon className="mr-2 h-4 w-4" />
                                  ) : (
                                    <PenIcon className="mr-2 h-4 w-4" />
                                  )}
                                  {sub.title === "Intended Use Statement"
                                    ? "Edit User Context"
                                    : "Edit Device Info"}
                                </Button>
                                {sectionId !== "A" && (
                                  <>
                                    <Input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={(e) =>
                                        e.target.files &&
                                        handleFileUpload(
                                          sub.id,
                                          e.target.files[0]
                                        )
                                      }
                                      className="hidden"
                                      id={`file-upload-${sub.id}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        globalThis.document
                                          .getElementById(
                                            `file-upload-${sub.id}`
                                          )
                                          ?.click()
                                      }
                                      disabled={uploading === sub.id}
                                    >
                                      {uploading === sub.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <UploadIcon className="mr-2 h-4 w-4" />
                                      )}
                                      Upload
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRegenerateContent(sub.id)
                                  }
                                >
                                  <BrainIcon className="mr-2 h-4 w-4" />
                                  Regenerate Content
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleSaveEditedContent(
                                      sub.id,
                                      editContent[sub.id] || sub.content || ""
                                    )
                                  }
                                >
                                  Save
                                </Button>
                              </div>

                              {sub.title === "Intended Use Statement" && (
                                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={sub.isLinked || false}
                                      onChange={(e) =>
                                        setCurrentSection((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                subsections:
                                                  prev.subsections.map((s) =>
                                                    s.id === sub.id
                                                      ? {
                                                          ...s,
                                                          isLinked:
                                                            e.target.checked,
                                                        }
                                                      : s
                                                  ),
                                              }
                                            : null
                                        )
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-blue-800">
                                      Linked Field – auto-updates everywhere
                                    </span>
                                  </label>
                                </div>
                              )}

                              <div className="relative">
                                {sub.title === "Device Specifications" ? (
                                  <DeviceSpecifications />
                                ) : (
                                  <Textarea
                                    value={
                                      editContent[sub.id] !== undefined
                                        ? editContent[sub.id]
                                        : sub.content || ""
                                    }
                                    onChange={(e) =>
                                      setEditContent({
                                        ...editContent,
                                        [sub.id]: e.target.value,
                                      })
                                    }
                                    className="min-h-[250px] p-5 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-800 leading-relaxed w-full"
                                    placeholder="No content available. Upload a document or generate content."
                                    disabled={sub.isLinked}
                                  />
                                )}
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-500">
                                  {sub.status === "ai-draft"
                                    ? "Generated"
                                    : sub.fileId
                                    ? "User-uploaded"
                                    : "Not uploaded"}{" "}
                                  • Last updated:{" "}
                                  {lastUpdated[sub.id] || "Not saved yet"}
                                </div>
                                {sub.aiConfidence && (
                                  <Badge
                                    variant="outline"
                                    className="text-blue-700 border-blue-300 bg-blue-50"
                                  >
                                    Confidence: {sub.aiConfidence}%
                                  </Badge>
                                )}
                              </div>

                              <div className="border-t border-gray-200 pt-4">
                                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                  RTA Compliance Check:
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {sub.checklist && sub.checklist.length > 0 ? (
                                    sub.checklist.map(
                                      (item: ChecklistItem, index: number) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                                        >
                                          <div className="flex items-center gap-3">
                                            {getRTAStatusIcon(
                                              item.status || "missing"
                                            )}
                                            <span className="text-sm font-medium text-gray-900">
                                              {item.question}
                                            </span>
                                            {item.status === "missing" &&
                                              item.tooltip && (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <InfoIcon className="h-4 w-4 text-gray-400 cursor-help" />
                                                  </TooltipTrigger>
                                                  <TooltipContent className="max-w-xs">
                                                    <p className="mb-2">
                                                      {item.tooltip}
                                                    </p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                          </div>
                                          {item.status === "missing" &&
                                            item.suggestion && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                  setShowFixSuggestion({
                                                    subsectionId: sub.id,
                                                    index,
                                                  })
                                                }
                                                className="flex items-center gap-1 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                                              >
                                                <BrainIcon className="h-3 w-3" />
                                                Fix with AI
                                              </Button>
                                            )}
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <p className="text-sm text-gray-500 col-span-2">
                                      No checklist items available. Please
                                      contact support to update the template.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-gray-900">
                      FDA Submission Checklist{" "}
                      {submission
                        ? `for ${submission.submission_title} (${submission.predicate_device_name})`
                        : `(ID: ${id})`}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      {submission
                        ? `Auto-generated based on submission type: ${submission.submission_type}, device: ${submission.device_class}`
                        : "Submission data not found"}
                    </p>
                  </div>

                  <Card className="bg-gray-50 border-gray-200 mb-8">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Total Sections
                          </Label>
                          <p className="text-2xl font-bold text-gray-900">
                            {sections.length}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Sections Uploaded
                          </Label>
                          <p className="text-2xl font-bold text-gray-900">
                            {
                              sections.filter(
                                (section) => section.status === "uploaded"
                              ).length
                            }{" "}
                            of {sections.length}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Internal Deadline
                          </Label>
                          <p className="text-2xl font-bold text-gray-900">
                            {submission?.internal_deadline
                              ? format(
                                  parseISO(submission.internal_deadline),
                                  "MMM dd, yyyy",
                                  { locale: enGB }
                                )
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Time Remaining
                          </Label>
                          <p className="text-2xl font-bold text-gray-900">
                            {submission?.internal_deadline
                              ? `${Math.ceil(
                                  (new Date(
                                    submission.internal_deadline
                                  ).getTime() -
                                    new Date().getTime()) /
                                    (1000 * 60 * 60 * 24)
                                )} days`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    {sections.map((section) => (
                      <Card key={section.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-medium">
                              {section.title}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="text-gray-600 border-gray-300"
                              >
                                {section.subsections.reduce(
                                  (acc, sub) =>
                                    acc +
                                    (sub.checklist?.filter(
                                      (item) => item.status === "complete"
                                    ).length || 0),
                                  0
                                )}{" "}
                                of{" "}
                                {section.subsections.reduce(
                                  (acc, sub) =>
                                    acc + (sub.checklist?.length || 0),
                                  0
                                )}{" "}
                                Completed
                              </Badge>
                              {getStatusBadge(section.status || "missing")}
                              <Link href={`/submissions/${id}/${section.id}`}>
                                <Button size="sm" variant="outline">
                                  <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/submissions")}
                    >
                      Back to Submissions
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Continue to Section Uploads
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {sectionId && currentSection && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-40">
                <div className="mx-auto max-w-7xl flex items-center justify-between">
                  <div className="flex gap-3">
                    <Button variant="outline">Save Progress</Button>
                    <Button variant="outline" onClick={handleRTAReview}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Run Simulated FDA Review
                    </Button>
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!canMarkComplete(currentSection)}
                  >
                    Mark Section Complete
                  </Button>
                </div>
              </div>
            )}

            <Dialog open={showDocumentTray} onOpenChange={setShowDocumentTray}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Uploaded Documents</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {currentSection?.subsections
                    .filter((sub) => sub.fileId)
                    .map((sub) => (
                      <Card key={sub.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{sub.title}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              Uploaded: {lastUpdated[sub.id] || "Not saved yet"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              Extracted fields:
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {sub.checklist.map((item) => (
                                <Badge
                                  key={item.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {item.question}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-4xl p-6 rounded-lg shadow-lg bg-white">
                <DialogHeader>
                  <DialogTitle>Preview: {currentSection?.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 max-h-[80vh] overflow-y-auto">
                  {sectionId === "B" || sectionId === "G" ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">
                          {currentSection?.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">
                          Preview of the {currentSection?.title} is not
                          available in this view. Please view the section
                          directly.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    currentSection?.subsections.map((sub) => (
                      <Card key={sub.id}>
                        <CardHeader>
                          <CardTitle className="text-lg font-medium">
                            {sub.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {sub.content || "No content available"}
                          </p>
                          <div className="mt-4 flex gap-2">
                            {getStatusBadge(sub.status || "missing")}
                            {sub.aiConfidence && (
                              <Badge
                                variant="outline"
                                className="text-blue-700 border-blue-300 bg-blue-50"
                              >
                                Confidence: {sub.aiConfidence}%
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            Last updated:{" "}
                            {lastUpdated[sub.id] || "Not saved yet"}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(false)}
                  >
                    Close
                  </Button>
                  <Button>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download Preview
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Simulated FDA RTA Review Results</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {reviewResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            {result.sectionName}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              result.hasIssue
                                ? "text-red-600 border-red-300"
                                : "text-green-600 border-green-300"
                            }
                          >
                            {result.hasIssue ? "Issues Found" : "No Issues"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          Risk Score: {result.riskScore.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-700">
                          Summary: {result.issueSummary}
                        </p>
                        {result.targetDocument && (
                          <p className="text-sm text-gray-700">
                            Target Document: {result.targetDocument}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewModal(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showDeviceModal !== null}
              onOpenChange={() => setShowDeviceModal(null)}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Device Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="deviceName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Device Name
                    </Label>
                    <Input
                      id="deviceName"
                      value={deviceInfo.deviceName}
                      onChange={(e) =>
                        setDeviceInfo({
                          ...deviceInfo,
                          deviceName: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="Enter device name"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="regulatoryClass"
                      className="text-sm font-medium text-gray-700"
                    >
                      Regulatory Class
                    </Label>
                    <Select
                      value={deviceInfo.regulatoryClass}
                      onValueChange={(value) =>
                        setDeviceInfo({ ...deviceInfo, regulatoryClass: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I">Class I</SelectItem>
                        <SelectItem value="II">Class II</SelectItem>
                        <SelectItem value="III">Class III</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="indications"
                      className="text-sm font-medium text-gray-700"
                    >
                      Indications for Use
                    </Label>
                    <Textarea
                      id="indications"
                      value={deviceInfo.indications}
                      onChange={(e) =>
                        setDeviceInfo({
                          ...deviceInfo,
                          indications: e.target.value,
                        })
                      }
                      className="mt-1 min-h-[100px]"
                      placeholder="Describe indications for use"
                    />
                    <div>
                      <Label
                        htmlFor="mechanism"
                        className="text-sm font-medium text-gray-700"
                      >
                        Mechanism
                      </Label>
                      <Input
                        id="mechanism"
                        value={deviceInfo.mechanism}
                        onChange={(e) =>
                          setDeviceInfo({
                            ...deviceInfo,
                            mechanism: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Describe device mechanism"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="productCode"
                        className="text-sm font-medium text-gray-700"
                      >
                        Product Code
                      </Label>
                      <Input
                        id="productCode"
                        value={deviceInfo.productCode}
                        onChange={(e) =>
                          setDeviceInfo({
                            ...deviceInfo,
                            productCode: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Enter product code (e.g., ABC)"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="regulationNumber"
                        className="text-sm font-medium text-gray-700"
                      >
                        Regulation Number
                      </Label>
                      <Input
                        id="regulationNumber"
                        value={deviceInfo.regulationNumber}
                        onChange={(e) =>
                          setDeviceInfo({
                            ...deviceInfo,
                            regulationNumber: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Enter regulation number (e.g., 21 CFR 880.XXXX)"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeviceModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSaveDeviceInfo(showDeviceModal!)}
                    disabled={
                      isDeviceInfoLoading ||
                      !deviceInfo.deviceName ||
                      !deviceInfo.regulatoryClass ||
                      !deviceInfo.indications
                    }
                  >
                    {isDeviceInfoLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckIcon className="mr-2 h-4 w-4" />
                    )}
                    Save Device Info
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showUseContextModal}
              onOpenChange={setShowUseContextModal}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Intended Use Context</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="targetPopulation"
                      className="text-sm font-medium text-gray-700"
                    >
                      Target Population
                    </Label>
                    <Input
                      id="targetPopulation"
                      value={useContext.targetPopulation}
                      onChange={(e) =>
                        setUseContext({
                          ...useContext,
                          targetPopulation: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="e.g., Adult patients"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="clinicalSetting"
                      className="text-sm font-medium text-gray-700"
                    >
                      Clinical Setting
                    </Label>
                    <Input
                      id="clinicalSetting"
                      value={useContext.clinicalSetting}
                      onChange={(e) =>
                        setUseContext({
                          ...useContext,
                          clinicalSetting: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="e.g., Hospitals, clinics"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="contraindications"
                      className="text-sm font-medium text-gray-700"
                    >
                      Contraindications
                    </Label>
                    <Textarea
                      id="contraindications"
                      value={useContext.contraindications}
                      onChange={(e) =>
                        setUseContext({
                          ...useContext,
                          contraindications: e.target.value,
                        })
                      }
                      className="mt-1 min-h-[100px]"
                      placeholder="Describe any contraindications"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowUseContextModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      handleSaveUseContext(
                        currentSection?.subsections.find(
                          (sub) => sub.title === "Intended Use Statement"
                        )?.id || ""
                      )
                    }
                    disabled={
                      !useContext.targetPopulation ||
                      !useContext.clinicalSetting
                    }
                  >
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Save Context
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showFixSuggestion !== null}
              onOpenChange={() => setShowFixSuggestion(null)}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>AI Suggested Fix</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    {showFixSuggestion &&
                      currentSection?.subsections.find(
                        (sub) => sub.id === showFixSuggestion.subsectionId
                      )?.checklist[showFixSuggestion.index]?.suggestion}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowFixSuggestion(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      showFixSuggestion &&
                      applySuggestion(
                        showFixSuggestion.subsectionId,
                        showFixSuggestion.index,
                        currentSection?.subsections.find(
                          (sub) => sub.id === showFixSuggestion.subsectionId
                        )?.checklist[showFixSuggestion.index]?.suggestion || ""
                      )
                    }
                  >
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Apply Suggestion
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
