"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Clock, Loader2, Inbox, Send,
  DollarSign, Calendar, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ProvisioningStatus } from "../types/marketplace.types";

// ─── Local mock types ────────────────────────────────────────────────────────
interface ApplicationItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: string;
  applicant: { id: string; name: string; avatarUrl?: string; };
  pitch: string;
  targetRate?: string;
  estimatedDuration?: string;
  provisioningStatus: ProvisioningStatus;
  createdAt: string;
}

// ─── Mock data (replace with trpc query) ─────────────────────────────────────
const MOCK_RECEIVED: ApplicationItem[] = [
  {
    id: "app-1",
    listingId: "l-1",
    listingTitle: "AI-powered CRM Automation Pipeline",
    listingType: "project",
    applicant: { id: "u-2", name: "Sophia Carter", avatarUrl: "" },
    pitch: "I've built 3 end-to-end CRM automation pipelines with similar complexity. I can deliver this in 3 weeks with full test coverage and CI/CD setup.",
    targetRate: "$3,200 fixed",
    estimatedDuration: "3 weeks",
    provisioningStatus: "pending",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "app-2",
    listingId: "l-1",
    listingTitle: "AI-powered CRM Automation Pipeline",
    listingType: "project",
    applicant: { id: "u-3", name: "Marcus Holt", avatarUrl: "" },
    pitch: "Senior backend engineer with 5 years in automation. Familiar with n8n, Zapier, and direct API integrations. Happy to hop on a call to discuss scope.",
    targetRate: "$85/hr",
    estimatedDuration: "4–6 weeks",
    provisioningStatus: "pending",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const MOCK_SENT: ApplicationItem[] = [
  {
    id: "app-3",
    listingId: "l-5",
    listingTitle: "Build a React dashboard for IoT sensors",
    listingType: "task",
    applicant: { id: "u-1", name: "You", avatarUrl: "" },
    pitch: "I specialize in real-time data dashboards using React + WebSockets. Linked portfolio includes a live sensor UI built for a logistics firm.",
    targetRate: "$2,800 fixed",
    estimatedDuration: "2 weeks",
    provisioningStatus: "pending",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "app-4",
    listingId: "l-9",
    listingTitle: "Hire ML Engineer for NLP pipeline",
    listingType: "project",
    applicant: { id: "u-1", name: "You", avatarUrl: "" },
    pitch: "I've implemented BERT-based pipelines for entity recognition and classification. Worked on similar scopes at scale.",
    provisioningStatus: "completed",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function ProvisioningBadge({ status }: { status: ProvisioningStatus }) {
  const map: Record<ProvisioningStatus, { label: string; className: string }> = {
    pending:      { label: "Pending Review", className: "bg-amber-50 text-amber-600 border-amber-200" },
    provisioning: { label: "Processing…",   className: "bg-blue-50 text-blue-600 border-blue-200" },
    completed:    { label: "Accepted",       className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    failed:       { label: "Declined",       className: "bg-red-50 text-red-500 border-red-200" },
  };
  const { label, className } = map[status];
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border", className)}>
      {label}
    </span>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────
function ApplicationCard({
  app,
  mode,
  onAccept,
  onDecline,
  isProcessing,
}: {
  app: ApplicationItem;
  mode: "inbox" | "sent";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  isProcessing?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = app.provisioningStatus === "pending";
  const isThisProcessing = isProcessing === app.id;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={app.applicant.avatarUrl} />
          <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
            {app.applicant.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{app.applicant.name}</span>
            <Badge variant="outline" className="capitalize text-xs">{app.listingType}</Badge>
            <ProvisioningBadge status={app.provisioningStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Re: <span className="font-medium text-foreground">{app.listingTitle}</span>
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {format(new Date(app.createdAt), "MMM d")}
        </span>
      </div>

      {/* Pitch preview */}
      <div>
        <p className={cn("text-sm text-muted-foreground leading-relaxed", !expanded && "line-clamp-2")}>
          {app.pitch}
        </p>
        {app.pitch.length > 100 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-0.5"
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
          </button>
        )}
      </div>

      {/* Meta row */}
      {(app.targetRate || app.estimatedDuration) && (
        <div className="flex gap-4 text-xs text-muted-foreground border-t border-border pt-2 mt-1">
          {app.targetRate && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {app.targetRate}
            </span>
          )}
          {app.estimatedDuration && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {app.estimatedDuration}
            </span>
          )}
        </div>
      )}

      {/* Actions (inbox mode for poster) */}
      {mode === "inbox" && isPending && (
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDecline?.(app.id)}
            disabled={!!isProcessing}
          >
            {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept?.(app.id)}
            disabled={!!isProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            Accept & Grant Access
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function ApplicationsView() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [items, setItems] = useState(MOCK_RECEIVED);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    // Simulate async provisioning (replace with trpc.marketplace.acceptApplication.mutate)
    await new Promise(r => setTimeout(r, 1800));
    setItems(prev => prev.map(a => a.id === id ? { ...a, provisioningStatus: "completed" as ProvisioningStatus } : a));
    setProcessingId(null);
  };

  const handleDecline = async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 800));
    setItems(prev => prev.map(a => a.id === id ? { ...a, provisioningStatus: "failed" as ProvisioningStatus } : a));
    setProcessingId(null);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Applications</h3>
          <p className="text-sm text-muted-foreground">Manage incoming bids and track applications you've submitted.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as "inbox" | "sent")}>
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
            {items.filter(a => a.provisioningStatus === "pending").length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                {items.filter(a => a.provisioningStatus === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            My Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No applications received yet.</p>
            </div>
          ) : (
            items.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                mode="inbox"
                onAccept={handleAccept}
                onDecline={handleDecline}
                isProcessing={processingId}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {MOCK_SENT.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Send className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">You haven't applied to anything yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/marketplace'}>
                Browse Marketplace
              </Button>
            </div>
          ) : (
            MOCK_SENT.map(app => (
              <ApplicationCard key={app.id} app={app} mode="sent" />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
