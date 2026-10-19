import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElitePods — Magazin și comenzi",
  description: "AirPods Pro 3, AirPods 4 și AirPods Max. Plată ramburs și livrare în 1–3 zile.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="antialiased">{children}</body>
    </html>
  );
}
