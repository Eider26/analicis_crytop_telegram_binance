import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOL Trading Agent",
  description: "Agente de análisis SOL/USDT para Vercel"
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}