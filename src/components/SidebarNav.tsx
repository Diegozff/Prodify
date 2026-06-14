"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, BarChart2, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/orders",
    label: "Órdenes de Trabajo",
    icon: ClipboardList,
  },
  {
    href: "/gantt",
    label: "Gantt",
    icon: BarChart2,
  },
  {
    href: "/settings",
    label: "Configuración",
    icon: Settings,
    subItems: [{ href: "/settings/stages", label: "Etapas", icon: Layers }],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon, subItems }) => {
        const active =
          pathname === href ||
          (href !== "/settings" && pathname.startsWith(href + "/")) ||
          (href === "/settings" && pathname.startsWith("/settings"));

        return (
          <div key={href}>
            <Link
              href={href === "/settings" ? "/settings/stages" : href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#1B9AAA]/15 text-[#1B9AAA]"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>

            {/* Sub-items: show when parent section is active */}
            {subItems && pathname.startsWith("/settings") && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {subItems.map(({ href: sub, label: subLabel, icon: SubIcon }) => {
                  const subActive = pathname === sub || pathname.startsWith(sub + "/");
                  return (
                    <Link
                      key={sub}
                      href={sub}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        subActive
                          ? "bg-[#1B9AAA]/10 text-[#1B9AAA]"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      )}
                    >
                      <SubIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      {subLabel}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
