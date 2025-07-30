"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FileText, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { convert } from "html-to-text";

interface DocumentData {
  id?: string;
  _id?: string;
  name?: string;
  version?: string; // Added version field
  isNewDocument?: boolean;
}

interface EnhancedSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    fileName: string;
    versionName: string;
    description: string;
  }) => void;
  document?: DocumentData;
  content: string;
}

interface FormData {
  fileName: string;
  versionName: string;
  description: string;
  section: string;
}

const sections = [
  { value: "Section A", label: "Section A - Device Description" },
  { value: "Section B", label: "Section B - Indications for Use" },
  { value: "Section C", label: "Section C - Software" },
  { value: "Section D", label: "Section D - Sterility" },
  { value: "Section E", label: "Section E - Biocompatibility" },
  { value: "Section F", label: "Section F - Risk Analysis" },
  { value: "Section G", label: "Section G - Performance" },
  { value: "Section H", label: "Section H - Labeling" },
];

export function EnhancedSaveModal({
  isOpen,
  onClose,
  onSave,
  document,
  content,
}: EnhancedSaveModalProps) {
  const [formData, setFormData] = useState<FormData>({
    fileName: document?.name || "",
    versionName: document?.isNewDocument
      ? "v1.0"
      : `v${(parseFloat(document?.version || "1.0") + 0.1).toFixed(1)}`,
    description: "",
    section: "",
  });

  const handleSave = async () => {
    if (!formData.fileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }
    if (!formData.versionName.trim()) {
      toast.error("Please enter a version name");
      return;
    }
    if (!formData.section) {
      toast.error("Please select a section");
      return;
    }

    // Create a new docx document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: stripHtml(content),
                }),
              ],
            }),
          ],
        },
      ],
    });

    try {
      // Generate the .docx file as a Blob
      const blob = await Packer.toBlob(doc);
      const fileName = formData.fileName.trim();
      const versionName = formData.versionName.trim();
      const description = formData.description || "";

      // Determine if this is an update or a new document
      const isUpdate = document?.id && !document?.isNewDocument;
      const documentId = document?.id || document?._id || "";

      // Validate documentId for updates
      if (isUpdate && (!documentId || !/^DOC-[0-9A-F]{6}$/.test(documentId))) {
        console.warn(
          `Invalid document ID: ${documentId}. Falling back to creating a new document.`
        );
      }

      // Prepare FormData for backend
      const formDataToSend = new FormData();
      formDataToSend.append("name", fileName);
      formDataToSend.append("type", "docx");
      formDataToSend.append("section", formData.section);
      formDataToSend.append("sectionRef", "");
      formDataToSend.append("status", "Draft");
      formDataToSend.append("tags", JSON.stringify([]));
      formDataToSend.append("description", description);
      formDataToSend.append("capaId", "");
      formDataToSend.append("uploadedBy_name", "Current User");
      formDataToSend.append("uploadedBy_id", "current_user");
      formDataToSend.append("orgId", "your-org-id");
      formDataToSend.append("uploadedBy_roleId", "role-unknown");
      formDataToSend.append("uploadedBy_departmentId", "dept_unknown");
      formDataToSend.append("file", blob, `${fileName}.docx`);
      formDataToSend.append("id", document?.id || "");
console.log(document?.id, "document?.id");
      // Send to backend
      const endpoint = isUpdate
        ? `http://localhost:8000/api/documents/${documentId}`
        : "http://localhost:8000/api/documents";
      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            `Failed to ${isUpdate ? "update" : "create"} document`
        );
      }

      const result = await response.json();
      toast.success(
        `Document ${isUpdate ? "updated" : "created"} as ${fileName}.docx`
      );

      // Trigger onSave callback
      onSave({ fileName, versionName, description });

      // Download the file locally
      saveAs(blob, `${fileName}.docx`);

      // Reset form data
      setFormData({
        fileName: "",
        versionName: "",
        description: "",
        section: "",
      });

      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error(
        (error as Error).message || "Error generating or saving document"
      );
    }
  };

  const stripHtml = (html: string) => {
    return convert(html, {
      wordwrap: 130,
      preserveNewlines: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Save Document Version
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file-name">Document Name *</Label>
            <Input
              id="file-name"
              value={formData.fileName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fileName: e.target.value }))
              }
              placeholder="Enter document name"
            />
          </div>
          <div>
            <Label htmlFor="version-name">Version Name *</Label>
            <Input
              id="version-name"
              value={formData.versionName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  versionName: e.target.value,
                }))
              }
              placeholder="e.g., v1.0"
            />
          </div>
          <div>
            <Label htmlFor="section">Section *</Label>
            <Select
              value={formData.section}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, section: value }))
              }
            >
              <SelectTrigger id="section">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.value} value={section.value}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe changes in this version"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Save & Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
