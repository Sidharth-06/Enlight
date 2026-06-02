import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "InterviewBot — AI-Powered Interview Prep",
  description:
    "Practice technical, behavioral, and HR interviews with AI-powered coaching, Monaco IDE, and real-time feedback.",
  openGraph: {
    title: "InterviewBot",
    description: "AI-Powered Interview Preparation Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className={outfit.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--surface-solid)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                fontSize: "14px",
                fontFamily: "var(--font-outfit), sans-serif",
              },
              success: {
                iconTheme: { primary: "var(--accent)", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "var(--warning)", secondary: "#fff" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
