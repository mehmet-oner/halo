"use client";

import Image from "next/image";
import { MessageCircle, ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardView } from "../types";


type FooterNavProps = {
  activeView: DashboardView;
  onNavigate: (key: DashboardView, href: string) => void;
};

const navItems: Array<{
  key: DashboardView;
  label: string;
  icon?: React.ElementType;
  imageSrc?: string;
  imageAlt?: string;
  href: string;
}> = [
  {
    key: "home",
    label: "Halo",
    imageSrc: "/halo-logo.png",
    imageAlt: "Halo home",
    href: "/",
  },
  { key: "polls", label: "Polls", icon: MessageCircle, href: "/polls" },
  { key: "lists", label: "Lists", icon: ListTodo, href: "/lists" },
];

export default function FooterNav({ activeView, onNavigate }: FooterNavProps) {
  const router = useRouter();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-around px-5 py-3 text-xs font-medium text-slate-500">
        {navItems.map((item) => {
          const isActive = item.key === activeView;

          const baseClasses =
            "flex flex-col items-center gap-1 transition duration-200";
          const activeClasses = isActive
            ? "text-slate-900"
            : "text-slate-500 hover:text-slate-700";

          const iconClasses = `h-6 w-6 transition-opacity duration-200 ${
            isActive ? "opacity-100" : "opacity-60"
          }`;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.key, item.href);
                router.push(item.href);
              }}
              className={`${baseClasses} ${activeClasses}`}
            >
              {item.imageSrc ? (
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt ?? item.label}
                  width={24}
                  height={24}
                  className={iconClasses}
                />
              ) : (
                item.icon && <item.icon size={20} className={iconClasses} />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
