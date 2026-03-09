"use client";
import { useParams } from "next/navigation";
import SpaceDashboardView from "@/features/dashboard/views/space/SpaceDashboardView";

export default function SpaceDetailPage() {
    const params = useParams();
    const spaceId = params?.spaceId as string;
    return <SpaceDashboardView spaceId={spaceId} />;
}
