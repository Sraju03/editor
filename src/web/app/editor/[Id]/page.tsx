"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DocumentEditor } from "@/components/document-editor";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Copilot } from "@/components/copilot";
import { toast } from "react-hot-toast";

interface Document {
  _id: string;
  name: string;
  type: string;
  section?: string;
  status: string;
  fileUrl?: string;
  uploadedAt?: string;
  version: string;
  orgId: string;
  content: string;
  tags?: string[];
  description?: string | null;
  capaId?: string;
  uploadedBy?: {
    name: string;
    id: string;
    orgId: string;
    roleId: string;
    departmentId: string;
  };
  fileSize?: string;
  versionHistory?: string[];
  sectionRef?: string;
  last_updated?: string;
  is_deleted?: boolean;
  lastUpdated: string;
  updatedBy: string;
  linkedSection?: string;
  trustScore?: number;
  isPreviewMode?: boolean; // Add flag for preview mode
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  type:
    | "edit"
    | "save"
    | "restore"
    | "ai-action"
    | "upload"
    | "export"
    | "view"
    | "comment"
    | "approve";
  beforeContent?: string;
  afterContent?: string;
  sectionId?: string;
  isAiTriggered?: boolean;
}

export default function EditorDocPage() {
  const params = useParams();
  const router = useRouter();
  const id =
    (params?.id as string | undefined) || (params?.Id as string | undefined);
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotWidth, setCopilotWidth] = useState(600);
  const [copilotProps, setCopilotProps] = useState({
    initialPrompt: "",
    selectedText: "",
    actionType: "generate" as "fix" | "explain" | "rewrite" | "generate",
  });

  const API_BASE_URL = "http://localhost:8000/api/documents";
  const BACKEND_BASE_URL = "http://localhost:8000";
  const ORG_ID = "org-123";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Get the actual ID from params - handle both possible param names
    const documentId = params?.id || params?.Id;
    const idString = Array.isArray(documentId)
      ? documentId[0]
      : documentId?.toString();

    console.log("Raw params:", params);
    console.log("Extracted document ID:", idString);

    if (!idString) {
      console.error("No document ID found in params");
      setError("No document ID provided in URL");
      setLoading(false);
      return;
    }

    // If we're in preview mode, use mock data immediately
    if (idString === "[id]") {
      console.log("Using mock data for preview");
      const mockDocument: Document = {
        _id: "mock-doc-123",
        name: "Sample Device Master Record",
        content: `# Device Master Record

## Overview
This is a sample document for testing the editor functionality.

## Device Specifications
- **Device Name**: Sample Medical Device
- **Model Number**: SMD-2024-001
- **Classification**: Class II Medical Device

## Safety Protocols
1. Follow all safety guidelines
2. Ensure proper sterilization
3. Regular maintenance required

## Compliance Information
This device complies with FDA regulations and ISO standards.`,
        version: "v1.0",
        lastUpdated: "2024-01-15",
        updatedBy: "Dr. Sarah Chen",
        status: "draft",
        trustScore: 87,
        linkedSection: "Device Records",
        type: "DMR",
        section: "Medical Devices",
        fileUrl: "",
        uploadedAt: "2024-01-15",
        orgId: ORG_ID,
        tags: ["medical", "device", "dmr"],
        description: "Sample device master record for testing",
        capaId: "",
        uploadedBy: {
          name: "Dr. Sarah Chen",
          id: "user-123",
          orgId: ORG_ID,
          roleId: "role-doctor",
          departmentId: "dept-medical",
        },
        fileSize: "2.5 KB",
        versionHistory: ["v1.0"],
        sectionRef: "device-records",
        last_updated: "2024-01-15",
        is_deleted: false,
        isPreviewMode: true, // Mark as preview mode
      };

      setDocumentData(mockDocument);
      setLoading(false);
      setError(null);
      return;
    }

    // Validate real document ID
    if (!idString || !/^[A-Za-z0-9-_]+$/.test(idString)) {
      console.error("Invalid document ID:", idString);
      setError("Invalid document ID. Please check the URL format.");
      setLoading(false);
      return;
    }

    console.log("Processing document with ID:", idString);

    const fetchDocument = async () => {
      try {
        const url = `${API_BASE_URL}/${idString}?orgId=${encodeURIComponent(
          ORG_ID
        )}`;
        console.log("Request URL:", url);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const doc: Document = await response.json();
        if (!doc) {
          throw new Error("No document found for the given ID");
        }

        console.log("Fetched document:", JSON.stringify(doc, null, 2));

        const mappedDoc: Document = {
          ...doc,
          _id: doc._id || idString,
          name: doc.name || "Untitled Document",
          type: doc.type || "Unknown",
          section: doc.section || "",
          status: doc.status || "Draft",
          fileUrl: doc.fileUrl || "",
          uploadedAt: doc.uploadedAt || "",
          version: doc.version || "1.0",
          orgId: doc.orgId || ORG_ID,
          tags: doc.tags || [],
          description: doc.description || null,
          capaId: doc.capaId || "",
          uploadedBy: doc.uploadedBy || {
            name: "Unknown",
            id: "",
            orgId: ORG_ID,
            roleId: "role-unknown",
            departmentId: "dept-unknown",
          },
          fileSize: doc.fileSize || "",
          versionHistory: doc.versionHistory || [],
          sectionRef: doc.sectionRef || "",
          last_updated: doc.last_updated || "",
          is_deleted: doc.is_deleted || false,
          lastUpdated:
            doc.last_updated ||
            doc.uploadedAt ||
            new Date().toISOString().split("T")[0],
          updatedBy: doc.uploadedBy?.name || "Unknown",
          linkedSection: doc.sectionRef || doc.section || "",
          trustScore: doc.trustScore || 87,
          isPreviewMode: false,
        };

        localStorage.setItem("currentDocument", JSON.stringify(mappedDoc));

        if (doc.content) {
          console.log("Using doc.content:", doc.content);
          setDocumentData({
            ...mappedDoc,
            content: doc.content,
          });
        } else if (mappedDoc.fileUrl) {
          try {
            console.log(
              "Attempting to fetch content for fileUrl:",
              mappedDoc.fileUrl
            );
            const contentUrl = `${API_BASE_URL}/content?fileUrl=${encodeURIComponent(
              mappedDoc.fileUrl
            )}&orgId=${encodeURIComponent(ORG_ID)}`;
            console.log("Content request URL:", contentUrl);
            const contentResponse = await fetch(contentUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            console.log("Content API response status:", contentResponse.status);
            if (contentResponse.ok) {
              const { content } = await contentResponse.json();
              console.log("Fetched content:", content);
              setDocumentData({
                ...mappedDoc,
                content: content,
              });
            } else {
              console.warn(
                `Content fetch failed with status: ${contentResponse.status}`
              );
              const rawFileUrl = `${BACKEND_BASE_URL}${mappedDoc.fileUrl}`;
              console.log("Attempting to fetch raw content from:", rawFileUrl);
              const rawResponse = await fetch(rawFileUrl, { method: "GET" });
              if (rawResponse.ok) {
                const rawContent = await rawResponse.text();
                console.log("Fetched raw content:", rawContent);
                setDocumentData({
                  ...mappedDoc,
                  content: rawContent,
                });
              } else {
                console.warn(
                  `Raw content fetch failed with status: ${rawResponse.status}`
                );
                setDocumentData({
                  ...mappedDoc,
                  content:
                    "<p>Mock content for document " + mappedDoc._id + "</p>",
                });
              }
            }
          } catch (contentError) {
            const errorMessage =
              contentError instanceof Error
                ? contentError.message
                : "Unknown content error";
            console.error("Error fetching content:", errorMessage);
            setDocumentData({
              ...mappedDoc,
              content: "<p>Mock content for document " + mappedDoc._id + "</p>",
            });
          }
        } else {
          console.log("No fileUrl or content, using mock content");
          setDocumentData({
            ...mappedDoc,
            content: "<p>Mock content for document " + mappedDoc._id + "</p>",
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching document:", errorMessage);
        setError(`Failed to load document: ${errorMessage}`);
        toast.error(`Failed to load document: ${errorMessage}`);
        setDocumentData(null);
      } finally {
        setLoading(false);
      }
    };

    // Check localStorage first for real document IDs
    const currentDoc = localStorage.getItem("currentDocument");
    if (currentDoc) {
      try {
        const doc: Document = JSON.parse(currentDoc);
        console.log("Parsed localStorage doc:", JSON.stringify(doc, null, 2));
        if (doc._id === idString) {
          setDocumentData(doc);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse localStorage document:", e);
      }
    }

    // If not in localStorage or different ID, fetch from API
    fetchDocument();
  }, [isMounted]); // Only depend on mounted state

  const updateDocument = async (
    newContent: string,
    newVersion: string
  ): Promise<boolean> => {
    if (!documentData) {
      console.error("No document data available to update");
      toast.error("No document data available to update");
      return false;
    }

    // Handle preview mode - simulate successful update without API call
    if (documentData.isPreviewMode) {
      console.log("Preview mode: Simulating document update");

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedMappedDoc: Document = {
        ...documentData,
        content: newContent,
        version: newVersion,
        last_updated: new Date().toISOString(),
        lastUpdated: new Date().toISOString().split("T")[0],
        updatedBy: documentData.uploadedBy?.name || "Current User",
      };

      setDocumentData(updatedMappedDoc);
      localStorage.setItem("currentDocument", JSON.stringify(updatedMappedDoc));

      console.log("Preview mode: Document updated successfully");
      return true;
    }

    // Real API call for production mode
    try {
      const formData = new FormData();
      formData.append("content", newContent);
      formData.append("version", newVersion);
      formData.append("last_updated", new Date().toISOString());
      formData.append("orgId", ORG_ID);
      if (documentData.uploadedBy?.name) {
        formData.append("uploadedBy_name", documentData.uploadedBy.name);
        formData.append("uploadedBy_id", documentData.uploadedBy.id);
        formData.append("uploadedBy_orgId", documentData.uploadedBy.orgId);
        formData.append(
          "uploadedBy_roleId",
          documentData.uploadedBy.roleId || "role-unknown"
        );
        formData.append(
          "uploadedBy_departmentId",
          documentData.uploadedBy.departmentId || "dept-unknown"
        );
      } else {
        formData.append("uploadedBy_name", "Current User");
        formData.append("uploadedBy_id", "unknown");
        formData.append("uploadedBy_orgId", ORG_ID);
        formData.append("uploadedBy_roleId", "role-unknown");
        formData.append("uploadedBy_departmentId", "dept-unknown");
      }

      console.log("Updating document with ID:", documentData._id);
      const updateUrl = `${API_BASE_URL}/${documentData._id}`;
      console.log("Update request URL:", updateUrl);
      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        body: formData,
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Update error response:", errorText);
        throw new Error(`HTTP error ${updateResponse.status}: ${errorText}`);
      }

      const updatedDoc = await updateResponse.json();
      console.log("Document updated successfully:", updatedDoc);

      const updatedMappedDoc: Document = {
        ...documentData,
        content: newContent,
        version: newVersion,
        last_updated: new Date().toISOString(),
        lastUpdated: new Date().toISOString().split("T")[0],
        updatedBy: documentData.uploadedBy?.name || "Current User",
      };
      setDocumentData(updatedMappedDoc);
      localStorage.setItem("currentDocument", JSON.stringify(updatedMappedDoc));

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating document:", errorMessage);
      toast.error(`Failed to update document: ${errorMessage}`);
      return false;
    }
  };

  const handleCopilotSuggestion = async (suggestion: string) => {
    if (!documentData) {
      console.error("No document data available to apply suggestion");
      toast.error("No document data available to apply suggestion");
      return;
    }

    const currentContent = documentData.content || "";
    const newContent =
      currentContent.trim() === "<p></p>" || currentContent.trim() === ""
        ? `<p>${suggestion}</p>`
        : `${currentContent}\n\n<p>${suggestion}</p>`;
    const newVersion = (
      Number.parseFloat(documentData.version.replaceAll("v", "")) + 0.1
    ).toFixed(1);

    const success = await updateDocument(newContent, newVersion);
    if (success) {
      const updatedDoc: Document = {
        ...documentData,
        content: newContent,
        version: newVersion,
        last_updated: new Date().toISOString(),
        lastUpdated: new Date().toISOString().split("T")[0],
        updatedBy: documentData.uploadedBy?.name || "Current User",
      };
      setDocumentData(updatedDoc);
      localStorage.setItem("currentDocument", JSON.stringify(updatedDoc));
      console.log("Applied Copilot suggestion to document");
      toast.success("Content applied to editor!");

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        action: "Copilot Suggestion Applied",
        user: "Current User",
        timestamp: new Date().toISOString(),
        details: "Applied Copilot-generated content to editor",
        type: "ai-action",
        sectionId: documentData.linkedSection,
        isAiTriggered: true,
        beforeContent: currentContent,
        afterContent: newContent,
      };
      const currentAudit = JSON.parse(
        localStorage.getItem(`audit_${documentData._id}`) || "[]"
      );
      localStorage.setItem(
        `audit_${documentData._id}`,
        JSON.stringify([auditEntry, ...currentAudit])
      );
    } else {
      console.error("Failed to apply Copilot suggestion");
      toast.error("Failed to apply Copilot suggestion to editor");
    }
  };

  const handleReplaceContent = async (
    originalText: string,
    newContent: string
  ) => {
    if (!documentData) {
      console.error("No document data available to replace content");
      toast.error("No document data available to replace content");
      return;
    }

    const currentContent = documentData.content || "";

    // Clean the new content - remove outer HTML tags if present
    let cleanNewContent = newContent
      .replace(/^<p>|<\/p>$/g, "")
      .replace(/^<div>|<\/div>$/g, "")
      .trim();

    // If the new content doesn't have HTML formatting, wrap it appropriately
    if (!cleanNewContent.includes("<") && !cleanNewContent.includes("\n")) {
      cleanNewContent = cleanNewContent;
    } else if (
      cleanNewContent.includes("\n") &&
      !cleanNewContent.includes("<")
    ) {
      // Convert line breaks to HTML if needed
      cleanNewContent = cleanNewContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .join("<br>");
    }

    // Perform the replacement - try multiple strategies
    let updatedContent = currentContent;
    let replacementMade = false;

    // Strategy 1: Direct text replacement
    if (currentContent.includes(originalText)) {
      updatedContent = currentContent.replace(originalText, cleanNewContent);
      replacementMade = true;
    }
    // Strategy 2: Replace text content while preserving some HTML structure
    else {
      // Remove HTML tags from both original and current content for comparison
      const stripHTML = (str: string) => str.replace(/<[^>]*>/g, "").trim();
      const originalStripped = stripHTML(originalText);
      const currentStripped = stripHTML(currentContent);

      if (currentStripped.includes(originalStripped)) {
        // Create a regex to find the text regardless of HTML tags
        const escapedText = originalStripped.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const regex = new RegExp(`([^>]*?)${escapedText}([^<]*?)`, "gi");

        updatedContent = currentContent.replace(
          regex,
          (match, before, after) => {
            return before + cleanNewContent + after;
          }
        );
        replacementMade = true;
      }
    }

    // Strategy 3: If still no replacement, try a more aggressive approach
    if (!replacementMade) {
      // Try to replace just the core text content
      const words = originalText.split(/\s+/).filter((word) => word.length > 2); // Get significant words
      if (words.length > 0) {
        const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const lastWord = words[words.length - 1].replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        // Try to find a pattern that includes the first and last significant words
        const pattern = new RegExp(`${firstWord}.*?${lastWord}`, "gi");
        if (pattern.test(currentContent)) {
          updatedContent = currentContent.replace(pattern, cleanNewContent);
          replacementMade = true;
        }
      }
    }

    console.log("Replacing text:", {
      original: originalText,
      new: cleanNewContent,
      before: currentContent,
      after: updatedContent,
      isPreviewMode: documentData.isPreviewMode,
      replacementMade: replacementMade,
    });

    // If no replacement was made, show warning
    if (!replacementMade || updatedContent === currentContent) {
      console.warn("No replacement was made - text not found");
      toast.error(
        "Could not find the selected text to replace. The text may have been modified. Please try selecting again."
      );
      return;
    }

    const newVersion = (
      Number.parseFloat(documentData.version.replaceAll("v", "")) + 0.1
    ).toFixed(1);

    const success = await updateDocument(updatedContent, newVersion);
    if (success) {
      const updatedDoc: Document = {
        ...documentData,
        content: updatedContent,
        version: newVersion,
        last_updated: new Date().toISOString(),
        lastUpdated: new Date().toISOString().split("T")[0],
        updatedBy: documentData.uploadedBy?.name || "Current User",
      };
      setDocumentData(updatedDoc);
      localStorage.setItem("currentDocument", JSON.stringify(updatedDoc));
      console.log("Successfully replaced content in document");
      toast.success("Selected text replaced with AI response!");

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        action: "Content Replaced with AI",
        user: "Current User",
        timestamp: new Date().toISOString(),
        details: `Replaced "${originalText.substring(
          0,
          50
        )}..." with AI-generated content`,
        type: "ai-action",
        sectionId: documentData.linkedSection,
        isAiTriggered: true,
        beforeContent: currentContent,
        afterContent: updatedContent,
      };
      const currentAudit = JSON.parse(
        localStorage.getItem(`audit_${documentData._id}`) || "[]"
      );
      localStorage.setItem(
        `audit_${documentData._id}`,
        JSON.stringify([auditEntry, ...currentAudit])
      );
    } else {
      console.error("Failed to replace content");
      toast.error("Failed to replace selected text");
    }
  };

  const handleOpenCopilot = (
    initialPrompt = "",
    selectedText = "",
    actionType: "fix" | "explain" | "rewrite" | "generate" = "generate"
  ) => {
    setCopilotProps({
      initialPrompt,
      selectedText,
      actionType,
    });
    setIsCopilotOpen(true);
  };

  if (!isMounted) return null;

  if (loading) return <LoadingSpinner />;

  if (error || !documentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Document Not Found
          </h2>
          <p className="text-gray-600">
            {error || "The requested document could not be loaded."}
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => router.push("/document-hub")}
          >
            Back to Document Hub
          </button>
        </div>
      </div>
    );
  }

  console.log(
    "Rendering with Document Data:",
    JSON.stringify(documentData, null, 2)
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1">
        <DocumentEditor
          document={documentData}
          updateDocument={updateDocument}
          onOpenCopilot={handleOpenCopilot}
        />
      </div>

      <Copilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onWidthChange={setCopilotWidth}
        documentId={id}
        onSuggestion={handleCopilotSuggestion}
        onReplaceContent={handleReplaceContent}
        initialPrompt={copilotProps.initialPrompt}
        selectedText={copilotProps.selectedText}
        actionType={copilotProps.actionType}
      />
    </div>
  );
}
