"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ value, onChange, onSubmit, placeholder = "Search proposals...", navigateTo = "/search/results" }: { value?: string; onChange?: (v: string) => void; onSubmit?: () => void; placeholder?: string; navigateTo?: string; }) {
  const [local, setLocal] = useState(value || "");
  const router = useRouter();

  useEffect(() => {
    setLocal(value || "");
  }, [value]);

  return (
    <div className="flex w-full max-w-xl items-center gap-2">
      <input
        type="text"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange?.(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const q = (local || "").trim();
            onSubmit?.();
            if (navigateTo) {
              const url = `${navigateTo}?q=${encodeURIComponent(q)}`;
              router.push(url);
            }
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Search
      </button>
    </div>
  );
}


