"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles } from "lucide-react";

interface AIAssistantButtonProps {
  hasContent: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const AIAssistantButton = forwardRef<
  HTMLButtonElement,
  AIAssistantButtonProps
>(({ hasContent, onClick, disabled = false }, ref) => {
  return (
    <Button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`${
        hasContent
          ? "bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl"
          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
      } text-white transition-all duration-200 transform hover:scale-105 active:scale-95`}
    >
      {hasContent ? (
        <>
          <Bot className="h-4 w-4 mr-2" />
          AI Assistant
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generate
        </>
      )}
    </Button>
  );
});

AIAssistantButton.displayName = "AIAssistantButton";
