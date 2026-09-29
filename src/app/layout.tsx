import type { Metadata } from "next";
import { montserrat, poppins } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inmobiliaria Conte",
  description: "Portal inmobiliario de Inmobiliaria Conte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
