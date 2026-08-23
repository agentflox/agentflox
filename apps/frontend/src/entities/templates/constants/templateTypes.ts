/**
 * Template entity-type metadata for the frontend.
 *
 * Maps each TemplateEntityType (matching the Prisma enum values) to display
 * properties used across the Template Center, Save Modal, and cards.
 */

export interface TemplateEntityTypeMeta {
  /** Prisma/DB enum value */
  value: string;
  /** Human-readable label */
  label: string;
  /** Tailwind icon color class */
  iconColor: string;
  /** Tailwind background color for icon container */
  iconBg: string;
}

export const TEMPLATE_ENTITY_TYPES: TemplateEntityTypeMeta[] = [
  { value: "SPACE",     label: "Space",     iconColor: "text-blue-500",   iconBg: "bg-blue-50"    },
  { value: "FOLDER",    label: "Folder",    iconColor: "text-pink-500",   iconBg: "bg-pink-50"    },
  { value: "LIST",      label: "List",      iconColor: "text-amber-500",  iconBg: "bg-amber-50"   },
  { value: "TASK",      label: "Task",      iconColor: "text-purple-500", iconBg: "bg-purple-50"  },
  { value: "DOC",       label: "Doc",       iconColor: "text-teal-500",   iconBg: "bg-teal-50"    },
  { value: "VIEW",      label: "View",      iconColor: "text-zinc-500",   iconBg: "bg-zinc-100"   },
  { value: "AGENT",     label: "Agent",     iconColor: "text-indigo-500", iconBg: "bg-indigo-50"  },
  { value: "WORKFORCE", label: "Workforce", iconColor: "text-violet-500", iconBg: "bg-violet-50"  },
  { value: "PROPOSAL",  label: "Proposal",  iconColor: "text-orange-500", iconBg: "bg-orange-50"  },
];

/** Quick lookup by value */
export const TEMPLATE_ENTITY_TYPE_MAP = Object.fromEntries(
  TEMPLATE_ENTITY_TYPES.map((t) => [t.value, t])
) as Record<string, TemplateEntityTypeMeta>;

// ─── Template complexity levels ───────────────────────────────────────────────

export interface TemplateComplexityMeta {
  value: string;
  label: string;
  badgeBg: string;
  badgeText: string;
}

export const TEMPLATE_COMPLEXITY_LEVELS: TemplateComplexityMeta[] = [
  { value: "BEGINNER",     label: "Beginner",      badgeBg: "bg-emerald-100", badgeText: "text-emerald-700" },
  { value: "INTERMEDIATE", label: "Intermediate",   badgeBg: "bg-amber-100",   badgeText: "text-amber-700"   },
  { value: "ADVANCED",     label: "Advanced",       badgeBg: "bg-rose-100",    badgeText: "text-rose-700"    },
];

// ─── Share visibility options ─────────────────────────────────────────────────
// Persisted as Prisma `Visibility` (+ `share_user_ids` / `share_team_ids` for "custom").

export const TEMPLATE_SHARE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "members",  label: "Members and admins" },
  { value: "admins",   label: "Admins only" },
  { value: "me",       label: "Only me" },
  { value: "custom",   label: "Custom" },
] as const;

export type TemplateShareValue = (typeof TEMPLATE_SHARE_OPTIONS)[number]["value"];

// ─── Template categories ──────────────────────────────────────────────────────

export const TEMPLATE_CATEGORIES = [
  "Community",
  "Creative & Design",
  "Engineering & Product",
  "Finance & Accounting",
  "HR & Recruiting",
  "IT",
  "Marketing",
  "Operations",
  "Other",
  "PMO - Project Management",
  "Personal Use",
  "Professional Services",
  "Sales & CRM",
  "Support",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
