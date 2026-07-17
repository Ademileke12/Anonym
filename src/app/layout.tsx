import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anonym - Private Payments. Private Fundraising. Built on Monad.",
  description:
    "Anonym is a privacy-first payment and fundraising platform built on Monad. Vault protocol, ZK-ready commitments, private balances.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anonym",
  },
  applicationName: "Anonym",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
};

/** Pre-paint theme - injected via next/script (avoids React <head> hydration fights). */
const themeBootstrap = `(function(){try{var k='anonym-theme';var t=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||(t!=='light'&&d);var r=document.documentElement;if(dark){r.classList.add('dark');r.setAttribute('data-theme','dark');}else{r.classList.remove('dark');r.setAttribute('data-theme','light');}r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full overflow-x-hidden bg-base text-ink antialiased"
        suppressHydrationWarning
      >
        <Script
          id="anonym-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
