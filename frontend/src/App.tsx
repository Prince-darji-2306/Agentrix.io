import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/amcas/AppShell";
import Landing from "@/components/amcas/LandingPage";

const ProtectedRoute = ({ children, authed }: { children: React.ReactNode, authed: boolean }) => {
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean>(() => {
    return localStorage.getItem("agentrix_auth") === "true";
  });

  const handleAuth = () => {
    setAuthed(true);
    localStorage.setItem("agentrix_auth", "true");
    navigate("/chat");
  };

  return (
    <Routes>
      <Route path="/" element={<Landing onEnterApp={handleAuth} />} />
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
