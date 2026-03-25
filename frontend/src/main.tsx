import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import App from "./App";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" enableSystem={false}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
