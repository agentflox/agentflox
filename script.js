const fs = require('fs');
const path = require('path');

const viewsDir = "C:\\Users\\datng\\agentflox\\apps\\frontend\\src\\features\\dashboard\\views\\generic";

const viewFiles = [
    "ListView.tsx", "CalendarView.tsx", "EmbedView.tsx", "WorkloadView.tsx",
    "BoardView.tsx", "DashboardView.tsx", "GanttView.tsx", "MapView.tsx",
    "MindMapView.tsx", "PeopleView .tsx", "TimelineView.tsx"
];

function processFile(file) {
    const filePath = path.join(viewsDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const panelRegex = /\{\s*([a-zA-Z0-9_!&\s]+)\s*&&\s*\(\s*(?:<>\s*)?<div\s+className="([^"]*\babsolute\b[^"]*)"/g;
    
    let match;
    const onCloseMap = {
        "customizePanelOpen && !layoutOptionsOpen": "() => setCustomizePanelOpen(false)",
        "customizePanelOpen && !editSourcePanelOpen": "() => setCustomizePanelOpen(false)",
        "layoutOptionsOpen": "() => setLayoutOptionsOpen(false)",
        "fieldsPanelOpen && !createFieldModalOpen": "() => setFieldsPanelOpen(false)",
        "fieldsPanelOpen": "() => setFieldsPanelOpen(false)",
        "createFieldModalOpen": "() => { setCreateFieldModalOpen(false); setCreateFieldSearch(''); }",
        "assigneesPanelOpen": "() => setAssigneesPanelOpen(false)",
        "editSourcePanelOpen": "() => setEditSourcePanelOpen(false)",
        "customizePanelOpen": "() => setCustomizePanelOpen(false)"
    };
    
    const replacements = [];
    
    while ((match = panelRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const condition = match[1].trim();
        const className = match[2];
        const onClose = onCloseMap[condition];
        
        if (!onClose) {
            console.log(`Unknown condition in ${file}: ${condition}`);
            continue;
        }
        
        const replacement = `<SidePanel open={${condition}} onClose={${onClose}} className="${className}"`;
        replacements.push({ start: match.index, end: match.index + fullMatch.length, replacement });
    }
    
    if (replacements.length === 0) return;
    
    for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i];
        content = content.substring(0, rep.start) + rep.replacement + content.substring(rep.end);
    }
    
    // Replace closing tags accurately
    content = content.replace(/<\/div>\s*<\/>\s*\)\s*\}/g, "</SidePanel>\n            }");
    content = content.replace(/<\/div>\s*\)\s*\}/g, "</SidePanel>\n            }");
    content = content.replace(/<\/div>\s*<\/>\s*\)/g, "</SidePanel>");
    content = content.replace(/<\/div>\s*\)/g, "</SidePanel>");
    
    // Cleanup duplicate braces
    content = content.replace(/<\/SidePanel>\n\s*\}/g, "</SidePanel>");
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Processed ${file}`);
}

viewFiles.forEach(processFile);
