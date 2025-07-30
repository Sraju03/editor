"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Search } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  viewType: "consultant" | "client";
  setViewType: (viewType: "consultant" | "client") => void;
  title: string;
  description: string;
}

export function Header({ viewType, setViewType, title, description }: HeaderProps) {
  return (
 <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 opacity-100 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-slate-200"
            />
          </div>

          <div className="bg-slate-100 p-0.5 rounded-md">
            <button
              onClick={() => setViewType("consultant")}
              className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
                viewType === "consultant"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Consultant
            </button>
            <button
              onClick={() => setViewType("client")}
              className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
                viewType === "client" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Client
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative bg-transparent h-8 w-8">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="font-medium text-sm">Notifications</span>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Mark all as read
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <DropdownMenuItem className="p-0">
                  <div className="flex gap-2 p-2 w-full hover:bg-slate-50 cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium">FDA Response Required</p>
                      <p className="text-xs text-slate-500">K241234 - Due in 2 days</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <div className="flex gap-2 p-2 w-full hover:bg-slate-50 cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium">New Regulatory Update</p>
                      <p className="text-xs text-slate-500">Updated requirements for AI/ML devices</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <div className="flex gap-2 p-2 w-full hover:bg-slate-50 cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium">Submission Approved</p>
                      <p className="text-xs text-slate-500">K241230 - CardioMonitor Pro X1</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </div>
              <div className="p-2 border-t border-slate-100">
                <Button variant="outline" size="sm" className="w-full text-center text-sm bg-transparent h-7">
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-1 h-auto">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/placeholder.svg?height=28&width=28" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-slate-500">Regulatory Consultant</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Account Settings</DropdownMenuItem>
              <Link href="/login">
  <DropdownMenuItem>Sign Out</DropdownMenuItem>
</Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}