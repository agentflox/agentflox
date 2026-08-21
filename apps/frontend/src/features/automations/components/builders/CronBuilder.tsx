import React, { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type CronBuilderState = {
  repeat?: string;
  customInterval?: number;
  customPeriod?: "Day" | "Week" | "Month" | "Year";
  customDays?: string[];
  time?: string;
  startDate?: string;
  timezone?: string;
  ends?: string;
};

const US_TIMEZONES = [
  "US/Alaska",
  "US/Aleutian",
  "US/Arizona",
  "US/Central",
  "US/East-Indiana",
  "US/Eastern",
  "US/Hawaii",
  "US/Indiana-Starke",
  "US/Michigan",
  "US/Mountain",
  "US/Pacific",
  "US/Samoa",
];

const TIMEZONE_NAMES = [
  ...US_TIMEZONES,
  ...(typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [
      "UTC",
      "Africa/Abidjan",
      "Africa/Accra",
      "Africa/Addis_Ababa",
      "Africa/Algiers",
      "Africa/Asmara",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Asia/Bangkok",
      "Asia/Dubai",
      "Asia/Hong_Kong",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Pacific/Auckland",
      "Pacific/Honolulu",
    ]),
];

function getFormattedTimezone(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    let offset = "GMT+00:00";
    if (tzPart?.value) {
      if (tzPart.value === "GMT" || tzPart.value === "UTC") {
        offset = "GMT+00:00";
      } else {
        offset = tzPart.value.replace("UTC", "GMT");
      }
    }
    return `${offset}, ${tz}`;
  } catch {
    return `GMT+00:00, ${tz}`;
  }
}

function getNextScheduledRun({
  startDate,
  repeat,
  customInterval = 1,
  customPeriod = "Week",
  customDays = [],
}: {
  startDate?: string;
  repeat: string;
  customInterval?: number;
  customPeriod?: "Day" | "Week" | "Month" | "Year";
  customDays?: string[];
  time?: string;
}): string {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const base = startDate ? new Date(startDate) : new Date();
    base.setHours(0, 0, 0, 0);

    const start = isNaN(base.getTime()) ? today : base;
    const isCustom = repeat === "Custom";

    const daysMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    let targetDate = new Date(Math.max(today.getTime(), start.getTime()));

    if (isCustom) {
      if (customPeriod === "Day") {
        if (targetDate.getTime() <= today.getTime()) {
          targetDate = addDays(today, customInterval);
        }
      } else if (customPeriod === "Week") {
        const targetDayNums = customDays.map((d) => daysMap[d]).filter((n) => n !== undefined);
        if (targetDayNums.length > 0) {
          let found = false;
          for (let i = 0; i <= 35; i++) {
            const check = addDays(targetDate, i);
            if (check >= start && targetDayNums.includes(check.getDay())) {
              targetDate = check;
              found = true;
              break;
            }
          }
          if (!found) targetDate = addDays(targetDate, 7 * customInterval);
        } else {
          targetDate = addDays(targetDate, 7 * customInterval);
        }
      } else if (customPeriod === "Month") {
        targetDate = addMonths(targetDate, customInterval);
      } else if (customPeriod === "Year") {
        targetDate = addMonths(targetDate, 12 * customInterval);
      }
    } else {
      if (repeat === "Daily") {
        if (targetDate.getTime() <= today.getTime()) {
          targetDate = addDays(today, 1);
        }
      } else if (repeat === "Every weekday (Monday to Friday)") {
        let next = addDays(targetDate, 1);
        while (next.getDay() === 0 || next.getDay() === 6) {
          next = addDays(next, 1);
        }
        targetDate = next;
      } else if (repeat.startsWith("Weekly")) {
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const matchedIndex = dayNames.findIndex((d) => repeat.toLowerCase().includes(d));
        const dayNum = matchedIndex >= 0 ? matchedIndex : 4;
        let next = new Date(targetDate);
        for (let i = 0; i <= 7; i++) {
          const candidate = addDays(targetDate, i);
          if (candidate >= start && candidate.getDay() === dayNum) {
            next = candidate;
            break;
          }
        }
        targetDate = next;
      } else if (repeat.startsWith("Monthly on day")) {
        const match = repeat.match(/\d+/);
        const dayOfMonth = match ? parseInt(match[0]) : 20;
        let next = new Date(targetDate);
        next.setDate(dayOfMonth);
        if (next < today || next < start) {
          next = addMonths(next, 1);
          next.setDate(dayOfMonth);
        }
        targetDate = next;
      } else if (repeat.startsWith("Monthly on the")) {
        targetDate = addMonths(targetDate, 1);
      } else if (repeat.startsWith("Annually")) {
        targetDate = addMonths(targetDate, 12);
      }
    }

    return format(targetDate, "M/d/yyyy");
  } catch {
    return format(new Date(), "M/d/yyyy");
  }
}

function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const timezones = useMemo(() => {
    const unique = Array.from(new Set(TIMEZONE_NAMES));
    return unique.map((tz) => getFormattedTimezone(tz));
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return timezones;
    const lower = search.toLowerCase();
    return timezones.filter((tz) => tz.toLowerCase().includes(lower));
  }, [timezones, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50/80 transition-colors text-left"
        >
          <span className="truncate text-zinc-900 font-normal">{value || "Select timezone"}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width,300px)] min-w-[260px] p-0 shadow-lg rounded-lg border border-zinc-200 bg-white overflow-hidden"
        align="start"
      >
        <div className="p-2 border-b border-zinc-100">
          <div className="flex items-center gap-2 px-2.5 h-8 bg-zinc-50/70 border border-zinc-200 rounded-md focus-within:border-zinc-300">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-400 text-zinc-800"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[260px] overflow-y-auto p-1 space-y-0.5">
          {filteredTimezones.length > 0 ? (
            filteredTimezones.map((tz) => {
              const isSelected = tz === value || tz.includes(value) || (value && value.includes(tz));
              return (
                <button
                  key={tz}
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center px-2.5 py-1.5 rounded-md text-left text-sm transition-colors",
                    isSelected ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <span className="truncate">{tz}</span>
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-zinc-400">
              No timezones found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StartsPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleGoToday = () => {
    const today = new Date();
    setCurrentMonth(today);
  };

  const handleSelectDate = (date: Date) => {
    onChange(date.toISOString());
    setOpen(false);
  };

  const displayDate = useMemo(() => {
    if (!value) return "Pick a date";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return format(d, "MMMM d, yyyy");
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50/80 transition-colors text-left"
        >
          <span
            className={cn(
              "truncate font-normal",
              value ? "text-zinc-900" : "text-muted-foreground"
            )}
          >
            {displayDate}
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-3 shadow-lg rounded-xl border border-zinc-200 bg-white"
        align="start"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-semibold text-zinc-900">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <button
              type="button"
              onClick={handleGoToday}
              className="hover:text-zinc-800 text-xs px-1.5 py-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {weekDays.map((d) => (
            <span key={d} className="text-xs text-zinc-400 font-normal py-0.5">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isSelected =
              value &&
              !isNaN(new Date(value).getTime()) &&
              isSameDay(day, new Date(value));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleSelectDate(day)}
                className={cn(
                  "h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-full transition-colors cursor-pointer",
                  today && "bg-red-500 text-white font-medium hover:bg-red-600",
                  isSelected && !today && "bg-purple-600 text-white font-medium",
                  !today && !isSelected && isCurrentMonth && "text-zinc-800 hover:bg-zinc-100",
                  !today && !isSelected && !isCurrentMonth && "text-zinc-400 hover:bg-zinc-50"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EndsPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value && value !== "Never") {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useEffect(() => {
    if (value && value !== "Never") {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleGoToday = () => {
    const today = new Date();
    setCurrentMonth(today);
  };

  const handleSelectDate = (date: Date) => {
    onChange(format(date, "MMMM d, yyyy"));
    setOpen(false);
  };

  const isNever = !value || value.toLowerCase() === "never";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50/80 transition-colors text-left"
        >
          <span className="truncate text-zinc-900 font-normal">{value || "Never"}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-3 shadow-lg rounded-xl border border-zinc-200 bg-white"
        align="start"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-semibold text-zinc-900">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <button
              type="button"
              onClick={handleGoToday}
              className="hover:text-zinc-800 text-xs px-1.5 py-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {weekDays.map((d) => (
            <span key={d} className="text-xs text-zinc-400 font-normal py-0.5">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isSelected =
              !isNever &&
              value &&
              !isNaN(new Date(value).getTime()) &&
              isSameDay(day, new Date(value));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleSelectDate(day)}
                className={cn(
                  "h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-full transition-colors cursor-pointer",
                  today && "bg-red-500 text-white font-medium hover:bg-red-600",
                  isSelected && !today && "bg-purple-600 text-white font-medium",
                  !today && !isSelected && isCurrentMonth && "text-zinc-800 hover:bg-zinc-100",
                  !today && !isSelected && !isCurrentMonth && "text-zinc-400 hover:bg-zinc-50"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between items-center px-1">
          <button
            type="button"
            onClick={() => {
              onChange("Never");
              setOpen(false);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline cursor-pointer"
          >
            Never
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CronBuilder({
  value,
  onChange,
}: {
  value: CronBuilderState;
  onChange: (value: CronBuilderState) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const repeat = value.repeat || "Weekly on Thursday";
  const customInterval = value.customInterval || 1;
  const customPeriod = value.customPeriod || "Week";
  const customDays = value.customDays || ["Thu"];
  const time = value.time || "8:00 am";
  const startDate = value.startDate || new Date().toISOString();
  const timezone = value.timezone || "GMT+07:00, Asia/Bangkok";
  const ends = value.ends || "Never";

  const isCustom = repeat === "Custom";

  const handleUpdate = (updates: Partial<CronBuilderState>) => {
    onChange({ ...value, ...updates });
  };

  const nextScheduledRun = useMemo(() => {
    return getNextScheduledRun({
      startDate,
      repeat,
      customInterval,
      customPeriod,
      customDays,
      time,
    });
  }, [startDate, repeat, customInterval, customPeriod, customDays, time]);

  const daysOfWeek = [
    { label: "Mon", value: "Mon" },
    { label: "Tue", value: "Tue" },
    { label: "Wed", value: "Wed" },
    { label: "Thu", value: "Thu" },
    { label: "Fri", value: "Fri" },
    { label: "Sat", value: "Sat" },
    { label: "Sun", value: "Sun" },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm w-full">
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">Repeat</Label>
        <Select
          value={repeat}
          onValueChange={(val) => handleUpdate({ repeat: val })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Weekly on Thursday">Weekly on Thursday</SelectItem>
            <SelectItem value="Monthly on day 20">Monthly on day 20</SelectItem>
            <SelectItem value="Monthly on the third Thursday">
              Monthly on the third Thursday
            </SelectItem>
            <SelectItem value="Annually on August 20th">
              Annually on August 20th
            </SelectItem>
            <SelectItem value="Every weekday (Monday to Friday)">
              Every weekday (Monday to Friday)
            </SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <>
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Every</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                className="h-9 w-20"
                value={customInterval}
                onChange={(e) =>
                  handleUpdate({ customInterval: parseInt(e.target.value) || 1 })
                }
                min={1}
              />
              <Select
                value={customPeriod}
                onValueChange={(val: any) => handleUpdate({ customPeriod: val })}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Week">Week</SelectItem>
                  <SelectItem value="Month">Month</SelectItem>
                  <SelectItem value="Year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {customPeriod === "Week" && (
            <div className="flex w-full overflow-hidden rounded-md border border-zinc-200">
              {daysOfWeek.map((day) => {
                const isSelected = customDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        handleUpdate({
                          customDays: customDays.filter((d) => d !== day.value),
                        });
                      } else {
                        handleUpdate({
                          customDays: [...customDays, day.value],
                        });
                      }
                    }}
                    className={cn(
                      "flex-1 border-r border-zinc-200 py-1.5 text-[11px] font-medium last:border-r-0 hover:bg-zinc-50 transition-colors",
                      isSelected
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-white text-zinc-500"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">At</Label>
        <Input
          className="h-9"
          value={time}
          onChange={(e) => handleUpdate({ time: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">Starts</Label>
        <StartsPicker
          value={startDate}
          onChange={(val) => handleUpdate({ startDate: val })}
        />
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-800 cursor-pointer"
        >
          {showAdvanced ? "Hide advanced" : "Advanced"}
        </button>
      </div>

      {showAdvanced && (
        <>
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label className="!text-xs !text-zinc-500 font-medium">Timezone</Label>
            <TimezoneSelect
              value={timezone}
              onChange={(val) => handleUpdate({ timezone: val })}
            />
          </div>

          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label className="!text-xs !text-zinc-500 font-medium">Ends</Label>
            <EndsPicker
              value={ends}
              onChange={(val) => handleUpdate({ ends: val })}
            />
          </div>
        </>
      )}

      <div className="mt-2 rounded-lg bg-zinc-100 p-3 text-[11px] text-zinc-800 space-y-2">
        <div>
          <p className="font-semibold text-zinc-900 text-xs">
            {isCustom
              ? `Every ${customInterval} ${customPeriod.toLowerCase()}${customPeriod === "Week" && customDays.length > 0
                ? ` on ${customDays.join(", ")}`
                : ""
              } at ${time} (${timezone})`
              : `${repeat} at ${time} (${timezone})`}
          </p>
          <p className="text-zinc-500 mt-0.5">Next scheduled run: {nextScheduledRun}</p>
        </div>
        <p className="leading-relaxed">
          <span className="font-semibold text-zinc-900">Note:</span> At the scheduled
          time, this trigger will run for all tasks that are not marked as Closed.
        </p>
      </div>
    </div>
  );
}
