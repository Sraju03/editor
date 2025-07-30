"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { HorizontalStepper } from "@/components/horizontal-stepper";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Search,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";
import { debounce } from "lodash";

// --- Types ---
interface ProductCode {
  code: string;
  name: string;
  regulation_number?: string;
}

interface PredicateDevice {
  name: string;
  k_number: string;
  manufacturer: string;
  clearance_date: string;
  confidence: number;
  regulation_number?: string;
}

interface Submission {
  id?: string;
  submission_title: string;
  submission_type: string;
  regulatory_pathway: string;
  is_follow_up: boolean;
  previous_k: string;
  device_name: string;
  product_code: string;
  regulation_number: string;
  device_class: string;
  predicate_device_name: string;
  predicate_k: string;
  intended_use: string;
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
  internal_deadline: string;
  reviewer_notes: string;
  completed_sections?: string[];
}

const steps = [
  { id: "overview", title: "Overview", subtitle: "Basic submission details" },
  {
    id: "device-info",
    title: "Device Info",
    subtitle: "Device and predicate information",
  },
  {
    id: "intended-use",
    title: "Intended Use",
    subtitle: "Clinical intent and description",
  },
  {
    id: "scope-flags",
    title: "Scope & Flags",
    subtitle: "Testing scope and sections",
  },
  {
    id: "reviewer-info",
    title: "Reviewer Info",
    subtitle: "Contact and review details",
  },
];

export default function SubmissionFormPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.id as string;
  const isEditMode = !!submissionId;

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [predicateDevices, setPredicateDevices] = useState<PredicateDevice[]>(
    []
  );
  const [predicateSearch, setPredicateSearch] = useState("");
  const [showPredicateModal, setShowPredicateModal] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});

  const ITEMS_PER_PAGE = 100;

  const [formData, setFormData] = useState<Submission>({
    id: "",
    submission_title: "",
    submission_type: "",
    regulatory_pathway: "",
    is_follow_up: false,
    previous_k: "",
    device_name: "",
    product_code: "",
    regulation_number: "",
    device_class: "",
    predicate_device_name: "",
    predicate_k: "",
    intended_use: "",
    clinical_setting: "",
    target_specimen: "",
    target_market: "",
    includes_clinical_testing: false,
    includes_software: false,
    includes_sterile_packaging: false,
    major_predicate_changes: false,
    checklist_notes: "",
    submitter_org: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    reviewer_id: "",
    internal_deadline: "",
    reviewer_notes: "",
  });

  // Debounced predicate search
  const debouncedPredicateSearch = debounce((value: string) => {
    setPredicateSearch(value);
  }, 300);

  // Fetch submission data for editing
  useEffect(() => {
    if (isEditMode) {
      const fetchSubmission = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `http://localhost:8000/api/submissions/${submissionId}`,
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
          setFormData({
            id: data._id || submissionId,
            submission_title: data.submission_title || "",
            submission_type: data.submission_type || "",
            regulatory_pathway: data.regulatory_pathway || "",
            is_follow_up: data.is_follow_up || false,
            previous_k: data.previous_k || "",
            device_name: data.device_name || "",
            product_code: data.product_code || "",
            regulation_number: data.regulation_number || "",
            device_class: data.device_class || "",
            predicate_device_name: data.predicate_device_name || "",
            predicate_k: data.predicate_k || "",
            intended_use: data.intended_use || "",
            clinical_setting: data.clinical_setting || "",
            target_specimen: data.target_specimen || "",
            target_market: data.target_market || "",
            includes_clinical_testing: data.includes_clinical_testing || false,
            includes_software: data.includes_software || false,
            includes_sterile_packaging:
              data.includes_sterile_packaging || false,
            major_predicate_changes: data.major_predicate_changes || false,
            checklist_notes: data.checklist_notes || "",
            submitter_org: data.submitter_org || "",
            contact_name: data.contact_name || "",
            contact_email: data.contact_email || "",
            contact_phone: data.contact_phone || "",
            reviewer_id: data.reviewer_id || "",
            internal_deadline: data.internal_deadline || "",
            reviewer_notes: data.reviewer_notes || "",
          });
          if (data.internal_deadline) {
            try {
              setDeadline(parseISO(data.internal_deadline));
            } catch (e) {
              console.error("Invalid date format for internal_deadline:", e);
            }
          }
          setCompletedSections(data.completed_sections || []);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to fetch submission data";
          toast.error(errorMessage);
          console.error("Fetch submission error:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSubmission();
    }
  }, [isEditMode, submissionId]);

  // Fetch product codes
  useEffect(() => {
    const fetchProductCodes = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", ITEMS_PER_PAGE.toString());
        if (predicateSearch) params.set("search", predicateSearch);

        const res = await fetch(
          `http://localhost:8000/api/product-codes?${params.toString()}`
        );
        if (!res.ok)
          throw new Error(`HTTP ${res.status} - Failed to fetch product codes`);
        const data = await res.json();
        if (!Array.isArray(data))
          throw new Error("Invalid response format from server");

        setProductCodes(data);
        setHasMore(data.length === ITEMS_PER_PAGE);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setFetchError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductCodes();
  }, [currentPage, predicateSearch]);

  const handleInputChange = (
    field: keyof Submission,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error for the field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSectionToggle = (section: string) => {
    const updatedSections = completedSections.includes(section)
      ? completedSections.filter((s) => s !== section)
      : [...completedSections, section];
    setCompletedSections(updatedSections);
    handleInputChange("completed_sections", updatedSections);
  };

  // Handle product code change
  const handleProductCodeChange = (value: string) => {
    handleInputChange("product_code", value);
    const selected = productCodes.find((c) => c.code === value);
    if (selected) {
      handleInputChange("device_class", "class-ii");
      handleInputChange("regulation_number", selected.regulation_number || "");
    } else {
      handleInputChange("device_class", "");
      handleInputChange("regulation_number", "");
    }
  };

  // Generate intended use statement
  const handleAutoGenerateIntendedUse = async () => {
    if (!formData.product_code || !formData.device_name) {
      toast.error("Select a product code and enter a device name first");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/ai/intended-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_code: formData.product_code,
          device_category: formData.device_name,
          predicate_device_name: formData.predicate_device_name || undefined,
        }),
      });
      if (!res.ok)
        throw new Error(`HTTP ${res.status} - Failed to generate intended use`);
      const data = await res.json();
      if (!data.intended_use) throw new Error("No intended use returned");
      handleInputChange("intended_use", data.intended_use);
      toast.success("Generated intended use");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Intended use generation failed";
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search predicate devices
  const handlePredicateSearch = async () => {
    if (!formData.product_code) {
      toast.error("Select a product code first");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        "http://localhost:8000/api/ai/predicate-suggest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_code: formData.product_code,
            description: predicateSearch,
          }),
        }
      );
      if (!res.ok)
        throw new Error(`HTTP ${res.status} - Predicate fetch failed`);
      const data = await res.json();
      if (!data.devices || !Array.isArray(data.devices))
        throw new Error("Invalid predicate device data");
      setPredicateDevices(data.devices);
      setShowPredicateModal(true);
      if (data.devices.length === 0) toast.info("No predicate devices found");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Predicate fetch error";
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select predicate device
  const handleSelectPredicate = (device: PredicateDevice) => {
    handleInputChange("predicate_device_name", device.name);
    handleInputChange("predicate_k", device.k_number);
    handleInputChange("device_name", device.name);
    setShowPredicateModal(false);
  };

  // Validate form fields
  const validateForm = () => {
    const requiredFields = [
      { key: "submission_title", label: "Submission Title" },
      { key: "submission_type", label: "Submission Type" },
      { key: "regulatory_pathway", label: "Regulatory Pathway" },
      { key: "device_name", label: "Device Name" },
      { key: "product_code", label: "Product Code" },
      { key: "device_class", label: "Device Class" },
      { key: "predicate_device_name", label: "Predicate Device Name" },
      { key: "predicate_k", label: "Predicate 510(k) Number" },
      { key: "intended_use", label: "Intended Use" },
      { key: "clinical_setting", label: "Clinical Setting" },
      { key: "target_specimen", label: "Target Specimen" },
      { key: "target_market", label: "Target Market" },
      { key: "submitter_org", label: "Submitter Organization" },
      { key: "contact_name", label: "Contact Name" },
      { key: "contact_email", label: "Contact Email" },
      { key: "reviewer_id", label: "Reviewer Lead" },
    ];

    const missing = requiredFields.filter(({ key }) => {
      const value = formData[key as keyof Submission];
      return value === "" || value === null || value === undefined;
    });

    if (missing.length > 0) {
      const newErrors = missing.reduce((acc, { key }) => {
        acc[key] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      setValidationErrors(newErrors);
      return `Please fill the following required fields: ${missing
        .map((f) => f.label)
        .join(", ")}`;
    }

    if (formData.is_follow_up && !formData.previous_k) {
      setValidationErrors((prev) => ({ ...prev, previous_k: true }));
      return "Previous 510(k) Number is required for follow-up submissions";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email)) {
      setValidationErrors((prev) => ({ ...prev, contact_email: true }));
      return "Please provide a valid email address for Contact Email";
    }

    const kNumberRegex = /^K\d{6}$/;
    if (!kNumberRegex.test(formData.predicate_k)) {
      setValidationErrors((prev) => ({ ...prev, predicate_k: true }));
      return "Predicate 510(k) Number must be in the format KXXXXXX (e.g., K123456)";
    }
    if (formData.is_follow_up && !kNumberRegex.test(formData.previous_k)) {
      setValidationErrors((prev) => ({ ...prev, previous_k: true }));
      return "Previous 510(k) Number must be in the format KXXXXXX (e.g., K123456)";
    }

    const regulationNumberRegex = /^\d{3}\.\d{4}$/;
    if (
      formData.regulation_number &&
      !regulationNumberRegex.test(formData.regulation_number)
    ) {
      setValidationErrors((prev) => ({ ...prev, regulation_number: true }));
      return "Regulation Number must be in the format XXX.XXXX (e.g., 862.1345)";
    }

    if (!formData.internal_deadline) {
      setValidationErrors((prev) => ({ ...prev, internal_deadline: true }));
      return "Please select a valid Internal Deadline";
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.internal_deadline)) {
      setValidationErrors((prev) => ({ ...prev, internal_deadline: true }));
      return "Internal Deadline must be in the format yyyy-mm-dd";
    }
    try {
      new Date(formData.internal_deadline);
    } catch {
      setValidationErrors((prev) => ({ ...prev, internal_deadline: true }));
      return "Internal Deadline must be a valid date";
    }

    return null;
  };

  // Validate step-specific fields
  const validateStep = () => {
    const stepRequiredFields: {
      [key: number]: { key: string; label: string }[];
    } = {
      1: [
        { key: "submission_title", label: "Submission Title" },
        { key: "submission_type", label: "Submission Type" },
        { key: "regulatory_pathway", label: "Regulatory Pathway" },
        ...(formData.is_follow_up
          ? [{ key: "previous_k", label: "Previous 510(k) Number" }]
          : []),
      ],
      2: [
        { key: "device_name", label: "Device Name" },
        { key: "product_code", label: "Product Code" },
        { key: "device_class", label: "Device Class" },
        { key: "predicate_device_name", label: "Predicate Device Name" },
        { key: "predicate_k", label: "Predicate 510(k) Number" },
      ],
      3: [
        { key: "intended_use", label: "Intended Use" },
        { key: "clinical_setting", label: "Clinical Setting" },
        { key: "target_specimen", label: "Target Specimen" },
        { key: "target_market", label: "Target Market" },
      ],
      4: [],
      5: [
        { key: "submitter_org", label: "Submitter Organization" },
        { key: "contact_name", label: "Contact Name" },
        { key: "contact_email", label: "Contact Email" },
        { key: "reviewer_id", label: "Reviewer Lead" },
        { key: "internal_deadline", label: "Internal Deadline" },
      ],
    };

    const requiredFields = stepRequiredFields[currentStep];
    const missingFields = requiredFields.filter(({ key }) => {
      const value = formData[key as keyof Submission];
      return (
        value === "" ||
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "")
      );
    });

    if (missingFields.length > 0) {
      const newErrors = missingFields.reduce((acc, { key }) => {
        acc[key] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      setValidationErrors(newErrors);
      return `Please fill the following required fields: ${missingFields
        .map((f) => f.label)
        .join(", ")}`;
    }

    if (currentStep === 1 && formData.is_follow_up) {
      const kNumberRegex = /^K\d{6}$/;
      if (!kNumberRegex.test(formData.previous_k)) {
        setValidationErrors((prev) => ({ ...prev, previous_k: true }));
        return "Previous 510(k) Number must be in the format KXXXXXX (e.g., K123456)";
      }
    }

    if (currentStep === 2) {
      const kNumberRegex = /^K\d{6}$/;
      if (!kNumberRegex.test(formData.predicate_k)) {
        setValidationErrors((prev) => ({ ...prev, predicate_k: true }));
        return "Predicate 510(k) Number must be in the format KXXXXXX (e.g., K123456)";
      }
    }

    if (currentStep === 5) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email)) {
        setValidationErrors((prev) => ({ ...prev, contact_email: true }));
        return "Please provide a valid email address for Contact Email";
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (
        !formData.internal_deadline ||
        !dateRegex.test(formData.internal_deadline)
      ) {
        setValidationErrors((prev) => ({ ...prev, internal_deadline: true }));
        return "Please select a valid Internal Deadline (yyyy-mm-dd)";
      }
      try {
        new Date(formData.internal_deadline);
      } catch {
        setValidationErrors((prev) => ({ ...prev, internal_deadline: true }));
        return "Internal Deadline must be a valid date";
      }
    }

    return null;
  };

  const nextStep = async () => {
    if (currentStep < steps.length) {
      const validationError = validateStep();
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setValidationErrors({});
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCurrentStep(currentStep + 1);
      setIsLoading(false);
    }
  };

  const prevStep = async () => {
    if (currentStep > 1) {
      setValidationErrors({});
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCurrentStep(currentStep - 1);
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (formData.submission_type !== "traditional") {
      toast.error(
        "Only Traditional 510(k) submissions are supported at this time."
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        submission_title: formData.submission_title,
        submission_type: formData.submission_type,
        regulatory_pathway: formData.regulatory_pathway,
        is_follow_up: formData.is_follow_up,
        previous_k: formData.previous_k || "",
        device_name: formData.device_name,
        product_code: formData.product_code,
        regulation_number:
          formData.regulation_number.replace(/^21 CFR /, "") || "",
        device_class: formData.device_class,
        predicate_device_name: formData.predicate_device_name,
        predicate_k: formData.predicate_k,
        intended_use: formData.intended_use,
        clinical_setting: formData.clinical_setting,
        target_specimen: formData.target_specimen,
        target_market: formData.target_market,
        includes_clinical_testing: formData.includes_clinical_testing,
        includes_software: formData.includes_software,
        includes_sterile_packaging: formData.includes_sterile_packaging,
        major_predicate_changes: formData.major_predicate_changes,
        checklist_notes: formData.checklist_notes || "",
        submitter_org: formData.submitter_org,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || "",
        reviewer_id: formData.reviewer_id,
        internal_deadline: formData.internal_deadline,
        reviewer_notes: formData.reviewer_notes || "",
        completed_sections: completedSections,
        templateId: "510k_v1",
        submissionType: "510k",
        submittedBy: formData.contact_name || formData.reviewer_id,
        sections: [],
        sectionStatus: { totalSections: completedSections.length },
        rtaStatus: {},
        issues: 0,
        readinessScore: 0,
      };

      const res = await fetch(
        `http://localhost:8000/api/submissions/${submissionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.detail?.includes("E11000 duplicate key")) {
          throw new Error(
            "Duplicate submission. Try a different submission title."
          );
        }
        if (Array.isArray(errorData.detail)) {
          const errorMessages = errorData.detail
            .map((err: { loc: string | any[]; msg: any }) => {
              const field =
                err.loc && err.loc.length > 1 ? err.loc[1] : "Unknown field";
              return `${field}: ${err.msg || "Field required"}`;
            })
            .join(", ");
          throw new Error(
            errorMessages || "Submission update failed due to validation errors"
          );
        }
        throw new Error(errorData.detail || "Submission update failed");
      }

      const data = await res.json();
      toast.success("Submission updated!");
      router.push(`/submissions`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Submission update error";
      toast.error(errorMessage);
      console.error("Error during submission:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const availableSections = [
    "Device Description",
    "Substantial Equivalence",
    "Performance Testing",
    "Biocompatibility",
    "Software Documentation",
    "Labeling",
    "Risk Analysis",
    "Clinical Data",
    "Sterilization",
    "Shelf Life",
  ];

  const sectionCodes: { [key: string]: string } = {
    "Device Description": "F3.1",
    "Substantial Equivalence": "F3.2",
    "Performance Testing": "F3.3",
    "Software Documentation": "F3.4",
    Biocompatibility: "F3.5",
    Sterilization: "F3.6",
    "Clinical Data": "F3.7",
    Labeling: "F3.8",
    "Risk Analysis": "F3.9",
    "Shelf Life": "F3.10",
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <SidebarNavigation viewType={viewType} />
        <div className="flex-1 flex flex-col">
          <Header
            viewType={viewType}
            setViewType={setViewType}
            title={
              isEditMode ? "Edit 510(k) Submission" : "Create 510(k) Submission"
            }
            description="Enter details to generate or update an FDA submission checklist"
          />
          <div className="flex-1 p-4">
            <div className="max-w-[1200px] mx-auto w-full">
              <div className="bg-white border-b border-slate-200 px-6 py-6 mb-4 rounded-md shadow-sm">
                <HorizontalStepper steps={steps} currentStep={currentStep} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">
                            {currentStep}
                          </span>
                        </div>
                        {steps[currentStep - 1].title}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {steps[currentStep - 1].subtitle}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6 p-4">
                      {currentStep === 1 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor="submission_title"
                                className="text-sm font-medium text-slate-700"
                              >
                                Submission Title *
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                  <p>
                                    Internal reference name for this submission
                                    (e.g., ACME Glucose Monitor – July 2025)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="submission_title"
                              placeholder="Enter submission title"
                              value={formData.submission_title}
                              onChange={(e) =>
                                handleInputChange(
                                  "submission_title",
                                  e.target.value
                                )
                              }
                              required
                              className={cn(
                                "border",
                                validationErrors.submission_title &&
                                  "border-red-500 focus:ring-red-500"
                              )}
                            />
                            {validationErrors.submission_title && (
                              <p className="text-sm text-red-600 mt-1">
                                Submission Title is required
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="submission_type"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Submission Type *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Choose the FDA 510(k) submission type:
                                      Traditional, Special, or Abbreviated
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.submission_type}
                                onValueChange={(value) =>
                                  handleInputChange("submission_type", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.submission_type &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select submission type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="traditional">
                                    Traditional 510(k)
                                  </SelectItem>
                                  <SelectItem value="abbreviated">
                                    Abbreviated 510(k)
                                  </SelectItem>
                                  <SelectItem value="special">
                                    Special 510(k)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.submission_type && (
                                <p className="text-sm text-red-600 mt-1">
                                  Submission Type is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="regulatory_pathway"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Regulatory Pathway *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Select the applicable regulatory path
                                      (e.g., 510(k), De Novo, PMA)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.regulatory_pathway}
                                onValueChange={(value) =>
                                  handleInputChange("regulatory_pathway", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.regulatory_pathway &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select pathway" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="510k">510(k)</SelectItem>
                                  <SelectItem value="de-novo">
                                    De Novo
                                  </SelectItem>
                                  <SelectItem value="pma">PMA</SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.regulatory_pathway && (
                                <p className="text-sm text-red-600 mt-1">
                                  Regulatory Pathway is required
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium text-slate-700">
                                Is this a follow-up submission?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                  <p>
                                    Mark 'Yes' if this submission amends or
                                    references a prior 510(k)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                onClick={() =>
                                  handleInputChange("is_follow_up", false)
                                }
                                className={cn(
                                  "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                  !formData.is_follow_up
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                No
                              </Button>
                              <Button
                                type="button"
                                onClick={() =>
                                  handleInputChange("is_follow_up", true)
                                }
                                className={cn(
                                  "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                  formData.is_follow_up
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                Yes
                              </Button>
                            </div>
                          </div>
                          {formData.is_follow_up && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="previous_k"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Previous 510(k) Number *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Enter the prior 510(k) number this
                                      submission builds on
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="previous_k"
                                placeholder="e.g., K123456"
                                value={formData.previous_k}
                                onChange={(e) =>
                                  handleInputChange(
                                    "previous_k",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.previous_k &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.previous_k && (
                                <p className="text-sm text-red-600 mt-1">
                                  Previous 510(k) Number is required and must be
                                  in the format KXXXXXX
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {currentStep === 2 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="device_name"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Device Name *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Enter the marketed or model name of the
                                      device
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="device_name"
                                placeholder="Enter device name"
                                value={formData.device_name}
                                onChange={(e) =>
                                  handleInputChange(
                                    "device_name",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.device_name &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.device_name && (
                                <p className="text-sm text-red-600 mt-1">
                                  Device Name is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="product_code"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Product Code (FDA) *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Start typing to find FDA codes (e.g., NBW,
                                      LCG)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.product_code}
                                onValueChange={handleProductCodeChange}
                                disabled={isLoading || !!fetchError}
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.product_code &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue
                                    placeholder={
                                      isLoading
                                        ? "Loading..."
                                        : fetchError
                                        ? "Error loading product codes"
                                        : "Search product code"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto">
                                  <div className="p-2">
                                    <Input
                                      placeholder="Type to filter product codes..."
                                      value={predicateSearch}
                                      onChange={(e) =>
                                        debouncedPredicateSearch(e.target.value)
                                      }
                                      className="w-full"
                                    />
                                  </div>
                                  {productCodes.map((code) => (
                                    <SelectItem
                                      key={code.code}
                                      value={code.code}
                                    >
                                      {code.code} - {code.name}
                                    </SelectItem>
                                  ))}
                                  <div className="flex justify-between items-center px-2 py-1 border-t">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setCurrentPage((p) =>
                                          Math.max(1, p - 1)
                                        )
                                      }
                                      disabled={currentPage === 1}
                                    >
                                      Prev
                                    </Button>
                                    <span className="text-xs text-slate-500">
                                      Page {currentPage}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setCurrentPage((p) => p + 1)
                                      }
                                      disabled={!hasMore}
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </SelectContent>
                              </Select>
                              {validationErrors.product_code && (
                                <p className="text-sm text-red-600 mt-1">
                                  Product Code is required
                                </p>
                              )}
                              {fetchError && (
                                <p className="text-sm text-red-600 mt-1">
                                  Error: {fetchError}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="regulation_number"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Regulation Number
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      CFR reference (e.g., 862.1345),
                                      automatically populated from product code
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="regulation_number"
                                placeholder="862.1345"
                                value={
                                  formData.regulation_number
                                    ? `21 CFR ${formData.regulation_number}`
                                    : ""
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    "regulation_number",
                                    e.target.value.replace(/^21 CFR /, "")
                                  )
                                }
                                className={cn(
                                  "border",
                                  validationErrors.regulation_number &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.regulation_number && (
                                <p className="text-sm text-red-600 mt-1">
                                  Regulation Number must be in the format
                                  XXX.XXXX
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="device_class"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Device Class *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>FDA classification of the device</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.device_class}
                                onValueChange={(value) =>
                                  handleInputChange("device_class", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.device_class &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select device class" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="class-i">
                                    Class I
                                  </SelectItem>
                                  <SelectItem value="class-ii">
                                    Class II
                                  </SelectItem>
                                  <SelectItem value="class-iii">
                                    Class III
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.device_class && (
                                <p className="text-sm text-red-600 mt-1">
                                  Device Class is required
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="predicate_device_name"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Predicate Device Name *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Name of predicate device, if claiming
                                      equivalence
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <Input
                                  id="predicate_device_name"
                                  placeholder="Enter predicate device name"
                                  value={formData.predicate_device_name}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "predicate_device_name",
                                      e.target.value
                                    )
                                  }
                                  required
                                  className={cn(
                                    "border",
                                    validationErrors.predicate_device_name &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={handlePredicateSearch}
                                  disabled={isLoading}
                                  aria-label="Search predicate devices"
                                  className={cn(
                                    "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-green",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  <Search className="h-4 w-4" />
                                </button>
                              </div>
                              {validationErrors.predicate_device_name && (
                                <p className="text-sm text-red-600 mt-1">
                                  Predicate Device Name is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="predicate_k"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Predicate 510(k) Number *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      510(k) number of predicate device (e.g.,
                                      K201234)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="predicate_k"
                                placeholder="e.g., K123456"
                                value={formData.predicate_k}
                                onChange={(e) =>
                                  handleInputChange(
                                    "predicate_k",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.predicate_k &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.predicate_k && (
                                <p className="text-sm text-red-600 mt-1">
                                  Predicate 510(k) Number is required and must
                                  be in the format KXXXXXX
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {currentStep === 3 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="intended_use"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Intended Use Statement *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Describe the clinical purpose, user
                                      population, and setting
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoGenerateIntendedUse}
                                disabled={
                                  !formData.product_code ||
                                  !formData.device_name ||
                                  isLoading
                                }
                                className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                Auto-generate
                              </Button>
                            </div>
                            <Textarea
                              id="intended_use"
                              placeholder="Describe the intended use of your device..."
                              rows={4}
                              value={formData.intended_use}
                              onChange={(e) =>
                                handleInputChange(
                                  "intended_use",
                                  e.target.value
                                )
                              }
                              maxLength={1000}
                              required
                              className={cn(
                                "border",
                                validationErrors.intended_use &&
                                  "border-red-500 focus:ring-red-500"
                              )}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-slate-500">
                                {formData.intended_use.length}/1000 characters
                              </span>
                              {formData.intended_use && (
                                <span className="text-xs text-blue-600 italic">
                                  AI Draft - Edit before submission
                                </span>
                              )}
                            </div>
                            {validationErrors.intended_use && (
                              <p className="text-sm text-red-600 mt-1">
                                Intended Use is required
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="clinical_setting"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Clinical Setting *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Primary environment where the device will
                                      be used
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.clinical_setting}
                                onValueChange={(value) =>
                                  handleInputChange("clinical_setting", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.clinical_setting &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select setting" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lab">
                                    Laboratory
                                  </SelectItem>
                                  <SelectItem value="home">Home Use</SelectItem>
                                  <SelectItem value="hospital">
                                    Hospital
                                  </SelectItem>
                                  <SelectItem value="clinic">Clinic</SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.clinical_setting && (
                                <p className="text-sm text-red-600 mt-1">
                                  Clinical Setting is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="target_specimen"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Target Specimen *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Primary specimen type the device analyzes
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.target_specimen}
                                onValueChange={(value) =>
                                  handleInputChange("target_specimen", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.target_specimen &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select specimen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="blood">Blood</SelectItem>
                                  <SelectItem value="urine">Urine</SelectItem>
                                  <SelectItem value="saliva">Saliva</SelectItem>
                                  <SelectItem value="serum">Serum</SelectItem>
                                  <SelectItem value="plasma">Plasma</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.target_specimen && (
                                <p className="text-sm text-red-600 mt-1">
                                  Target Specimen is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="target_market"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Target Market *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Primary market where the device will be
                                      sold
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.target_market}
                                onValueChange={(value) =>
                                  handleInputChange("target_market", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.target_market &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select market" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="usa">USA</SelectItem>
                                  <SelectItem value="eu">EU</SelectItem>
                                  <SelectItem value="global">Global</SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.target_market && (
                                <p className="text-sm text-red-600 mt-1">
                                  Target Market is required
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {currentStep === 4 && (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <Label className="text-sm font-medium text-slate-700">
                              Required Sections
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {availableSections.map((section) => (
                                <div
                                  key={section}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={section}
                                    checked={completedSections.includes(
                                      section
                                    )}
                                    onCheckedChange={() =>
                                      handleSectionToggle(section)
                                    }
                                  />
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Label
                                        htmlFor={section}
                                        className="text-sm text-slate-700"
                                      >
                                        {section}
                                      </Label>
                                    </TooltipTrigger>
                                    {sectionCodes[section] && (
                                      <TooltipContent className="max-w-[240px]">
                                        <p>{sectionCodes[section]}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-slate-700">
                                  Includes Clinical Testing?
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Mark 'Yes' if the submission includes
                                      human clinical data
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "includes_clinical_testing",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.includes_clinical_testing
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  No
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "includes_clinical_testing",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.includes_clinical_testing
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  Yes
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-slate-700">
                                  Includes Software?
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Mark 'Yes' if the device includes software
                                      or embedded code
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-3">
                                <div>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleInputChange(
                                        "includes_software",
                                        false
                                      )
                                    }
                                    className={cn(
                                      "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                      !formData.includes_software
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    No
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleInputChange(
                                        "includes_software",
                                        true
                                      )
                                    }
                                    className={cn(
                                      "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                      formData.includes_software
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    Yes
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-slate-700">
                                  Includes Sterile Packaging?
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Mark 'Yes' if the device requires sterile
                                      packaging validation
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "includes_sterile_packaging",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.includes_sterile_packaging
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  No
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "includes_sterile_packaging",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.includes_sterile_packaging
                                      ? "bg-blue-600picker text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  Yes
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-slate-700">
                                  Major Predicate Changes?
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Mark 'Yes' if there are significant
                                      differences from the predicate device
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "major_predicate_changes",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.major_predicate_changes
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  No
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "major_predicate_changes",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.major_predicate_changes
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  Yes
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor="checklist_notes"
                                className="text-sm font-medium text-slate-700"
                              >
                                Notes for Checklist Tailoring
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-max-w-[240px]">
                                  <p>
                                    Optional notes to help customize the
                                    checklist for your specific submission
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div>
                              <Textarea
                                id="checklist_notes"
                                placeholder="Enter any specific requirements or considerations"
                                rows={3}
                                value={formData.checklist_notes}
                                onChange={(e) =>
                                  handleInputChange(
                                    "checklist_notes",
                                    e.target.value
                                  )
                                }
                                className="border"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {currentStep === 5 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="submitter_org"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Submitter Organization *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Legal name of the organization submitting
                                      this 510(k)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div>
                                <Input
                                  id="submitterorg"
                                  placeholder="Enter organization name"
                                  value={formData.submitter_org}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "submitter_org",
                                      e.target.value
                                    )
                                  }
                                  required
                                  className={cn(
                                    "border",
                                    validationErrors.submitter_org &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                />
                              </div>
                              {validationErrors.submitter_org && (
                                <p className="text-sm text-red-600 mt-1">
                                  Submitter Organization is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="contact_name"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Primary Contact *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Primary contact person for FDA
                                      correspondence
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contact_name"
                                placeholder="Enter contact name"
                                value={formData.contact_name}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contact_name",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.contact_name &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.contact_name && (
                                <p className="text-sm text-red-600 mt-1">
                                  Primary Contact is required
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="contact_email"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Email Address *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>Email address for FDA communication</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contact_email"
                                type="email"
                                placeholder="Enter email address"
                                value={formData.contact_email}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contact_email",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.contact_email &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.contact_email && (
                                <p className="text-sm text-red-600 mt-1">
                                  Valid Email Address is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="contact_phone"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Phone Number
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Optional phone number for FDA to reach you
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contact_phone"
                                placeholder="Enter phone number"
                                value={formData.contact_phone}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contact_phone",
                                    e.target.value
                                  )
                                }
                                className="border"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="reviewer_id"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Reviewer Lead *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Name of the internal lead reviewer for
                                      this submission
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="reviewer_id"
                                placeholder="Enter reviewer name"
                                value={formData.reviewer_id}
                                onChange={(e) =>
                                  handleInputChange(
                                    "reviewer_id",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.reviewer_id &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.reviewer_id && (
                                <p className="text-sm text-red-600 mt-1">
                                  Reviewer Lead is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="internal_deadline"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Internal Deadline *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px]">
                                    <p>
                                      Internal target date for submission
                                      completion
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full h-10 justify-start text-left font-normal",
                                      validationErrors.internal_deadline &&
                                        "border-red-500 focus:ring-red-500"
                                    )}
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    {deadline ? (
                                      format(deadline, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={deadline}
                                    onSelect={(date) => {
                                      setDeadline(date);
                                      handleInputChange(
                                        "internal_deadline",
                                        date ? format(date, "yyyy-MM-dd") : ""
                                      );
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              {validationErrors.internal_deadline && (
                                <p className="text-sm text-red-600 mt-1">
                                  Internal Deadline is required
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor="reviewer_notes"
                                className="text-sm font-medium text-slate-700"
                              >
                                Review Notes
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px]">
                                  <p>
                                    Optional comments or special considerations
                                    for the internal reviewer
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Textarea
                              id="reviewer_notes"
                              placeholder="Any additional notes for the review team..."
                              rows={4}
                              value={formData.reviewer_notes}
                              onChange={(e) =>
                                handleInputChange(
                                  "reviewer_notes",
                                  e.target.value
                                )
                              }
                              className="border"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between pt-6 border-t border-slate-200">
                        <Button
                          onClick={prevStep}
                          disabled={currentStep === 1 || isLoading}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          onClick={
                            currentStep === steps.length
                              ? handleSubmit
                              : nextStep
                          }
                          disabled={isLoading}
                        >
                          {currentStep === steps.length
                            ? "Update Submission"
                            : "Next"}
                          {currentStep < steps.length && (
                            <ArrowRight className="w-4 h-4 ml-2" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          {showPredicateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="mx-4 w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Search FDA Predicate Devices
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPredicateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Close predicate search modal"
                  >
                    ✗
                  </button>
                </div>
                <div className="mb-4">
                  <Input
                    placeholder="Search by device name, K-number, or manufacturer..."
                    value={predicateSearch}
                    onChange={(e) => debouncedPredicateSearch(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handlePredicateSearch()
                    }
                    className="w-full"
                  />
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {predicateDevices.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-slate-500">
                      No predicate devices found
                    </p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Device Name
                          </th>
                          <th className="text-px-4 py-3 text-left text-sm font-medium text-slate-700">
                            K-number
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Manufacturer
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Clearance Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {predicateDevices.map((device, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">
                              {device.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {device.k_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {device.manufacturer}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {device.clearance_date}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                onClick={() => handleSelectPredicate(device)}
                                className="bg-blue-600 hover:bg-blue-700"
                                aria-label={`Select predicate device ${device.name}`}
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowPredicateModal(false)}
                    className="text-slate-700 border-slate-300 hover:bg-slate-100"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
