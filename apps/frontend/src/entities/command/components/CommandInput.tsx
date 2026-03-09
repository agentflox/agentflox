import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, Loader2 } from 'lucide-react';

interface CommandInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    placeholder?: string;
    isLoading?: boolean;
    prefix?: React.ReactNode;
}

export function CommandInput({ value, onChange, onKeyDown, placeholder, isLoading, prefix }: CommandInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <div className="flex items-center px-4 py-3 gap-3">
            <div className="shrink-0 text-zinc-400">
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                ) : prefix ? (
                    prefix
                ) : (
                    <Search className="h-5 w-5" />
                )}
            </div>

            <input
                ref={inputRef}
                className="flex-1 bg-transparent text-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                placeholder={placeholder || "Type a command or ask AI..."}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
            />

            <div className="shrink-0 flex items-center gap-2">
                {value && (
                    <button
                        onClick={() => onChange('')}
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-600 px-2 py-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                        Clear
                    </button>
                )}
                <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-zinc-50 px-2 font-mono text-[10px] font-medium text-zinc-500">
                    <span className="text-xs">ESC</span>
                </kbd>
            </div>
        </div>
    );
}
