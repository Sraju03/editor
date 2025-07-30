// components/ClientWrapper.tsx
"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AIChatbot } from "@/components/ai-chatbot";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
  // const [showAIChat, setShowAIChat] = useState<boolean>(false);
  // const pathname = usePathname();

  // // Hide AI Assistant on login page
  // const hideAIAssistant = pathname === "/login";

  // if (hideAIAssistant) {
  //   return <>{children}</>;
  // }

  // return (
  //   <>
  //     {children}
  //     <Button
  //       onClick={() => setShowAIChat(true)}
  //       className="fixed bottom-20 right-8 bg-cyan-500 hover:bg-cyan-600 text-white z-50"
  //     >
  //       <Bot className="h-4 w-4 mr-2" />
  //       AI Assistant
  //     </Button>
  //     {showAIChat && <AIChatbot onClose={() => setShowAIChat(false)} />}
  //   </>
  // );
}