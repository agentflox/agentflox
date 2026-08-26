"use client";
import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const AdminDashboardView = dynamic(
  () => import("@/features/admin/components/AdminDashboardView"),
  {
    ssr: false,
    loading: () => <DashboardLoadingState message="Loading admin..." />
  }
);

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
