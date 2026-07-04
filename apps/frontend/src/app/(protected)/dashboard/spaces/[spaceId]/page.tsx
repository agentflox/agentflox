"use client";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const SpaceDashboardView = dynamic(
  () => import("@/features/dashboard/views/space/SpaceDashboardView"),
  { loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div> }
);

export default function SpaceDetailPage() {
    const params = useParams();
    const spaceId = params?.spaceId as string;
    return <SpaceDashboardView spaceId={spaceId} />;
}
