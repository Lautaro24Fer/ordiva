"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronDown, Globe, LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="lg" aria-label={`Cuenta: ${email}`} />}>
        <UserRound aria-hidden />
        <span className="hidden max-w-48 truncate sm:inline">{email}</span>
        <ChevronDown aria-hidden className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>
          <Globe aria-hidden />
          Ir al sitio público
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => logoutAction())}>
          <LogOut aria-hidden />
          {pending ? "Saliendo…" : "Salir"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
