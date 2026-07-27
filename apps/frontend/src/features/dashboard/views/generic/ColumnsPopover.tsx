import * as React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnsPopoverProps {
    fieldConfig: { id: string; label: string; icon?: any; isCustom?: boolean }[];
    visibleColumns: Set<string>;
    toggleColumn: (colId: string) => void;
    /** Called to set all columns at once (for All / None). If omitted the header buttons are hidden. */
    setAllColumns?: (ids: string[]) => void;
    children: React.ReactNode;
}

export function ColumnsPopover({ fieldConfig, visibleColumns, toggleColumn, setAllColumns, children }: ColumnsPopoverProps) {
    const [search, setSearch] = React.useState("");

    // Filter out unwanted columns: custom task id, duration, sprint points
    const excludedColumns = ["customTaskId", "duration", "sprintPoints"];
    const filteredFields = fieldConfig.filter(f =>
        !excludedColumns.includes(f.id) &&
        f.label.toLowerCase().includes(search.toLowerCase())
    );

    // "Name" is always shown and can't be toggled, so it's excluded from All/None logic
    const toggleableFields = filteredFields.filter(f => f.id !== "name");

    const allChecked = toggleableFields.length > 0 && toggleableFields.every(f => visibleColumns.has(f.id));
    const noneChecked = toggleableFields.every(f => !visibleColumns.has(f.id));

    const handleAll = () => {
        if (setAllColumns) {
            setAllColumns(toggleableFields.map(f => f.id));
        } else {
            toggleableFields.forEach(f => { if (!visibleColumns.has(f.id)) toggleColumn(f.id); });
        }
    };

    const handleNone = () => {
        if (setAllColumns) {
            setAllColumns([]);
        } else {
            toggleableFields.forEach(f => { if (visibleColumns.has(f.id)) toggleColumn(f.id); });
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 rounded-xl shadow-xl z-[200] overflow-hidden" align="end" sideOffset={-128}>
                <div className="flex items-center gap-2 px-3 h-9 bg-white overflow-hidden cursor-text">
                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                    <Input
                        variant="ghost"
                        className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                        placeholder="Search Task Fields"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Show</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={allChecked ? handleNone : handleAll}
                            className="text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer text-zinc-400 hover:text-zinc-700"
                        >
                            {allChecked ? "None" : "All"}
                        </button>
                    </div>
                </div>

                <ScrollArea className="h-[400px]">
                    <div className="p-1 space-y-0.5">
                        {filteredFields.map(field => {
                            const isName = field.id === "name";
                            const isChecked = isName ? true : visibleColumns.has(field.id);
                            return (
                                <label
                                    key={field.id}
                                    className={`flex items-center justify-between px-2 py-1.5 rounded-md group ${
                                        isName ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-100 cursor-pointer"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="!text-sm text-zinc-700 !font-normal">{field.label}</span>
                                    </div>
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={isName}
                                        onCheckedChange={isName ? undefined : () => toggleColumn(field.id)}
                                        className="h-4 w-4 border-zinc-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 rounded-[4px]"
                                    />
                                </label>
                            );
                        })}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

