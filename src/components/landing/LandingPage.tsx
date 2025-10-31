"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import AuthPanel from "@/components/auth/AuthPanel";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/halo-logo.png"
              alt="Halo"
              width={40}
              height={40}
              priority
            />
            <span className="text-lg font-semibold text-slate-900">Halo</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-baseline justify-center px-6 py-4 mt-10">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-2">
            <div className="flex items-center  text-slate-500 w-full">
              <h1 className="text-sm font-medium uppercase tracking-[0.2em]  w-full text-center">
                Stay close
              </h1>
            </div>
            <h2 className="text-sm font-extralight tracking-tight text-slate-900 sm:text-5xl">
              Share real-time status updates with the people who matter most.
            </h2>
          </div>
          <div className="flex justify-center lg:justify-end">
            <AuthPanel />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Halo</span>
          <span>Built for private, intentional sharing</span>
        </div>
      </footer>
    </div>
  );
}
