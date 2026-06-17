import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/src/providers/QueryClientProvider";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { ServiceWorkerRegister } from "@/src/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HCM Time-Off Module",
  description: "Employee and Manager Time-Off Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans dark:bg-black">
        <Providers>
          <ServiceWorkerRegister />
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
