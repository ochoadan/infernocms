import type { Metadata } from "next";
import { Figtree, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SchemaProvider } from "@/components/providers";
import { AdminLayout } from "@/components/admin-layout";
import { ToastContextProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const instrumentSans = Instrument_Sans({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", instrumentSans.variable)}>
      <body className={`${figtree.className} antialiased`}>
        <ToastContextProvider>
          <SchemaProvider>
            <AdminLayout>{children}</AdminLayout>
          </SchemaProvider>
          <Toaster />
        </ToastContextProvider>
      </body>
    </html>
  );
}
