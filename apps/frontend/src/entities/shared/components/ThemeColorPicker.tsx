"use client";

import React, { useRef } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColorMode = "RGB" | "HEX" | "HSL";

export interface ThemeColorPickerProps {
    color: string;
    mode: ColorMode;
    onModeChange: (m: ColorMode) => void;
    onColorChange: (hex: string) => void;
    onSave: () => void;
    className?: string;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
        return { r, g, b };
    }
    if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
        return { r, g, b };
    }
    return null;
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case rn: h = 60 * (((gn - bn) / d) % 6); break;
            case gn: h = 60 * ((bn - rn) / d + 2); break;
            default: h = 60 * ((rn - gn) / d + 4); break;
        }
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else[rp, gp, bp] = [c, 0, x];
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255),
    };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rn: h = 60 * (((gn - bn) / d) % 6); break;
            case gn: h = 60 * ((bn - rn) / d + 2); break;
            default: h = 60 * ((rn - gn) / d + 4); break;
        }
        if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, sPercent: number, lPercent: number): { r: number; g: number; b: number } {
    const s = clamp(sPercent, 0, 100) / 100;
    const l = clamp(lPercent, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else[rp, gp, bp] = [c, 0, x];
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255),
    };
}

export function ThemeColorPicker({
    color,
    mode,
    onModeChange,
    onColorChange,
    onSave,
    className,
}: ThemeColorPickerProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const modeOrder: ColorMode[] = ["RGB", "HEX", "HSL"];
    const rgb = hexToRgb(color) ?? { r: 255, g: 255, b: 255 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const updateFromPanel = (clientX: number, clientY: number) => {
        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;
        const s = clamp((clientX - rect.left) / rect.width, 0, 1);
        const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
        const nextRgb = hsvToRgb(hsv.h, s, v);
        onColorChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    };

    return (
        <div className={cn("space-y-4 p-1", className)}>
            {/* Saturation/Brightness Panel */}
            <div
                ref={panelRef}
                className="relative h-36 w-full rounded-2xl cursor-crosshair overflow-hidden shadow-sm"
                style={{ backgroundColor: `hsl(${Math.round(hsv.h)} 100% 50%)` }}
                onMouseDown={(e) => {
                    updateFromPanel(e.clientX, e.clientY);
                    const onMove = (ev: MouseEvent) => updateFromPanel(ev.clientX, ev.clientY);
                    const onUp = () => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                }}
            >
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000 0%, rgba(0,0,0,0) 100%)" }} />
                <div
                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-lg ring-1 ring-black/10"
                    style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
                />
            </div>

            {/* Hue Slider */}
            <div className="flex items-center gap-4 px-1">
                <div className="relative flex-1 h-3 rounded-full cursor-pointer">
                    <input
                        type="range"
                        min={0}
                        max={360}
                        value={Math.round(hsv.h)}
                        onChange={(e) => {
                            const nextRgb = hsvToRgb(Number(e.target.value), hsv.s, hsv.v);
                            onColorChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="absolute inset-0 rounded-full shadow-inner border border-black/5" style={{ background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)" }} />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center pointer-events-none z-10"
                        style={{ left: `calc(${(hsv.h / 360) * 100}% - 12px)` }}
                    >
                        <div className="h-3 w-3 rounded-full shadow-inner ring-1 ring-black/5" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }} />
                    </div>
                </div>
                <div className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-zinc-200" style={{ backgroundColor: color }} />
            </div>

            {/* Value Inputs */}
            <div className="flex gap-2">
                <button
                    type="button"
                    className="h-8 w-[72px] shrink-0 flex items-center justify-between px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-all text-[12px] font-medium text-zinc-800 active:scale-[0.97] cursor-pointer"
                    onClick={() => {
                        const idx = modeOrder.indexOf(mode);
                        const next = modeOrder[(idx + 1) % modeOrder.length];
                        onModeChange(next);
                    }}
                >
                    {mode}
                    <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
                </button>

                {mode === "HEX" ? (
                    <div className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 bg-white flex items-center focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all">
                        <input
                            value={color}
                            onChange={(e) => onColorChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
                            className="w-full bg-transparent border-none p-0 h-full text-[12px] font-normal text-zinc-800 text-center placeholder:text-zinc-300 focus:outline-none focus:ring-0"
                        />
                    </div>
                ) : (
                    <div className="flex-1 h-8 flex items-center rounded-lg border border-zinc-200 bg-white focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all overflow-hidden">
                        {mode === "RGB" ? (
                            <>
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.r}
                                    onChange={(e) => onColorChange(rgbToHex(Number(e.target.value || 0), rgb.g, rgb.b))}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.g}
                                    onChange={(e) => onColorChange(rgbToHex(rgb.r, Number(e.target.value || 0), rgb.b))}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={rgb.b}
                                    onChange={(e) => onColorChange(rgbToHex(rgb.r, rgb.g, Number(e.target.value || 0)))}
                                />
                            </>
                        ) : (
                            <>
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.h}
                                    onChange={(e) => { const next = hslToRgb(Number(e.target.value || 0), hsl.s, hsl.l); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.s}
                                    onChange={(e) => { const next = hslToRgb(hsl.h, Number(e.target.value || 0), hsl.l); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                                <div className="w-[1px] h-3 bg-zinc-200 shrink-0" />
                                <input
                                    className="w-full bg-transparent border-none p-0 h-full text-center text-[12px] font-normal focus:outline-none focus:ring-0"
                                    value={hsl.l}
                                    onChange={(e) => { const next = hslToRgb(hsl.h, hsl.s, Number(e.target.value || 0)); onColorChange(rgbToHex(next.r, next.g, next.b)); }}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="w-full h-10 text-[13px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-[0.98] cursor-pointer"
                onClick={onSave}
            >
                Save
            </button>
        </div>
    );
}
