const fs = require('fs');
const file = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/CalendarView.tsx';
let txt = fs.readFileSync(file, 'utf8');

const startIdx = txt.indexOf(') : (\r\n                                                                                                        <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-400" />');
const startIdx2 = txt.indexOf(') : (\n                                                                                                        <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-400" />');
const actualStart = startIdx > -1 ? startIdx : startIdx2;

const endIdx = txt.indexOf(') : (\r\n                        <>\r\n                            {/* Weekday Headers */}');
const endIdx2 = txt.indexOf(') : (\n                        <>\n                            {/* Weekday Headers */}');
const actualEnd = endIdx > -1 ? endIdx : endIdx2;

if (actualStart > -1 && actualEnd > -1) {
    txt = txt.slice(0, actualStart) + '\n                        </div>\n                    ' + txt.slice(actualEnd);
    fs.writeFileSync(file, txt);
    console.log('Replaced by string match!');
} else {
    console.log('Could not find start or end index', actualStart, actualEnd);
}
