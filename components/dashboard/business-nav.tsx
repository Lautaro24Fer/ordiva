"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BusinessNav({ businessId }: { businessId: number }) {
  const pathname = usePathname();
  const base = `/dashboard/${businessId}`;
  const links = [
    { href: base, label: "Turnos" },
    { href: `${base}/services`, label: "Servicios" },
    { href: `${base}/hours`, label: "Horarios" },
    { href: `${base}/settings`, label: "Configuración" },
  ];

  return (
    <nav aria-label="Secciones del negocio" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  active && "border-primary font-medium text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
