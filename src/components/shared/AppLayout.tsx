"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/shared/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("interview-prep-theme") as "light" | "dark" | null;
    const resolved = saved ?? "light";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("interview-prep-theme", next);
  }

  return (
    <div className="app-layout">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-main">{children}</main>
    </div>
  );
}
