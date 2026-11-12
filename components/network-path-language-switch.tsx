"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNpI18n, type NpLang } from "@/lib/network-path-i18n";

const options: { value: NpLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "简体中文" },
];

export function NetworkPathLanguageSwitch({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const { lang, setLang, t } = useNpI18n();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === lang) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`np-lang-trigger ${tone}`}
          aria-label={t("Language")}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {current.label}
          <ChevronDown size={10} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="np-lang-menu">
        <div role="listbox" aria-label={t("Language")}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === lang}
              className={option.value === lang ? "active" : ""}
              onClick={() => {
                setLang(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {option.value === lang && <Check size={12} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
