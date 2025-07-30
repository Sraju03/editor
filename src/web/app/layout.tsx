// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper"; // Import the client wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fignos - FDA Submission Platform",
  description: "Professional regulatory platform for FDA 510(k) submissions",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}