"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useSessionStore } from "@/store/sessionStore";
import { buildQuestionBank, selectQuestions } from "@/lib/questions";
import AppLayout from "@/components/shared/AppLayout";
import {
  Code2, Brain, Users, MessageSquare, Cpu, Zap, Play, Trophy,
  Target, Clock, TrendingUp, ArrowRight, CheckCircle2, Star, Flame
} from "lucide-react";
import type { DifficultyLevel, InterviewType, Persona, Profile } from "@/lib/types";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<InterviewType, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  Technical_Coding: {
    label: "Coding",
    color: "#10b981",
    icon: <Code2 size={22} />,
    desc: "Algorithms, data structures, system implementation",
  },
  Technical_System_Design: {
    label: "System Design",
    color: "#6366f1",
    icon: <Cpu size={22} />,
    desc: "Distributed systems, scalability, architecture",
  },
  Behavioral: {
    label: "Behavioral",
    color: "#f59e0b",
    icon: <Brain size={22} />,
    desc: "STAR method, leadership, conflict resolution",
  },
  Situational: {
    label: "Situational",
    color: "#ef4444",
    icon: <MessageSquare size={22} />,
    desc: "Hypothetical scenarios, judgment, decision-making",
  },
  HR: {
    label: "HR & Culture",
    color: "#8b5cf6",
    icon: <Users size={22} />,
    desc: "Culture fit, salary negotiation, career goals",
  },
};

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string }> = {
  Beginner: { label: "Beginner", color: "#10b981" },
  Intermediate: { label: "Intermediate", color: "#f59e0b" },
  Advanced: { label: "Advanced", color: "#ef4444" },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile, startSession, starredQuestions } = useSessionStore();
  const bank = useMemo(() => buildQuestionBank(), []);

  const [role, setRole] = useState(profile.role || "Software Engineer");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(profile.difficulty || "Intermediate");
  const [persona, setPersona] = useState<Persona>(profile.persona || "friendly");
  const [selectedTypes, setSelectedTypes] = useState<InterviewType[]>(
    profile.preferredTypes.length ? profile.preferredTypes : ["Technical_Coding", "Behavioral"]
  );
  const [questionCount, setQuestionCount] = useState(5);
  const [timedMode, setTimedMode] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] || "there";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("interview-prep-history");
      if (saved) setRecentSessions(JSON.parse(saved).slice(0, 5));
    } catch {}
  }, []);

  function toggleType(type: InterviewType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleLaunch() {
    if (!role.trim()) { toast.error("Please enter a target role"); return; }
    if (selectedTypes.length === 0) { toast.error("Select at least one interview type"); return; }

    const newProfile: Profile = {
      name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
      role: role.trim(),
      difficulty,
      preferredTypes: selectedTypes,
      persona,
      timedMode,
    };

    const plan = selectQuestions(bank, selectedTypes, difficulty, questionCount, role.trim(), starredQuestions, []);
    if (plan.length === 0) { toast.error("No questions match your filters. Adjust role or types."); return; }

    setProfile(newProfile);
    startSession(plan, newProfile);
    setIsLaunching(true);
    setTimeout(() => router.push("/practice"), 300);
  }

  const avgScore = recentSessions.length
    ? (recentSessions.reduce((s, r) => s + (r.averageScore || 0), 0) / recentSessions.length).toFixed(1)
    : null;

  const stats = [
    { label: "Sessions", value: recentSessions.length || "0", icon: <Target size={20} />, color: "#10b981" },
    { label: "Avg Score", value: avgScore ? `${avgScore}/10` : "—", icon: <Trophy size={20} />, color: "#f59e0b" },
    { label: "Starred", value: starredQuestions.length.toString(), icon: <Star size={20} />, color: "#6366f1" },
    { label: "Best Type", value: "Coding", icon: <Flame size={20} />, color: "#ef4444" },
  ];

  return (
    <AppLayout>
      <div className="dashboard">
        {/* Welcome Hero */}
        <motion.div className="dashboard-hero" {...fadeUp}>
          <div>
            <p className="dashboard-eyebrow">Good {getTimeGreeting()},</p>
            <h1 className="dashboard-title">Welcome back, <span className="accent">{displayName}</span> 👋</h1>
            <p className="dashboard-subtitle">Ready to sharpen your skills? Start a session below.</p>
          </div>

          {/* Stats row */}
          <div className="dashboard-stats">
            {stats.map(({ label, value, icon, color }) => (
              <motion.div key={label} className="stat-card" whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                <div className="stat-icon" style={{ color, background: `${color}15` }}>{icon}</div>
                <div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="dashboard-grid">
          {/* Session Config Card */}
          <motion.div className="dashboard-config-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="card-header">
              <Zap size={18} className="card-header-icon" />
              <h2>New Session</h2>
            </div>

            {/* Role input */}
            <div className="config-field">
              <label>Target Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="config-input"
              />
            </div>

            {/* Difficulty segmented control */}
            <div className="config-field">
              <label>Difficulty</label>
              <div className="segmented-control">
                {(["Beginner", "Intermediate", "Advanced"] as DifficultyLevel[]).map((d) => (
                  <button
                    key={d}
                    className={`segmented-btn ${difficulty === d ? "active" : ""}`}
                    onClick={() => setDifficulty(d)}
                    style={difficulty === d ? { borderColor: DIFFICULTY_CONFIG[d].color, background: `${DIFFICULTY_CONFIG[d].color}15`, color: DIFFICULTY_CONFIG[d].color } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona */}
            <div className="config-field">
              <label>Coach Persona</label>
              <div className="segmented-control">
                {(["friendly", "neutral", "challenging"] as Persona[]).map((p) => (
                  <button
                    key={p}
                    className={`segmented-btn ${persona === p ? "active" : ""}`}
                    onClick={() => setPersona(p)}
                  >
                    {p === "friendly" ? "😊 Friendly" : p === "neutral" ? "⚖️ Neutral" : "🔥 Tough"}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count + timed mode */}
            <div className="config-row">
              <div className="config-field" style={{ flex: 1 }}>
                <label>Questions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="config-input"
                />
              </div>
              <div className="config-field" style={{ flex: 1 }}>
                <label>Timed Mode</label>
                <button
                  type="button"
                  className={`toggle-btn ${timedMode ? "on" : ""}`}
                  onClick={() => setTimedMode(!timedMode)}
                >
                  <div className="toggle-thumb" />
                </button>
              </div>
            </div>

             <motion.button
              className="launch-btn"
              onClick={handleLaunch}
              disabled={isLaunching}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
            >
              {isLaunching ? (
                <div className="btn-spinner" />
              ) : (
                <>
                  <Play size={18} />
                  Launch Session
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Interview Types grid */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <CheckCircle2 size={18} className="card-header-icon" />
              <h2>Interview Types</h2>
            </div>
            <div className="type-cards-grid">
              {(Object.entries(TYPE_CONFIG) as [InterviewType, typeof TYPE_CONFIG[InterviewType]][]).map(
                ([type, cfg]) => {
                  const active = selectedTypes.includes(type);
                  return (
                    <motion.button
                      key={type}
                      className={`type-card ${active ? "active" : ""}`}
                      style={active ? { borderColor: cfg.color, background: `${cfg.color}0f` } : {}}
                      onClick={() => toggleType(type)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="type-card-icon" style={{ color: cfg.color, background: `${cfg.color}18` }}>
                        {cfg.icon}
                      </div>
                      <div className="type-card-info">
                        <div className="type-card-name">{cfg.label}</div>
                        <div className="type-card-desc">{cfg.desc}</div>
                      </div>
                      {active && (
                        <div className="type-card-check" style={{ color: cfg.color }}>
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </motion.button>
                  );
                }
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <motion.div className="recent-sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <TrendingUp size={18} className="card-header-icon" />
              <h2>Recent Sessions</h2>
              <button className="text-link" onClick={() => router.push("/history")}>
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="sessions-table">
              <div className="sessions-table-header">
                <span>Role</span><span>Type</span><span>Score</span><span>Questions</span><span>Date</span>
              </div>
              {recentSessions.map((s, i) => (
                <motion.div key={i} className="sessions-table-row" whileHover={{ backgroundColor: "var(--surface-muted)" }}>
                  <span className="session-role">{s.profile?.role || "Unknown"}</span>
                  <span>
                    <span className="session-type-badge">
                      {(s.profile?.preferredTypes?.[0] || "Mixed").replace("_", " ")}
                    </span>
                  </span>
                  <span className="session-score" style={{ color: scoreColor(s.averageScore) }}>
                    {s.averageScore?.toFixed(1)}/10
                  </span>
                  <span className="session-count">{s.records?.length || 0} Q</span>
                  <span className="session-date">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function scoreColor(score: number) {
  if (!score) return "var(--muted)";
  if (score >= 8) return "#10b981";
  if (score >= 5) return "#f59e0b";
  return "#ef4444";
}
