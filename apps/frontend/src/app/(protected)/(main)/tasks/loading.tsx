import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

export default function TasksLoading() {
  return <DashboardLoadingState message="Loading tasks..." />;
}
