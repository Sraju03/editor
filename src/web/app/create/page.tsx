"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HorizontalStepper } from "@/components/horizontal-stepper";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

const steps = [
  {
    id: "overview",
    title: "Overview",
    subtitle: "Basic submission details",
  },
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

export default function CreateSubmissionPage() {
  const router = useRouter();
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
  const [completedSections, setCompletedSections] = useState<string[]>([
    "Device Description",
    "Substantial Equivalence",
    "Performance Testing",
    "Labeling",
    "Clinical Performance",
  ]);

  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});

  const ITEMS_PER_PAGE = 100;

  const [formData, setFormData] = useState({
    submissionTitle: "",
    submissionType: "",
    regulatoryPathway: "",
    isFollowUp: false,
    previousK: "",
    deviceName: "",
    productCode: "",
    regulationNumber: "",
    deviceClass: "",
    predicateDeviceName: "",
    predicateK: "",
    intendedUse: "",
    clinicalSetting: "",
    targetSpecimen: "",
    targetMarket: "",
    includesClinicalTesting: false,
    includesSoftware: false,
    includesSterilePackaging: false,
    majorPredicateChanges: false,
    checklistNotes: "",
    submitterOrg: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    reviewerLead: "",
    internalDeadline: "",
    reviewerNotes: "",
  });

  const handleInputChange = (
    field: string,
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
  };

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
      } catch (err: any) {
        const message = err.message || "Unknown error";
        setFetchError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductCodes();
  }, [currentPage, predicateSearch]);

  // Handle product code change and auto-fill device class and regulation number
  const handleProductCodeChange = (value: string) => {
    handleInputChange("productCode", value);
    const selected = productCodes.find((c) => c.code === value);
    if (selected) {
      handleInputChange("deviceClass", "class-ii");
      handleInputChange("regulationNumber", selected.regulation_number || "");
    } else {
      handleInputChange("deviceClass", "");
      handleInputChange("regulationNumber", "");
    }
  };

  // Generate intended use statement
  const handleAutoGenerateIntendedUse = async () => {
    if (!formData.productCode || !formData.deviceName) {
      toast.error("Select a product code and enter a device name first");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/ai/intended-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_code: formData.productCode,
          device_category: formData.deviceName,
          predicate_device_name: formData.predicateDeviceName || undefined,
        }),
      });
      if (!res.ok)
        throw new Error(`HTTP ${res.status} - Failed to generate intended use`);
      const data = await res.json();
      if (!data.intended_use) throw new Error("No intended use returned");
      handleInputChange("intendedUse", data.intended_use);
      toast.success("Generated intended use");
    } catch (err: any) {
      toast.error(err.message || "Intended use generation failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search predicate devices
  const handlePredicateSearch = async () => {
    if (!formData.productCode) {
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
            product_code: formData.productCode,
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
    } catch (err: any) {
      toast.error(err.message || "Predicate fetch error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select predicate device
  const handleSelectPredicate = (device: PredicateDevice) => {
    handleInputChange("predicateDeviceName", device.name);
    handleInputChange("predicateK", device.k_number);
    handleInputChange("deviceName", device.name);
    setShowPredicateModal(false);
  };

  // Validate form fields
  const validateForm = () => {
    const requiredFields = [
      { key: "submissionTitle", label: "Submission Title" },
      { key: "submissionType", label: "Submission Type" },
      { key: "regulatoryPathway", label: "Regulatory Pathway" },
      { key: "deviceName", label: "Device Name" },
      { key: "productCode", label: "Product Code" },
      { key: "deviceClass", label: "Device Class" },
      { key: "predicateDeviceName", label: "Predicate Device Name" },
      { key: "predicateK", label: "Predicate 510(k) Number" },
      { key: "intendedUse", label: "Intended Use" },
      { key: "clinicalSetting", label: "Clinical Setting" },
      { key: "targetSpecimen", label: "Target Specimen" },
      { key: "targetMarket", label: "Target Market" },
      { key: "submitterOrg", label: "Submitter Organization" },
      { key: "contactName", label: "Contact Name" },
      { key: "contactEmail", label: "Contact Email" },
      { key: "reviewerLead", label: "Reviewer Lead" },
    ];

    const missing = requiredFields.filter(({ key }) => {
      const value = formData[key as keyof typeof formData];
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      setValidationErrors((prev) => ({ ...prev, contactEmail: true }));
      return "Please provide a valid email address for Contact Email";
    }

    const kNumberRegex = /^K\d{6}$/;
    if (!kNumberRegex.test(formData.predicateK)) {
      setValidationErrors((prev) => ({ ...prev, predicateK: true }));
      return "Predicate 510(k) Number must be in the format KXXXXXX (e.g., K123456)";
    }

    const regulationNumberRegex = /^\d{3}\.\d{4}$/;
    if (
      formData.regulationNumber &&
      !regulationNumberRegex.test(formData.regulationNumber)
    ) {
      setValidationErrors((prev) => ({ ...prev, regulationNumber: true }));
      return "Regulation Number must be in the format XXX.XXXX (e.g., 862.1345)";
    }

    if (!formData.internalDeadline) {
      setValidationErrors((prev) => ({ ...prev, internalDeadline: true }));
      return "Please select a valid Internal Deadline";
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.internalDeadline)) {
      setValidationErrors((prev) => ({ ...prev, internalDeadline: true }));
      return "Internal Deadline must be in the format yyyy-mm-dd";
    }
    try {
      new Date(formData.internalDeadline);
    } catch {
      setValidationErrors((prev) => ({ ...prev, internalDeadline: true }));
      return "Internal Deadline must be a valid date";
    }

    return null;
  };

  // Navigation to next step with validation
  const nextStep = async () => {
    if (currentStep < steps.length) {
      // Define required fields for each step
      const stepRequiredFields: {
        [key: number]: { key: string; label: string }[];
      } = {
        1: [
          { key: "submissionTitle", label: "Submission Title" },
          { key: "submissionType", label: "Submission Type" },
          { key: "regulatoryPathway", label: "Regulatory Pathway" },
        ],
        2: [
          { key: "deviceName", label: "Device Name" },
          { key: "productCode", label: "Product Code" },
          { key: "deviceClass", label: "Device Class" },
          { key: "predicateDeviceName", label: "Predicate Device Name" },
          { key: "predicateK", label: "Predicate 510(k) Number" },
        ],
        3: [
          { key: "intendedUse", label: "Intended Use" },
          { key: "clinicalSetting", label: "Clinical Setting" },
          { key: "targetSpecimen", label: "Target Specimen" },
          { key: "targetMarket", label: "Target Market" },
        ],
        4: [], // No required fields for Scope & Flags
        5: [
          { key: "submitterOrg", label: "Submitter Organization" },
          { key: "contactName", label: "Contact Name" },
          { key: "contactEmail", label: "Contact Email" },
          { key: "reviewerLead", label: "Reviewer Lead" },
          { key: "internalDeadline", label: "Internal Deadline" },
        ],
      };

      // Validate required fields for the current step
      const requiredFields = stepRequiredFields[currentStep];
      const missingFields = requiredFields.filter(({ key }) => {
        const value = formData[key as keyof typeof formData];
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
        toast.error(
          `Please fill the following required fields: ${missingFields
            .map((f) => f.label)
            .join(", ")}`
        );
        return;
      }

      // Additional validation for specific fields
      if (currentStep === 2) {
        const kNumberRegex = /^K\d{6}$/;
        if (!kNumberRegex.test(formData.predicateK)) {
          setValidationErrors((prev) => ({ ...prev, predicateK: true }));
          toast.error(
            "Predicate 510(k) Number must be in the format KXXXXXX (e.g., K123456)"
          );
          return;
        }
      }

      if (currentStep === 5) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.contactEmail)) {
          setValidationErrors((prev) => ({ ...prev, contactEmail: true }));
          toast.error("Please provide a valid email address for Contact Email");
          return;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (
          !formData.internalDeadline ||
          !dateRegex.test(formData.internalDeadline)
        ) {
          setValidationErrors((prev) => ({ ...prev, internalDeadline: true }));
          toast.error("Please select a valid Internal Deadline (yyyy-mm-dd)");
          return;
        }
        try {
          new Date(formData.internalDeadline);
        } catch {
          setValidationErrors((prev) => ({ ...prev, internalDeadline: true }));
          toast.error("Internal Deadline must be a valid date");
          return;
        }
      }

      // Clear validation errors and proceed to the next step
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

  // Handle submission
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (formData.submissionType !== "traditional") {
      toast.error(
        "Only Traditional 510(k) submissions are supported at this time."
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        submission_title: formData.submissionTitle,
        submission_type: formData.submissionType,
        regulatory_pathway: formData.regulatoryPathway,
        is_follow_up: formData.isFollowUp,
        previous_k: formData.previousK,
        device_name: formData.deviceName,
        product_code: formData.productCode,
        regulation_number: formData.regulationNumber.replace(/^21 CFR /, ""),
        device_class: formData.deviceClass,
        predicate_device_name: formData.predicateDeviceName,
        predicate_k: formData.predicateK,
        intended_use: formData.intendedUse,
        clinical_setting: formData.clinicalSetting,
        target_specimen: formData.targetSpecimen,
        target_market: formData.targetMarket,
        includes_clinical_testing: formData.includesClinicalTesting,
        includes_software: formData.includesSoftware,
        includes_sterile_packaging: formData.includesSterilePackaging,
        major_predicate_changes: formData.majorPredicateChanges,
        checklist_notes: formData.checklistNotes,
        submitter_org: formData.submitterOrg,
        contact_name: formData.contactName,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        reviewer_id: formData.reviewerLead,
        internal_deadline: formData.internalDeadline,
        reviewer_notes: formData.reviewerNotes,
      };

      const res = await fetch("http://localhost:8000/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.detail?.includes("E11000 duplicate key")) {
          throw new Error(
            "Duplicate submission. Try a different submission title."
          );
        }
        if (Array.isArray(errorData.detail)) {
          const errorMessages = errorData.detail
            .map((err: any) => {
              const field =
                err.loc && err.loc.length > 1 ? err.loc[1] : "Unknown field";
              return `${field}: ${err.msg || "Field required"}`;
            })
            .join(", ");
          throw new Error(
            errorMessages || "Submission failed due to validation errors"
          );
        }
        throw new Error(errorData.detail || "Submission failed");
      }

      const data = await res.json();
      toast.success("Submission created!");
      router.push(`/submissions/${data.id}/checklist`);
    } catch (err: any) {
      toast.error(err.message || "Submission error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const availableSections = [
    "Device Description",
    "Substantial Equivalence",
    "Performance Testing",
    "Software Documentation",
    "Biocompatibility",
    "Sterilization & Shelf Life",
    "Clinical Performance",
    "Labeling",
  ];

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <SidebarNavigation viewType={viewType} />
        <div className="flex-1 flex flex-col">
          <Header
            viewType={viewType}
            setViewType={setViewType}
            title="Create 510(k) Submission"
            description="Enter details to generate an FDA submission checklist"
          />
          <div className="flex-1 p-4">
            <div className="max-w-screen-xl mx-auto w-full">
              <div className="bg-white border-b border-slate-200 px-6 py-6 mb-4 rounded-md shadow-sm">
                <HorizontalStepper steps={steps} currentStep={currentStep} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Card className="bg-white border-slate-200 shadow-sm w-full">
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
                                htmlFor="submissionTitle"
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
                              id="submissionTitle"
                              placeholder="Enter submission title"
                              value={formData.submissionTitle}
                              onChange={(e) =>
                                handleInputChange(
                                  "submissionTitle",
                                  e.target.value
                                )
                              }
                              required
                              className={cn(
                                "border",
                                validationErrors.submissionTitle &&
                                  "border-red-500 focus:ring-red-500"
                              )}
                            />
                            {validationErrors.submissionTitle && (
                              <p className="text-sm text-red-600 mt-1">
                                Submission Title is required
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="submissionType"
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
                                value={formData.submissionType}
                                onValueChange={(value) =>
                                  handleInputChange("submissionType", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.submissionType &&
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
                              {validationErrors.submissionType && (
                                <p className="text-sm text-red-600 mt-1">
                                  Submission Type is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="regulatoryPathway"
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
                                value={formData.regulatoryPathway}
                                onValueChange={(value) =>
                                  handleInputChange("regulatoryPathway", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.regulatoryPathway &&
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
                              {validationErrors.regulatoryPathway && (
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
                                  handleInputChange("isFollowUp", false)
                                }
                                className={cn(
                                  "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                  !formData.isFollowUp
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                No
                              </Button>
                              <Button
                                type="button"
                                onClick={() =>
                                  handleInputChange("isFollowUp", true)
                                }
                                className={cn(
                                  "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                  formData.isFollowUp
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                Yes
                              </Button>
                            </div>
                          </div>

                          {formData.isFollowUp && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="previousK"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Previous 510(k) Number
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
                                id="previousK"
                                placeholder="e.g., K123456"
                                value={formData.previousK}
                                onChange={(e) =>
                                  handleInputChange("previousK", e.target.value)
                                }
                                className={cn(
                                  "border",
                                  validationErrors.previousK &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.previousK && (
                                <p className="text-sm text-red-600 mt-1">
                                  Previous 510(k) Number is required
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
                                  htmlFor="deviceName"
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
                                id="deviceName"
                                placeholder="Enter device name"
                                value={formData.deviceName}
                                onChange={(e) =>
                                  handleInputChange(
                                    "deviceName",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.deviceName &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.deviceName && (
                                <p className="text-sm text-red-600 mt-1">
                                  Device Name is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="productCode"
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
                                value={formData.productCode}
                                onValueChange={handleProductCodeChange}
                                disabled={isLoading || !!fetchError}
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.productCode &&
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
                                        setPredicateSearch(e.target.value)
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
                                  <div>
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
                              {validationErrors.productCode && (
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
                                  htmlFor="regulationNumber"
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
                                id="regulationNumber"
                                placeholder="862.1345"
                                value={
                                  formData.regulationNumber
                                    ? `21 CFR ${formData.regulationNumber}`
                                    : ""
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    "regulationNumber",
                                    e.target.value.replace(/^21 CFR /, "")
                                  )
                                }
                                className={cn(
                                  "border",
                                  validationErrors.regulationNumber &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.regulationNumber && (
                                <p className="text-sm text-red-600 mt-1">
                                  Regulation Number is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="deviceClass"
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
                                value={formData.deviceClass}
                                onValueChange={(value) =>
                                  handleInputChange("deviceClass", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.deviceClass &&
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
                              {validationErrors.deviceClass && (
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
                                  htmlFor="predicateDeviceName"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Predicate Device Name *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Name of predicate device, if claiming
                                      equivalence
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <Input
                                  id="predicateDeviceName"
                                  placeholder="Enter predicate device name"
                                  value={formData.predicateDeviceName}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "predicateDeviceName",
                                      e.target.value
                                    )
                                  }
                                  required
                                  className={cn(
                                    "border",
                                    validationErrors.predicateDeviceName &&
                                      "border-red-500 focus:ring-red-500"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={handlePredicateSearch}
                                  disabled={isLoading}
                                  className={cn(
                                    "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  <Search className="h-4 w-4" />
                                </button>
                              </div>
                              {validationErrors.predicateDeviceName && (
                                <p className="text-sm text-red-600 mt-1">
                                  Predicate Device Name is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="predicateK"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Predicate K Number *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      510(k) number of predicate device (e.g.,
                                      K201234)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="predicateK"
                                placeholder="e.g., K123456"
                                value={formData.predicateK}
                                onChange={(e) =>
                                  handleInputChange(
                                    "predicateK",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.predicateK &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.predicateK && (
                                <p className="text-sm text-red-600 mt-1">
                                  Predicate K Number is required
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
                                  htmlFor="intendedUse"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Intended Use Statement *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
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
                                  !formData.productCode ||
                                  !formData.deviceName ||
                                  isLoading
                                }
                                className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 bg-white rounded-md px-3 py-1.5 font-normal"
                              >
                                Auto-generate
                              </Button>
                            </div>
                            <Textarea
                              id="intendedUse"
                              placeholder="Describe the intended use of your device..."
                              rows={4}
                              value={formData.intendedUse}
                              onChange={(e) =>
                                handleInputChange("intendedUse", e.target.value)
                              }
                              maxLength={1000}
                              required
                              className={cn(
                                "border",
                                validationErrors.intendedUse &&
                                  "border-red-500 focus:ring-red-500"
                              )}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-slate-500">
                                {formData.intendedUse.length}/1000 characters
                              </span>
                              {formData.intendedUse && (
                                <span className="text-xs text-blue-600 italic font-light">
                                  AI Draft – Edit before submission
                                </span>
                              )}
                            </div>
                            {validationErrors.intendedUse && (
                              <p className="text-sm text-red-600 mt-1">
                                Intended Use Statement is required
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="clinicalSetting"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Clinical Setting *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Primary environment where the device will
                                      be used
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.clinicalSetting}
                                onValueChange={(value) =>
                                  handleInputChange("clinicalSetting", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.clinicalSetting &&
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
                              {validationErrors.clinicalSetting && (
                                <p className="text-sm text-red-600 mt-1">
                                  Clinical Setting is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="targetSpecimen"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Target Specimen *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Primary specimen type the device analyzes
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.targetSpecimen}
                                onValueChange={(value) =>
                                  handleInputChange("targetSpecimen", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.targetSpecimen &&
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
                              {validationErrors.targetSpecimen && (
                                <p className="text-sm text-red-600 mt-1">
                                  Target Specimen is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="targetMarket"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Target Market *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Primary market where the device will be
                                      sold
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select
                                value={formData.targetMarket}
                                onValueChange={(value) =>
                                  handleInputChange("targetMarket", value)
                                }
                                required
                              >
                                <SelectTrigger
                                  className={cn(
                                    "border",
                                    validationErrors.targetMarket &&
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
                              {validationErrors.targetMarket && (
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
                              {availableSections.map((section) => {
                                const sectionCodes: { [key: string]: string } =
                                  {
                                    "Device Description": "F3.1",
                                    "Substantial Equivalence": "F3.2",
                                    "Performance Testing": "F3.3",
                                    "Software Documentation": "F3.4",
                                    Biocompatibility: "F3.5",
                                    "Sterilization & Shelf Life": "F3.6",
                                    "Clinical Performance": "F3.7",
                                    Labeling: "F3.8",
                                  };
                                const sectionCode = sectionCodes[section] || "";
                                return (
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
                                      {sectionCode && (
                                        <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                          <p>{sectionCode}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </div>
                                );
                              })}
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
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
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
                                      "includesClinicalTesting",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.includesClinicalTesting
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
                                      "includesClinicalTesting",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.includesClinicalTesting
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
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Mark 'Yes' if the device includes software
                                      or embedded code
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange("includesSoftware", false)
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.includesSoftware
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  No
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange("includesSoftware", true)
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.includesSoftware
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  Yes
                                </Button>
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
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
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
                                      "includesSterilePackaging",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.includesSterilePackaging
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
                                      "includesSterilePackaging",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.includesSterilePackaging
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
                                  Major Predicate Changes?
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
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
                                      "majorPredicateChanges",
                                      false
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    !formData.majorPredicateChanges
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
                                      "majorPredicateChanges",
                                      true
                                    )
                                  }
                                  className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                    formData.majorPredicateChanges
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
                                htmlFor="checklistNotes"
                                className="text-sm font-medium text-slate-700"
                              >
                                Notes for Checklist Tailoring
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                  <p>
                                    Optional notes to help customize the
                                    checklist for your specific submission
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Textarea
                              id="checklistNotes"
                              placeholder="Enter any specific requirements or considerations"
                              rows={3}
                              value={formData.checklistNotes}
                              onChange={(e) =>
                                handleInputChange(
                                  "checklistNotes",
                                  e.target.value
                                )
                              }
                              className="border"
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 5 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="submitterOrg"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Submitter Organization *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Legal name of the organization submitting
                                      this 510(k)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="submitterOrg"
                                placeholder="Enter organization name"
                                value={formData.submitterOrg}
                                onChange={(e) =>
                                  handleInputChange(
                                    "submitterOrg",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.submitterOrg &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.submitterOrg && (
                                <p className="text-sm text-red-600 mt-1">
                                  Submitter Organization is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="contactName"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Primary Contact *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Primary contact person for FDA
                                      correspondence
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contactName"
                                placeholder="Enter contact name"
                                value={formData.contactName}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contactName",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.contactName &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.contactName && (
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
                                  htmlFor="contactEmail"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Email Address *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>Email address for FDA communication</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contactEmail"
                                type="email"
                                placeholder="Enter email address"
                                value={formData.contactEmail}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contactEmail",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.contactEmail &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.contactEmail && (
                                <p className="text-sm text-red-600 mt-1">
                                  Email Address is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="contactPhone"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Phone Number
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Optional phone number for FDA to reach you
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="contactPhone"
                                placeholder="Enter phone number"
                                value={formData.contactPhone}
                                onChange={(e) =>
                                  handleInputChange(
                                    "contactPhone",
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
                                  htmlFor="reviewerLead"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Reviewer Lead *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                    <p>
                                      Name of the internal lead reviewer for
                                      this submission
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="reviewerLead"
                                placeholder="Enter reviewer name"
                                value={formData.reviewerLead}
                                onChange={(e) =>
                                  handleInputChange(
                                    "reviewerLead",
                                    e.target.value
                                  )
                                }
                                required
                                className={cn(
                                  "border",
                                  validationErrors.reviewerLead &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              />
                              {validationErrors.reviewerLead && (
                                <p className="text-sm text-red-600 mt-1">
                                  Reviewer Lead is required
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor="internalDeadline"
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Internal Deadline *
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[240px] bg-white shadow-md">
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
                                      validationErrors.internalDeadline &&
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
                                        "internalDeadline",
                                        date ? format(date, "yyyy-MM-dd") : ""
                                      );
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              {validationErrors.internalDeadline && (
                                <p className="text-sm text-red-600 mt-1">
                                  Internal Deadline is required
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor="reviewerNotes"
                                className="text-sm font-medium text-slate-700"
                              >
                                Review Notes
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[240px] bg-white shadow-md">
                                  <p>
                                    Optional comments or special considerations
                                    for the internal reviewer
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Textarea
                              id="reviewerNotes"
                              placeholder="Any additional notes for the review team..."
                              rows={4}
                              value={formData.reviewerNotes}
                              onChange={(e) =>
                                handleInputChange(
                                  "reviewerNotes",
                                  e.target.value
                                )
                              }
                              className="border"
                            />
                          </div>
                        </div>
                      )}

                      {/* Navigation Buttons */}
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
                            ? "Submit & Generate FDA Checklist"
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

          {/* Predicate Device Search Modal */}
          {showPredicateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="mx-4 w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Search FDA Predicate Devices
                  </h3>
                  <button
                    onClick={() => setShowPredicateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-4">
                  <Input
                    placeholder="Search by device name, K-number, or manufacturer..."
                    value={predicateSearch}
                    onChange={(e) => setPredicateSearch(e.target.value)}
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
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Device Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
