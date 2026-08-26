"use client";

import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { BarChart3, CreditCard, Shield, Users } from "lucide-react";
import AdminOverviewPanel from "@/features/admin/components/panels/AdminOverviewPanel";
import AdminUsersPanel from "@/features/admin/components/panels/AdminUsersPanel";
import AdminBillingPanel from "@/features/admin/components/panels/AdminBillingPanel";
import AdminSupportPanel from "@/features/admin/components/panels/AdminSupportPanel";

export default function AdminDashboardView() {
  const [tab, setTab] = useState<"overview" | "users" | "billing" | "support">("overview");

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: BarChart3 },
      { id: "users" as const, label: "Users", icon: Users },
      { id: "billing" as const, label: "Billing", icon: CreditCard },
      { id: "support" as const, label: "Support & logs", icon: Shield },
    ],
    []
  );

  const overview = trpc.admin.overview.useQuery({ days: 30 }, { staleTime: 15_000 });

  return (
    <Shell noPadding>
      <div className="flex flex-col min-h-full relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 inset-x-0 h-[300px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

        {/* Enterprise Docked Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs px-6 pt-6 pb-4 transition-all">
          <PageHeader
            title="Admin command center"
            description="Monitor platform health, manage users and subscriptions, and review support + audit logs."
            className="border-none shadow-none bg-transparent"
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-6 pt-6 pb-8 space-y-8">
          <Card className="p-0 overflow-hidden border border-white/20 dark:border-white/10 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-xl transition-all duration-300">
            <div className="p-4 sm:p-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-xl h-auto border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm shadow-inner">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="relative cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all duration-300 py-2.5 px-5 group overflow-hidden"
                  >
                    {/* Active tab glow effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 opacity-0 group-data-[state=active]:opacity-100 transition-opacity" />
                    <div className="relative flex items-center z-10 font-medium">
                      <t.icon className="h-4 w-4 mr-2 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:text-indigo-600 dark:group-data-[state=active]:text-indigo-400" />
                      {t.label}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="p-4 sm:p-6">
            <Tabs value={tab}>
              <TabsContent value="overview" className="m-0">
                <AdminOverviewPanel data={overview.data} isLoading={overview.isLoading} />
              </TabsContent>
              <TabsContent value="users" className="m-0">
                <AdminUsersPanel />
              </TabsContent>
              <TabsContent value="billing" className="m-0">
                <AdminBillingPanel />
              </TabsContent>
              <TabsContent value="support" className="m-0">
                <AdminSupportPanel />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
        </div>
      </div>
    </Shell>
  );
}

