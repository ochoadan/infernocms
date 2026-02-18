import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { SchemaProvider } from "@/components/providers";
import { AdminLayout } from "@/components/admin-layout";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "InfernoCMS Admin",
  description: "Content management admin interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.className} antialiased`}>
        <SchemaProvider>
          <AdminLayout>{children}</AdminLayout>
        </SchemaProvider>
      </body>
    </html>
  );
}
