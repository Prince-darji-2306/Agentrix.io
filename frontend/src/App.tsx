import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/amcas/AppShell";
import Landing from "@/components/amcas/LandingPage";
import LoginPage from "@/components/amcas/LoginPage";
import RegisterPage from "@/components/amcas/RegisterPage";
import { useAppStore } from "@/lib/store";

const ProtectedRoute = ({ children, authed }: { children: React.ReactNode, authed: boolean }) => {
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();
  const [authed, setAuthed] = useState<boolean>(() => {
    return !!localStorage.getItem("agentrix_token");
  });

  const handleAuth = (token: string, userId: string, displayName: string | null) => {
    setAuth(token, userId, displayName);
    setAuthed(true);
    navigate("/chat");
  };

  return (
    <Routes>
      <Route path="/" element={<Landing onEnterApp={() => handleAuth(
        localStorage.getItem("agentrix_token") || "",
        localStorage.getItem("agentrix_user_id") || "",
        localStorage.getItem("agentrix_display_name")
      )} />} />
      <Route path="/login" element={<LoginPage onEnterApp={handleAuth} />} />
      <Route path="/register" element={<RegisterPage onEnterApp={handleAuth} />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute authed={authed}>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
