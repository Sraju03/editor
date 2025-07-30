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
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [copilotWidth, setCopilotWidth] = useState(400);
  const API_BASE_URL = "http://localhost:8000/api/documents";
  const BACKEND_BASE_URL = "http://localhost:8000";
  const ORG_ID = "org-123";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!id || !/^[A-Z0-9-]+$/.test(id)) {
      console.error("Invalid or missing document ID:", id);
      setError(
        "Invalid document ID. Ensure the URL is in the format /editor/[id]"
      );
      setLoading(false);
      router.push("/document-hub");
      return;
    }

    console.log("Fetching document with ID:", id);

    const fetchDocument = async () => {
      try {
        const url = `${API_BASE_URL}/${id}?orgId=${encodeURIComponent(ORG_ID)}`;
        console.log("Request URL:", url);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add authentication headers if required
            // "Authorization": "Bearer your-auth-token",
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
          _id: doc._id || id,
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
          console.log("No fileUrl or content, using default content");
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

    const currentDoc = localStorage.getItem("currentDocument");
    if (currentDoc) {
      const doc: Document = JSON.parse(currentDoc);
      console.log("Parsed localStorage doc:", JSON.stringify(doc, null, 2));
      if (doc._id === id) {
        setDocumentData(doc);
        fetchDocument();
      } else {
        fetchDocument();
      }
    } else {
      fetchDocument();
    }
  }, [id, isMounted, router]);

  const updateDocument = async (
    newContent: string,
    newVersion: string
  ): Promise<boolean> => {
    if (!documentData) {
      console.error("No document data available to update");
      toast.error("No document data available to update");
      return false;
    }

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
    const newVersion = (parseFloat(documentData.version) + 0.1).toFixed(1);

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
      toast.success("Copilot SOP document applied to editor!");

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        action: "Copilot Suggestion Applied",
        user: "Current User",
        timestamp: new Date().toISOString(),
        details: "Applied Copilot-generated SOP document to editor",
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
    <div className="flex">
      <div
        className="flex-1"
        style={{ marginRight: isCopilotOpen ? `${copilotWidth}px` : "0" }}
      >
        <DocumentEditor
          document={documentData}
          updateDocument={updateDocument}
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />
      </div>
      <Copilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onWidthChange={setCopilotWidth}
        documentId={id}
        onSuggestion={handleCopilotSuggestion}
      />
    </div>
  );
}
