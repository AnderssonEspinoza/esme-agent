import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XIO",
  description: "Asistente personal para agenda, pendientes y recordatorios inteligentes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

