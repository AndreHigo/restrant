import type { Metadata, Viewport } from "next";
import { FloatingBackButton } from "@/components/layout/floating-back-button";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Restaurant Brasil"
  },
  applicationName: "Restaurant Brasil",
  title: "Restaurant Brasil",
  description: "ERP e operacao para restaurante no Brasil",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#313925",
  viewportFit: "cover",
  width: "device-width"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <FloatingBackButton />
        <PwaRegister />
      </body>
    </html>
  );
}
