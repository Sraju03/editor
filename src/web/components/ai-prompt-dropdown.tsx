"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, BarChart, Bot, X } from "lucide-react";

interface AIPromptDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (content: string) => void;
  onOpenChart: () => void;
  hasContent: boolean;
  initialPrompt?: string;
  anchorRef: React.RefObject<HTMLElement>;
}

export function AIPromptDropdown({
  isOpen,
  onClose,
  onGenerate,
  onOpenChart,
  hasContent,
  initialPrompt = "",
  anchorRef,
}: AIPromptDropdownProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 520; // Fixed width for better UX

      // Position dropdown to the left of the button, aligned to the right edge
      setPosition({
        top: rect.bottom + 12,
        left: rect.right - dropdownWidth, // Align right edge of dropdown with right edge of button
        width: dropdownWidth,
      });

      // Focus textarea after positioning
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      const response = await fetch("http://localhost:8000/generate-fda-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_intent: "selected_text",
          fda_guideline: "510(k)", // Default guideline, can be dynamic if needed
          user_input: prompt,
          selected_text: initialPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}: ${await response.text()}`
        );
      }

      const data = await response.json();
      const generatedContent = data.output;

      onGenerate(generatedContent);
      setPrompt("");
      onClose();
    } catch (error) {
      console.error("Error generating FDA content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChart = () => {
    onOpenChart();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-lg">AI Assistant</span>
              <p className="text-cyan-100 text-sm">
                {hasContent ? "Enhance your content" : "Generate new content"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <Textarea
              ref={textareaRef}
              placeholder={
                hasContent
                  ? "Describe how you'd like to improve your content..."
                  : "Describe what you want to create..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[120px] resize-none border-gray-200 focus:border-cyan-400 focus:ring-cyan-400 text-sm leading-relaxed"
              disabled={isGenerating}
            />

            {/* Keyboard shortcut hint */}
            <p className="text-xs text-gray-500 flex items-center justify-between">
              <span>
                {hasContent
                  ? "Describe improvements you'd like to make"
                  : "Tell me what kind of document you need"}
              </span>
              <span className="text-gray-400">
                {!isGenerating && "⌘ + Enter to generate"}
              </span>
            </p>
          </div>

          {/* Action Buttons - Right aligned */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Button
              onClick={handleOpenChart}
              size="sm"
              variant="outline"
              className="text-cyan-600 border-cyan-200 hover:bg-cyan-50 bg-transparent"
              disabled={isGenerating}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Open Chat
            </Button>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white min-w-[120px] shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {hasContent ? "Enhance" : "Generate"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
