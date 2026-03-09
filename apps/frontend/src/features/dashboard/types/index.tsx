import { ReactNode } from "react";

export interface DashboardContentSection {
  id: string;
  title: string;
  description: string;
  viewAllHref?: string;
  viewAllText?: string;
  items: any[];
  isLoading?: boolean;
  renderItem: (item: any) => ReactNode;
  skeletonCount?: number;
  emptyState?: ReactNode;
  headerAction?: ReactNode;
}
