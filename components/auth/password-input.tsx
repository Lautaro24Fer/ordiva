"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Contraseña con botón para mostrarla. Permite pegar y usar gestores de
 * contraseñas (WCAG 2.2 "Accessible Authentication"); el botón no envía el form.
 */
export function PasswordInput(props: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="h-9 pr-10" />
      <button
        type="button"
        aria-pressed={visible}
        aria-controls={props.id}
        aria-label="Mostrar contraseña"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon aria-hidden className="size-4" />
      </button>
    </div>
  );
}
