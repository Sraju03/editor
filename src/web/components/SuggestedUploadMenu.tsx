"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  CheckCircle,
  ChevronDown,
  UploadIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const suggestedDocs = [
  "Truthful & Accurate Statement",
  "Form 3881",
  "510(k) Summary or Statement",
  "RTA Checklist (optional)",
];

export default function SuggestedUploadMenu() {
  const [uploaded, setUploaded] = useState<{ [key: string]: boolean }>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (label: string) => {
    if (uploading) {
      toast.error("Please wait until the current upload is complete.");
      return;
    }

    setUploading(label);
    try {
      // Create a hidden file input element
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.doc,.docx";
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          // Validate file type and size
          if (
            ![
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ].includes(file.type)
          ) {
            toast.error("Only .pdf, .doc, or .docx files are supported.");
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            toast.error("File size exceeds 10MB limit.");
            return;
          }

          // Prepare form data for upload
          const formData = new FormData();
          formData.append("file", file);
          formData.append("document_label", label); // Include document label for metadata

          // Send file to backend
          const response = await fetch(
            `http://localhost:8000/api/files/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.detail ||
                `HTTP ${response.status}: Failed to upload file`
            );
          }

          const { fileId } = await response.json();
          setUploaded((prev) => ({ ...prev, [label]: true }));
          toast.success(
            `${label} uploaded successfully with File ID: ${fileId}`
          );
        }
      };
      input.click();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setUploading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={!!uploading}>
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4" />
          )}
          Suggested Upload
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Required Documents</DropdownMenuLabel>
        <div className="flex flex-col gap-2 px-2 py-1">
          {suggestedDocs.map((label) => (
            <div
              key={label}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
            >
              <span className="text-sm text-gray-700">{label}</span>
              {uploaded[label] ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => handleUpload(label)}
                  className="flex items-center gap-1 ml-3 p-3 text-xs border bg-blue-800 text-gray-100 px-2 py-0.5 rounded-md hover:bg-blue-50 hover:text-black hover:border-gray-950 transition"
                  disabled={uploading === label}
                >
                  {uploading === label ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadIcon className="w-4 h-4" />
                  )}
                  Upload
                </button>
              )}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
