"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  FileTextIcon,
  EyeIcon,
  TrashIcon,
  EditIcon,
  UploadIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  FileIcon,
  FolderIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon,
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreateDocumentModalTrigger } from "@/components/CreateDocumentModal";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Header } from "@/components/header";

// Import mammoth for Word document processing
const mammoth = require("mammoth");

interface UploadedBy {
  name: string;
  id: string;
  orgId: string;
  roleId: string;
  departmentId: string;
}

interface VersionHistory {
  version: string;
  fileUrl: string;
  uploadedAt: string;
}

interface Document {
  _id: string;
  name: string;
  type: string;
  section: string;
  status: "Draft" | "Under Review" | "Approved";
  tags: string[];
  description?: string;
  capaId?: string;
  version: string;
  uploadedBy?: UploadedBy;
  uploadedAt: string;
  fileUrl: string;
  sectionRef?: string;
  versionHistory: VersionHistory[];
  fileSize?: string;
  is_deleted: boolean;
  last_updated?: string;
  content?: string;
  originalFile?: File;
  orgId: string;
}
export default function DocumentHubPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"consultant" | "client">(
    "consultant"
  );

  const [uploadForm, setUploadForm] = useState<{
    file: File | null;
    name: string;
    type: string;
    section: string;
    status: "Draft" | "Under Review" | "Approved";
    tags: string[];
    description: string;
    capaId: string;
    uploadedBy: UploadedBy;
    fileUrl: string;
    orgId: string;
  }>({
    file: null,
    name: "",
    type: "",
    section: "",
    status: "Draft",
    tags: [],
    description: "",
    capaId: "",
    uploadedBy: {
      name: "Current User",
      id: "current_user",
      orgId: "org-123",
      roleId: "role-qc-manager",
      departmentId: "dept-manufacturing",
    },
    fileUrl: "",
    orgId: "org-123",
  });

  const [editForm, setEditForm] = useState<{
    name: string;
    type: string;
    section: string;
    status: "Draft" | "Under Review" | "Approved";
    tags: string[];
    description: string;
    capaId: string;
    orgId: string;
  }>({
    name: "",
    type: "",
    section: "",
    status: "Draft",
    tags: [],
    description: "",
    capaId: "",
    orgId: "org-123",
  });

  const API_BASE_URL = "http://localhost:8000/api/documents";

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      params.append("orgId", "org-123");
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterSection !== "all") params.append("section", filterSection);

      const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text(); // Get raw response for debugging
        console.error(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("Non-JSON response:", errorText);
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();
      console.log(
        "Raw API response (GET /api/documents):",
        JSON.stringify(data, null, 2)
      );

      if (!data.documents || !Array.isArray(data.documents)) {
        console.error(
          "Invalid response format: 'documents' field is missing or not an array"
        );
        throw new Error("Invalid response format from server");
      }

      const documentsWithDefaultUploadedBy = data.documents
        .filter((doc: Document) => {
          const isDeleted = doc.is_deleted === true;
          if (isDeleted) {
            console.log(
              `Excluding document with _id: ${doc._id} due to is_deleted: true`
            );
          }
          return !isDeleted;
        })
        .map((doc: Document) => {
          const formatDate = (dateStr: string | undefined) => {
            if (!dateStr || isNaN(new Date(dateStr).getTime())) {
              return "Invalid date";
            }
            return new Date(dateStr)
              .toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "UTC",
              })
              .replace(/,/, "");
          };

          const uploadedBy =
            doc.uploadedBy &&
            doc.uploadedBy.name &&
            doc.uploadedBy.id &&
            doc.uploadedBy.orgId &&
            doc.uploadedBy.roleId &&
            doc.uploadedBy.departmentId
              ? doc.uploadedBy
              : {
                  name: "Unknown User",
                  id: "unknown",
                  orgId: "org-123",
                  roleId: "role-qc-manager",
                  departmentId: "dept-manufacturing",
                };

          const tags = Array.isArray(doc.tags)
            ? doc.tags
            : typeof doc.tags === "string"
            ? JSON.parse(doc.tags)
            : [];

          return {
            ...doc,
            _id: doc._id, // Ensure _id is used consistently
            uploadedBy,
            uploadedAt: formatDate(doc.uploadedAt),
            last_updated: formatDate(doc.last_updated || doc.uploadedAt),
            tags,
            orgId: doc.orgId || "org-123",
          };
        });

      if (documentsWithDefaultUploadedBy.length === 0) {
        toast("No documents found for the given filters.", {
          icon: "ℹ️",
          style: { background: "#e8f0fe", color: "#1e3a8a" },
        });
      }

      console.log(
        "Processed documents:",
        documentsWithDefaultUploadedBy.map((doc: Document) => ({
          _id: doc._id,
          name: doc.name,
          tags: doc.tags,
          orgId: doc.orgId,
        }))
      );

      setDocuments(documentsWithDefaultUploadedBy);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error(
        `Failed to load documents: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const processWordDocument = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error("Error processing Word document:", error);
      throw new Error("Failed to process Word document");
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!uploadForm.name || !uploadForm.type || !uploadForm.section) {
      toast.error("Please fill in all required fields (name, type, section).");
      return;
    }
    if (uploadForm.file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    setIsProcessing(true);
    try {
      let content = "";
      if (
        uploadForm.file.type.includes("word") ||
        uploadForm.file.name.endsWith(".docx") ||
        uploadForm.file.name.endsWith(".doc")
      ) {
        content = await processWordDocument(uploadForm.file);
        toast.success("Word document processed successfully!");
      } else {
        content = `<p>Document uploaded: ${uploadForm.file.name}</p>`;
      }
      const formData = new FormData();
      formData.append("name", uploadForm.name);
      formData.append("type", uploadForm.type);
      formData.append("section", uploadForm.section);
      formData.append("sectionRef", uploadForm.section);
      formData.append("status", uploadForm.status);
      formData.append("tags", JSON.stringify(uploadForm.tags || []));
      formData.append("description", uploadForm.description || "");
      formData.append("capaId", uploadForm.capaId || "");
      formData.append("uploadedBy_name", uploadForm.uploadedBy.name);
      formData.append("uploadedBy_id", uploadForm.uploadedBy.id);
      formData.append("uploadedBy_orgId", uploadForm.uploadedBy.orgId);
      formData.append("uploadedBy_roleId", uploadForm.uploadedBy.roleId);
      formData.append(
        "uploadedBy_departmentId",
        uploadForm.uploadedBy.departmentId
      );
      formData.append("orgId", uploadForm.orgId);
      formData.append("file", uploadForm.file);
      formData.append("uploadedAt", new Date().toISOString());
      formData.append("last_updated", new Date().toISOString());
      formData.append("content", content);
      console.log("Upload FormData:", {
        name: uploadForm.name,
        type: uploadForm.type,
        section: uploadForm.section,
        status: uploadForm.status,
        tags: uploadForm.tags,
        description: uploadForm.description,
        capaId: uploadForm.capaId,
        uploadedBy: uploadForm.uploadedBy,
        orgId: uploadForm.orgId,
      });
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        await fetchDocuments();
        setUploadForm({
          file: null,
          name: "",
          type: "",
          section: "",
          status: "Draft",
          tags: [],
          description: "",
          capaId: "",
          uploadedBy: {
            name: "Current User",
            id: "current_user",
            orgId: "org-123",
            roleId: "role-qc-manager",
            departmentId: "dept-manufacturing",
          },
          fileUrl: "",
          orgId: "org-123",
        });
        setShowUploadModal(false);
        toast.success("Document uploaded successfully!");
      } else {
        const errorData = await response.json();
        console.error("Upload error:", errorData);
        toast.error(`Upload failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("An error occurred while uploading the document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReupload = async () => {
    if (!selectedDocument || !selectedDocument._id) {
      toast.error("Please select a valid document to re-upload.");
      return;
    }
    if (!uploadForm.file) {
      toast.error("Please select a file to re-upload.");
      return;
    }
    if (!uploadForm.name || !uploadForm.type || !uploadForm.section) {
      toast.error("Please fill in all required fields (name, type, section).");
      return;
    }
    if (uploadForm.file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    setIsProcessing(true);
    try {
      let content = "";
      if (
        uploadForm.file.type.includes("word") ||
        uploadForm.file.name.endsWith(".docx") ||
        uploadForm.file.name.endsWith(".doc")
      ) {
        content = await processWordDocument(uploadForm.file);
        toast.success("Word document processed successfully!");
      } else {
        content = `<p>Document uploaded: ${uploadForm.file.name}</p>`;
      }
      const formData = new FormData();
      formData.append("name", uploadForm.name);
      formData.append("type", uploadForm.type);
      formData.append("section", uploadForm.section);
      formData.append("sectionRef", uploadForm.section);
      formData.append("status", uploadForm.status);
      formData.append("tags", JSON.stringify(uploadForm.tags));
      formData.append("description", uploadForm.description || "");
      formData.append("capaId", uploadForm.capaId || "");
      formData.append(
        "uploadedBy_name",
        uploadForm.uploadedBy?.name || "Unknown User"
      );
      formData.append("uploadedBy_id", uploadForm.uploadedBy?.id || "unknown");
      formData.append(
        "uploadedBy_orgId",
        uploadForm.uploadedBy?.orgId || "org-123"
      );
      formData.append(
        "uploadedBy_roleId",
        uploadForm.uploadedBy?.roleId || "role-qc-manager"
      );
      formData.append(
        "uploadedBy_departmentId",
        uploadForm.uploadedBy?.departmentId || "dept-manufacturing"
      );
      formData.append("orgId", uploadForm.orgId);
      formData.append("file", uploadForm.file);
      formData.append("uploadedAt", new Date().toISOString());
      formData.append("last_updated", new Date().toISOString());
      formData.append(
        "versionHistory",
        JSON.stringify(selectedDocument.versionHistory || [])
      );
      formData.append("content", content);
      const currentVersion =
        parseFloat(selectedDocument.version || "1.0") + 0.1;
      formData.append("version", currentVersion.toFixed(1));
      console.log("Reupload FormData:", {
        ...Object.fromEntries(formData),
        orgId: uploadForm.orgId,
      });
      const response = await fetch(
        `${API_BASE_URL}/${selectedDocument._id}?orgId=${uploadForm.orgId}`,
        {
          method: "PUT",
          body: formData,
        }
      );
      if (response.ok) {
        await fetchDocuments();
        setUploadForm({
          file: null,
          name: "",
          type: "",
          section: "",
          status: "Draft",
          tags: [],
          description: "",
          capaId: "",
          uploadedBy: {
            name: "Current User",
            id: "current_user",
            orgId: "org-123",
            roleId: "role-qc-manager",
            departmentId: "dept-manufacturing",
          },
          fileUrl: "",
          orgId: "org-123",
        });
        setShowReuploadModal(false);
        toast.success("Document re-uploaded successfully!");
      } else {
        const errorData = await response.json();
        console.error("Error re-uploading document:", errorData);
        toast.error(
          `Re-upload failed: ${errorData.detail || "Unknown server error"}`
        );
      }
    } catch (error) {
      console.error("Error re-uploading document:", error);
      toast.error("An error occurred while re-uploading the document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDocument || !selectedDocument._id) {
      toast.error("Please select a valid document to edit.");
      return;
    }
    if (!editForm.name || !editForm.type || !editForm.section) {
      toast.error("Please fill in all required fields (name, type, section).");
      return;
    }
    const lastUpdated = new Date().toISOString();
    const formData = new FormData();
    formData.append("name", editForm.name);
    formData.append("type", editForm.type);
    formData.append("section", editForm.section);
    formData.append("sectionRef", editForm.section);
    formData.append("status", editForm.status);
    formData.append("tags", JSON.stringify(editForm.tags || []));
    formData.append("description", editForm.description || "");
    formData.append("capaId", editForm.capaId || "");
    formData.append("orgId", editForm.orgId);
    formData.append("last_updated", lastUpdated);
    console.log("Edit FormData:", {
      name: editForm.name,
      type: editForm.type,
      section: editForm.section,
      status: editForm.status,
      tags: editForm.tags,
      description: editForm.description,
      capaId: editForm.capaId,
      orgId: editForm.orgId,
      last_updated: lastUpdated,
    });
    try {
      const response = await fetch(
        `${API_BASE_URL}/${selectedDocument._id}?orgId=${editForm.orgId}`,
        {
          method: "PUT",
          body: formData,
        }
      );
      if (response.ok) {
        await fetchDocuments();
        const docResponse = await fetch(
          `${API_BASE_URL}/${selectedDocument._id}?orgId=${editForm.orgId}`
        );
        if (docResponse.ok) {
          const updatedDoc = await docResponse.json();
          const safeUploadedBy =
            updatedDoc.uploadedBy &&
            updatedDoc.uploadedBy.name &&
            updatedDoc.uploadedBy.id &&
            updatedDoc.uploadedBy.orgId &&
            updatedDoc.uploadedBy.roleId &&
            updatedDoc.uploadedBy.departmentId
              ? updatedDoc.uploadedBy
              : {
                  name: "Unknown User",
                  id: "unknown",
                  orgId: "org-123",
                  roleId: "role-qc-manager",
                  departmentId: "dept-manufacturing",
                };
          const formattedDoc = {
            ...updatedDoc,
            uploadedBy: safeUploadedBy,
            uploadedAt:
              updatedDoc.uploadedAt &&
              !isNaN(new Date(updatedDoc.uploadedAt).getTime())
                ? new Date(updatedDoc.uploadedAt)
                    .toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })
                    .replace(/,/, "")
                : "No timestamp available",
            last_updated:
              updatedDoc.last_updated &&
              !isNaN(new Date(updatedDoc.last_updated).getTime())
                ? new Date(updatedDoc.last_updated)
                    .toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })
                    .replace(/,/, "")
                : "No timestamp available",
            tags: Array.isArray(updatedDoc.tags) ? updatedDoc.tags : [],
            orgId: updatedDoc.orgId || "org-123",
          };
          console.log("Updated selectedDocument:", {
            id: formattedDoc._id,
            name: formattedDoc.name,
            tags: formattedDoc.tags,
            orgId: formattedDoc.orgId,
          });
          setSelectedDocument(formattedDoc);
        } else {
          console.error(
            "Error fetching updated document:",
            await docResponse.json()
          );
          toast.error("Failed to fetch updated document details.");
        }
        setShowEditModal(false);
        toast.success("Document updated successfully!");
      } else {
        const errorData = await response.json();
        console.error("Update error:", errorData);
        toast.error(`Update failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("An error occurred while updating the document.");
    }
  };

  const handleDelete = (documentId: string) => {
    if (!documentId) {
      toast.error("No document selected for deletion.");
      return;
    }
    setDocumentToDelete(documentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) {
      toast.error("No document selected for deletion.");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/${documentToDelete}?orgId=org-123`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        await fetchDocuments();
        toast.success("Document deleted successfully!");
      } else {
        const errorData = await response.json();
        console.error("Error deleting document:", errorData);
        toast.error(`Delete failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("An error occurred while deleting the document.");
    } finally {
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    }
  };

  const handleOpenInEditor = (document: Document) => {
    console.log("Navigating to editor with _id:", document._id);
    localStorage.setItem("currentDocument", JSON.stringify(document));
    router.push(`/editor/${document._id}`);
  };

  const documentTypes = [
    "Clinical Data",
    "SOP",
    "Validation",
    "Design Control",
    "Risk Analysis",
    "Testing",
    "Manufacturing",
    "Labeling",
    "Regulatory",
  ];

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

  const availableTags = [
    "IFU",
    "Design Specifications",
    "Validation",
    "ISO 10993",
    "Risk",
    "ISO 14971",
    "SOP",
    "Biocompatibility",
    "Test Results",
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircleIcon className="h-3 w-3" />;
      case "Under Review":
        return <ClockIcon className="h-3 w-3" />;
      case "Draft":
        return <AlertTriangleIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
            <CheckCircleIcon className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "Under Review":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
            <ClockIcon className="h-3 w-3 mr-1" /> Under Review
          </Badge>
        );
      case "Draft":
        return (
          <Badge className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50">
            <AlertTriangleIcon className="h-3 w-3 mr-1" /> Draft
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSectionBadge = (section: string) => {
    const sectionColors = {
      "Section A": "bg-blue-50 text-blue-700 border-blue-200",
      "Section B": "bg-purple-50 text-purple-700 border-purple-200",
      "Section C": "bg-green-50 text-green-700 border-green-200",
      "Section D": "bg-orange-50 text-orange-700 border-orange-200",
      "Section E": "bg-pink-50 text-pink-700 border-pink-200",
      "Section F": "bg-red-50 text-red-700 border-red-200",
      "Section G": "bg-indigo-50 text-indigo-700 border-indigo-200",
      "Section H": "bg-teal-50 text-teal-700 border-teal-200",
    };
    const validSection = sections.some((s) => s.value === section)
      ? section
      : "";
    return (
      <Badge
        className={cn(
          "text-xs font-medium",
          validSection
            ? sectionColors[validSection as keyof typeof sectionColors]
            : "bg-gray-50 text-gray-700 border-gray-200"
        )}
      >
        {validSection || "No Section"}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(doc.tags) &&
        doc.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesSection =
      filterSection === "all" || (doc.section && doc.section === filterSection);
    const isNotDeleted = !doc.is_deleted;
    if (!isNotDeleted) {
      console.log(
        `Excluding document from table with _id: ${doc._id} due to is_deleted: true`
      );
    }
    return matchesSearch && matchesStatus && matchesSection && isNotDeleted;
  });

  const documentCounts = {
    total: documents.length,
    approved: documents.filter((d) => d.status === "Approved").length,
    review: documents.filter((d) => d.status === "Under Review").length,
    draft: documents.filter((d) => d.status === "Draft").length,
    linked: documents.filter((d) => d.section).length,
  };

  const handleCardFilter = (filterType: string, value: string) => {
    if (filterType === "status") setFilterStatus(value);
    setSearchTerm("");
    setFilterSection("all");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadForm((prev) => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
      }));
      toast.success("File selected: " + file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadForm((prev) => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
      }));
      toast.success("File selected: " + file.name);
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !uploadForm.tags.includes(tag) && uploadForm.tags.length < 5) {
      setUploadForm((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput("");
    }
  };

  const handleAddEditTag = (tag: string) => {
    if (tag && !editForm.tags.includes(tag) && editForm.tags.length < 5) {
      setEditForm((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUploadForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleViewDetails = async (document: Document) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/${document._id}?orgId=${document.orgId || "org-123"}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const updatedDoc = await response.json();
      const safeUploadedBy =
        updatedDoc.uploadedBy &&
        updatedDoc.uploadedBy.name &&
        updatedDoc.uploadedBy.id &&
        updatedDoc.uploadedBy.orgId &&
        updatedDoc.uploadedBy.roleId &&
        updatedDoc.uploadedBy.departmentId
          ? updatedDoc.uploadedBy
          : {
              name: "Unknown User",
              id: "unknown",
              orgId: "org-123",
              roleId: "role-qc-manager",
              departmentId: "dept-manufacturing",
            };
      const formattedDoc = {
        ...updatedDoc,
        uploadedBy: safeUploadedBy,
        uploadedAt:
          updatedDoc.uploadedAt &&
          !isNaN(new Date(updatedDoc.uploadedAt).getTime())
            ? new Date(updatedDoc.uploadedAt)
                .toLocaleString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })
                .replace(/,/, "")
            : "No timestamp available",
        last_updated:
          updatedDoc.last_updated &&
          !isNaN(new Date(updatedDoc.last_updated).getTime())
            ? new Date(updatedDoc.last_updated)
                .toLocaleString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })
                .replace(/,/, "")
            : "No timestamp available",
        tags: Array.isArray(updatedDoc.tags) ? updatedDoc.tags : [],
        orgId: updatedDoc.orgId || "org-123",
      };
      console.log("Selected document details:", {
        id: formattedDoc._id,
        name: formattedDoc.name,
        tags: formattedDoc.tags,
        orgId: formattedDoc.orgId,
      });
      setSelectedDocument(formattedDoc);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error fetching document details:", error);
      toast.error("Failed to load document details.");
    }
  };

  const handleReuploadModal = (document: Document) => {
    const safeDocument = {
      ...document,
      uploadedBy:
        document.uploadedBy &&
        document.uploadedBy.name &&
        document.uploadedBy.id &&
        document.uploadedBy.orgId &&
        document.uploadedBy.roleId &&
        document.uploadedBy.departmentId
          ? document.uploadedBy
          : {
              name: "Unknown User",
              id: "unknown",
              orgId: "org-123",
              roleId: "role-qc-manager",
              departmentId: "dept-manufacturing",
            },
    };
    setSelectedDocument(safeDocument);
    setUploadForm({
      file: null,
      name: safeDocument.name,
      type: safeDocument.type,
      section: safeDocument.section,
      status: safeDocument.status,
      tags: Array.isArray(safeDocument.tags) ? safeDocument.tags : [],
      description: safeDocument.description || "",
      capaId: safeDocument.capaId || "",
      uploadedBy: safeDocument.uploadedBy,
      fileUrl: safeDocument.fileUrl,
      orgId: safeDocument.orgId || "org-123",
    });
    setShowReuploadModal(true);
  };

  const handleEditModal = (document: Document) => {
    const safeDocument = {
      ...document,
      uploadedBy:
        document.uploadedBy &&
        document.uploadedBy.name &&
        document.uploadedBy.id &&
        document.uploadedBy.orgId &&
        document.uploadedBy.roleId &&
        document.uploadedBy.departmentId
          ? document.uploadedBy
          : {
              name: "Unknown User",
              id: "unknown",
              orgId: "org-123",
              roleId: "role-qc-manager",
              departmentId: "dept-manufacturing",
            },
    };
    setSelectedDocument(safeDocument);
    setEditForm({
      name: safeDocument.name,
      type: safeDocument.type,
      section: safeDocument.section,
      status: safeDocument.status,
      tags: Array.isArray(safeDocument.tags) ? safeDocument.tags : [],
      description: safeDocument.description || "",
      capaId: safeDocument.capaId || "",
      orgId: safeDocument.orgId || "org-123",
    });
    setShowEditModal(true);
  };

  const handleSectionFilter = (section: string) => {
    setFilterSection(section);
    setFilterStatus("all");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNavigation viewType={viewType} />
      <div className="flex-1 flex flex-col">
        <Header
          viewType={viewType}
          setViewType={setViewType}
          title="Document Hub (DHF)"
          description="FDA-linked document control for 510(k) submission readiness"
        />
        <div className="flex-1 p-4">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Document Hub (DHF)
                </h1>
                <p className="mt-2 text-gray-600">
                  FDA-linked document control for 510(k) submission readiness
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowUploadModal(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" /> Add Document
                </Button>
                <CreateDocumentModalTrigger />
              </div>
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-5">
              <Card
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200"
                onClick={() => handleCardFilter("status", "all")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileTextIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Documents
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {documentCounts.total}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200"
                onClick={() => handleCardFilter("status", "Approved")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Approved
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {documentCounts.approved}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200"
                onClick={() => handleCardFilter("status", "Under Review")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <ClockIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Under Review
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {documentCounts.review}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200"
                onClick={() => handleCardFilter("status", "Draft")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <FileIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Draft</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {documentCounts.draft}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <FolderIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Linked to 510(k) Sections
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {documentCounts.linked}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 border-gray-300">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-64 border-gray-300">
                  <SelectValue placeholder="Filter by section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="border-gray-200">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-900">
                        Document Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Version
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Section
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow
                        key={document._id}
                        className="hover:bg-gray-50 border-gray-200"
                      >
                        <TableCell>
                          <div
                            className="flex items-start gap-3 cursor-pointer"
                            onClick={() => handleViewDetails(document)}
                          >
                            <div className="p-1.5 bg-blue-50 rounded">
                              <FileTextIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 hover:text-blue-900">
                                {document.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {Array.isArray(document.tags) &&
                                document.tags.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    {document.tags.slice(0, 2).map((tag) => (
                                      <Badge
                                        key={`${document._id}-${tag}`}
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                    {document.tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{document.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    No tags
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(document.status)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {document.version}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              handleSectionFilter(document.section)
                            }
                            className="hover:opacity-80"
                          >
                            {document.section ? (
                              getSectionBadge(document.section)
                            ) : (
                              <Badge variant="outline">No Section</Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(document)}
                              >
                                <EyeIcon className="mr-2 h-4 w-4" /> View
                                Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditModal(document)}
                              >
                                <EditIcon className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReuploadModal(document)}
                              >
                                <UploadIcon className="mr-2 h-4 w-4" />{" "}
                                Re-upload
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenInEditor(document)}
                              >
                                <EditIcon className="mr-2 h-4 w-4" /> Open in
                                Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (document._id) {
                                    handleDelete(document._id);
                                  } else {
                                    console.error(
                                      "Invalid document ID:",
                                      document._id
                                    );
                                    toast.error(
                                      "Cannot delete: Invalid document ID."
                                    );
                                  }
                                }}
                                className="text-red-600"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogContent className="max-w-[880px] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Upload New Document
                  </DialogTitle>
                  <DialogDescription>
                    Upload a new document to the Document Hub for 510(k)
                    submission. Provide metadata and tags to organize it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      File Upload
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                        dragActive
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {uploadForm.file ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-10 w-10 text-blue-600" />
                            <div className="text-left">
                              <p className="font-medium text-gray-900">
                                {uploadForm.file.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {(uploadForm.file.size / 1024 / 1024).toFixed(
                                  1
                                )}{" "}
                                MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setUploadForm((prev) => ({
                                ...prev,
                                file: null,
                                name: "",
                              }))
                            }
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <div className="space-y-2 mb-4">
                            <p className="text-base font-medium text-gray-900">
                              Drop files here or click to upload
                            </p>
                            <p className="text-sm text-gray-500">
                              Supports PDF, Word, Excel, PowerPoint, image files
                              (max 10MB)
                            </p>
                          </div>
                          <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileInput}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                          />
                          <label htmlFor="file-upload">
                            <Button
                              type="button"
                              onClick={() =>
                                document.getElementById("file-upload")?.click()
                              }
                            >
                              Choose File
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Metadata
                    </Label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="doc-name"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Name
                        </Label>
                        <Input
                          id="doc-name"
                          value={uploadForm.name}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter document name"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="doc-type"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Type
                        </Label>
                        <Select
                          value={uploadForm.type}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="linked-section"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Linked 510(k) Section
                        </Label>
                        <Select
                          value={uploadForm.section}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              section: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem
                                key={section.value}
                                value={section.value}
                              >
                                {section.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="status"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Status
                        </Label>
                        <Select
                          value={uploadForm.status}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              status: value as
                                | "Draft"
                                | "Under Review"
                                | "Approved",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Under Review">
                              Under Review
                            </SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Tags
                    </Label>
                    <div className="space-y-4">
                      {uploadForm.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uploadForm.tags.map((tag) => (
                            <div
                              key={tag}
                              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                            >
                              <TagIcon className="h-3 w-3" />
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-blue-900"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                      <div className="flex gap-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Type to add tags..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={!tagInput || uploadForm.tags.length >= 5}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter((tag) => !uploadForm.tags.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleAddTag(tag)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                              disabled={uploadForm.tags.length >= 5}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500">Maximum 5 tags</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Description & CAPA Link
                    </Label>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="description"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Description / Notes
                        </Label>
                        <Textarea
                          id="description"
                          value={uploadForm.description}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Brief description or rationale for this document..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="capa-risk-id"
                          className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" /> CAPA/Risk ID
                          (Optional)
                        </Label>
                        <Input
                          id="capa-risk-id"
                          value={uploadForm.capaId}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              capaId: e.target.value,
                            }))
                          }
                          placeholder="CAPA-2024-001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      !uploadForm.file ||
                      !uploadForm.name ||
                      !uploadForm.type ||
                      !uploadForm.section ||
                      isProcessing
                    }
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    {isProcessing ? "Processing..." : "Upload"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showReuploadModal}
              onOpenChange={setShowReuploadModal}
            >
              <DialogContent className="max-w-[880px] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Re-upload Document
                  </DialogTitle>
                  <DialogDescription>
                    Re-upload a new file for the document. Provide updated
                    metadata and tags.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      File Upload
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                        dragActive
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {uploadForm.file ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-10 w-10 text-blue-600" />
                            <div className="text-left">
                              <p className="font-medium text-gray-900">
                                {uploadForm.file.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {(uploadForm.file.size / 1024 / 1024).toFixed(
                                  1
                                )}{" "}
                                MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setUploadForm((prev) => ({ ...prev, file: null }))
                            }
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <div className="space-y-2 mb-4">
                            <p className="text-base font-medium text-gray-900">
                              Drop new file here or click to upload
                            </p>
                            <p className="text-sm text-gray-500">
                              Supports PDF, Word, Excel, PowerPoint, image files
                              (max 10MB)
                            </p>
                          </div>
                          <input
                            id="file-reupload"
                            type="file"
                            onChange={handleFileInput}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                          />
                          <label htmlFor="file-reupload">
                            <Button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById("file-reupload")
                                  ?.click()
                              }
                            >
                              Choose File
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Metadata
                    </Label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="doc-name-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Name
                        </Label>
                        <Input
                          id="doc-name-reupload"
                          value={uploadForm.name}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter document name"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="doc-type-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Type
                        </Label>
                        <Select
                          value={uploadForm.type}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="linked-section-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Linked 510(k) Section
                        </Label>
                        <Select
                          value={uploadForm.section}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              section: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem
                                key={section.value}
                                value={section.value}
                              >
                                {section.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="status-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Status
                        </Label>
                        <Select
                          value={uploadForm.status}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              status: value as
                                | "Draft"
                                | "Under Review"
                                | "Approved",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Under Review">
                              Under Review
                            </SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Tags
                    </Label>
                    <div className="space-y-4">
                      {uploadForm.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uploadForm.tags.map((tag) => (
                            <div
                              key={tag}
                              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                            >
                              <TagIcon className="h-3 w-3" />
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-blue-900"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                      <div className="flex gap-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Type to add tags..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={!tagInput || uploadForm.tags.length >= 5}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter((tag) => !uploadForm.tags.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleAddTag(tag)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                              disabled={uploadForm.tags.length >= 5}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500">Maximum 5 tags</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Description & CAPA Link
                    </Label>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="description-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Description / Notes
                        </Label>
                        <Textarea
                          id="description-reupload"
                          value={uploadForm.description}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Brief description or rationale for this document..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="capa-risk-id-reupload"
                          className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" /> CAPA/Risk ID
                          (Optional)
                        </Label>
                        <Input
                          id="capa-risk-id-reupload"
                          value={uploadForm.capaId}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              capaId: e.target.value,
                            }))
                          }
                          placeholder="CAPA-2024-001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowReuploadModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReupload}
                    disabled={
                      !uploadForm.file ||
                      !uploadForm.name ||
                      !uploadForm.type ||
                      !uploadForm.section ||
                      isProcessing
                    }
                  >
                    {isProcessing ? "Processing..." : "Re-upload"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogContent className="max-w-[880px] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Edit Document
                  </DialogTitle>
                  <DialogDescription>
                    Update the metadata for the document. The file remains
                    unchanged.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Metadata
                    </Label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="doc-name-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Name
                        </Label>
                        <Input
                          id="doc-name-edit"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter document name"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="doc-type-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Type
                        </Label>
                        <Select
                          value={editForm.type}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="linked-section-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Linked 510(k) Section
                        </Label>
                        <Select
                          value={editForm.section}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, section: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem
                                key={section.value}
                                value={section.value}
                              >
                                {section.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="status-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Status
                        </Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({
                              ...prev,
                              status: value as
                                | "Draft"
                                | "Under Review"
                                | "Approved",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Under Review">
                              Under Review
                            </SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Tags
                    </Label>
                    <div className="space-y-4">
                      {Array.isArray(editForm.tags) &&
                      editForm.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {editForm.tags.map((tag) => (
                            <div
                              key={tag}
                              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                            >
                              <TagIcon className="h-3 w-3" />
                              {tag}
                              <button
                                onClick={() => handleRemoveEditTag(tag)}
                                className="ml-1 hover:text-blue-900"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                      <div className="flex gap-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Type to add tags..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddEditTag(tagInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddEditTag(tagInput)}
                          disabled={
                            !tagInput ||
                            (Array.isArray(editForm.tags) &&
                              editForm.tags.length >= 5)
                          }
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter((tag) => !editForm.tags.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleAddEditTag(tag)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                              disabled={
                                Array.isArray(editForm.tags) &&
                                editForm.tags.length >= 5
                              }
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500">Maximum 5 tags</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Description & CAPA Link
                    </Label>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="description-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Description / Notes
                        </Label>
                        <Textarea
                          id="description-edit"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Brief description or rationale for this document..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="capa-risk-id-edit"
                          className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" /> CAPA/Risk ID
                          (Optional)
                        </Label>
                        <Input
                          id="capa-risk-id-edit"
                          value={editForm.capaId}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              capaId: e.target.value,
                            }))
                          }
                          placeholder="CAPA-2024-001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEdit}
                    disabled={
                      !editForm.name || !editForm.type || !editForm.section
                    }
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
              <DialogContent className="max-w-[880px] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Document Details
                  </DialogTitle>
                  <DialogDescription>
                    View detailed information about the selected document.
                  </DialogDescription>
                </DialogHeader>
                {selectedDocument && (
                  <div className="space-y-6">
                    <div className="border-t border-gray-200 pt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        Metadata
                      </Label>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Document Name
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Document Type
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.type}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Linked 510(k) Section
                          </Label>
                          <p className="text-sm text-gray-900">
                            {sections.find(
                              (s) => s.value === selectedDocument.section
                            )?.label ||
                              selectedDocument.section ||
                              "No Section"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Status
                          </Label>
                          {getStatusBadge(selectedDocument.status)}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Version
                          </Label>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {selectedDocument.version}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Uploaded By
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.uploadedBy?.name ||
                              "Unknown User"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Role ID
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.uploadedBy?.roleId || "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Department ID
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.uploadedBy?.departmentId || "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Uploaded At
                          </Label>
                          <p className="text-sm text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />{" "}
                            {selectedDocument.uploadedAt}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Last Updated
                          </Label>
                          <p className="text-sm text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />{" "}
                            {selectedDocument.last_updated}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        Tags
                      </Label>
                      {Array.isArray(selectedDocument.tags) &&
                      selectedDocument.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedDocument.tags.map((tag) => (
                            <Badge
                              key={`${selectedDocument._id}-${tag}`}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <TagIcon className="h-3 w-3 mr-1" /> {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        Description & CAPA Link
                      </Label>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block">
                            Description
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.description ||
                              "No description provided"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" /> CAPA/Risk ID
                          </Label>
                          <p className="text-sm text-gray-900">
                            {selectedDocument.capaId ||
                              "No CAPA/Risk ID linked"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        Version History
                      </Label>
                      {selectedDocument.versionHistory &&
                      selectedDocument.versionHistory.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDocument.versionHistory.map((version) => (
                            <div
                              key={version.version}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileIcon className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Version {version.version}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Uploaded on{" "}
                                    {version.uploadedAt &&
                                    !isNaN(
                                      new Date(version.uploadedAt).getTime()
                                    )
                                      ? new Date(version.uploadedAt)
                                          .toLocaleString("en-IN", {
                                            year: "numeric",
                                            month: "short",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                            timeZone: "Asia/Kolkata",
                                          })
                                          .replace(/,/, "")
                                      : "No timestamp available"}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(version.fileUrl, "_blank")
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No version history available
                        </p>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        File
                      </Label>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-10 w-10 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {selectedDocument.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {selectedDocument.fileSize || "Unknown size"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            window.open(selectedDocument.fileUrl, "_blank")
                          }
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <Button onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this document? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete}>
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showBlankModal} onOpenChange={setShowBlankModal}>
              <DialogContent className="max-w-[880px] max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Create Blank Document
                  </DialogTitle>
                  <DialogDescription>
                    Create a new blank document to start editing directly in the
                    Document Hub.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Metadata
                    </Label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="doc-name-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Name
                        </Label>
                        <Input
                          id="doc-name-blank"
                          value={uploadForm.name}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter document name"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="doc-type-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Document Type
                        </Label>
                        <Select
                          value={uploadForm.type}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="linked-section-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Linked 510(k) Section
                        </Label>
                        <Select
                          value={uploadForm.section}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              section: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem
                                key={section.value}
                                value={section.value}
                              >
                                {section.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="status-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Status
                        </Label>
                        <Select
                          value={uploadForm.status}
                          onValueChange={(value) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              status: value as
                                | "Draft"
                                | "Under Review"
                                | "Approved",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Under Review">
                              Under Review
                            </SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Tags
                    </Label>
                    <div className="space-y-4">
                      {uploadForm.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uploadForm.tags.map((tag) => (
                            <div
                              key={tag}
                              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                            >
                              <TagIcon className="h-3 w-3" />
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-blue-900"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                      <div className="flex gap-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Type to add tags..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={!tagInput || uploadForm.tags.length >= 5}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter((tag) => !uploadForm.tags.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleAddTag(tag)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                              disabled={uploadForm.tags.length >= 5}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500">Maximum 5 tags</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <Label className="text-sm font-medium text-gray-700 mb-4 block">
                      Description & CAPA Link
                    </Label>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="description-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block"
                        >
                          Description / Notes
                        </Label>
                        <Textarea
                          id="description-blank"
                          value={uploadForm.description}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Brief description or rationale for this document..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="capa-risk-id-blank"
                          className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" /> CAPA/Risk ID
                          (Optional)
                        </Label>
                        <Input
                          id="capa-risk-id-blank"
                          value={uploadForm.capaId}
                          onChange={(e) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              capaId: e.target.value,
                            }))
                          }
                          placeholder="CAPA-2024-001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowBlankModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (
                        !uploadForm.name ||
                        !uploadForm.type ||
                        !uploadForm.section
                      ) {
                        toast.error(
                          "Please fill in all required fields (name, type, section)."
                        );
                        return;
                      }
                      setIsProcessing(true);
                      try {
                        const formData = new FormData();
                        formData.append("name", uploadForm.name);
                        formData.append("type", uploadForm.type);
                        formData.append("section", uploadForm.section);
                        formData.append("sectionRef", uploadForm.section);
                        formData.append("status", uploadForm.status);
                        formData.append(
                          "tags",
                          JSON.stringify(uploadForm.tags || [])
                        );
                        formData.append(
                          "description",
                          uploadForm.description || ""
                        );
                        formData.append("capaId", uploadForm.capaId || "");
                        formData.append(
                          "uploadedBy_name",
                          uploadForm.uploadedBy.name
                        );
                        formData.append(
                          "uploadedBy_id",
                          uploadForm.uploadedBy.id
                        );
                        formData.append(
                          "uploadedBy_orgId",
                          uploadForm.uploadedBy.orgId
                        );
                        formData.append(
                          "uploadedBy_roleId",
                          uploadForm.uploadedBy.roleId
                        );
                        formData.append(
                          "uploadedBy_departmentId",
                          uploadForm.uploadedBy.departmentId
                        );
                        formData.append("orgId", uploadForm.orgId);
                        formData.append("uploadedAt", new Date().toISOString());
                        formData.append(
                          "last_updated",
                          new Date().toISOString()
                        );
                        formData.append("content", "<p>New blank document</p>");
                        formData.append("version", "1.0");
                        const response = await fetch(API_BASE_URL, {
                          method: "POST",
                          body: formData,
                        });
                        if (response.ok) {
                          const newDoc = await response.json();
                          await fetchDocuments();
                          setUploadForm({
                            file: null,
                            name: "",
                            type: "",
                            section: "",
                            status: "Draft",
                            tags: [],
                            description: "",
                            capaId: "",
                            uploadedBy: {
                              name: "Current User",
                              id: "current_user",
                              orgId: "org-123",
                              roleId: "role-qc-manager",
                              departmentId: "dept-manufacturing",
                            },
                            fileUrl: "",
                            orgId: "org-123",
                          });
                          setShowBlankModal(false);
                          toast.success("Blank document created successfully!");
                          router.push(`/editor/${newDoc._id}`);
                        } else {
                          const errorData = await response.json();
                          console.error(
                            "Error creating blank document:",
                            errorData
                          );
                          toast.error(
                            `Creation failed: ${
                              errorData.detail || "Unknown error"
                            }`
                          );
                        }
                      } catch (error) {
                        console.error("Error creating blank document:", error);
                        toast.error(
                          "An error occurred while creating the document."
                        );
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={
                      !uploadForm.name ||
                      !uploadForm.type ||
                      !uploadForm.section ||
                      isProcessing
                    }
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    {isProcessing ? "Creating..." : "Create & Open in Editor"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
