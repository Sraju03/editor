"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, FileText, Target, ClipboardCheck, Mail } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api/documents";

const templates = [
  {
    title: "Standard Operating Procedure (SOP)",
    description: "Step-by-step instructions for routine operations",
    sections: ["Purpose", "Scope", "Responsibilities", "+3 more"],
    icon: FileText,
  },
  {
    title: "Corrective and Preventive Action (CAPA)",
    description: "Document corrective actions and preventive measures",
    sections: [
      "Problem Description",
      "Root Cause",
      "Corrective Action",
      "+2 more",
    ],
    icon: Target,
  },
  {
    title: "Work Instruction (WI)",
    description: "Detailed task-specific instructions",
    sections: ["Objective", "Materials", "Safety", "+2 more"],
    icon: ClipboardCheck,
  },
  {
    title: "Training Memo",
    description: "Communication and training documentation",
    sections: ["Subject", "Background", "Key Points", "+2 more"],
    icon: Mail,
  },
];

interface FormData {
  id?: string;
  name: string;
  type: string;
  section: string;
  status: string;
  description: string;
  tags: string[];
  capaId: string;
}

export function CreateDocumentModalTrigger() {
  const [open, setOpen] = useState(false);
  const [showBlankForm, setShowBlankForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    id: "",
    name: "Untitled Document",
    type: "Blank",
    section: "General",
    status: "Draft",
    description: "",
    tags: [],
    capaId: "",
  });
  const router = useRouter();

  const handleCreateBlank = async () => {
    if (!formData.name || !formData.section) {
      toast.error("Name and Section are required fields.");
      return;
    }

    setIsProcessing(true);
    try {
      const formDataPayload = new FormData();
      formDataPayload.append("id", formData?.id || "");
      formDataPayload.append("name", formData.name);
      formDataPayload.append("type", formData.type);
      formDataPayload.append("section", formData.section);
      formDataPayload.append("sectionRef", formData.section); // Match sectionRef to section
      formDataPayload.append("status", formData.status);
      formDataPayload.append(
        "tags",
        JSON.stringify(formData.tags.length ? formData.tags : [""])
      );
      formDataPayload.append("description", formData.description || "");
      formDataPayload.append("capaId", formData.capaId || "");
      formDataPayload.append("uploadedBy_name", "Current User");
      formDataPayload.append("uploadedByid", "current_user");
      formDataPayload.append("orgId", "org-123"); // Replace with dynamic orgId if needed
      formDataPayload.append("uploadedBy_roleId", "role-unknown");
      formDataPayload.append("uploadedBy_departmentId", "dept-unknown");
      formDataPayload.append("content", "<p></p>");
      formDataPayload.append("fileUrl", "upload/file.docx"); // Placeholder for file URL

      // Log FormData for debugging
      for (let [key, value] of formDataPayload.entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await fetch(`${API_BASE_URL}/blank`, {
        method: "POST",
        body: formDataPayload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      setFormData({
        id: result.documentId || "",
        name: "Untitled Document",
        type: "Blank",
        section: "General",
        status: "Draft",
        description: "",
        tags: [],
        capaId: "",
      });
      setOpen(false);
      setShowBlankForm(false);
      toast.success("Blank document created successfully!");
      router.push(`/editor/${result.documentId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating blank document:", errorMessage);
      toast.error(`Failed to create document: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          onClick={() => setOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Document
        </Button>

        <DialogContent className="max-w-4xl rounded-2xl p-6">
          <DialogTitle className="text-2xl font-semibold mb-1">
            Create New Document
          </DialogTitle>
          <p className="text-muted-foreground mb-6 text-sm">
            Choose a template to get started with AI-powered content generation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {templates.map((template, index) => {
              const Icon = template.icon;
              return (
                <Card
                  key={index}
                  className="transition-all hover:shadow-xl hover:border-blue-600 border border-border rounded-xl cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4 items-start">
                      <div className="bg-blue-100 text-blue-700 rounded-full p-2">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-1 group-hover:text-blue-900 transition-colors">
                          {template.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {template.sections.map((section, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs rounded-md"
                            >
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex gap-2 items-center"
              onClick={() => setShowBlankForm(true)}
            >
              <FileText size={16} />
              Create From Blank
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlankForm} onOpenChange={setShowBlankForm}>
        <DialogContent className="rounded-2xl p-6">
          <DialogTitle className="text-2xl font-semibold mb-1">
            Create Blank Document
          </DialogTitle>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Document Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Untitled Document"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium">
                Document Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blank">Blank</SelectItem>
                  <SelectItem value="SOP">SOP</SelectItem>
                  <SelectItem value="Policy">Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium">
                Section
              </label>
              <Input
                id="section"
                value={formData.section}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, section: e.target.value }))
                }
                placeholder="Enter section (e.g., General)"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                Description (optional)
              </label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description"
              />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium">
                Tags (optional, comma-separated)
              </label>
              <Input
                id="tags"
                value={formData.tags.join(", ")}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tags: e.target.value
                      ? e.target.value.split(", ").map((t) => t.trim())
                      : [],
                  }))
                }
                placeholder="Enter tags, separated by commas"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBlankForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateBlank}
                disabled={isProcessing || !formData.name || !formData.section}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? "Creating..." : "Create and Open in Editor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
