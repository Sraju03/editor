"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  FolderOpen,
  CheckCircle,
  Building2,
  Search,
  FileText,
  Download,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";

interface SidebarNavigationProps {
  viewType: "consultant" | "client";
}

export function SidebarNavigation({ viewType }: SidebarNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboards: true,
  });
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navigationItems = [
    {
      section: "navigation",
      title: "NAVIGATION",
      isHeader: true,
      items: [
        {
          title: "Dashboard",
          href: "/MainDashboard",
          icon: BarChart3,
        },
        {
          title: "Submissions",
          href: "/submissions",
          icon: FolderOpen,
        },

        {
          title: "DHF",
          href: "/document-hub",
          icon: Building2,
        },
      ],
    },
    {
      section: "tools",
      title: "TOOLS",
      isHeader: true,
      items: [
        {
          title: "Predicate Comparator",
          href: "/predicate-comparator",
          icon: Search,
        },
        {
          title: "Summary Generator",
          href: "/tools/summary-generator",
          icon: FileText,
        },
      ],
    },
    {
      section: "output",
      title: "OUTPUT",
      isHeader: true,
      items: [
        {
          title: "eSTAR Export",
          href: "/output/estar-export",
          icon: Download,
          expandable: true,
          children: [
            { title: "Export Wizard", href: "/output/estar-export/wizard" },
            { title: "Export History", href: "/output/estar-export/history" },
          ],
        },
      ],
    },
    {
      section: "system",
      title: "SYSTEM",
      isHeader: true,
      items: [
        ...(viewType === "consultant"
          ? [
              {
                title: "Admin Panel",
                href: "/admin",
                icon: Shield,
              },
            ]
          : []),
        {
          title: "Settings",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];

  const NavItem = ({ item, isSubItem = false }: { item: any; isSubItem?: boolean }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;

    const content = (
      <div className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
            isSubItem && "ml-5 px-1.5",
            isActive
              ? "bg-slate-100 text-slate-900 font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            isCollapsed && !isSubItem && "justify-center px-1.5",
          )}
        >
          {Icon && <Icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed && !isSubItem && "h-5 w-5")} />}
          {(!isCollapsed || isSubItem) && (
            <>
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs bg-slate-100 text-slate-600">
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSection(item.title);
                  }}
                  className="ml-auto"
                >
                  {expandedSections[item.title] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
        {!isCollapsed && hasChildren && expandedSections[item.title] && (
          <div className="mt-1 space-y-1">
            {item.children.map((child: any, idx: number) => (
              <Link
                key={idx}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 ml-5 rounded-md text-sm transition-colors",
                  pathname === child.href
                    ? "bg-slate-50 text-slate-900 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>{child.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );

    if (isCollapsed && !isSubItem) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href} className="block">
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (item.href && !hasChildren) {
      return <Link href={item.href}>{content}</Link>;
    }

    return <div>{content}</div>;
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "sticky top-0 flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 z-50",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-900">Fignos</h1>
                <p className="text-xs text-slate-500">Accelerating Quality Outcomes</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 w-7 p-0">
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((section) => (
            <div key={section.section} className="mb-2">
              {section.isHeader && !isCollapsed && (
                <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  isCollapsed && "justify-center px-1.5",
                )}
              >
                <User className={cn("h-4 w-4 flex-shrink-0", isCollapsed && "h-5 w-5")} />
                {!isCollapsed && <span className="truncate">Profile</span>}
              </Link>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Profile</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}