import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cafecitos",
  description: "Sistema de cafecitos (Amor Perfecto)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
