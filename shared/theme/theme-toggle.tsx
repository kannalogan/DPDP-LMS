"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/shared/theme/theme-provider";

const options: Array<{ icon: typeof Sun; label: string; value: Theme }> = [
  { icon: Sun, label: "Light theme", value: "light" },
  { icon: Moon, label: "Dark theme", value: "dark" },
  { icon: Laptop, label: "System theme", value: "system" }
];

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <div aria-label="Theme" className="segmented-control" role="group">
      {options.map(({ icon: Icon, label, value }) => (
        <button
          aria-pressed={theme === value}
          className="icon-button"
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          type="button"
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
