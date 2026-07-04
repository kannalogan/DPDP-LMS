import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ToastProvider } from "@/shared/ui/feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYRA Learning Platform",
  description: "AI-first enterprise learning platform for compliance and professional education."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
