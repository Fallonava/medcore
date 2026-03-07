import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as requested for modern look
import { initAutomationScheduler } from "@/lib/automation-scheduler";

// scheduler should start on server-side only
// In Vercel/Production, we use Vercel Crons instead of in-memory node-cron
if (typeof window === 'undefined' && !process.env.VERCEL) {
  initAutomationScheduler().catch(err => {
    console.error('Failed to initialize automation scheduler:', err);
  });
}
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { MobileMenu } from "@/components/MobileMenu";
import { OfflineSyncer } from "@/components/OfflineSyncer";

import { SWRProvider } from "@/components/swr-provider";
import { AutomationRunner } from "@/components/AutomationRunner";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedCore26 Admin | Premium Hospital System",
  description: "Advanced Hospital Administration System with Real-time Monitoring and Modern UI",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Low-end device detection — runs before paint to avoid FOUC */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function(){
            try {
              var ua = navigator.userAgent || '';
              var isTV = /WebOS|Tizen|SMART-TV|SmartTV|NetCast|BRAVIA|Viera/i.test(ua);
              var lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2;
              var lowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
              if (isTV || lowMem || (lowCPU && lowMem !== false)) {
                document.documentElement.classList.add('reduce-effects');
              }
            } catch(e){}
          })();
        `}} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <OfflineSyncer />
        <SWRProvider>
          <AuthProvider>
          <AutomationRunner />
          <div className="flex h-screen bg-background overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-2 lg:pt-8 pb-32 lg:pb-8 relative bg-white/50">
              {children}
            </main>
            <BottomNav />
            <MobileMenu />
          </div>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
