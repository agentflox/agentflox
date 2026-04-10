const fs = require('fs');
const listFile = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/ListView.tsx';
const calFile = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/CalendarView.tsx';

const listData = fs.readFileSync(listFile, 'utf8');
const calData = fs.readFileSync(calFile, 'utf8');

const listLines = listData.split('\n');
// get lines 3134 to 3773 (0-indexed: 3133 to 3772)
const renderFilterContentStr = listLines.slice(3133, 3773).join('\n');

const brokenCode = "    const renderFilterContent = (props?: { onClose?: () => void };";
if (calData.includes(brokenCode)) {
    const fixedCalData = calData.replace(brokenCode, renderFilterContentStr);
    fs.writeFileSync(calFile, fixedCalData);
    console.log("Fixed CalendarView.tsx!");
} else {
    console.log("Could not find broken string in CalendarView.tsx");
}
