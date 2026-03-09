'use client';

import React, { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LocationData {
    address: string;
    lat: number;
    lng: number;
}

interface LocationSearchInputProps {
    value?: string;
    onSelect: (val: LocationData) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function LocationSearchInput({
    value,
    onSelect,
    placeholder = "Search location...",
    disabled = false,
    className
}: LocationSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Simple debounce
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                setQuery(parsed.address || value);
            } catch {
                setQuery(value);
            }
        } else {
            setQuery("");
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        async function search() {
            if (!debouncedQuery || debouncedQuery.length < 3) {
                setResults([]);
                return;
            }

            // Avoid searching if it matches the current value
            let parsedValueAddress = '';
            try {
                parsedValueAddress = JSON.parse(value || '{}').address;
            } catch { }

            if (debouncedQuery === value || debouncedQuery === parsedValueAddress) {
                return;
            }

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}`);
                const data = await res.json();
                setResults(data);
                setShowResults(true);
            } catch (e) {
                console.error("Location search failed", e);
            }
        }

        search();
    }, [debouncedQuery, value]);

    const handleSelect = (res: any) => {
        const loc: LocationData = {
            address: res.display_name,
            lat: parseFloat(res.lat),
            lng: parseFloat(res.lon)
        };
        setQuery(loc.address);
        onSelect(loc);
        setShowResults(false);
    };

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div className="relative group">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-hover:text-violet-500 transition-colors" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setShowResults(true); }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="pl-9 h-8 text-sm bg-zinc-50/50 border-zinc-200 focus:bg-white transition-all shadow-sm"
                />
            </div>
            {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-zinc-200/80 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto w-full animate-in fade-in zoom-in-95 duration-200 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                    <div className="p-1">
                        {results.map((res: any, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-700 rounded-md flex flex-col gap-0.5 border-b border-zinc-50 last:border-0 last:mb-0 transition-colors"
                                onClick={() => handleSelect(res)}
                            >
                                <span className="font-semibold truncate">{res.display_name.split(',')[0]}</span>
                                <span className="text-[10px] text-zinc-500 truncate">{res.display_name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
