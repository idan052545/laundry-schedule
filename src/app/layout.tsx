import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "פלוגת דותן",
  description: "מערכת ניהול פלוגת דותן - מכבסה, הודעות, מצל ועוד",
  other: {
    "theme-color": "#2d5a27",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="text-center py-5 mt-8 border-t border-dotan-mint">
            <p className="text-sm text-gray-500">
              נבנה ע&quot;י <span className="font-bold text-dotan-green-dark">עידן חן סימנטוב</span> <span className="text-xs bg-dotan-mint-light text-dotan-green-dark px-2 py-0.5 rounded-full font-medium mr-1">צוות 16</span>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
