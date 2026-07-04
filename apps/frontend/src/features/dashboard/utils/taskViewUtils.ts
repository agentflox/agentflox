import {
  Type,
  AlignLeft,
  Hash,
  LayoutList,
  Calendar,
  CheckSquare,
  Globe,
  Mail,
  Phone,
  Tag,
  DollarSign,
  FunctionSquare,
  Paperclip,
  Link2,
  Users,
  TrendingUp,
  SlidersHorizontal,
  FileText,
  MessageSquare,
  Heart,
  MapPin,
  Star,
  PenTool,
  MousePointer,
  ListChecks,
  Target,
} from "lucide-react";

const CUSTOM_FIELD_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  TEXT: Type,
  TEXT_AREA: AlignLeft,
  LONG_TEXT: AlignLeft,
  NUMBER: Hash,
  DROPDOWN: LayoutList,
  DATE: Calendar,
  CHECKBOX: CheckSquare,
  URL: Globe,
  EMAIL: Mail,
  PHONE: Phone,
  LABELS: Tag,
  MONEY: DollarSign,
  FORMULA: FunctionSquare,
  FILES: Paperclip,
  RELATIONSHIP: Link2,
  PEOPLE: Users,
  PROGRESS_AUTO: TrendingUp,
  PROGRESS_MANUAL: SlidersHorizontal,
  SUMMARY: FileText,
  PROGRESS_UPDATES: MessageSquare,
  TRANSLATION: Globe,
  SENTIMENT: Heart,
  LOCATION: MapPin,
  RATING: Star,
  VOTING: Users,
  SIGNATURE: PenTool,
  BUTTON: MousePointer,
  ACTION_ITEMS: ListChecks,
  CUSTOM_TEXT: Type,
  CUSTOM_DROPDOWN: LayoutList,
  CATEGORIZE: Target,
  TSHIRT_SIZE: Users,
};

export function getCustomFieldIcon(fieldType: string) {
  return CUSTOM_FIELD_ICON_MAP[fieldType] || Type;
}

export function collectUsedCustomFieldIds(tasks: { customFieldValues?: { customFieldId: string }[] }[]) {
  const fieldIds = new Set<string>();
  tasks.forEach((task) => {
    task.customFieldValues?.forEach((cfv) => {
      fieldIds.add(cfv.customFieldId);
    });
  });
  return fieldIds;
}
