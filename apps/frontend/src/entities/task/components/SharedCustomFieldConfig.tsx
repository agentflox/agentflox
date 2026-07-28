import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '@/lib/utils';
import { ListChecks, Plus, ChevronDown, ChevronUp, Search, Check, Trash2, GripVertical, ChevronsUpDown } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';

export const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
    { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
    { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
    { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
    { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
    { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ' },
    { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
    { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },
    { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
    { code: 'BIF', name: 'Burundian Franc', symbol: 'Fr' },
    { code: 'BMD', name: 'Bermudan Dollar', symbol: '$' },
    { code: 'BND', name: 'Brunei Dollar', symbol: 'B$' },
    { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'BSD', name: 'Bahamian Dollar', symbol: '$' },
    { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu' },
    { code: 'BWP', name: 'Botswanan Pula', symbol: 'P' },
    { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
    { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'CDF', name: 'Congolese Franc', symbol: 'Fr' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$' },
    { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
    { code: 'CUP', name: 'Cuban Peso', symbol: '$' },
    { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
    { code: 'DZD', name: 'Algerian Dinar', symbol: 'دج' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
    { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
    { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$' },
    { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
    { code: 'GNF', name: 'Guinean Franc', symbol: 'Fr' },
    { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
    { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
    { code: 'HTG', name: 'Haitian Gourde', symbol: 'G' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
    { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },
    { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
    { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
    { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'KGS', name: 'Kyrgystani Som', symbol: 'с' },
    { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
    { code: 'KPW', name: 'North Korean Won', symbol: '₩' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
    { code: 'KYD', name: 'Cayman Islands Dollar', symbol: 'CI$' },
    { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
    { code: 'LAK', name: 'Laotian Kip', symbol: '₭' },
    { code: 'LBP', name: 'Lebanese Pound', symbol: 'LL' },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
    { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$' },
    { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
    { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
    { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден' },
    { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
    { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮' },
    { code: 'MOP', name: 'Macanese Pataca', symbol: 'P' },
    { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM' },
    { code: 'MUR', name: 'Mauritian Rupee', symbol: 'Rs' },
    { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf' },
    { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
    { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
    { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.' },
    { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲' },
    { code: 'QAR', name: 'Qatari Rial', symbol: 'QR' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
    { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'RWF', name: 'Rwandan Franc', symbol: 'Fr' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
    { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$' },
    { code: 'SCR', name: 'Seychellois Rupee', symbol: 'Rs' },
    { code: 'SDG', name: 'Sudanese Pound', symbol: 'LS' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh' },
    { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
    { code: 'STN', name: 'São Tomé & Príncipe Dobra', symbol: 'Db' },
    { code: 'SYP', name: 'Syrian Pound', symbol: 'LS' },
    { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'E' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM' },
    { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'T' },
    { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
    { code: 'TOP', name: "Tongan Pa'anga", symbol: 'T$' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'TTD', name: 'Trinidad & Tobago Dollar', symbol: 'TT$' },
    { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
    { code: 'UZS', name: 'Uzbekistani Som', symbol: 'сум' },
    { code: 'VES', name: 'Venezuelan Bolívar', symbol: 'Bs.S' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT' },
    { code: 'WST', name: 'Samoan Tala', symbol: 'WS$' },
    { code: 'XAF', name: 'Central African CFA Franc', symbol: 'Fr' },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'Fr' },
    { code: 'YER', name: 'Yemeni Rial', symbol: '﷼' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
];

type ColorMode = "HEX" | "RGB" | "HSL";
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
}
function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255; const gn = g / 255; const bn = b / 255;
    const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
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
    const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
    let rp = 0; let gp = 0; let bp = 0;
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
    const rn = r / 255; const gn = g / 255; const bn = b / 255;
    const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
    const d = max - min; const l = (max + min) / 2;
    let h = 0; let s = 0;
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
    const s = clamp(sPercent, 0, 100) / 100; const l = clamp(lPercent, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = l - c / 2;
    let rp = 0; let gp = 0; let bp = 0;
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
}: {
    color: string;
    mode: ColorMode;
    onModeChange: (m: ColorMode) => void;
    onColorChange: (hex: string) => void;
    onSave: () => void;
}) {
    const panelRef = React.useRef<HTMLDivElement | null>(null);
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
        <div className="space-y-4 p-1">
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
                <div className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-zinc-200" style={{ backgroundColor: color }} />
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    className="h-8 w-[72px] shrink-0 flex items-center justify-between px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-all text-[12px] font-bold text-zinc-800 shadow-sm active:scale-[0.97] cursor-pointer"
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
                    <div className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 bg-white shadow-sm flex items-center focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all">
                        <input
                            value={color}
                            onChange={(e) => onColorChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
                            className="w-full bg-transparent border-none p-0 h-full text-[12px] font-normal text-zinc-800 text-center placeholder:text-zinc-300 focus:outline-none focus:ring-0"
                        />
                    </div>
                ) : (
                    <div className="flex-1 h-8 flex items-center rounded-lg border border-zinc-200 bg-white shadow-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/10 transition-all overflow-hidden">
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

export function SortableOptionItem({
    opt,
    focusedOptionId,
    newOptionInputRef,
    setOptions,
    setFocusedOptionId,
}: {
    opt: { id: string; name: string; color: string };
    focusedOptionId: string | null;
    newOptionInputRef: React.MutableRefObject<HTMLInputElement | null>;
    setOptions: React.Dispatch<React.SetStateAction<{ id: string; name: string; color: string }[]>>;
    setFocusedOptionId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const PRESET_COLORS = [
        '#e4e4e7', '#ddd6fe', '#a5b4fc', '#bae6fd', '#bbf7d0',
        '#52525b', '#7c3aed', '#3b82f6', '#1d4ed8', '#16a34a',
        '#fde68a', '#fca5a5', '#fbcfe8', '#f0abfc', '#c4b5fd', '#a1a1aa',
        '#fb923c', '#f87171', '#f472b6', '#e879f9', '#78716c',
    ];

    const [colorView, setColorView] = React.useState<'preset' | 'custom'>('preset');
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [customColor, setCustomColor] = React.useState(opt.color);
    const [colorMode, setColorMode] = React.useState<ColorMode>('HEX');

    const openCustom = () => {
        setCustomColor(opt.color);
        setColorView('custom');
    };

    const saveCustomColor = () => {
        setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, color: customColor } : o));
        setPopoverOpen(false);
        setColorView('preset');
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative flex items-center gap-2 bg-white border border-zinc-200/80 rounded-lg h-[38px] px-2 hover:border-zinc-300 transition-colors"
        >
            <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-center w-4 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </div>
            <Popover open={popoverOpen} onOpenChange={(o) => { setPopoverOpen(o); if (!o) setColorView('preset'); }}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 border border-zinc-200 hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                        style={{ backgroundColor: opt.color }}
                    />
                </PopoverTrigger>
                <PopoverContent className="p-3 shadow-xl rounded-xl border-zinc-200 z-[200]" style={{ width: colorView === 'custom' ? '240px' : '200px' }} align="start">
                    {colorView === 'preset' ? (
                        <div>
                            <p className="text-xs font-medium text-zinc-700 mb-3">Color</p>
                            <div className="grid grid-cols-6 gap-1.5 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, color: 'transparent' } : o))}
                                    className="h-6 w-6 rounded-full border border-zinc-200 flex items-center justify-center hover:scale-110 transition-transform focus:outline-none cursor-pointer overflow-hidden relative"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 absolute inset-0" fill="none">
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, color: c } : o))}
                                        className={cn('h-6 w-6 rounded-full border border-zinc-200/50 hover:scale-110 transition-transform focus:outline-none cursor-pointer', opt.color === c && 'ring-2 ring-offset-1 ring-zinc-500')}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="border-t border-zinc-100 pt-2.5">
                                <button
                                    type="button"
                                    onClick={openCustom}
                                    className="flex w-full p-1.5 rounded-md items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add color
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ThemeColorPicker
                            color={customColor}
                            mode={colorMode}
                            onModeChange={setColorMode}
                            onColorChange={setCustomColor}
                            onSave={saveCustomColor}
                        />
                    )}
                </PopoverContent>
            </Popover>
            <input
                ref={focusedOptionId === opt.id ? newOptionInputRef : undefined}
                value={opt.name}
                onChange={(e) => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, name: e.target.value } : o))}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const newId = Math.random().toString();
                        setOptions(prev => [...prev, { id: newId, name: '', color: '#e5e7eb' }]);
                        setFocusedOptionId(newId);
                        setTimeout(() => newOptionInputRef.current?.focus(), 30);
                    }
                    if (e.key === 'Backspace' && opt.name === '') {
                        e.preventDefault();
                        setOptions(prev => prev.filter(o => o.id !== opt.id));
                    }
                }}
                placeholder="Option name"
                className="flex-1 bg-transparent border-none text-[13px] h-full focus:outline-none focus:ring-0 text-zinc-900 placeholder:text-zinc-400"
            />
            <button
                type="button"
                onClick={() => setOptions(prev => prev.filter(o => o.id !== opt.id))}
                className="h-6 w-6 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

export function useCustomFieldConfigState(initialConfig?: any) {
    const [options, setOptions] = React.useState<{ id: string; name: string; color: string }[]>(initialConfig?.options || [
        { id: 'opt1', name: 'Option 1', color: '#e0e7ff' },
        { id: 'opt2', name: 'Option 2', color: '#fce7f3' }
    ]);
    const [emojiType, setEmojiType] = React.useState<string>(initialConfig?.emojiType || '👍');
    const [hideVotedUsers, setHideVotedUsers] = React.useState<boolean>(initialConfig?.hideVotedUsers || false);
    const [startValue, setStartValue] = React.useState<number>(initialConfig?.startValue ?? 0);
    const [endValue, setEndValue] = React.useState<number>(initialConfig?.endValue ?? 100);
    const [buttonName, setButtonName] = React.useState<string>(initialConfig?.buttonName || 'Run');
    const [buttonColor, setButtonColor] = React.useState<string>(initialConfig?.buttonColor || '#52525b');
    const [buttonEmoji, setButtonEmoji] = React.useState<string>(initialConfig?.buttonEmoji || '');
    const [ratingScale, setRatingScale] = React.useState<number>(initialConfig?.ratingScale ?? 5);
    const [currency, setCurrency] = React.useState<string>(initialConfig?.currency || 'USD');
    const [peopleSettings, setPeopleSettings] = React.useState(initialConfig?.peopleSettings || {
        entireWorkspace: false,
        showGuests: false,
        multipleSelect: true,
        includeTeams: false,
    });

    const getConfig = (type: string) => {
        const config: Record<string, unknown> = {};
        if (type === 'DROPDOWN' || type === 'CUSTOM_DROPDOWN' || type === 'LABELS' || type === 'CATEGORIZE' || type === 'SENTIMENT' || type === 'TSHIRT_SIZE') {
            config.options = options.length > 0 ? options : [];
        }
        if (type === 'VOTING') {
            config.emojiType = emojiType;
            config.hideVotedUsers = hideVotedUsers;
        }
        if (type === 'PROGRESS_AUTO' || type === 'PROGRESS_MANUAL') {
            config.startValue = startValue;
            config.endValue = endValue;
        }
        if (type === 'BUTTON') {
            config.buttonName = buttonName;
            config.buttonColor = buttonColor;
            config.buttonEmoji = buttonEmoji;
        }
        if (type === 'RATING') {
            config.emojiType = emojiType;
            config.ratingScale = ratingScale;
        }
        if (type === 'MONEY' || type === 'CURRENCY') {
            config.currency = currency;
        }
        if (type === 'PEOPLE' || type === 'USER') {
            config.peopleSettings = peopleSettings;
        }
        return Object.keys(config).length ? config : undefined;
    };

    const resetConfig = () => {
        setOptions([
            { id: 'opt1', name: 'Option 1', color: '#e0e7ff' },
            { id: 'opt2', name: 'Option 2', color: '#fce7f3' }
        ]);
        setEmojiType('👍');
        setHideVotedUsers(false);
        setStartValue(0);
        setEndValue(100);
        setButtonName('Run');
        setButtonColor('#52525b');
        setButtonEmoji('');
        setRatingScale(5);
        setCurrency('USD');
        setPeopleSettings({ entireWorkspace: false, showGuests: false, multipleSelect: true, includeTeams: false });
    };

    return {
        options, setOptions,
        emojiType, setEmojiType,
        hideVotedUsers, setHideVotedUsers,
        startValue, setStartValue,
        endValue, setEndValue,
        buttonName, setButtonName,
        buttonColor, setButtonColor,
        buttonEmoji, setButtonEmoji,
        ratingScale, setRatingScale,
        currency, setCurrency,
        peopleSettings, setPeopleSettings,
        getConfig, resetConfig
    };
}

export function CustomFieldConfigForm({
    type,
    state,
    hideTypeSelector,
    setType,
}: {
    type: string;
    state: ReturnType<typeof useCustomFieldConfigState>;
    hideTypeSelector?: boolean;
    setType?: (type: string) => void;
}) {
    const {
        options, setOptions,
        emojiType, setEmojiType,
        hideVotedUsers, setHideVotedUsers,
        startValue, setStartValue,
        endValue, setEndValue,
        buttonName, setButtonName,
        buttonColor, setButtonColor,
        buttonEmoji, setButtonEmoji,
        ratingScale, setRatingScale,
        currency, setCurrency,
        peopleSettings, setPeopleSettings,
    } = state;

    const [focusedOptionId, setFocusedOptionId] = React.useState<string | null>(null);
    const newOptionInputRef = React.useRef<HTMLInputElement | null>(null);
    const optionsDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    
    const [currencySearch, setCurrencySearch] = React.useState('');
    const [currencyOpen, setCurrencyOpen] = React.useState(false);

    return (
        <div className="space-y-4">
            {/* Type selector */}
            {!hideTypeSelector && setType && (
                <div className="space-y-2">
                    <Label className="block !text-xs !font-medium !text-zinc-600">Type</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-full h-9 bg-white border-zinc-200/80 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[13px]">
                            <SelectValue placeholder="Select type" className="text-zinc-900 font-normal" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-zinc-200 shadow-lg">
                            {FIELD_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <SelectItem key={opt.id} value={opt.type} className="py-2.5 px-3 cursor-pointer focus:bg-violet-50/50 border border-transparent focus:border-violet-200 transition-all rounded-lg group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", opt.isAi ? "bg-purple-50" : "bg-zinc-100 group-focus:bg-white group-focus:shadow-sm")}>
                                                <Icon className={cn("h-3.5 w-3.5", opt.color, "group-focus:text-violet-900")} />
                                            </div>
                                            <span className="text-[13px] font-normal text-zinc-900 group-focus:text-violet-900 transition-colors">{opt.label}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Dropdown Options */}
            {['DROPDOWN', 'CUSTOM_DROPDOWN', 'LABELS', 'CATEGORIZE', 'SENTIMENT', 'TSHIRT_SIZE'].includes(type) && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <Label className="!text-xs !font-medium !text-zinc-600">
                            Dropdown options <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <button type="button" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
                            <ListChecks className="h-3.5 w-3.5" />
                            Manual
                        </button>
                    </div>
                    <div className="space-y-2">
                        <DndContext
                            sensors={optionsDndSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                                const { active, over } = event;
                                if (over && active.id !== over.id) {
                                    setOptions(prev => {
                                        const oldIndex = prev.findIndex(o => o.id === active.id);
                                        const newIndex = prev.findIndex(o => o.id === over.id);
                                        return arrayMove(prev, oldIndex, newIndex);
                                    });
                                }
                            }}
                        >
                            <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                    {options.map((opt) => (
                                        <SortableOptionItem
                                            key={opt.id}
                                            opt={opt}
                                            focusedOptionId={focusedOptionId}
                                            newOptionInputRef={newOptionInputRef}
                                            setOptions={setOptions}
                                            setFocusedOptionId={setFocusedOptionId}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <button
                            type="button"
                            onClick={() => {
                                const newId = Math.random().toString();
                                setOptions(prev => [...prev, { id: newId, name: '', color: '#e5e7eb' }]);
                                setFocusedOptionId(newId);
                                setTimeout(() => newOptionInputRef.current?.focus(), 30);
                            }}
                            className="w-full flex items-center gap-2 h-[38px] px-3 rounded-lg border border-zinc-200/80 text-[13px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Add option
                        </button>
                    </div>
                </div>
            )}

            {/* Voting Options */}
            {type === 'VOTING' && (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label className="!text-xs !font-medium !text-zinc-600">
                            Emoji type
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button type="button" className="w-full flex items-center justify-between bg-white border border-zinc-200/80 rounded-lg h-9 px-3 hover:border-zinc-300 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                                    <span className="text-xl leading-none flex items-center h-full">{emojiType}</span>
                                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-xl z-[200]" align="start">
                                <EmojiPicker onEmojiClick={(e) => { setEmojiType(e.emoji); }} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="hide-voted-users"
                            checked={hideVotedUsers}
                            onCheckedChange={(c) => setHideVotedUsers(!!c)}
                            className="cursor-pointer"
                        />
                        <Label htmlFor="hide-voted-users" className="!text-[13px] !font-normal !text-zinc-600 cursor-pointer !mb-0">
                            Hide users who have voted
                        </Label>
                    </div>
                </div>
            )}

            {/* Progress Options */}
            {(type === 'PROGRESS_AUTO' || type === 'PROGRESS_MANUAL') && (
                <div className="flex items-center gap-4 pt-2">
                    <div className="space-y-2 flex-1">
                        <Label className="!text-xs !font-medium !text-zinc-600">Start value</Label>
                        <Input
                            type="number"
                            value={startValue}
                            onChange={(e) => setStartValue(Number(e.target.value))}
                            className="w-full h-9 bg-white border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all !text-[13px]"
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label className="!text-xs !font-medium !text-zinc-600">End value</Label>
                        <Input
                            type="number"
                            value={endValue}
                            onChange={(e) => setEndValue(Number(e.target.value))}
                            className="w-full h-9 bg-white border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all !text-[13px]"
                        />
                    </div>
                </div>
            )}

            {/* Button Options */}
            {type === 'BUTTON' && (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label className="!text-xs !font-medium !text-zinc-600">Button details</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center bg-white border border-zinc-200/80 rounded-lg h-9 px-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all overflow-hidden">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="text-[15px] h-full px-1 hover:bg-zinc-50 transition-colors focus:outline-none flex items-center justify-center shrink-0 cursor-pointer">
                                            {buttonEmoji || <span className="text-[11px] text-zinc-400">emoji</span>}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-none shadow-xl z-[200]" align="start">
                                        <EmojiPicker onEmojiClick={(e) => { setButtonEmoji(e.emoji); }} />
                                    </PopoverContent>
                                </Popover>
                                <input
                                    value={buttonName}
                                    onChange={(e) => setButtonName(e.target.value)}
                                    placeholder="Enter button name"
                                    className="flex-1 bg-transparent border-none text-[13px] h-full focus:outline-none focus:ring-0 placeholder:text-zinc-400 pl-1 text-zinc-900"
                                />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" className="h-9 w-9 rounded-lg border border-zinc-200/80 flex items-center justify-center hover:bg-zinc-50 transition-colors shrink-0 focus:outline-none cursor-pointer">
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: buttonColor }} />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 shadow-xl rounded-xl border-zinc-200 z-[200]" align="end">
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium text-zinc-700">Color</p>
                                        <div className="grid grid-cols-6 gap-2">
                                            {['#fca5a5', '#d1d5db', '#c4b5fd', '#93c5fd', '#86efac', '#52525b', '#71717a', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#fcd34d', '#fb923c', '#f87171', '#f472b6', '#d946ef', '#d6d3d1', '#fbbf24', '#ea580c', '#dc2626', '#e11d48', '#c026d3', '#a8a29e'].map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setButtonColor(c)}
                                                    className={cn("h-6 w-6 rounded-full border border-zinc-200 hover:scale-110 transition-transform focus:outline-none cursor-pointer", buttonColor === c && "ring-2 ring-offset-2 ring-indigo-500")}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Options */}
            {type === 'RATING' && (
                <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                        <Label className="!text-xs !font-medium !text-zinc-600">
                            Emoji type
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button type="button" className="w-full flex items-center justify-between bg-white border border-zinc-200/80 rounded-lg h-9 px-3 hover:border-zinc-300 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                                    <span className="text-xl leading-none flex items-center h-full">{emojiType}</span>
                                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-xl z-[200]" align="start">
                                <EmojiPicker onEmojiClick={(e) => { setEmojiType(e.emoji); }} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="!text-xs !font-medium !text-zinc-600">Scale</Label>
                            <span className="text-[13px] text-zinc-600 font-medium">1 - {ratingScale}</span>
                        </div>
                        <div className="px-1 relative">
                            <Slider
                                value={[ratingScale]}
                                min={1}
                                max={5}
                                step={1}
                                onValueChange={(vals) => setRatingScale(vals[0])}
                                className="w-full"
                            />
                            <div className="flex justify-between mt-2 text-[11px] text-zinc-500 px-0.5 relative">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <div key={v} className="flex flex-col items-center">
                                        <div className="w-[1px] h-1.5 bg-zinc-300 absolute -top-1.5" />
                                        <span>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Money / Currency Options */}
            {(type === 'MONEY' || type === 'CURRENCY') && (() => {
                const filtered = CURRENCIES.filter(c =>
                    `${c.code} - ${c.name} (${c.symbol})`.toLowerCase().includes(currencySearch.toLowerCase())
                );
                const selected = CURRENCIES.find(c => c.code === currency);
                return (
                    <div className="space-y-2 pt-2">
                        <Label className="!text-xs !font-medium !text-zinc-600">Currency</Label>
                        <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between bg-white border border-zinc-200/80 rounded-lg h-9 px-3 hover:border-zinc-300 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <span className="text-[13px] text-zinc-800 truncate">
                                        {selected ? `${selected.code} - ${selected.name} (${selected.symbol})` : 'Select currency'}
                                    </span>
                                    {currencyOpen
                                        ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                                        : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl rounded-xl border-zinc-200 z-[200]" align="start" sideOffset={4}>
                                <div className="flex flex-col max-h-72">
                                    <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
                                        <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <input
                                            autoFocus
                                            value={currencySearch}
                                            onChange={e => setCurrencySearch(e.target.value)}
                                            placeholder="Search..."
                                            className="flex-1 text-[13px] bg-transparent border-none focus:outline-none placeholder:text-zinc-400 text-zinc-800"
                                        />
                                    </div>
                                    <div className="overflow-y-auto" onWheel={e => e.stopPropagation()}>
                                        {filtered.length === 0 && (
                                            <p className="text-[13px] text-zinc-400 px-3 py-4 text-center">No currencies found</p>
                                        )}
                                        {filtered.map(c => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => { setCurrency(c.code); setCurrencyOpen(false); setCurrencySearch(''); }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-[13px] text-zinc-800 hover:bg-zinc-50 transition-colors text-left cursor-pointer",
                                                    currency === c.code && "font-medium"
                                                )}
                                            >
                                                <span className="truncate">{c.code} - {c.name} ({c.symbol})</span>
                                                {currency === c.code && <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0 ml-2" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            })()}

            {/* People / User Options */}
            {(type === 'PEOPLE' || type === 'USER') && (
                <div className="space-y-3 pt-2">
                    <Label className="!text-xs !font-semibold !text-zinc-700 uppercase tracking-wide">Settings</Label>
                    {([
                        { key: 'entireWorkspace', label: 'Show people from my entire Workspace' },
                        { key: 'showGuests', label: 'Show guests' },
                        { key: 'multipleSelect', label: 'Select multiple people' },
                        { key: 'includeTeams', label: 'Include teams' },
                    ] as const).map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2.5">
                            <Checkbox
                                id={`people-${key}`}
                                checked={peopleSettings[key]}
                                onCheckedChange={(c) =>
                                    setPeopleSettings(prev => ({ ...prev, [key]: !!c }))
                                }
                            />
                            <Label
                                htmlFor={`people-${key}`}
                                className="!text-[13px] !font-normal !text-zinc-700 cursor-pointer leading-tight"
                            >
                                {label}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
