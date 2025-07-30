"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  Eye,
  Edit3,
  Upload,
  User,
  Bot,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
}

interface ResizableCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onWidthChange: (width: number) => void;
  documentId: string | undefined;
  onSuggestion?: (suggestion: string) => void;
}

interface FDARequest {
  user_intent: "full_document" | "section" | "selected_text";
  doc_type: string | null; // Changed from fda_guideline to doc_type
  user_input: Record<string, string>;
  selected_text: string | null;
}

export function Copilot({
  isOpen,
  onClose,
  onWidthChange,
  documentId,
  onSuggestion,
}: ResizableCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Got it. Would you like me to use the FDA-prescribed template, or upload a custom one?",
      timestamp: "14:30",
    },
    {
      id: "2",
      type: "user",
      content: "Please use the FDA template.",
      timestamp: "14:31",
    },
    {
      id: "3",
      type: "ai",
      content:
        "Done. Here's a preview of your Indications for Use Statement:\n\n'This device is intended for the qualitative detection of cardiac biomarkers in blood plasma from symptomatic patients to aid in the diagnosis of cardiovascular conditions in CLIA-certified laboratories.'",
      timestamp: "14:32",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const copilotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const minWidth = 300;
  const maxWidth = 800;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    onWidthChange(isOpen ? width : 0);
  }, [isOpen, width, onWidthChange]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let userIntent: "full_document" | "section" | "selected_text" =
        "full_document";
      const lowerInput = inputMessage.toLowerCase();
      if (lowerInput.includes("section")) {
        userIntent = "section";
      } else if (
        lowerInput.includes("selected") ||
        lowerInput.includes("edit")
      ) {
        userIntent = "selected_text";
      } else if (
        lowerInput.includes("sop") ||
        lowerInput.includes("standard operating procedure")
      ) {
        userIntent = "full_document";
      }

      // Construct user_input as a dictionary
      const userInput = {
        procedure_info: inputMessage,
        procedure_type: lowerInput.includes("western blot")
          ? "Western Blot"
          : "General Procedure",
        author: "Default Author", // Replace with actual author (e.g., from user session)
      };

      const requestPayload: FDARequest = {
        user_intent: userIntent,
        doc_type:
          lowerInput.includes("sop") ||
          lowerInput.includes("standard operating procedure")
            ? "SOP"
            : "510(k)", // Changed to doc_type
        user_input: userInput,
        selected_text: null,
      };

      console.log("Sending payload:", JSON.stringify(requestPayload, null, 2));

      const response = await fetch("http://localhost:8000/generate-fda-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error details:", errorData);
        // Improved error message for user
        const errorMessage = errorData.detail
          ? Array.isArray(errorData.detail)
            ? errorData.detail.map((err: any) => err.msg).join("; ")
            : errorData.detail
          : "Invalid input";
        toast.error(`Failed to generate content: ${errorMessage}`);
        throw new Error(
          `API request failed: ${JSON.stringify(errorData.detail)}`
        );
      }

      const data = await response.json();
      const aiResponseContent = data.output || "No response received from AI.";

      // Ensure the response is valid markdown
      if (
        requestPayload.doc_type === "SOP" &&
        !aiResponseContent.includes("#")
      ) {
        throw new Error("Generated content is not in markdown SOP format.");
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponseContent,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }),
      };

      setMessages((prev) => [...prev, aiResponse]);
      if (onSuggestion) {
        onSuggestion(aiResponseContent); // Pass to DocumentEditor
      }
    } catch (error) {
      console.error("Error generating FDA content:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "Sorry, an error occurred while generating the response: " +
          (error instanceof Error ? error.message : "Unknown error"),
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = startX - e.clientX;
    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, startWidth + deltaX)
    );
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, startX, startWidth]);

  if (!isOpen) return null;

  return (
    <div
      ref={copilotRef}
      className="fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transition-all duration-300 ease-in-out"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize bg-gray-300 hover:bg-gray-400 transition-colors"
        onMouseDown={handleMouseDown}
      />
      <div className="flex items-center justify-between p-4 text-white bg-gradient-to-r from-purple-600 to-purple-400 border-b">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Fignos CoPilot</h1>
          <span className="text-sm opacity-90">
            510(k) Smart Document Builder
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-purple-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "ai" && (
                <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[70%] ${
                  message.type === "user" ? "order-2" : ""
                }`}
              >
                <div
                  className={`p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                    message.type === "user"
                      ? "bg-purple-500 text-white"
                      : "bg-white text-gray-800 border border-gray-200 shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
              {message.type === "user" && (
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center order-3 flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={3}
              className="flex-1 min-h-[80px] resize-none border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg text-sm transition-colors"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 transition-colors bg-transparent"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 transition-colors bg-transparent"
            >
              <Edit3 className="h-4 w-4" />
              Edit & Save
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload to Section
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
