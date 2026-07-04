import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

export default function AgentsLoading() {
  return <DashboardLoadingState message="Loading agents..." />;
}
