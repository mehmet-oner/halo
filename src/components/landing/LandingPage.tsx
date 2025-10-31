"use client";

import Image from "next/image";
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

      <main className="flex sm:flex-row flex-col flex-1 items-baseline sm:justify-center mt-10 mx-10 gap-10">
        <div className="flex-col w-full sm:w-2/3 text-slate-900 sm:justify-end ">
          <h1 className="text-sm font-medium uppercase tracking-[0.2em] sm:text-end text-center sm:text-2xl sm:mb-5">
            Stay close
          </h1>
          <h2 className="text-sm sm:text-2xl sm:pl-16 pt-4 sm:pt-2 font-extralight tracking-tight text-slate-900 sm:text-end ">
            Share real-time status updates with the people who matter most.
          </h2>
        </div>
        <div className="flex w-full sm:w-1/3 justify-center sm:justify-end">
          <AuthPanel />
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
