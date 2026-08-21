const fs = require("fs");
const path = "apps/frontend/src/features/automations/components/builders/ActionConfigFields.tsx";
let s = fs.readFileSync(path, "utf8");

// Unescape corrupted quotes
s = s.replace(/\\"/g, '"');

// Fix broken JSX tag spacing introduced by corruption
s = s.replace(/<\s+([A-Za-z/])/g, "<$1");
s = s.replace(/<\/\s+([A-Za-z])/g, "</$1");
s = s.replace(/([A-Za-z0-9"])\s+>/g, "$1>");
s = s.replace(/\/>\s*$/gm, (m) => m); // leave alone
s = s.replace(/\s+\/>/g, " />");

// Fix serializeAction extra brace: `return { type, input: { ...config } };\n  }`
s = s.replace(
  /return \{ type, input: \{ \.\.\.config \} \};\r?\n  \}/,
  "return { type, input: { ...config } };\n}",
);

// Ensure cn + Button imports exist
if (!s.includes("@/lib/utils")) {
  s = s.replace(
    'import { Checkbox } from "@/components/ui/checkbox";',
    'import { Checkbox } from "@/components/ui/checkbox";\nimport { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";',
  );
} else if (!s.includes('from "@/components/ui/button"')) {
  s = s.replace(
    'import { cn } from "@/lib/utils";',
    'import { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";',
  );
}

fs.writeFileSync(path, s);
console.log("fixed. remaining backslash-quotes", (s.match(/\\"/g) || []).length);
console.log("has Button", s.includes('@/components/ui/button'));
console.log("has cn", s.includes("@/lib/utils"));
