import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import MaintenanceWrapper from "@/components/MaintenanceWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrewFlow - Maritime AI Automation Platform",
  description: "Navigate your business with AI automation. 10 specialized AI agents for maritime operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Shopify App Bridge Scripts - Load from CDN for embedded apps */}
        <script
          src="https://unpkg.com/@shopify/app-bridge@3"
          defer
        />
        <script
          src="https://unpkg.com/@shopify/app-bridge-utils@3"
          defer
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <MaintenanceWrapper>
            {children}
          </MaintenanceWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
