"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "react-hot-toast";
import DiffMatchPatch from "diff-match-patch";
import { AIPromptDropdown } from "./ai-prompt-dropdown";
import { AIAssistantButton } from "./ai-assistant-button";
import { TextSelectionPopup } from "./text-selection-popup";
import {
  Save,
  FileDown,
  Eye,
  GitCompare,
  Undo,
  Redo,
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ImageIcon,
  Calendar,
  User,
  FileText,
  Activity,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  LinkIcon,
  Quote,
  Minus,
  GitBranch,
  Download,
  Edit3,
  X,
  BarChart3,
  Search,
  MessageSquare,
  Archive,
  XCircle,
  Plus,
  Printer,
  Indent,
  Outdent,
} from "lucide-react";
import { marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import { EnhancedSaveModal } from "./enchanced-save-modal";

// Types
interface DocumentVersion {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  createdBy: string;
  type: "manual" | "auto-save" | "ai-generated";
  description?: string;
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

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface DocumentEditorProps {
  document: {
    id?: string;
    _id: string;
    name: string;
    content: string;
    version: string;
    lastUpdated: string;
    updatedBy: string;
    status: string;
    trustScore?: number;
    linkedSection?: string;
    isNewDocument?: boolean;
  };
  updateDocument: (newContent: string, newVersion: string) => Promise<boolean>;
  onOpenCopilot?: () => void
}

export function DocumentEditor({ document, updateDocument, onOpenCopilot}: DocumentEditorProps) {
  // Copilot state
 
  // AI Prompt Dialog state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [textSelection, setTextSelection] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedText: "",
  });
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  // TipTap Editor Configuration
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6], HTMLAttributes: { class: "prose-heading" } },
      bulletList: { HTMLAttributes: { class: "prose-bullet-list" } },
      orderedList: { HTMLAttributes: { class: "prose-ordered-list" } },
      blockquote: { HTMLAttributes: { class: "prose-blockquote" } },
      codeBlock: { HTMLAttributes: { class: "prose-code-block" } },
      code: { HTMLAttributes: { class: "prose-code" } },
      paragraph: { HTMLAttributes: { class: "prose-paragraph" } },
    }),
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Image.configure({ HTMLAttributes: { class: "prose-image" } }),
    Link.configure({
      HTMLAttributes: { class: "prose-link" },
      openOnClick: true,
      autolink: true,
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    FontFamily.configure({ types: ["textStyle"] }),
  ],
  content: "<p></p>", // Initialize with empty content; useEffect will set initial content
  onUpdate: ({ editor }) => {
    const newContent = editor.getHTML();
    setContent(newContent);
    setHasUnsavedChanges(newContent !== originalContent);
    addAuditEntry("Content Modified", "Document content was edited", "edit");
  },

});


  // State management
  const [content, setContent] = useState(document.content || "");
  const [originalContent, setOriginalContent] = useState(
    document.content || ""
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [trackChanges, setTrackChanges] = useState(true);

  // Tab management
  const [activeTab, setActiveTab] = useState("editor");
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [tabOrder, setTabOrder] = useState([
    "editor",
    "version-control",
    "compare-version",
    "audit-trail",
  ]);

  // Modals
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Form states
  const [linkForm, setLinkForm] = useState({ url: "", text: "" });
  const [imageForm, setImageForm] = useState({ url: "", alt: "" });
  const [versionName, setVersionName] = useState("");
  const [versionDescription, setVersionDescription] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<[string, string]>([
    "",
    "",
  ]);
  const [searchQuery, setSearchQuery] = useState("");

  // Version management
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const tabs: Tab[] = [
    { id: "editor", label: "Editor", icon: "edit" },
    { id: "version-control", label: "Version Control", icon: "git-branch" },
    { id: "compare-version", label: "Compare version", icon: "git-compare" },
    { id: "audit-trail", label: "Audit Trail", icon: "file-text" },
  ];
const setFontSize = (size: string) => {
  editor?.chain().focus().setMark('textStyle', { style: `font-size: ${size}px` }).run();
};
  // Check if editor has content (more robust check)
const hasContent = !!(
  content &&
  content.trim() !== "" &&
  content !== "<p></p>" &&
  content !== "<p><br></p>"
);
 const addAuditEntry = useCallback(
    (
      action: string,
      details: string,
      type: AuditEntry["type"],
      isAiTriggered = false
    ) => {
      const entry: AuditEntry = {
        id: Date.now().toString(),
        action: isAiTriggered ? `🧠 ${action}` : action,
        user: "Current User",
        timestamp: new Date().toISOString(),
        details,
        type,
        sectionId: document.linkedSection,
        isAiTriggered,
        beforeContent: content,
        afterContent: editor?.getHTML() || content,
      };

      setAuditTrail((prev) => {
        const updated = [entry, ...prev];
        localStorage.setItem(`audit_${document.id}`, JSON.stringify(updated));
        return updated;
      });
    },
    [document.id, document.linkedSection, content, editor]
  );

  // Initialize versions and audit trail
useEffect(() => {
  const savedVersions = localStorage.getItem(`versions_${document._id}`);
  const savedAudit = localStorage.getItem(`audit_${document._id}`);

  if (savedVersions) {
    setVersions(JSON.parse(savedVersions));
  } else {
    const initialVersion: DocumentVersion = {
      id: "v1.0",
      name: "Initial Version",
      content: document.content,
      createdAt: document.lastUpdated,
      createdBy: document.updatedBy,
      type: "manual",
      description: "Initial document version",
    };
    setVersions([initialVersion]);
  }

  if (savedAudit) {
    setAuditTrail(JSON.parse(savedAudit));
  } else {
    addAuditEntry(
      "Document Opened",
      `Document "${document.name}" opened in editor`,
      "edit"
    );
  }
}, [document._id, document.content, document.lastUpdated, document.name, document.updatedBy, addAuditEntry]);

marked.setOptions({
  async: false,
  gfm: true,
  breaks: true,
});
// New useEffect to sync editor content with document.content
useEffect(() => {
  if (editor) {
    if (document.isNewDocument) {
      editor.commands.setContent("<p></p>");
      setContent("");
      setOriginalContent("");
      setHasUnsavedChanges(false);
      console.log("New document detected, editor cleared");
    } else if (document.content) {
      try {
        const rawContent = document.content.trim();
        const htmlContent = marked.parse(rawContent, {
          gfm: true,
          breaks: true,
        }) as string;
        const cleanContent = sanitizeHtml(htmlContent, {
          allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'img', 'blockquote', 'code', 'pre'],
          allowedAttributes: {
            a: ['href', 'class'],
            img: ['src', 'alt', 'class'],
            h1: ['class'],
            h2: ['class'],
            h3: ['class'],
            h4: ['class'],
            h5: ['class'],
            h6: ['class'],
            ul: ['class'],
            ol: ['class'],
            li: ['class'],
            blockquote: ['class'],
            code: ['class'],
            pre: ['class'],
            p: ['class'],
          },
        });
        editor.commands.setContent(cleanContent);
        setContent(cleanContent);
        setOriginalContent(cleanContent);
        setHasUnsavedChanges(false);
        console.log("Raw document content:", rawContent);
        console.log("Parsed HTML content:", htmlContent);
        console.log("Sanitized HTML content:", cleanContent);
        console.log("Editor HTML after setContent:", editor.getHTML());
      } catch (error) {
        console.error("Error parsing markdown:", error);
        editor.commands.setContent("<p>Error loading content</p>");
        setContent("<p>Error loading content</p>");
        setOriginalContent("<p>Error loading content</p>");
        toast.error("Failed to load document content");
      }
    } else {
      editor.commands.setContent("<p></p>");
      setContent("");
      setOriginalContent("");
      setHasUnsavedChanges(false);
      console.log("Empty document content, editor cleared");
    }
  }
}, [editor, document.content, document.isNewDocument]);
useEffect(() => {
  console.log("Document content received:", document.content);
  console.log("Parsed HTML content:", document.content ? marked.parse(document.content) : "Empty");
}, [document.content]);
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setTextSelection({
          isVisible: true,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top,
          },
          selectedText: selection.toString().trim(),
        });
      } else {
        setTextSelection((prev) => ({ ...prev, isVisible: false }));
      }
    };

    // Use the global document object – not the prop named `document`
    const editorElement =
      typeof window !== "undefined"
        ? window.document.querySelector(".ProseMirror")
        : null;

    if (editorElement) {
      editorElement.addEventListener("mouseup", handleTextSelection);
      editorElement.addEventListener("keyup", handleTextSelection);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener("mouseup", handleTextSelection);
        editorElement.removeEventListener("keyup", handleTextSelection);
      }
    };
  }, [editor]);

 
  const handleAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsAutoSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const autoSaveVersion: DocumentVersion = {
        id: `auto_${Date.now()}`,
        name: `Auto-save ${new Date().toLocaleTimeString()}`,
        content: content,
        createdAt: new Date().toISOString(),
        createdBy: "System",
        type: "auto-save",
      };

      setVersions((prev) => {
        const updated = [autoSaveVersion, ...prev];
        localStorage.setItem(
          `versions_${document.id}`,
          JSON.stringify(updated)
        );
        return updated;
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      addAuditEntry("Auto-save", "Document auto-saved", "save");
      toast.success("Document auto-saved", { duration: 2000 });
    } catch (error) {
      toast.error("Auto-save failed");
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, content, addAuditEntry]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges) {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, autoSaveEnabled, handleAutoSave]);

  // AI Generation Handler
const handleAIGenerate = (generatedContent: string) => {
  if (!editor) return;

  try {
    // Remove outer <p> tags and trim
    const rawContent = generatedContent
      .replace(/^<p>|<\/p>$/g, '')
      .trim();

    // Parse markdown to HTML
    const parsedContent = marked.parse(rawContent, {
      gfm: true,
      breaks: true,
    }) as string;

    // Clean up parsed content
    const cleanContent = parsedContent
      .replace(/^<div>|<\/div>$/g, '')
      .trim();

    if (document.isNewDocument || !hasContent) {
      editor.commands.setContent(cleanContent);
      setContent(cleanContent);
      setOriginalContent(cleanContent);
      addAuditEntry(
        "AI SOP Generated",
        "SOP content generated using AI prompt",
        "ai-action",
        true
      );
      toast.success("SOP generated successfully!");
    } else {
      const currentContent = editor.getHTML();
      const enhancedContent = `${currentContent}<p></p>${cleanContent}`;
      editor.commands.setContent(enhancedContent);
      setContent(enhancedContent);
      addAuditEntry(
        "AI SOP Enhanced",
        "Existing SOP content enhanced using AI",
        "ai-action",
        true
      );
      toast.success("SOP content enhanced successfully!");
    }
    setHasUnsavedChanges(true);
    console.log("Raw AI-generated content:", rawContent);
    console.log("Parsed HTML content:", parsedContent);
    console.log("Cleaned HTML content:", cleanContent);
    console.log("Editor HTML after setContent:", editor.getHTML());
  } catch (error) {
    console.error("Error parsing AI-generated markdown:", error);
    toast.error("Failed to process AI-generated content");
  }
};
  // Add handler for text selection popup:
  const handleFixWithAI = (selectedText: string) => {
    setAiPromptText(selectedText);
    setShowAIPrompt(true);
    setTextSelection((prev) => ({ ...prev, isVisible: false }));
  };

  // Handle copilot width change


  // Tab management functions
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "edit":
        return <Edit3 className="h-4 w-4" />;
      case "git-branch":
        return <GitBranch className="h-4 w-4" />;
      case "git-compare":
        return <GitCompare className="h-4 w-4" />;
      case "file-text":
        return <FileText className="h-4 w-4" />;
      default:
        return <Edit3 className="h-4 w-4" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) return;

    const newOrder = [...tabOrder];
    const draggedIndex = newOrder.indexOf(draggedTab);
    const targetIndex = newOrder.indexOf(targetTabId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTab);

    setTabOrder(newOrder);
    setDraggedTab(null);
  };

  // Editor functions
const handleManualSave = async (saveData: { fileName: string; versionName: string; description: string }) => {
  if (!saveData?.versionName) {
    toast.error("Version name is required to save the document.");
    return;
  }

  const newVersion: DocumentVersion = {
    id: saveData.versionName.toLowerCase().replace(/\s+/g, "-"),
    name: saveData.versionName,
    content: content,
    createdAt: new Date().toISOString(),
    createdBy: "Current User",
    type: "manual",
    description: saveData.description || "",
  };

  setVersions((prev) => {
    const updated = [newVersion, ...prev];
    localStorage.setItem(`versions_${document.id}`, JSON.stringify(updated));
    return updated;
  });

  addAuditEntry(
    "Manual Save",
    `Version "${saveData.versionName}" saved${saveData.fileName !== document.name ? ` and document renamed to "${saveData.fileName}"` : ""}`,
    "save"
  );

  // Update document in backend
  const success = await updateDocument(content, saveData.versionName);
  if (success) {
    // Update local document state with new name if changed
    const updatedDoc = {
      ...document,
      name: saveData.fileName,
      content: content,
      version: saveData.versionName,
      lastUpdated: new Date().toISOString().split("T")[0],
      updatedBy: "Current User",
      isNewDocument: false,
    };
    localStorage.setItem(`currentDocument_${document.id}`, JSON.stringify(updatedDoc));
    setOriginalContent(content);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    toast.success(`Document${saveData.fileName !== document.name ? ` renamed to "${saveData.fileName}" and` : ""} saved as version "${saveData.versionName}"`);
  } else {
    toast.error("Failed to save document");
  }
};

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (editor) {
      editor.commands.setContent(version.content);
      setContent(version.content);
      setOriginalContent(version.content);
      setHasUnsavedChanges(false);

      addAuditEntry(
        "Version Restored",
        `Restored to version "${version.name}"`,
        "restore"
      );
      toast.success(`Restored to version "${version.name}"`);
      setShowHistoryModal(false);
    }
  };

  const generateDiff = (content1: string, content2: string) => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(content1, content2);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map((diff, index) => {
      const [operation, text] = diff;
      let className = "";
      let prefix = "";

      if (operation === 1) {
        className = "bg-green-100 text-green-800";
        prefix = "+";
      } else if (operation === -1) {
        className = "bg-red-100 text-red-800 line-through";
        prefix = "-";
      }

      return (
        <span key={index} className={className}>
          {prefix}
          {text}
        </span>
      );
    });
  };

  const exportAuditLog = () => {
  const csvContent = [
    ["Timestamp", "User", "Action", "Type", "Details", "Section"].join(","),
    ...auditTrail.map((entry) =>
      [
        entry.timestamp,
        entry.user,
        entry.action,
        entry.type,
        entry.details.replace(/,/g, ";"),
        entry.sectionId || "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a"); // Use window.document
  a.href = url;
  a.download = `audit-log-${document.name}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  addAuditEntry("Audit Log Exported", "Audit log exported to CSV", "export");
  toast.success("Audit log exported");
};

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // TipTap Editor Actions
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
  const toggleHighlight = () => editor?.chain().focus().toggleHighlight().run();
  const toggleCode = () => editor?.chain().focus().toggleCode().run();
  const toggleBlockquote = () =>
    editor?.chain().focus().toggleBlockquote().run();

  const setAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    editor?.chain().focus().setTextAlign(alignment).run();
  };

  const toggleBulletList = () =>
    editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor?.chain().focus().toggleOrderedList().run();

  const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  };

  const setParagraph = () => editor?.chain().focus().setParagraph().run();

  const setFontFamily = (fontFamily: string) => {
    editor?.chain().focus().setFontFamily(fontFamily).run();
  };

  const setTextColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  const insertHorizontalRule = () => {
    editor?.chain().focus().setHorizontalRule().run();
  };

  const insertLink = () => {
    if (linkForm.url) {
      editor?.chain().focus().setLink({ href: linkForm.url }).run();
      if (linkForm.text) {
        editor?.chain().focus().insertContent(linkForm.text).run();
      }
      setLinkForm({ url: "", text: "" });
      setShowLinkModal(false);
    }
  };

  const insertImage = () => {
    if (imageForm.url) {
      editor
        ?.chain()
        .focus()
        .setImage({ src: imageForm.url, alt: imageForm.alt })
        .run();
      setImageForm({ url: "", alt: "" });
      setShowImageModal(false);
    }
  };

  const handleUndo = () => editor?.chain().focus().undo().run();
  const handleRedo = () => editor?.chain().focus().redo().run();

  // Render functions
  const renderMovableTabs = () => {
    const orderedTabs = tabOrder
      .map((id) => tabs.find((tab) => tab.id === id)!)
      .filter(Boolean);

    return (
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center">
          {orderedTabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-3 cursor-pointer border-r border-gray-200
                transition-all duration-200 hover:bg-gray-50 select-none
                ${
                  activeTab === tab.id
                    ? "bg-white border-b-2 border-b-blue-500 text-blue-600"
                    : "bg-gray-50 text-gray-600 hover:text-gray-900"
                }
                ${draggedTab === tab.id ? "opacity-50" : ""}
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              {getIcon(tab.icon)}
              <span className="text-sm font-medium whitespace-nowrap">
                {tab.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 ml-2 hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEditorToolbar = () => (
    <div className="border-b border-gray-200 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!editor?.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!editor?.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom */}
        <Select defaultValue="100">
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
            <SelectItem value="125">125%</SelectItem>
            <SelectItem value="150">150%</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Style */}
        <Select
          onValueChange={(value) => {
            if (value === "paragraph") setParagraph();
            else setHeading(Number(value) as 1 | 2 | 3 | 4 | 5 | 6);
          }}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="1">Heading 1</SelectItem>
            <SelectItem value="2">Heading 2</SelectItem>
            <SelectItem value="3">Heading 3</SelectItem>
            <SelectItem value="4">Heading 4</SelectItem>
            <SelectItem value="5">Heading 5</SelectItem>
            <SelectItem value="6">Heading 6</SelectItem>
          </SelectContent>
        </Select>

        {/* Font */}
        <Select onValueChange={setFontFamily}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times">Times</SelectItem>
            <SelectItem value="Courier">Courier</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={setFontSize} defaultValue="12">
  <SelectTrigger className="w-16 h-8">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="10">10</SelectItem>
    <SelectItem value="12">12</SelectItem>
    <SelectItem value="14">14</SelectItem>
    <SelectItem value="16">16</SelectItem>
    <SelectItem value="18">18</SelectItem>
  </SelectContent>
</Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Formatting */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBold}
            className={editor?.isActive("bold") ? "bg-gray-200" : ""}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleItalic}
            className={editor?.isActive("italic") ? "bg-gray-200" : ""}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleUnderline}
            className={editor?.isActive("underline") ? "bg-gray-200" : ""}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStrike}
            className={editor?.isActive("strike") ? "bg-gray-200" : ""}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlignment("left")}
            className={
              editor?.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
            }
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlignment("center")}
            className={
              editor?.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
            }
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlignment("right")}
            className={
              editor?.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
            }
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlignment("justify")}
            className={
              editor?.isActive({ textAlign: "justify" }) ? "bg-gray-200" : ""
            }
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBulletList}
            className={editor?.isActive("bulletList") ? "bg-gray-200" : ""}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleOrderedList}
            className={editor?.isActive("orderedList") ? "bg-gray-200" : ""}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Outdent className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Indent className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Insert */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkModal(true)}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImageModal(true)}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBlockquote}
            className={editor?.isActive("blockquote") ? "bg-gray-200" : ""}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertHorizontalRule}>
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => setShowVersionModal(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Version
          </Button>
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "editor":
        return (
          <div className="bg-white">
            {renderEditorToolbar()}
            <div className="p-6">
              <div className="min-h-[500px] bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <EditorContent editor={editor} className="min-h-[480px] p-4" />
              </div>
            </div>
            {renderBottomActions()}
          </div>
        );

      case "version-control":
        return renderVersionControlTab();

      case "compare-version":
        return renderCompareVersionTab();

      case "audit-trail":
        return renderAuditTrailTab();

      default:
        return renderEditorTab();
    }
  };

  const renderVersionControlTab = () => {
    const filteredVersions = versions.filter(
      (version) =>
        version.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        version.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (version.description &&
          version.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Version History of {document.name}
            </h2>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={exportAuditLog}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by Date,Version,Docs Name, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {filteredVersions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {version.name}
                      </span>
                      <Badge
                        variant={
                          version.type === "manual" ? "default" : "secondary"
                        }
                        className={
                          version.type === "manual"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {version.type === "manual"
                          ? "Manual"
                          : version.type === "auto-save"
                          ? "Auto"
                          : "AI"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimestamp(version.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>by {version.createdBy}</span>
                      </div>
                    </div>
                    {version.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {version.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreVersion(version)}
                  >
                    Restore
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {renderBottomActions()}
      </div>
    );
  };

const renderCompareVersionTab = () => {
  const version1 =
    selectedVersions[0] === "current"
      ? { content }
      : versions.find((v) => v.id === selectedVersions[0]);
  const version2 =
    selectedVersions[1] === "current"
      ? { content }
      : versions.find((v) => v.id === selectedVersions[1]);

  return (
    <div className="bg-white">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GitCompare className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Compare Versions
            </h2>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <FileDown className="h-4 w-4 mr-2" />
            Export Comparison
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Compare:</span>
            <Select
              value={selectedVersions[0]}
              onValueChange={(value) =>
                setSelectedVersions([value, selectedVersions[1]])
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-gray-400">with</span>
          <div className="flex items-center gap-2">
            <Select
              value={selectedVersions[1]}
              onValueChange={(value) =>
                setSelectedVersions([selectedVersions[0], value])
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 h-[500px]">
          <div className="border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {selectedVersions[0] === "current"
                    ? "Current"
                    : versions.find((v) => v.id === selectedVersions[0])?.name}
                </span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Current
                </Badge>
              </div>
            </div>
            <ScrollArea className="h-[450px] p-4">
              <div className="prose prose-sm max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: version1?.content || "",
                  }}
                />
              </div>
            </ScrollArea>
          </div>

          <div className="border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {selectedVersions[1] === "current"
                    ? "Current"
                    : versions.find((v) => v.id === selectedVersions[1])?.name}
                </span>
                <Badge variant="secondary">Previous</Badge>
              </div>
            </div>
            <ScrollArea className="h-[450px] p-4">
              <div className="prose prose-sm max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: version2?.content || "",
                  }}
                />
              </div>
            </ScrollArea>
          </div>
        </div>

        {version1 && version2 && (
          <div className="mt-6 border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <h3 className="font-medium text-gray-900">Changes Summary</h3>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {generateDiff(version1.content, version2.content)}
              </pre>
            </div>
          </div>
        )}
      </div>
      {renderBottomActions()}
    </div>
  );
};
  const renderAuditTrailTab = () => {
    const getAuditIcon = (type: string) => {
      switch (type) {
        case "view":
          return <Eye className="h-4 w-4" />;
        case "edit":
          return <Edit3 className="h-4 w-4" />;
        case "save":
          return <Save className="h-4 w-4" />;
        case "comment":
          return <MessageSquare className="h-4 w-4" />;
        case "approve":
          return <Activity className="h-4 w-4" />;
        default:
          return <Activity className="h-4 w-4" />;
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case "view":
          return "bg-blue-50 text-blue-600";
        case "edit":
          return "bg-orange-50 text-orange-600";
        case "save":
          return "bg-green-50 text-green-600";
        case "comment":
          return "bg-purple-50 text-purple-600";
        case "approve":
          return "bg-emerald-50 text-emerald-600";
        default:
          return "bg-gray-50 text-gray-600";
      }
    };

    const filteredEntries = auditTrail.filter(
      (entry) =>
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Audit Trail
              </h2>
            </div>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={exportAuditLog}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Audit Log
            </Button>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search audit entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {filteredEntries.map((entry, index) => (
              <div
                key={`${entry.id}-${index}`}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getTypeColor(entry.type)}`}>
                  {getAuditIcon(entry.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {entry.action}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{entry.details}</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{entry.user}</span>
                    <Badge variant="outline" className="ml-2">
                      {entry.type}
                    </Badge>
                    {entry.isAiTriggered && (
                      <Badge className="bg-purple-100 text-purple-700">
                        AI Triggered
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No audit entries found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
        {renderBottomActions()}
      </div>
    );
  };

  const renderBottomActions = () => (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Acknowledgement
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );

  const renderEditorTab = () => {
    return (
      <div className="bg-white">
        {renderEditorToolbar()}
        <div className="p-6">
          <div className="min-h-[500px] bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <EditorContent editor={editor} className="min-h-[480px] p-4" />
          </div>
        </div>
        {renderBottomActions()}
      </div>
    );
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div
        className="flex-1 transition-all duration-300 ease-in-out overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-full mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {document.name}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/document-hub")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Hub
                </Button>
              </div>

              {/* Track Changes Alert */}
              {trackChanges && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      <strong>Track Changes is enabled</strong> - All edits will
                      be highlighted and tracked for review.
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTrackChanges(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Status Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-sm text-gray-500">
                      Version & Status
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{document.version}</Badge>
                      <Badge
                        className={
                          document.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : document.status === "review"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {document.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Last Updated</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{document.lastUpdated}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        Trust Score: {document.trustScore || 87}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Track Changes</span>
                    <Switch
                      checked={trackChanges}
                      onCheckedChange={setTrackChanges}
                    />
                  </div>
                  {lastSaved && (
                    <div className="text-sm text-gray-500">
                      Last saved: {lastSaved.toLocaleTimeString()}
                    </div>
                  )}
                  {hasUnsavedChanges && (
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-200"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Unsaved changes
                    </Badge>
                  )}
                  {isAutoSaving && (
                    <span className="text-sm text-blue-600 flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                      Auto-saving...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                  <AIAssistantButton
                    ref={aiButtonRef}
                    hasContent={hasContent}
                    onClick={() => setShowAIPrompt(true)}
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <Card className="border-0 shadow-lg">
              {renderMovableTabs()}
              <div className="p-0">{renderTabContent()}</div>
            </Card>

            <AIPromptDropdown
              isOpen={showAIPrompt}
              onClose={() => setShowAIPrompt(false)}
              onGenerate={handleAIGenerate}
              onOpenChart={onOpenCopilot ?? (() => console.log("Copilot not available"))} // Use the new prop
              hasContent={hasContent}
              initialPrompt={aiPromptText}
              anchorRef={aiButtonRef}
            />

            <TextSelectionPopup
              isVisible={textSelection.isVisible}
              position={textSelection.position}
              selectedText={textSelection.selectedText}
              onFixWithAI={handleFixWithAI}
              onClose={() =>
                setTextSelection((prev) => ({ ...prev, isVisible: false }))
              }
            />

            {/* Modals */}
            {/* Link Modal */}
            <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Insert Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                      id="link-url"
                      value={linkForm.url}
                      onChange={(e) =>
                        setLinkForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link-text">Link Text (optional)</Label>
                    <Input
                      id="link-text"
                      value={linkForm.text}
                      onChange={(e) =>
                        setLinkForm((prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      placeholder="Link text"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowLinkModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={insertLink}>Insert Link</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Image Modal */}
            <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Insert Image</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-url">Image URL</Label>
                    <Input
                      id="image-url"
                      value={imageForm.url}
                      onChange={(e) =>
                        setImageForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-alt">Alt Text (optional)</Label>
                    <Input
                      id="image-alt"
                      value={imageForm.alt}
                      onChange={(e) =>
                        setImageForm((prev) => ({
                          ...prev,
                          alt: e.target.value,
                        }))
                      }
                      placeholder="Alternative text"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowImageModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={insertImage}>Insert Image</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <EnhancedSaveModal
              isOpen={showVersionModal}
              onClose={() => setShowVersionModal(false)}
              onSave={handleManualSave}
              document={document}
              content={content}
            />

            {/* History Modal */}
            <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Version History</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {versions.map((version) => (
                      <Card key={version.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {version.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Created by {version.createdBy} on{" "}
                              {version.createdAt}
                            </p>
                            {version.description && (
                              <p className="text-sm mt-2">
                                {version.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleRestoreVersion(version)}
                          >
                            Restore
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Diff Modal */}
<Dialog open={showDiffModal} onOpenChange={setShowDiffModal}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Compare Versions</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={selectedVersions[0]}
          onValueChange={(value) =>
            setSelectedVersions([value, selectedVersions[1]])
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Version 1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current</SelectItem>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {version.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedVersions[1]}
          onValueChange={(value) =>
            setSelectedVersions([selectedVersions[0], value])
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Version 2" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current</SelectItem>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {version.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card className="p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {selectedVersions[0] &&
            selectedVersions[1] &&
            generateDiff(
              selectedVersions[0] === "current"
                ? content
                : versions.find((v) => v.id === selectedVersions[0])?.content ||
                  "",
              selectedVersions[1] === "current"
                ? content
                : versions.find((v) => v.id === selectedVersions[1])?.content ||
                  ""
            )}
        </pre>
      </Card>
    </div>
  </DialogContent>
</Dialog>

            {/* Audit Modal */}
            <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Audit Trail</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {auditTrail.map((entry) => (
                      <Card key={entry.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {entry.action}
                            </h3>
                            <p className="text-sm text-gray-500">
                              By {entry.user} on {entry.timestamp}
                            </p>
                            <p className="text-sm mt-2">{entry.details}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Resizable Copilot */}

    </div>
  );
}