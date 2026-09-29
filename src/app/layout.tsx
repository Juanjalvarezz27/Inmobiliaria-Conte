import type { Metadata } from "next";
import { montserrat, poppins } from "@/lib/fonts";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inmobiliaria CONTÉ",
  description: "Portal inmobiliario de Inmobiliaria CONTÉ",
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
      <body className="min-h-screen flex flex-col font-sans bg-slate-100 text-slate-800">
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
