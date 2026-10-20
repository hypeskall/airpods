import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElitePods — Magazin și comenzi",
  description: "AirPods Pro 3, AirPods 4 și AirPods Max. Plată ramburs și livrare în 1–3 zile.",
  manifest:"/site.webmanifest",
  openGraph:{title:"ElitePods — Alege-ți AirPods.",description:"AirPods 4, Pro 3 și Max USB-C. Plată ramburs și livrare în 1–3 zile.",url:"https://elitepods.vercel.app/",siteName:"ElitePods",locale:"ro_RO",type:"website",images:[{url:"https://elitepods.vercel.app/social/elitepods-ep-v1.jpg",width:1200,height:630,alt:"Monograma EP ElitePods"}]},
  twitter:{card:"summary_large_image",images:["https://elitepods.vercel.app/social/elitepods-ep-v1.jpg"]},
  icons: {
    icon: [{url:"/favicon.ico?v=ep1"},{url:"/favicon-32.png",sizes:"32x32",type:"image/png"}],
    shortcut: "/favicon.ico?v=ep1",
    apple:"/apple-touch-icon.png",
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
