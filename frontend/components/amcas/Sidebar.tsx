"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import {
  MessageSquare,
  GitFork,
  Swords,
  Brain,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  History,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { id: "chat", label: "Chat Interface", icon: MessageSquare },
  { id: "task-graph", label: "Task Graph", icon: GitFork },
  { id: "debate", label: "Debate Arena", icon: Swords },
  { id: "memory", label: "Memory Intel.", icon: Brain },
  { id: "reflection", label: "Self-Reflection", icon: FlaskConical },
  { id: "history", label: "Chat History", icon: History },
];

export default function Sidebar() {
  const { activePage, sidebarCollapsed, setSidebarCollapsed, setIsHistoryOpen } = useAppStore();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
        sidebarCollapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo / brand */}
      <div className={cn(
        "flex items-center gap-2.5 border-b border-sidebar-border shrink-0",
        sidebarCollapsed ? "px-3 py-4 justify-center" : "px-4 py-4"
      )}>
        {/* ASCII-style terminal icon */}
        <div className="flex items-center justify-center w-7 h-7 shrink-0 border border-primary/50 text-primary font-mono font-bold text-xs phosphor-glow">
          &gt;_
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 leading-none">
            <span className="block text-xs font-mono font-bold tracking-widest text-primary uppercase phosphor-glow">
              Agentrix.io
            </span>
            <span className="block text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase mt-0.5">
              v2.4.1 / ONLINE
            </span>
          </div>
        )}
      </div>

      {/* System status strip */}
      {/* {!sidebarCollapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border bg-sidebar-accent/40">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
              SYS_NOMINAL
            </span>
          </div>
        </div>
      )} */}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {!sidebarCollapsed && (
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground/60 uppercase px-2 py-1.5">
            Modules
          </p>
        )}
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "history") {
                  setSidebarCollapsed(false); // expand sidebar if collapsed
                  setIsHistoryOpen(true);
                } else {
                  navigate(`/${item.id}`);
                }
              }}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono transition-all duration-100 group relative",
                sidebarCollapsed && "justify-center",
                isActive
                  ? "text-primary bg-primary/10 border border-primary/25 shadow-[inset_0_0_8px_-4px_var(--glow)]"
                  : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-sidebar-accent hover:border-sidebar-border"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
              )}
              <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate tracking-wide">{item.label}</span>
                  <span className="ml-auto text-[8px] tracking-widest text-muted-foreground/40">
                    0{i + 1}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-muted-foreground border border-transparent",
            "hover:text-foreground hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-100",
            sidebarCollapsed && "justify-center"
          )}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Moon className="w-3.5 h-3.5 shrink-0" />
          )}
          {!sidebarCollapsed && (
            <span className="tracking-wide">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-muted-foreground border border-transparent",
            "hover:text-foreground hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-100",
            sidebarCollapsed && "justify-center"
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="tracking-wide">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Logout control */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => {
            localStorage.removeItem("agentrix_auth");
            window.location.href = "/";
          }}
          title="Logout Session"
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-destructive/70 border border-transparent",
            "hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 transition-all duration-100",
            sidebarCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && <span className="tracking-wide">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
