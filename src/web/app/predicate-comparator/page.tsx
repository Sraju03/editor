"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Upload,
  Eye,
  Plus,
  Check,
  X,
  ChevronDown,
  Info,
  RotateCcw,
  HelpCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

// AI Explainability Modal Component
interface AIExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldLabel: string;
  aiSuggestion: string;
  yourDeviceData: string;
  predicateData: string;
  reasoning: string;
  prompt?: string;
  modelVersion?: string;
  onRegenerate?: () => void;
  onSave?: (editedText: string) => void;
}

function AIExplainabilityModal({
  isOpen,
  onClose,
  fieldLabel,
  aiSuggestion,
  yourDeviceData,
  predicateData,
  reasoning,
  prompt = "Compare the intended use statements and determine substantial equivalence...",
  modelVersion = "gpt-4o",
  onRegenerate,
  onSave,
}: AIExplainabilityModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(aiSuggestion);
  const [showPromptPanel, setShowPromptPanel] = useState(false);

  const handleSave = () => {
    if (onSave) {
      onSave(editedText);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-2xl shadow-xl p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            AI Explanation – {fieldLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">AI Suggestion</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-mode"
                  checked={isEditing}
                  onCheckedChange={setIsEditing}
                />
                <Label htmlFor="edit-mode" className="text-sm">
                  Edit
                </Label>
              </div>
            </div>
            {isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={4}
                className="w-full"
              />
            ) : (
              <div className="bg-muted rounded-lg p-4 font-medium text-sm leading-relaxed">
                {aiSuggestion}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">
              Comparison Summary
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Your Device</TableHead>
                    <TableHead className="font-semibold">
                      Predicate Device
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="p-4 align-top">
                      <div className="text-sm">{yourDeviceData}</div>
                    </TableCell>
                    <TableCell className="p-4 align-top">
                      <div className="text-sm">{predicateData}</div>
                      {yourDeviceData !== predicateData && (
                        <div className="mt-2">
                          <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">
                            Difference Detected
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">
              AI Reasoning
            </Label>
            <div className="bg-gray-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{reasoning}"
              </p>
            </div>
          </div>

          <Collapsible open={showPromptPanel} onOpenChange={setShowPromptPanel}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
              >
                <Label className="text-sm font-medium cursor-pointer">
                  Prompt & Inputs
                </Label>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showPromptPanel ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600">
                    GPT Prompt
                  </Label>
                  <div className="bg-gray-100 rounded p-3 text-xs font-mono text-gray-700 mt-1">
                    {prompt}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Model Version
                    </Label>
                    <p className="text-xs text-gray-700 mt-1">{modelVersion}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Processing Time
                    </Label>
                    <p className="text-xs text-gray-700 mt-1">1.2s</p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={onRegenerate}
            className="flex items-center gap-2 bg-transparent"
          >
            <RotateCcw className="h-4 w-4" />
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save & Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Interfaces from old UI
interface PredicateDevice {
  name: string;
  k_number: string;
  manufacturer: string;
  clearance_date: string;
  confidence: number;
  regulation_number: string | null;
  device_description: string | null;
}

interface Predicate {
  id: string;
  deviceName: string;
  kNumber: string;
  productCode: string;
  class: string;
  date: string;
  intendedUse: string;
  technology: string;
  performanceMetrics: string;
  added: boolean;
  manufacturer?: string;
  regulationNumber?: string;
  deviceDescription?: string | null;
}
interface DeviceInfo {
  deviceName: string;
  productCode: string;
  intendedUse: string;
  technology: string;
  performanceMetrics: string;
  deviceDescription?: string;
}

interface PerformanceMetric {
  metric: string;
  yourDevice: string;
  predicate: string;
  delta: string;
  confidence: string;
  sampleSize: string;
  method: string;
  deltaType: string;
}

const mockPredicates: Predicate[] = [
  {
    id: "1",
    deviceName: "QuickVue Influenza A+B Test",
    kNumber: "K123456",
    productCode: "LLC",
    class: "II",
    date: "2023-03-15",
    intendedUse:
      "For the qualitative detection of Influenza A and B antigens in nasal swabs",
    technology: "Lateral flow immunoassay using monoclonal antibodies",
    performanceMetrics: "Sensitivity: 89.2%, Specificity: 94.8%",
    added: false,
    manufacturer: "Quidel Corporation",
    regulationNumber: "866.3320",
    deviceDescription:
      "The QuickVue Influenza A+B Test is a lateral flow immunoassay for detecting Influenza A and B antigens in nasal swabs.",
  },
  {
    id: "2",
    deviceName: "BD Veritor Flu A+B",
    kNumber: "K789012",
    productCode: "LLC",
    class: "II",
    date: "2022-11-08",
    intendedUse:
      "For the qualitative detection of Influenza A and B antigens in nasal specimens",
    technology: "Lateral flow immunoassay technology",
    performanceMetrics: "Sensitivity: 91.7%, Specificity: 95.3%",
    added: false,
    manufacturer: "Becton Dickinson",
    regulationNumber: "866.3320",
    deviceDescription:
      "The BD Veritor Flu A+B is a rapid lateral flow test for Influenza A and B antigen detection in nasal specimens.",
  },
];

const performanceMetrics: PerformanceMetric[] = [
  {
    metric: "Sensitivity",
    yourDevice: "92.4%",
    predicate: "89.2%",
    delta: "+3.2%",
    confidence: "95%",
    sampleSize: "450",
    method: "Clinical Study",
    deltaType: "positive",
  },
  {
    metric: "Specificity",
    yourDevice: "96.1%",
    predicate: "94.8%",
    delta: "+1.3%",
    confidence: "95%",
    sampleSize: "450",
    method: "Clinical Study",
    deltaType: "positive",
  },
  {
    metric: "LoD (TCID50/mL)",
    yourDevice: "1.2 x 10³",
    predicate: "2.1 x 10³",
    delta: "-43%",
    confidence: "95%",
    sampleSize: "120",
    method: "Analytical Study",
    deltaType: "positive",
  },
];

const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default function PredicateComparator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceName: "",
    productCode: "",
    intendedUse: "",
    technology: "",
    performanceMetrics: "",
    deviceDescription: "",
  });
  const [predicates, setPredicates] = useState<Predicate[]>(mockPredicates);
  const [selectedPredicates, setSelectedPredicates] = useState<Predicate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiGenerated, setAiGenerated] = useState(true);
  const [expandedPredicates, setExpandedPredicates] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const router = useRouter();
  const [currentAiField, setCurrentAiField] = useState({
    fieldLabel: "",
    aiSuggestion: "",
    yourDeviceData: "",
    predicateData: "",
    reasoning: "",
  });

  const steps = [
    { id: 1, title: "Your Device Info", description: "Device specifications" },
    { id: 2, title: "Predicate Search", description: "Find predicates" },
    { id: 3, title: "Review Details", description: "Verify information" },
    { id: 4, title: "Predicate Comparison", description: "Compare key fields" },
    {
      id: 5,
      title: "Clinical Performance",
      description: "Performance metrics",
    },
    { id: 6, title: "AI SE Summary", description: "Generate summary" },
    { id: 7, title: "Section B Overview", description: "Final assembly" },
  ];

  // Auto-search functionality
  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const trimmedQuery = searchQuery.trim();
          const isKNumber = /^K\d{6}$/i.test(trimmedQuery);
          let productCode = deviceInfo.productCode || "Unknown";
          let description = "";
          let kNumber = "";

          if (isKNumber) {
            kNumber = trimmedQuery.toUpperCase();
          } else {
            const [firstPart, ...descriptionParts] = trimmedQuery.split(" ");
            productCode = firstPart || deviceInfo.productCode || "Unknown";
            description = descriptionParts.join(" ");
          }

          const response = await fetch(
            "http://localhost:8000/api/ai/predicate-suggest",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                product_code: productCode,
                description: description,
                k_number: kNumber || undefined,
              }),
            }
          );
          if (!response.ok) {
            throw new Error(
              `API request failed with status ${response.status}`
            );
          }
          const data = await response.json();
          const fetchedPredicates: Predicate[] = data.devices.map(
            (device: PredicateDevice) => ({
              id: device.k_number,
              deviceName: device.name,
              kNumber: device.k_number,
              productCode: productCode || deviceInfo.productCode || "Unknown",
              class: "II",
              date: device.clearance_date || "Unknown",
              intendedUse: "N/A",
              technology: "N/A",
              performanceMetrics: "N/A",
              added: false,
              manufacturer: device.manufacturer || "Unknown",
              regulationNumber: device.regulation_number || "Unknown",
              deviceDescription: device.device_description || "N/A",
            })
          );
          setPredicates((prev) => {
            const effectiveProductCode =
              productCode || deviceInfo.productCode || "Unknown";
            if (
              effectiveProductCode === "Unknown" ||
              effectiveProductCode.toUpperCase() === "LLC" ||
              kNumber
            ) {
              const updatedPredicates = [...prev];
              fetchedPredicates.forEach((newPred) => {
                const existingIndex = updatedPredicates.findIndex(
                  (p) =>
                    p.kNumber.toLowerCase() === newPred.kNumber.toLowerCase() ||
                    normalizeDeviceName(p.deviceName) ===
                      normalizeDeviceName(newPred.deviceName)
                );
                if (existingIndex !== -1) {
                  updatedPredicates[existingIndex] = {
                    ...updatedPredicates[existingIndex],
                    productCode:
                      updatedPredicates[existingIndex].productCode ===
                        "Unknown" ||
                      !updatedPredicates[existingIndex].productCode
                        ? newPred.productCode
                        : updatedPredicates[existingIndex].productCode,
                    manufacturer:
                      updatedPredicates[existingIndex].manufacturer ===
                        "Unknown" ||
                      !updatedPredicates[existingIndex].manufacturer
                        ? newPred.manufacturer
                        : updatedPredicates[existingIndex].manufacturer,
                    regulationNumber:
                      updatedPredicates[existingIndex].regulationNumber ===
                        "Unknown" ||
                      !updatedPredicates[existingIndex].regulationNumber
                        ? newPred.regulationNumber
                        : updatedPredicates[existingIndex].regulationNumber,
                    date:
                      updatedPredicates[existingIndex].date === "Unknown" ||
                      !updatedPredicates[existingIndex].date
                        ? newPred.date
                        : updatedPredicates[existingIndex].date,
                  };
                } else {
                  updatedPredicates.push(newPred);
                }
              });
              return updatedPredicates;
            } else {
              return fetchedPredicates;
            }
          });
        } catch (error) {
          console.error("Error fetching predicates:", error);
          alert("Failed to fetch predicates. Please try again.");
          setPredicates(mockPredicates);
        } finally {
          setIsSearching(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, deviceInfo.productCode]);

  const addPredicate = (predicate: Predicate) => {
    if (selectedPredicates.length >= 3) {
      alert("Maximum 3 predicates allowed.");
      return;
    }
    setSelectedPredicates((prev) => [...prev, predicate]);
    setPredicates((prev) =>
      prev.map((p) => (p.id === predicate.id ? { ...p, added: true } : p))
    );
  };

  const removePredicate = (predicateId: string) => {
    setSelectedPredicates((prev) => prev.filter((p) => p.id !== predicateId));
    setPredicates((prev) =>
      prev.map((p) => (p.id === predicateId ? { ...p, added: false } : p))
    );
  };

  const togglePredicateExpansion = (predicateId: string) => {
    setExpandedPredicates((prev) =>
      prev.includes(predicateId)
        ? prev.filter((id) => id !== predicateId)
        : [...prev, predicateId]
    );
  };

  const getDeltaColor = (deltaType: string) => {
    switch (deltaType) {
      case "positive":
        return "bg-green-100 text-green-800";
      case "neutral":
        return "bg-yellow-100 text-yellow-800";
      case "negative":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMatchStatus = (field: string) => {
    if (field === "deviceName")
      return { status: "partial", color: "bg-yellow-100 text-yellow-800" };
    if (field === "productCode")
      return { status: "match", color: "bg-green-100 text-green-800" };
    if (field === "intendedUse")
      return { status: "match", color: "bg-green-100 text-green-800" };
    if (field === "technology")
      return { status: "match", color: "bg-green-100 text-green-800" };
    return { status: "match", color: "bg-green-100 text-green-800" };
  };

  const addSampleData = () => {
    setDeviceInfo({
      deviceName: "FluDetect A/B Rapid Test",
      productCode: "LLC",
      intendedUse:
        "For the qualitative detection of Influenza A and B antigens in nasal swabs",
      technology: "Lateral flow immunoassay using monoclonal antibodies",
      performanceMetrics: "Sensitivity: 92.4%, Specificity: 96.1%",
      deviceDescription:
        "The FluDetect A/B Rapid Test is a lateral flow immunoassay for detecting Influenza A and B antigens in nasal swabs.",
    });
  };

  const openAiModal = (
    fieldLabel: string,
    aiSuggestion: string,
    yourDeviceData: string,
    predicateData: string,
    reasoning: string
  ) => {
    setCurrentAiField({
      fieldLabel,
      aiSuggestion,
      yourDeviceData,
      predicateData,
      reasoning,
    });
    setAiModalOpen(true);
  };

  // Functions from old UI for handling predicate matching
  const normalizeDeviceName = (name: string): string => {
    if (!name) return "";
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .replace(/replacment/g, "replacement")
      .replace(/ossicular/g, "ossicular")
      .replace(/titanium/g, "titanium");
  };

  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = Array(b.length + 1)
      .fill(0)
      .map(() => Array(a.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  };

  const getStringSimilarity = (str1: string, str2: string): number => {
    const norm1 = normalizeDeviceName(str1);
    const norm2 = normalizeDeviceName(str2);
    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(norm1, norm2);
    return 1 - distance / maxLen;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://localhost:8000/api/ai/predicate-suggest/upload-pdf",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error(`PDF upload failed with status ${response.status}`);
      }
      const data = await response.json();
      const newPredicate: Predicate = {
        id: data.k_number || `uploaded-${Date.now()}`,
        deviceName: data.device_name || "Uploaded Device",
        kNumber: data.k_number || "Unknown",
        productCode: data.product_code || deviceInfo.productCode || "Unknown",
        class: data.regulation_number ? "II" : "Unknown",
        date: data.clearance_date || "Unknown",
        intendedUse: data.intended_use || "N/A",
        technology: data.technology || "N/A",
        performanceMetrics: data.performance_claims || "N/A",
        added: false,
        manufacturer: data.manufacturer || "Unknown",
        regulationNumber: data.regulation_number || "Unknown",
        deviceDescription: data.device_description || "N/A",
      };
      console.log("New Predicate:", {
        kNumber: newPredicate.kNumber,
        deviceName: newPredicate.deviceName,
        normalizedDeviceName: normalizeDeviceName(newPredicate.deviceName),
        regulationNumber: newPredicate.regulationNumber,
      });
      console.log(
        "Existing Predicates:",
        predicates.map((p) => ({
          kNumber: p.kNumber,
          deviceName: p.deviceName,
          normalizedDeviceName: normalizeDeviceName(p.deviceName),
          regulationNumber: p.regulationNumber,
        }))
      );

      setPredicates((prev) => {
        let existingPredicate =
          newPredicate.kNumber && newPredicate.kNumber !== "Unknown"
            ? prev.find(
                (p) =>
                  p.kNumber.toLowerCase() === newPredicate.kNumber.toLowerCase()
              )
            : undefined;

        if (!existingPredicate) {
          const normalizedNewDeviceName = normalizeDeviceName(
            newPredicate.deviceName
          );
          existingPredicate = prev.find(
            (p) => normalizeDeviceName(p.deviceName) === normalizedNewDeviceName
          );
        }

        if (!existingPredicate) {
          const SIMILARITY_THRESHOLD = 0.9;
          existingPredicate = prev.reduce(
            (bestMatch: Predicate | undefined, p: Predicate) => {
              const similarity = getStringSimilarity(
                p.deviceName,
                newPredicate.deviceName
              );
              if (similarity >= SIMILARITY_THRESHOLD) {
                console.log(
                  `Fuzzy match: ${p.deviceName} (similarity: ${similarity})`
                );
                return similarity >
                  (bestMatch
                    ? getStringSimilarity(
                        bestMatch.deviceName,
                        newPredicate.deviceName
                      )
                    : 0)
                  ? p
                  : bestMatch;
              }
              return bestMatch;
            },
            undefined
          );
        }

        if (existingPredicate) {
          console.log("Matched Predicate:", {
            kNumber: existingPredicate.kNumber,
            deviceName: existingPredicate.deviceName,
            similarity: getStringSimilarity(
              existingPredicate.deviceName,
              newPredicate.deviceName
            ),
            regulationNumber: existingPredicate.regulationNumber,
          });
          return prev.map((p) =>
            (p.kNumber.toLowerCase() === newPredicate.kNumber.toLowerCase() &&
              newPredicate.kNumber !== "Unknown") ||
            normalizeDeviceName(p.deviceName) ===
              normalizeDeviceName(newPredicate.deviceName) ||
            getStringSimilarity(p.deviceName, newPredicate.deviceName) >= 0.9
              ? {
                  ...p,
                  intendedUse:
                    p.intendedUse === "N/A" ||
                    p.intendedUse === "Unknown" ||
                    !p.intendedUse
                      ? newPredicate.intendedUse
                      : p.intendedUse,
                  technology:
                    p.technology === "N/A" ||
                    p.technology === "Unknown" ||
                    !p.technology
                      ? newPredicate.technology
                      : p.technology,
                  performanceMetrics:
                    p.performanceMetrics === "N/A" ||
                    p.performanceMetrics === "Unknown" ||
                    !p.performanceMetrics
                      ? newPredicate.performanceMetrics
                      : p.performanceMetrics,
                  productCode:
                    newPredicate.productCode &&
                    newPredicate.productCode !== "Unknown"
                      ? newPredicate.productCode
                      : p.productCode,
                  class:
                    newPredicate.class && newPredicate.class !== "Unknown"
                      ? newPredicate.class
                      : p.class,
                  date:
                    newPredicate.date && newPredicate.date !== "Unknown"
                      ? newPredicate.date
                      : p.date,
                  manufacturer:
                    newPredicate.manufacturer &&
                    newPredicate.manufacturer !== "Unknown"
                      ? newPredicate.manufacturer
                      : p.manufacturer,
                  regulationNumber:
                    newPredicate.regulationNumber &&
                    newPredicate.regulationNumber !== "Unknown"
                      ? newPredicate.regulationNumber
                      : p.regulationNumber || "Unknown",
                }
              : p
          );
        } else {
          console.log("No match found, adding new predicate");
          return [...prev, newPredicate];
        }
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload and parse PDF. Please try again.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Your Device Information
              </h2>
              <p className="text-gray-600 mb-6">
                Enter the specifications for your device that will be compared
                against predicates.
              </p>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Device Specifications</CardTitle>
                  <CardDescription>
                    Complete all required fields for comparison
                  </CardDescription>
                </div>
                <Button
                  onClick={addSampleData}
                  variant="outline"
                  className="shrink-0 bg-transparent"
                >
                  Add Sample Data
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="deviceName">Device Name</Label>
                    <Input
                      id="deviceName"
                      placeholder="Enter your device name"
                      value={deviceInfo.deviceName}
                      onChange={(e) =>
                        setDeviceInfo((prev) => ({
                          ...prev,
                          deviceName: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productCode">Product Code</Label>
                    <Input
                      id="productCode"
                      placeholder="Enter FDA product code (e.g., LLC)"
                      value={deviceInfo.productCode}
                      onChange={(e) =>
                        setDeviceInfo((prev) => ({
                          ...prev,
                          productCode: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="intendedUse">Intended Use</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Describe what the device is intended to do and its
                            clinical purpose
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    id="intendedUse"
                    rows={4}
                    placeholder="Describe the intended use of your device"
                    value={deviceInfo.intendedUse}
                    onChange={(e) =>
                      setDeviceInfo((prev) => ({
                        ...prev,
                        intendedUse: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="technology">Technology Description</Label>
                  <Textarea
                    id="technology"
                    rows={4}
                    placeholder="Describe the technology and methodology used"
                    value={deviceInfo.technology}
                    onChange={(e) =>
                      setDeviceInfo((prev) => ({
                        ...prev,
                        technology: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="performanceMetrics">
                      Performance Metrics
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Include sensitivity, specificity, and other key
                            performance data
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    id="performanceMetrics"
                    rows={4}
                    placeholder="Enter performance metrics (sensitivity, specificity, etc.)"
                    value={deviceInfo.performanceMetrics}
                    onChange={(e) =>
                      setDeviceInfo((prev) => ({
                        ...prev,
                        performanceMetrics: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Predicate Search</h2>
              <p className="text-gray-600 mb-6">
                Search FDA-cleared 510(k)s or upload predicate documents.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search FDA-cleared 510(k)s
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Type device name, K number, or product code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                      disabled={isSearching || searchQuery.length <= 2}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  {isSearching && (
                    <div className="text-sm text-gray-600 flex items-center gap-2 mt-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Searching FDA database...
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload 510(k) PDF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag & drop PDF files here or click to upload
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload">
                      <Button asChild variant="outline">
                        <span>Upload Files</span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!isSearching && predicates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                <div className="space-y-3">
                  {predicates.map((predicate) => (
                    <Card key={predicate.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">
                              {predicate.deviceName}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {predicate.kNumber}
                            </Badge>
                          </div>
                          <p
                            className="text-sm text-gray-600 line-clamp-1"
                            title={
                              predicate.deviceDescription ||
                              predicate.intendedUse
                            }
                          >
                            {truncateText(
                              predicate.deviceDescription ||
                                predicate.intendedUse,
                              100
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  510(k) Summary – {predicate.deviceName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Device Name</Label>
                                    <p className="text-sm">
                                      {predicate.deviceName}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>K Number</Label>
                                    <p className="text-sm">
                                      {predicate.kNumber}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Product Code</Label>
                                    <p className="text-sm">
                                      {predicate.productCode}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Class</Label>
                                    <p className="text-sm">{predicate.class}</p>
                                  </div>
                                  <div>
                                    <Label>Manufacturer</Label>
                                    <p className="text-sm">
                                      {predicate.manufacturer || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Regulation Number</Label>
                                    <p className="text-sm">
                                      {predicate.regulationNumber || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Device Description</Label>
                                  <p className="text-sm">
                                    {predicate.deviceDescription || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <Label>Intended Use</Label>
                                  <p className="text-sm">
                                    {predicate.intendedUse}
                                  </p>
                                </div>
                                <div>
                                  <Label>Technology</Label>
                                  <p className="text-sm">
                                    {predicate.technology}
                                  </p>
                                </div>
                                <div>
                                  <Label>Performance Metrics</Label>
                                  <p className="text-sm">
                                    {predicate.performanceMetrics}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => addPredicate(predicate)}
                                  disabled={predicate.added}
                                  className="w-full"
                                >
                                  {predicate.added
                                    ? "Added to Comparison"
                                    : "Add to Comparison"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant={predicate.added ? "default" : "default"}
                            size="sm"
                            onClick={() =>
                              predicate.added
                                ? removePredicate(predicate.id)
                                : addPredicate(predicate)
                            }
                          >
                            {predicate.added ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Predicate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!isSearching &&
              searchQuery.length > 2 &&
              predicates.length === 0 && (
                <div className="text-center text-gray-600">
                  No results found. Try adjusting your search query.
                </div>
              )}

            {selectedPredicates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Selected Predicates
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPredicates.map((predicate) => (
                    <Badge
                      key={predicate.id}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      {predicate.deviceName}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0"
                        onClick={() => removePredicate(predicate.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Review Predicate Details
              </h2>
              <p className="text-gray-600 mb-6">
                Review and verify predicate information before proceeding.
              </p>
            </div>

            <div className="space-y-4">
              {selectedPredicates.map((predicate) => (
                <Card key={predicate.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {predicate.deviceName}
                        </CardTitle>
                        <CardDescription>{predicate.kNumber}</CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Ready for Comparison
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Predicate Comparison Table
              </h2>
              <p className="text-gray-600 mb-6">
                Compare key fields between your device and selected predicates.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">General Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Field</TableHead>
                      <TableHead className="font-semibold">
                        Your Device
                      </TableHead>
                      <TableHead className="font-semibold">Predicate</TableHead>
                      <TableHead className="font-semibold">
                        Match Status
                      </TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4">
                        Device Name
                      </TableCell>
                      <TableCell className="py-4">
                        {deviceInfo.deviceName}
                      </TableCell>
                      <TableCell className="py-4">
                        {selectedPredicates[0]?.deviceName || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          className={`${
                            getMatchStatus("deviceName").color
                          } border-0 px-3 py-1 cursor-pointer`}
                          onClick={() => {
                            // Open justify modal
                          }}
                        >
                          Partial Match
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to justify this difference</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white shadow-lg">
                            <DialogHeader>
                              <DialogTitle>Device Name Comparison</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Your Device</Label>
                                <p className="text-sm">
                                  {deviceInfo.deviceName}
                                </p>
                              </div>
                              <div>
                                <Label>Predicate Device</Label>
                                <p className="text-sm">
                                  {selectedPredicates[0]?.deviceName}
                                </p>
                              </div>
                              <div>
                                <Label>Justification Notes</Label>
                                <Textarea
                                  placeholder="Explain why this difference is acceptable..."
                                  rows={3}
                                />
                              </div>
                              <Button>Mark as Justified</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium py-4">
                        Product Code
                      </TableCell>
                      <TableCell className="py-4">
                        {deviceInfo.productCode}
                      </TableCell>
                      <TableCell className="py-4">
                        {selectedPredicates[0]?.productCode || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          Match
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button variant="outline" size="sm" disabled>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Intended Use</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4 w-32">
                        Intended Use
                      </TableCell>
                      <TableCell className="py-4">
                        {deviceInfo.intendedUse}
                      </TableCell>
                      <TableCell className="py-4">
                        {selectedPredicates[0]?.intendedUse || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          Match
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technology</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4 w-32">
                        Technology
                      </TableCell>
                      <TableCell className="py-4">
                        {deviceInfo.technology}
                      </TableCell>
                      <TableCell className="py-4">
                        {selectedPredicates[0]?.technology || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          Match
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4 w-32">
                        Device Description
                      </TableCell>
                      <TableCell className="py-4">
                        {deviceInfo.deviceDescription || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        {selectedPredicates[0]?.deviceDescription || "N/A"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          Match
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Clinical Performance
              </h2>
              <p className="text-gray-600 mb-6">
                Compare performance metrics between your device and predicates.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Metric</TableHead>
                      <TableHead>Your Device</TableHead>
                      <TableHead>Predicate</TableHead>
                      <TableHead>Δ %</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Sample Size</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceMetrics.map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {metric.metric}
                        </TableCell>
                        <TableCell>{metric.yourDevice}</TableCell>
                        <TableCell>{metric.predicate}</TableCell>
                        <TableCell>
                          <Badge className={getDeltaColor(metric.deltaType)}>
                            {metric.delta}
                          </Badge>
                        </TableCell>
                        <TableCell>{metric.confidence}</TableCell>
                        <TableCell>{metric.sampleSize}</TableCell>
                        <TableCell>{metric.method}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Justify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">AI SE Summary</h2>
              <p className="text-gray-600 mb-6">
                Generate or edit your substantial equivalence comparison
                summary.
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Substantial Equivalence Summary
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ai-mode"
                        checked={aiGenerated}
                        onCheckedChange={setAiGenerated}
                      />
                      <Label htmlFor="ai-mode" className="font-medium">
                        Generate SE Summary
                      </Label>
                    </div>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {aiGenerated ? (
                  <div className="space-y-6">
                    <div className="prose max-w-none">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed mb-4">
                            • The FluDetect A/B Rapid Test demonstrates
                            substantial equivalence to the predicate device
                            QuickVue Influenza A+B Test (K123456) based on
                            identical intended use and technology.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 p-1 h-6 w-6"
                          onClick={() =>
                            openAiModal(
                              "Device Comparison Summary",
                              "The FluDetect A/B Rapid Test demonstrates substantial equivalence to the predicate device QuickVue Influenza A+B Test (K123456) based on identical intended use and technology.",
                              "FluDetect A/B Rapid Test - Lateral flow immunoassay for Influenza A and B detection",
                              "QuickVue Influenza A+B Test - Lateral flow immunoassay for Influenza A and B detection",
                              "Both devices use identical lateral flow immunoassay technology and have the same intended use for qualitative detection of Influenza A and B antigens, demonstrating clear substantial equivalence."
                            )
                          }
                        >
                          <Info className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed mb-4">
                            • Both devices are intended for the qualitative
                            detection of Influenza A and B antigens in nasal
                            swabs with identical specimen types and patient
                            populations.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 p-1 h-6 w-6"
                          onClick={() =>
                            openAiModal(
                              "Intended Use Comparison",
                              "Both devices are intended for the qualitative detection of Influenza A and B antigens in nasal swabs with identical specimen types and patient populations.",
                              "For the qualitative detection of Influenza A and B antigens in nasal swabs",
                              "For the qualitative detection of Influenza A and B antigens in nasal swabs",
                              "The intended use statements are identical, indicating perfect alignment in the fundamental purpose and scope of both devices."
                            )
                          }
                        >
                          <Info className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>

                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed mb-4">
                            • Both devices utilize lateral flow immunoassay
                            technology with monoclonal antibodies, demonstrating
                            technological equivalence in detection methodology.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 p-1 h-6 w-6"
                          onClick={() =>
                            openAiModal(
                              "Technology Assessment",
                              "Both devices utilize lateral flow immunoassay technology with monoclonal antibodies, demonstrating technological equivalence in detection methodology.",
                              "Lateral flow immunoassay using monoclonal antibodies",
                              "Lateral flow immunoassay using monoclonal antibodies",
                              "The technological approaches are identical, both employing lateral flow immunoassay with monoclonal antibodies, which establishes clear technological equivalence."
                            )
                          }
                        >
                          <Info className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter your substantial equivalence summary..."
                      rows={12}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 7:
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  Section B Overview
                </h2>
                <p className="text-gray-600 mb-6">
                  Final assembly of Substantial Equivalence content for 510(k)
                  Section B submission.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="shrink-0 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh from Comparator
                </Button>
              </div>
            </div>

            <Card className="shadow-lg rounded-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      🧠 Substantial Equivalence Summary
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="ai-generated"
                        checked={aiGenerated}
                        onCheckedChange={setAiGenerated}
                      />
                      <Label
                        htmlFor="ai-generated"
                        className="text-sm font-medium"
                      >
                        AI Generated Summary
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Regenerate Summary
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white">
                      ✏️ Edit Summary
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="group relative">
                    <div className="flex items-start justify-between">
                      <p className="text-gray-700 leading-relaxed flex-1 pr-4">
                        <strong>Subject Device:</strong> FluDetect A/B Rapid
                        Test demonstrates substantial equivalence to the
                        predicate device QuickVue Influenza A+B Test (K123456)
                        based on identical intended use, technological approach,
                        and comparable performance characteristics.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      >
                        ✏️
                      </Button>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="flex items-start justify-between">
                      <p className="text-gray-700 leading-relaxed flex-1 pr-4">
                        <strong>Intended Use Comparison:</strong> Both devices
                        are intended for the qualitative detection of Influenza
                        A and B antigens in nasal swab specimens from patients
                        with signs and symptoms of respiratory infection. The
                        intended use statements are functionally identical.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      >
                        ✏️
                      </Button>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="flex items-start justify-between">
                      <p className="text-gray-700 leading-relaxed flex-1 pr-4">
                        <strong>Technological Equivalence:</strong> Both the
                        subject and predicate devices utilize lateral flow
                        immunoassay technology employing monoclonal antibodies
                        specific to Influenza A and B antigens. The detection
                        methodology and assay format are substantially
                        equivalent.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      >
                        ✏️
                      </Button>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="flex items-start justify-between">
                      <p className="text-gray-700 leading-relaxed flex-1 pr-4">
                        <strong>Performance Comparison:</strong> Clinical
                        performance data demonstrates that the subject device
                        maintains comparable sensitivity (92.4% vs 89.2%) and
                        specificity (96.1% vs 94.8%) to the predicate device,
                        with differences falling within acceptable clinical
                        ranges.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      >
                        ✏️
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-2xl border-0">
              <CardHeader className="bg-gray-50 border-b rounded-t-2xl">
                <CardTitle className="text-lg">
                  📋 Predicate Comparison Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">
                        Device Name
                      </TableHead>
                      <TableHead className="font-semibold">K-Number</TableHead>
                      <TableHead className="font-semibold">
                        Manufacturer
                      </TableHead>
                      <TableHead className="font-semibold">
                        Clearance Date
                      </TableHead>
                      <TableHead className="font-semibold">
                        Indication
                      </TableHead>
                      <TableHead className="font-semibold">
                        Classification
                      </TableHead>
                      <TableHead className="font-semibold">
                        Comparison
                      </TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4">
                        QuickVue Influenza A+B Test
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          K123456
                        </span>
                      </TableCell>
                      <TableCell className="py-4">Quidel Corporation</TableCell>
                      <TableCell className="py-4">2023-03-15</TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          Influenza A and B detection
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Class II
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          ✓ Same
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium py-4">
                        BD Veritor Flu A+B
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          K789012
                        </span>
                      </TableCell>
                      <TableCell className="py-4">Becton Dickinson</TableCell>
                      <TableCell className="py-4">2022-11-08</TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          Influenza A and B detection
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Class II
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          ✓ Same
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium py-4">
                        Sofia Influenza A+B FIA
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          K103236
                        </span>
                      </TableCell>
                      <TableCell className="py-4">Quidel Corporation</TableCell>
                      <TableCell className="py-4">2011-03-22</TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          Influenza A and B detection
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Class II
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1">
                          ⚠ Similar
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium py-4">
                        BinaxNOW Influenza A&B
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          K033237
                        </span>
                      </TableCell>
                      <TableCell className="py-4">Abbott Diagnostics</TableCell>
                      <TableCell className="py-4">2003-09-08</TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          Influenza A and B detection
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Class II
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          ✓ Same
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium py-4">
                        OSOM Influenza A&B Test
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          K040347
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        Sekisui Diagnostics
                      </TableCell>
                      <TableCell className="py-4">2004-11-12</TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          Influenza A and B detection
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Class II
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-red-100 text-red-800 border-0 px-3 py-1">
                          ✗ Different
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-2xl border-0">
              <CardHeader className="bg-gray-50 border-b rounded-t-2xl">
                <CardTitle className="text-lg">
                  📊 Performance Comparison Table
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold">
                        Your Value
                      </TableHead>
                      <TableHead className="font-semibold">Predicate</TableHead>
                      <TableHead className="font-semibold">Delta (%)</TableHead>
                      <TableHead className="font-semibold">
                        Confidence
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Sensitivity</TableCell>
                      <TableCell>92.4%</TableCell>
                      <TableCell>89.2%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          +3.2%
                        </Badge>
                      </TableCell>
                      <TableCell>95%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Specificity</TableCell>
                      <TableCell>96.1%</TableCell>
                      <TableCell>94.8%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          +1.3%
                        </Badge>
                      </TableCell>
                      <TableCell>95%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        LoD (TCID50/mL)
                      </TableCell>
                      <TableCell>1.2 x 10³</TableCell>
                      <TableCell>2.1 x 10³</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          -43%
                        </Badge>
                      </TableCell>
                      <TableCell>95%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">PPV</TableCell>
                      <TableCell>94.7%</TableCell>
                      <TableCell>92.1%</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800 border-0">
                          +2.6%
                        </Badge>
                      </TableCell>
                      <TableCell>95%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">NPV</TableCell>
                      <TableCell>95.8%</TableCell>
                      <TableCell>93.4%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          +2.4%
                        </Badge>
                      </TableCell>
                      <TableCell>95%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="p-6 bg-blue-50 border-t">
                  <h4 className="font-semibold text-blue-900 mb-3">
                    Clinical Equivalence Summary
                  </h4>
                  <div className="text-sm text-blue-800 leading-relaxed">
                    <p className="mb-2">
                      The subject device demonstrates clinical performance that
                      meets or exceeds the predicate device across all key
                      metrics. Statistical analysis confirms non-inferiority
                      with 95% confidence intervals, supporting substantial
                      equivalence determination.
                    </p>
                    <p>
                      Performance improvements in sensitivity (+3.2%) and
                      specificity (+1.3%) enhance clinical utility while
                      maintaining the same risk profile as the predicate device.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-900">
                        Ready for Integration
                      </h3>
                    </div>
                    <p className="text-green-800 text-sm mb-2">
                      All required comparison fields have been mapped to Section
                      B structure.
                    </p>
                    <p className="text-xs text-green-600">
                      Last synced from Comparator: {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                    >
                      🧾 Preview Export
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                    >
                      📁 Export as eSTAR Block
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      🔗 Integrate to Section B Editor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Button
                    onClick={() => router.push("/MainDashboard")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md border border-blue-500/30 hover:bg-blue-700 hover:shadow-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 flex items-center gap-2 font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>

                <h1 className="text-xl font-semibold text-gray-900 mb-8">
                  510(k) Predicate Comparator
                </h1>
              </div>

              <nav className="space-y-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentStep === step.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          currentStep === step.id
                            ? "bg-blue-600 text-white"
                            : currentStep > step.id
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-xs text-gray-500">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1 p-8">
            <div className="max-w-5xl mx-auto">
              {renderStep()}

              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>

                <Button
                  onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
                  disabled={currentStep === 7}
                >
                  {currentStep === 7 ? "Complete" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AIExplainabilityModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          fieldLabel={currentAiField.fieldLabel}
          aiSuggestion={currentAiField.aiSuggestion}
          yourDeviceData={currentAiField.yourDeviceData}
          predicateData={currentAiField.predicateData}
          reasoning={currentAiField.reasoning}
          onRegenerate={() => {
            console.log("Regenerating AI suggestion...");
          }}
          onSave={(editedText) => {
            console.log("Saving edited text:", editedText);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
