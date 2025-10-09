'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import AuthPanel from '@/components/auth/AuthPanel';

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
          <p className="text-sm text-slate-500">Private status sharing for your inner circle</p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                <Image
                  src="/halo-logo.png"
                  alt="Halo"
                  width={32}
                  height={32}
                  priority
                />
              </div>
              <span className="text-sm font-medium uppercase tracking-[0.2em]">Stay close</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Share real-time status updates with the people who matter most.
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Halo keeps your trusted circles in sync with quick updates, location hints, and check-ins that disappear when the moment passes.
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 text-slate-900" />
                <span>Switch between family, friends, and roommates without missing a beat.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 text-slate-900" />
                <span>Drop a quick preset status or craft your own in seconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 text-slate-900" />
                <span>Run lightweight polls to lock plans without endless group chats.</span>
              </li>
            </ul>
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
