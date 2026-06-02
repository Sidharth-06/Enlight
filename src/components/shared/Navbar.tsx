"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Brain, BarChart3, History, LayoutDashboard, Sun, Moon, LogOut, User, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type NavLink = { href: string; label: string; icon: React.ReactNode };

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/practice", label: "Practice", icon: <Brain size={16} /> },
  { href: "/history", label: "History", icon: <History size={16} /> },
];

export default function Navbar({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/dashboard" className="navbar-logo">
          <div className="navbar-logo-icon"><Brain size={18} /></div>
          <span>InterviewBot</span>
        </Link>

        {/* Nav links */}
        <nav className="navbar-links">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`navbar-link ${pathname?.startsWith(href) ? "active" : ""}`}
            >
              {icon}
              <span>{label}</span>
              {pathname?.startsWith(href) && (
                <motion.div className="navbar-link-indicator" layoutId="nav-indicator" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="navbar-right">
          <button className="navbar-icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User dropdown */}
          <div className="navbar-user-wrap" ref={dropRef}>
            <button className="navbar-user" onClick={() => setDropOpen(!dropOpen)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="navbar-avatar-img" />
              ) : (
                <div className="navbar-avatar">{initials}</div>
              )}
              <span className="navbar-username">{displayName}</span>
              <ChevronDown size={14} className={`navbar-chevron ${dropOpen ? "open" : ""}`} />
            </button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  className="navbar-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-name">{displayName}</div>
                    <div className="navbar-dropdown-email">{user?.email}</div>
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <button className="navbar-dropdown-item" onClick={signOut}>
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
