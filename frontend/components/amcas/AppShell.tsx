"use client";

import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import ChatPage from "./pages/ChatPage";
import TaskGraphPage from "./pages/TaskGraphPage";
import DebatePage from "./pages/DebatePage";
import MemoryPage from "./pages/MemoryPage";
import ReflectionPage from "./pages/ReflectionPage";
import LandingPage from "./LandingPage";
import HistoryPanel from "./HistoryPanel";
import CodingPanel from "./CodingPanel";

export default function AppShell() {
  const { setActivePage, isHistoryOpen, setIsHistoryOpen } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync activePage state with URL for sidebar highlighting
  useEffect(() => {
    const path = location.pathname.split("/")[1];
    setActivePage(path);
  }, [location, setActivePage]);

  const isLandingPage = location.pathname === "/";

  const handleEnterApp = () => {
    navigate("/chat");
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {!isLandingPage && <Sidebar />}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<LandingPage onEnterApp={handleEnterApp} />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/task-graph" element={<TaskGraphPage />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/reflection" element={<ReflectionPage />} />
          {/* Fallback to chat */}
          <Route path="*" element={<ChatPage />} />
        </Routes>
      </main>

      {/* Global History Panel */}
      <HistoryPanel isOpen={isHistoryOpen} onClose={handleCloseHistory} />

      {/* Global Coding Panel — half-screen overlay for coding agent outputs */}
      <CodingPanel />
    </div>
  );
}
