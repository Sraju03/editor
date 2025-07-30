"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, MessageSquare, Wand2, X } from "lucide-react";

interface TextSelectionPopupProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onOpenCopilot: (text: string, action: "fix" | "explain" | "rewrite") => void;
  onClose: () => void;
}

export function TextSelectionPopup({
  isVisible,
  position,
  selectedText,
  onOpenCopilot,
  onClose,
}: TextSelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleScroll = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });

      timeoutRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible, onClose]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      onClose();
    }, 3000);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={popupRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-w-xs w-fit animate-fadeIn"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateY(-110%)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-md">
          ✨ Quick Fix
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-auto p-2 hover:bg-blue-100 rounded-lg transition"
          onClick={() => onOpenCopilot(selectedText, "fix")}
        >
          <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">Fix with AI</div>
            <div className="text-xs text-gray-500">
              Improve selected content
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-auto p-2 hover:bg-blue-100 rounded-lg transition"
          onClick={() => onOpenCopilot(selectedText, "explain")}
        >
          <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              Explain using AI
            </div>
            <div className="text-xs text-gray-500">
              Get an explanation quickly
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-auto p-2 hover:bg-blue-100 rounded-lg transition"
          onClick={() => onOpenCopilot(selectedText, "rewrite")}
        >
          <Wand2 className="h-4 w-4 mr-2 text-purple-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              Rewrite using AI
            </div>
            <div className="text-xs text-gray-500">
              Professional tone rephrasing
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
