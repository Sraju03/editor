"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, Bot, User, Minimize2, Maximize2 } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
}

interface AIChatbotProps {
  onClose: () => void;
}

export function AIChatbot({ onClose }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Correct type for ref
  const sessionId = "test_session_1";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/chat/history?session_id=${sessionId}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const historyMessages: Message[] = data.history.map((msg: any) => {
          // Validate timestamp
          const date = new Date(msg.timestamp);
          const timestamp =
            date instanceof Date && !isNaN(date.getTime())
              ? date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata", // Force IST (adjust if needed)
                })
              : new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                });
          return {
            id: msg._id || Date.now().toString(),
            type: msg.type === "human" ? "user" : "ai",
            content: msg.content,
            timestamp,
          };
        });
        setMessages(historyMessages);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
        setError("Failed to load chat history.");
      }
    };
    fetchChatHistory();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/chat?session_id=${sessionId}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: inputMessage,
            filters: { topic: "510(k) Submission Process" },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error("API error:", err);
      setError("Failed to get response from the server. Please try again.");
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = ["What's missing in a 510(k) submission?"];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card
        className={`bg-white shadow-2xl border-0 transition-all duration-300 ${
          isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">FDA 510(k) Assistant</h3>
              <p className="text-xs opacity-90">
                Compliance & Submission Helper
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto h-[400px] bg-gradient-to-b from-purple-50 to-blue-50">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.type === "ai" && (
                      <div className="p-2 bg-white rounded-full shadow-sm">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                          : "bg-white text-gray-800 shadow-sm"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.type === "user"
                            ? "text-white/70"
                            : "text-gray-500"
                        }`}
                      >
                        {message.timestamp}
                      </p>
                    </div>
                    {message.type === "user" && (
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-sm">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                      <p className="text-sm text-gray-500">Typing...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 mb-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-3 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100"
                    onClick={() => setInputMessage(action)}
                    disabled={isLoading}
                  >
                    {action}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about 510(k) submissions..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-10 w-10 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
