const fs = require('fs');
const file = 'apps/frontend/src/features/dashboard/views/generic/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchStart = '{/* Inline Create Form */}\n                                                                        {isInline && (';
const startIdx = content.indexOf(searchStart);
const innerFormStart = content.indexOf('<div className={cn(', startIdx);
const innerFormEndStr = '                                                                        )}';
const innerFormEnd = content.indexOf(innerFormEndStr, innerFormStart);

const inlineFormChunk = content.substring(innerFormStart, innerFormEnd).trim();

const renderFunc = `    const renderInlineCreateForm = (isAbsolute: boolean, colIndex?: number, totalCols?: number) => {
        return (
            <div className={cn(
                "z-[100] bg-white border border-zinc-300 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col p-2.5 cursor-default overflow-visible rounded-lg group/form",
                isAbsolute ? "absolute top-[0px] h-[95px]" : "relative min-h-[95px] shrink-0 mt-1 mb-1 z-[60] w-full",
                isAbsolute && (viewMode === "week" || viewMode === "4days") ? "w-[380px] sm:w-[480px]" : isAbsolute ? "left-[-1px] right-[0px]" : "",
                isAbsolute && (viewMode === "week" || viewMode === "4days") && colIndex !== undefined && totalCols !== undefined && (colIndex >= totalCols - 2) ? "right-0" : isAbsolute ? "left-[-1px]" : ""
            )} onClick={e => e.stopPropagation()}>
` + inlineFormChunk.substring(inlineFormChunk.indexOf('<div className="flex-1'));

const returnStart = '    return (\n        <div className="h-full flex flex-col bg-white border border-zinc-200 shadow-sm overflow-hidden text-[13px] relative">';
content = content.replace(returnStart, renderFunc + '\n    };\n\n' + returnStart);

content = content.replace(content.substring(startIdx, innerFormEnd + innerFormEndStr.length), '{/* Inline Create Form */}\n                                                                        {isInline && renderInlineCreateForm(true, i, calendarDays.length)}');

const oldHeaderStart = '{/* Days Header */}';
const oldAllDayEndStr = '                            </div>\n\n                            {/* Hours Grid */}';
const oldHeadersChunk = content.substring(content.indexOf(oldHeaderStart), content.indexOf(oldAllDayEndStr));

const newHeadersChunk = `{/* Sticky Header Group */}
                            <div className="sticky top-0 z-40 flex flex-col bg-white shadow-sm border-b border-zinc-200">
                                {/* Days Header */}
                                {viewMode !== "day" && (
                                    <div className="flex border-b border-zinc-200 shrink-0 bg-white">
                                        <div className="w-16 border-r border-zinc-200 shrink-0" />
                                        <div className="flex-1 flex">
                                            {calendarDays.map((day, i) => (
                                                <div key={i} className="flex-1 border-r border-zinc-200 last:border-r-0 px-4 py-2 flex flex-col justify-center bg-white">
                                                    <span className="text-[12px] font-bold text-zinc-700">{format(day, 'EEEE')}</span>
                                                    <span className={cn("text-[11px] font-medium block mt-0.5", isTodayFns(day) ? "text-red-500" : "text-zinc-500")}>
                                                        {format(day, 'd MMM')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All Day Row */}
                                <div className="flex shrink-0">
                                    <div className="w-16 px-2 py-3 text-[10px] font-medium text-zinc-500 border-r border-zinc-200 shrink-0 flex items-start">
                                        All day
                                    </div>
                                    <div className="flex-1 flex" onClick={(e) => e.stopPropagation()}>
                                        {calendarDays.map((day, i) => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            const dayTasks = (tasksByDate.get(dateKey) || []).filter(task => {
                                                const start = task.startDate ? new Date(task.startDate) : null;
                                                const end = task.dueDate ? new Date(task.dueDate) : null;
                                                // Check if exactly midnight to midnight or just one date at midnight
                                                const startIsMidnight = start && start.getHours() === 0 && start.getMinutes() === 0;
                                                const endIsMidnight = end && end.getHours() === 0 && end.getMinutes() === 0;

                                                // True if it lacks both, OR if it's perfectly midnight
                                                if (!start && !end) return true;
                                                if (start && end) return startIsMidnight && endIsMidnight;
                                                if (start && !end) return startIsMidnight;
                                                if (!start && end) return endIsMidnight;
                                                return false;
                                            });

                                            const isInlineAllDay = inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === -1;

                                            return (
                                                <div key={i}
                                                    className="flex-1 border-r border-zinc-200 last:border-r-0 relative min-h-[40px] p-1 gap-1 flex flex-col group/allday cursor-pointer hover:bg-zinc-50/50 transition-colors z-20"
                                                    onClick={(e) => {
                                                        if (isInlineAllDay) return;
                                                        e.stopPropagation();
                                                        setInlineCreateState({ dayKey: dateKey, hour: -1, half: 0 });
                                                        setInlineCreateText("");
                                                        setInlineAddTags([]);
                                                        setInlineAddAssigneeIds([]);
                                                        setInlineAddPriority(null);
                                                        setInlineAddDueDate(null);
                                                        setInlineAddStartDate(null);
                                                    }}
                                                >
                                                    {dayTasks.map(task => {
                                                        const statusColor = task.status?.color || "#a1a1aa";
                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className={cn(
                                                                    "px-2 py-1.5 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center justify-between gap-2 truncate",
                                                                    "hover:opacity-80 border shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-zinc-700"
                                                                )}
                                                                style={{
                                                                    backgroundColor: \`\${statusColor}15\`,
                                                                    borderColor: \`\${statusColor}30\`,
                                                                    borderLeft: \`3px solid \${statusColor}\`
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onTaskSelect ? onTaskSelect(task.id) : setSelectedDetailTaskId(task.id);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: task.status?.color || "#a1a1aa" }} />
                                                                    {(() => {
                                                                        const typeId = task.taskTypeId || task.taskType?.id || task.taskType;
                                                                        const tt = availableTaskTypes?.find((t: any) => t.id === typeId || t.name === typeId);
                                                                        return <TaskTypeIcon type={tt || typeId} className="h-3.5 w-3.5 shrink-0" />;
                                                                    })()}
                                                                    <span className="truncate">{task.title || task.name}</span>
                                                                </div>
                                                                {task.dueDate && (
                                                                    <span className="text-[9px] opacity-60 flex items-center shrink-0">
                                                                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                                                                        {format(new Date(task.dueDate), 'h:mma').toLowerCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* All Day Inline Task Creation */}
                                                    {isInlineAllDay && renderInlineCreateForm(false, i, calendarDays.length)}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>`;

content = content.replace(oldHeadersChunk, newHeadersChunk);

fs.writeFileSync(file, content);
console.log('Update Complete');
