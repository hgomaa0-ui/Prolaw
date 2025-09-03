import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import NavBar from "@/components/NavBar";
import { i18nInstance } from "@/lib/i18n";
import { useTranslation } from "react-i18next";

export const metadata: Metadata = {
  title: "ProLaw",
  description: "Legal Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NavBar />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
