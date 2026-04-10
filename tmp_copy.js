const fs = require('fs');

const listFile = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/ListView.tsx';
const calFile = 'c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/generic/CalendarView.tsx';

const listData = fs.readFileSync(listFile, 'utf8');
let calData = fs.readFileSync(calFile, 'utf8');

// 1. Extract renderFilterContent
const renderStartToken = '    const renderFilterContent = (props?: { onClose?: () => void }) => {';
let renderStart = listData.indexOf(renderStartToken);
const renderSubstr = listData.substring(renderStart);
let braces = 0;
let renderEnd = -1;
for (let i = 0; i < renderSubstr.length; i++) {
    if (renderSubstr[i] === '{') braces++;
    if (renderSubstr[i] === '}') {
        braces--;
        if (braces === 0) {
            renderEnd = renderStart + i + 1; // includes the '}'
            break;
        }
    }
}
const renderFilterContentStr = listData.substring(renderStart, renderEnd) + ';';

// 2. Extract State Functions: addFilterCondition, addFilterGroup, removeFilterItem, updateFilterCondition, updateFilterGroupOperator
// They are all grouped together from addFilterCondition down to end of updateFilterGroupOperator
const stateFnsStartToken = '    const addFilterCondition = (groupId: string = "root") => {';
const stateFnsStart = listData.indexOf(stateFnsStartToken);

const updateOpStart = listData.indexOf('    const updateFilterGroupOperator = (id: string, operator: FilterOperator) => {', stateFnsStart);
const updateOpSubstr = listData.substring(updateOpStart);
braces = 0;
let updateOpEnd = -1;
for (let i = 0; i < updateOpSubstr.length; i++) {
    if (updateOpSubstr[i] === '{') braces++;
    if (updateOpSubstr[i] === '}') {
        braces--;
        if (braces === 0) {
            updateOpEnd = updateOpStart + i + 1;
            break;
        }
    }
}
const stateFnsStr = listData.substring(stateFnsStart, updateOpEnd) + ';';

// 3. Extract saved filter functions
const saveStartToken = '    const saveNewFilter = useCallback(async () => {';
const saveStart = listData.indexOf(saveStartToken);
const applyStart = listData.indexOf('    const applySavedFilter = (config: FilterGroup) => {', saveStart);
const applySubstr = listData.substring(applyStart);
braces = 0;
let saveEnd = -1;
for (let i = 0; i < applySubstr.length; i++) {
    if (applySubstr[i] === '{') braces++;
    if (applySubstr[i] === '}') {
        braces--;
        if (braces === 0) {
            saveEnd = applyStart + i + 1;
            break;
        }
    }
}
const saveFnsStr = listData.substring(saveStart, saveEnd) + ';';

// Prepare variables 
const newVars = `
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('agentflox_saved_filters');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [filterSearch, setFilterSearch] = useState("");
    const [assigneesSearch, setAssigneesSearch] = useState("");

    const allAvailableStatuses = useMemo(() => {
        if (currentList && currentList.statuses) return currentList.statuses;
        const set = new Map();
        tasks.forEach(t => t.status && set.set(t.status.id, t.status));
        return Array.from(set.values());
    }, [currentList, tasks]);

    const allAvailableTags = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => t.tags?.forEach(tag => set.add(tag)));
        return Array.from(set);
    }, [tasks]);

    const getPriorityStyles = (priority: string | null) => {
        switch (priority) {
            case "URGENT": return { icon: "text-red-500", text: "text-red-600", bg: "bg-red-50" };
            case "HIGH": return { icon: "text-orange-500", text: "text-orange-600", bg: "bg-orange-50" };
            case "NORMAL": return { icon: "text-blue-500", text: "text-blue-600", bg: "bg-blue-50" };
            case "LOW": return { icon: "text-zinc-400", text: "text-zinc-600", bg: "bg-zinc-100" };
            default: return { icon: "text-zinc-300", text: "text-zinc-500", bg: "bg-zinc-50" };
        }
    };
`;

// Insert variables, states, and renderFilterContent into CalendarView
// First replace the old renderFilterContent () => ( ... );
const calRenderStart = calData.indexOf('    const renderFilterContent = () => (');
if (calRenderStart === -1) {
    console.log("Could not find renderFilterContent in CalendarView");
    process.exit(1);
}
const calRenderSubstr = calData.substring(calRenderStart);
let calBraces = 0;
let calRenderEnd = -1;
// It uses () instead of {} for its arrow function body! But wait, ')' inside it!
// Let me just regex replace the old renderFilterContent
let regex = /    const renderFilterContent \= \(\) \=\> \([\s\S]*?    \);/m;
let newCalData = calData.replace(regex, newVars + '\n\n' + stateFnsStr + '\n\n' + saveFnsStr + '\n\n' + renderFilterContentStr);

// Now handle imports
if (!newCalData.includes('SingleDateCalendar')) {
    newCalData = newCalData.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { SingleDateCalendar } from "@/components/ui/date-picker";\nimport { DestinationPicker } from "@/entities/task/components/DestinationPicker";\nimport { Info, Box, Trash2 } from "lucide-react";\nimport type { FilterCondition, FilterOperator } from "./listViewTypes";\nimport { parseEncodedTag } from "@/entities/task/utils/tags";');
}

// Fix 'initialConfig' not existing in saveNewFilter/deleteSavedFilter by just replacing initialConfig checks with false
newCalData = newCalData.replace(/if \(viewId && initialConfig \!= null\) \{[\s\S]*?\} else if \(typeof window \!\=\= "undefined"\) \{/g, 'if (typeof window !== "undefined") {');

fs.writeFileSync(calFile, newCalData);
console.log("Successfully patched CalendarView.tsx!");
