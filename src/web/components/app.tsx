import React, { useState, useEffect } from "react";
import DocxUploader from "./DocxUploader";
import RichEditor from "./RichEditor";
import { Button } from "@/components/ui/button";

interface AppProps {
  submissionId: string;
}

export default function App({ submissionId }: AppProps) {
  const [docxHtml, setDocxHtml] = useState("");
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [savedContent, setSavedContent] = useState("");

  useEffect(() => {
    // Simulate fetching initial content
    const fetchInitialContent = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${submissionId}/content`
        );
        if (response.ok) {
          const data = await response.json();
          setDocxHtml(data.content || "");
        }
      } catch (error) {
        console.error("Failed to fetch initial content:", error);
      }
    };
    fetchInitialContent();
  }, [submissionId]);

  const handleDocxLoad = (html: string) => {
    setDocxHtml(html);
    editorInstance?.commands.setContent(html);
  };

  const handleSave = async () => {
    if (editorInstance) {
      const content = editorInstance.getHTML();
      setSavedContent(content);
      try {
        const response = await fetch(
          `http://localhost:8000/api/submissions/${submissionId}/content`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );
        if (response.ok) {
          alert("Content saved successfully!");
        } else {
          throw new Error("Save failed");
        }
      } catch (error) {
        console.error("Save error:", error);
        alert("Error saving content. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        510(k) Editor - Submission {submissionId}
      </h2>
      <p className="text-gray-600">
        Upload a .docx file or edit content in the rich text editor.
      </p>
      <DocxUploader onDocxLoad={handleDocxLoad} />
      <RichEditor
        content={docxHtml}
        onEditorReady={setEditorInstance}
        onSave={setSavedContent}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!savedContent || savedContent === docxHtml}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
