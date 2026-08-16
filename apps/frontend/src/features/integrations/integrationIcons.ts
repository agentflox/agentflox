import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Calendar,
  Clock,
  Cloud,
  Code,
  Globe2,
  HardDrive,
  Link,
  Mail,
  MessageSquare,
  Users,
  Video,
} from 'lucide-react';

/** Icon map for integration cards — kept separate from constants to avoid pulling legacy catalog data. */
export const INTEGRATION_ICONS: Record<string, LucideIcon> = {
  figma: Link,
  github: Code,
  gmail: Mail,
  google_drive: HardDrive,
  codegen: Code,
  zoom: Video,
  microsoft_teams: Users,
  slack: MessageSquare,
  google_calendar: Calendar,
  discord: MessageSquare,
  microsoft_online: Cloud,
  youtube: Video,
  facebook: Globe2,
  openai: Bot,
  anthropic: Bot,
  http_webhook: Globe2,
  schedule: Clock,
};
