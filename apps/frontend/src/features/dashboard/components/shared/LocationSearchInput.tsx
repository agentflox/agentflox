import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

export interface LocationValue {
    address: string;
    lat: number;
    lng: number;
}

interface LocationSearchInputProps {
    value?: string;
    onSelect: (val: LocationValue) => void;
    placeholder?: string;
    className?: string;
}

export function LocationSearchInput({ value, onSelect, placeholder = "Search location...", className }: LocationSearchInputProps) {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Simple debounce
    const [debouncedQuery, setDebouncedQuery] = useState(query);
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
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}`);
                const data = await res.json();
                setResults(data);
                setShowResults(true);
            } catch (e) {
                console.error("Location search failed", e);
            }
        }

        let parsedValueAddress = '';
        try {
            parsedValueAddress = JSON.parse(value || '{}').address;
        } catch { }

        if (debouncedQuery !== value && debouncedQuery !== parsedValueAddress) search();
    }, [debouncedQuery, value]);

    const handleSelect = (res: any) => {
        const loc = {
            address: res.display_name,
            lat: parseFloat(res.lat),
            lng: parseFloat(res.lon)
        };
        setQuery(loc.address);
        onSelect(loc);
        setShowResults(false);
    };

    return (
        <div ref={wrapperRef} className={`relative w-full ${className || ''}`}>
            <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setShowResults(true); }}
                    placeholder={placeholder}
                    className="pl-9 h-8 text-sm"
                />
            </div>
            {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto w-full">
                    {results.map((res: any, idx) => (
                        <button
                            key={idx}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 flex flex-col gap-0.5 border-b border-zinc-50 last:border-0 text-zinc-900"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(res);
                            }}
                        >
                            <span className="font-medium truncate">{res.display_name.split(',')[0]}</span>
                            <span className="text-xs text-zinc-500 truncate">{res.display_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
