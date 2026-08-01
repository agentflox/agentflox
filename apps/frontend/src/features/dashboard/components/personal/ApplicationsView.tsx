"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, Clock, Loader2, Inbox, Send,
  DollarSign, Calendar, ChevronDown, ChevronUp,
  Briefcase, FileText, Sparkles, ExternalLink, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { ApplicationDetailModal } from "@/features/marketplace/components/ApplicationDetailModal";

type ProvisioningStatus = "pending" | "proposal_requested" | "proposal_submitted" | "revision_requested" | "accepted" | "rejected" | "failed" | "provisioning" | "completed";

interface ApplicationItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: string;
  applicant: { id: string; name: string; avatarUrl?: string; };
  pitch: string;
  targetRate?: string | null;
  estimatedDuration?: string | null;
  provisioningStatus: ProvisioningStatus;
  answers?: any;
  listing?: any;
  createdAt: string | Date;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function ProvisioningBadge({ status }: { status: ProvisioningStatus }) {
  const map: Record<ProvisioningStatus, { label: string; className: string; icon?: any }> = {
    pending: { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    proposal_requested: { label: "Revision Requested", className: "bg-orange-50 text-orange-700 border-orange-200", icon: FileText },
    proposal_submitted: { label: "Proposal Submitted", className: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: CheckCircle2 },
    revision_requested: { label: "Revision Requested", className: "bg-orange-50 text-orange-700 border-orange-200", icon: FileText },
    accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Declined", className: "bg-rose-50 text-rose-700 border-rose-200" },
    provisioning: { label: "Processing…", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Loader2 },
    completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    failed: { label: "Failed", className: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const { label, className, icon: Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border", className)}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {label}
    </span>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────
function ApplicationCard({
  app,
  mode,
  isProcessing,
  index,
  onOpenDetail,
}: {
  app: ApplicationItem;
  mode: "inbox" | "sent";
  isProcessing?: string | null;
  index: number;
  onOpenDetail: (app: ApplicationItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = app.provisioningStatus === "pending";
  const isThisProcessing = isProcessing === app.id;

  const getStatusBarColor = (status: ProvisioningStatus) => {
    switch (status) {
      case "pending": return "bg-gradient-to-b from-amber-400 to-amber-600";
      case "proposal_requested":
      case "revision_requested": return "bg-gradient-to-b from-orange-400 to-orange-600";
      case "proposal_submitted": return "bg-gradient-to-b from-indigo-400 to-indigo-600";
      case "accepted":
      case "completed": return "bg-gradient-to-b from-emerald-400 to-emerald-600";
      case "rejected":
      case "failed": return "bg-gradient-to-b from-rose-400 to-rose-600";
      case "provisioning": return "bg-gradient-to-b from-blue-400 to-blue-600";
      default: return "bg-gradient-to-b from-slate-300 to-slate-500";
    }
  };

  return (
    <div
      className="group relative rounded-xl border border-slate-200/60 bg-white hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 overflow-hidden"
      style={{
        animation: `slideIn 0.4s ease-out ${index * 0.08}s backwards`
      }}
    >
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-indigo-50/0 to-blue-50/0 group-hover:from-slate-50/50 group-hover:via-indigo-50/30 group-hover:to-blue-50/40 transition-all duration-500 pointer-events-none" />

      {/* Status indicator bar */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-blue-200 blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full scale-110" />
            <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-1 ring-slate-200/50 relative">
              <AvatarImage src={app.applicant.avatarUrl} className="object-cover" />
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700">
                {app.applicant.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-900 text-base">{app.applicant.name}</span>
                  <Badge
                    variant="outline"
                    className="capitalize text-xs bg-slate-50 text-slate-700 border-slate-200 font-medium"
                  >
                    <Briefcase className="h-3 w-3 mr-1" strokeWidth={2} />
                    {app.listingType}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 flex items-start gap-1.5">
                  <span className="text-slate-500 flex-shrink-0">Re:</span>
                  <span 
                    className="relative z-10 font-medium text-slate-900 truncate hover:underline hover:text-indigo-600 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/marketplace/listing/${app.listingId}`, '_blank');
                    }}
                  >
                    {app.listingTitle}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  {format(new Date(app.createdAt), "MMM d, yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                  onClick={() => onOpenDetail(app)}
                >
                  View Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ mode }: { mode: "inbox" | "sent" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-50 to-violet-100 blur-2xl opacity-60 rounded-full scale-150" />
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-sm border border-slate-200/50">
          {mode === "inbox" ? (
            <Inbox className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          ) : (
            <Send className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          )}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {mode === "inbox" ? "No applications yet" : "No applications submitted"}
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-sm leading-relaxed mb-6">
        {mode === "inbox"
          ? "When someone applies to your listings, their applications will appear here for review."
          : "You haven't applied to any opportunities yet. Browse the marketplace to find projects that match your expertise."}
      </p>

      {mode === "sent" && (
        <Button
          variant="primary"
          size="sm"
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          onClick={() => window.location.href = '/marketplace'}
        >
          <TrendingUp className="h-4 w-4 mr-2" strokeWidth={2} />
          Browse Marketplace
        </Button>
      )}
    </div>
  );
}

function ApplicationsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200/60 bg-white p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36 rounded-md" />
                  <Skeleton className="h-4 w-56 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-[90%] rounded-md" />
                <Skeleton className="h-4 w-[78%] rounded-md" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-10 w-40 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function ApplicationsView() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId] = useState<string | null>(null);
  const inboxQuery = trpc.marketplace.myReceivedApplications.useQuery();
  const sentQuery = trpc.marketplace.myApplications.useQuery();

  const handleOpenDetail = (app: ApplicationItem) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const items: ApplicationItem[] = (inboxQuery.data ?? []).map((app: any) => ({
    id: app.id,
    listingId: app.listingId,
    listingTitle: app.listing?.title ?? "Untitled listing",
    listingType: String(app.listing?.type ?? "listing").toLowerCase(),
    applicant: {
      id: app.applicant?.id,
      name: app.applicant?.name ?? "Unknown",
      avatarUrl: app.applicant?.image ?? undefined,
    },
    pitch: app.pitch ?? "",
    targetRate: app.targetRate,
    estimatedDuration: app.estimatedDuration,
    provisioningStatus: app.provisioningStatus as ProvisioningStatus,
    answers: app.answers,
    listing: app.listing,
    createdAt: app.createdAt,
  }));

  const sentItems: ApplicationItem[] = (sentQuery.data ?? []).map((app: any) => ({
    id: app.id,
    listingId: app.listingId,
    listingTitle: app.listing?.title ?? "Untitled listing",
    listingType: String(app.listing?.type ?? "listing").toLowerCase(),
    applicant: { id: app.applicantId, name: "You" },
    pitch: app.pitch ?? "",
    targetRate: app.targetRate,
    estimatedDuration: app.estimatedDuration,
    provisioningStatus: app.provisioningStatus as ProvisioningStatus,
    answers: app.answers,
    listing: app.listing,
    createdAt: app.createdAt,
  }));

  const pendingCount = items.filter(a => a.provisioningStatus === "pending").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
          Applications
        </h1>
        <p className="text-slate-600 text-sm">
          Review applications to your listings and track your submissions
        </p>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as "inbox" | "sent")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 backdrop-blur-sm">
          <TabsTrigger
            value="inbox"
            className="gap-2 cursor-pointer rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 transition-all duration-200 font-medium data-[state=active]:text-slate-900 text-slate-600 relative"
          >
            <Inbox className="h-4 w-4" strokeWidth={2} />
            Inbox
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center shadow-sm">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sent"
            className="gap-2 cursor-pointer rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 transition-all duration-200 font-medium data-[state=active]:text-slate-900 text-slate-600"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            My Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-4">
          {inboxQuery.isLoading ? (
            <ApplicationsLoadingSkeleton />
          ) : items.length === 0 ? (
            <EmptyState mode="inbox" />
          ) : (
            items.map((app, index) => (
              <ApplicationCard
                key={app.id}
                app={app}
                mode="inbox"
                isProcessing={processingId}
                index={index}
                onOpenDetail={handleOpenDetail}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6 space-y-4">
          {sentQuery.isLoading ? (
            <ApplicationsLoadingSkeleton />
          ) : sentItems.length === 0 ? (
            <EmptyState mode="sent" />
          ) : (
            sentItems.map((app, index) => (
              <ApplicationCard
                key={app.id}
                app={app}
                mode="sent"
                index={index}
                onOpenDetail={handleOpenDetail}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ApplicationDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        application={selectedApp}
      />
    </div>
  );
}