"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Brain, CheckCircle2, Zap, BarChart3, Code2, Users } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

const features = [
  { icon: Code2, label: "Monaco IDE", desc: "HackerRank-style coding environment" },
  { icon: Brain, label: "AI Coach", desc: "Groq-powered real-time feedback" },
  { icon: BarChart3, label: "Analytics", desc: "Track improvement over sessions" },
  { icon: Users, label: "5 Question Types", desc: "Technical, Behavioral, HR & more" },
];

export default function AuthPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [showPass, setShowPass] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const signInForm = useForm<SignInForm>({ resolver: zodResolver(signInSchema) });
  const signUpForm = useForm<SignUpForm>({ resolver: zodResolver(signUpSchema) });

  async function handleSignIn(data: SignInForm) {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success("Welcome back!");
    } catch (e: any) {
      toast.error(e.message || "Sign in failed");
    }
  }

  async function handleSignUp(data: SignUpForm) {
    try {
      await signUpWithEmail(data.email, data.password, data.name);
    } catch (e: any) {
      toast.error(e.message || "Sign up failed");
    }
  }

  async function handleGoogle() {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      toast.error(e.message || "Google sign in failed");
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left branding panel */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo">
            <Brain size={28} />
            <span>InterviewBot</span>
          </div>

          <div className="auth-hero">
            <h1>Ace every<br /><span className="auth-hero-accent">interview.</span></h1>
            <p className="auth-hero-sub">
              Practice with AI coaching, real-time feedback, and a full coding environment — all in one place.
            </p>
          </div>

          <div className="auth-features">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="auth-feature-item">
                <div className="auth-feature-icon"><Icon size={16} /></div>
                <div>
                  <div className="auth-feature-label">{label}</div>
                  <div className="auth-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-social-proof">
            <div className="auth-avatars">
              {["S", "A", "R", "K"].map((l, i) => (
                <div key={i} className="auth-avatar" style={{ zIndex: 4 - i }}>{l}</div>
              ))}
            </div>
            <span>Join engineers prepping for top companies</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${tab === "signin" ? "active" : ""}`}
              onClick={() => setTab("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => setTab("signup")}
            >
              Create Account
            </button>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogle}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <div className="auth-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          {/* Forms */}
          {tab === "signin" ? (
            <form
              key="signin"
              onSubmit={signInForm.handleSubmit(handleSignIn)}
              className="auth-fields"
            >
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...signInForm.register("email")}
                />
                {signInForm.formState.errors.email && (
                  <span className="auth-error">{signInForm.formState.errors.email.message}</span>
                )}
              </div>
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    {...signInForm.register("password")}
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signInForm.formState.errors.password && (
                  <span className="auth-error">{signInForm.formState.errors.password.message}</span>
                )}
              </div>
              <button type="submit" className="auth-submit" disabled={signInForm.formState.isSubmitting}>
                {signInForm.formState.isSubmitting ? <div className="auth-spinner" /> : "Sign In →"}
              </button>
            </form>
          ) : (
            <form
              key="signup"
              onSubmit={signUpForm.handleSubmit(handleSignUp)}
              className="auth-fields"
            >
              <div className="auth-field">
                <label>Full Name</label>
                <input type="text" placeholder="Alex Johnson" {...signUpForm.register("name")} />
                {signUpForm.formState.errors.name && (
                  <span className="auth-error">{signUpForm.formState.errors.name.message}</span>
                )}
              </div>
              <div className="auth-field">
                <label>Email</label>
                <input type="email" placeholder="you@example.com" {...signUpForm.register("email")} />
                {signUpForm.formState.errors.email && (
                  <span className="auth-error">{signUpForm.formState.errors.email.message}</span>
                )}
              </div>
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    {...signUpForm.register("password")}
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signUpForm.formState.errors.password && (
                  <span className="auth-error">{signUpForm.formState.errors.password.message}</span>
                )}
              </div>
              <button type="submit" className="auth-submit" disabled={signUpForm.formState.isSubmitting}>
                {signUpForm.formState.isSubmitting ? <div className="auth-spinner" /> : "Create Account →"}
              </button>
            </form>
          )}

          <p className="auth-terms">
            By continuing, you agree to our{" "}
            <span className="auth-link">Terms of Service</span> and{" "}
            <span className="auth-link">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
