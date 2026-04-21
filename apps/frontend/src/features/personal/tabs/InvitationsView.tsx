"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, Mail, Loader2, RefreshCw, Send, Inbox, MailOpen, Sparkles, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { permissionsService } from "@/services/permissions.service";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface InvitationItem {
  id: string;
  token?: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  title: string;
  description: string;
  sender: { name: string; email: string; avatar?: string };
  recipient?: { name?: string; email?: string; avatar?: string };
  createdAt: string | Date;
}

function InvitationsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="relative overflow-hidden border border-slate-200/60 p-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-200 to-slate-300" />
          <div className="flex items-start gap-5">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-56 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-[92%] rounded-md" />
              <Skeleton className="h-4 w-[80%] rounded-md" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-3.5 w-40 rounded-md" />
                <Skeleton className="h-3.5 w-44 rounded-md" />
              </div>
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-40 rounded-md" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function InvitationsView() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<InvitationItem[]>([]);
  const [sent, setSent] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [pendingResp, sentResp] = await Promise.all([
        permissionsService.invitations.listPending(session),
        permissionsService.invitations.listSent(session),
      ]);
      if (pendingResp.ok) setReceived(await pendingResp.json());
      if (sentResp.ok) setSent(await sentResp.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [session]);

  const accept = async (inv: InvitationItem) => {
    if (!inv.token) return;
    try {
      setProcessingId(inv.id);
      await permissionsService.invitations.accept({ token: inv.token }, session);
      await fetchInvitations();
      toast({ title: "Invitation accepted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Accept failed", description: e?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const decline = async (inv: InvitationItem) => {
    if (!inv.token) return;
    try {
      setProcessingId(inv.id);
      await permissionsService.invitations.decline({ token: inv.token }, session);
      await fetchInvitations();
      toast({ title: "Invitation declined" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Decline failed", description: e?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "accepted": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled": return "bg-slate-50 text-slate-600 border-slate-200";
      case "expired": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const EmptyState = ({ mode }: { mode: "received" | "sent" }) => (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-blue-50 to-indigo-100 blur-2xl opacity-60 rounded-full scale-150" />
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-sm border border-slate-200/50">
          {mode === "received" ? (
            <Inbox className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          ) : (
            <Send className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          )}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {mode === "received" ? "No invitations yet" : "No sent invitations"}
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-sm leading-relaxed">
        {mode === "received"
          ? "When someone sends you an invitation, it will appear here. You'll be able to review and respond to it."
          : "Invitations you send to others will be listed here. You can track their status and see when they've been accepted."}
      </p>
    </div>
  );

  const renderItems = (items: InvitationItem[], mode: "received" | "sent") => {
    if (isLoading) {
      return <InvitationsLoadingSkeleton />;
    }

    if (!items.length) return <EmptyState mode={mode} />;

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <Card
            key={item.id}
            className="group relative overflow-hidden border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
            style={{
              animation: `slideIn 0.4s ease-out ${index * 0.1}s backwards`
            }}
          >
            {/* Subtle gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-violet-50/0 to-blue-50/0 group-hover:from-slate-50/50 group-hover:via-violet-50/30 group-hover:to-blue-50/40 transition-all duration-500 pointer-events-none" />

            {/* Status indicator bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${item.status === "pending" ? "bg-gradient-to-b from-amber-400 to-amber-600" :
              item.status === "accepted" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" :
                item.status === "cancelled" ? "bg-gradient-to-b from-slate-300 to-slate-500" :
                  "bg-gradient-to-b from-rose-400 to-rose-600"
              }`} />

            <div className="relative flex items-start p-6 gap-5">
              {/* Avatar with glow effect */}
              <div className="relative flex-shrink-0 mt-1">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-200 to-blue-200 blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full scale-110" />
                <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-slate-200/50 relative">
                  <AvatarImage
                    src={mode === "received" ? item.sender.avatar : item.recipient?.avatar}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-violet-100 to-blue-100 text-violet-700 font-semibold text-lg">
                    {(mode === "received" ? item.sender.name : item.recipient?.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h4 className="font-semibold text-slate-900 text-lg tracking-tight truncate">
                        {item.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(item.status)} border font-medium text-xs px-2.5 py-0.5 flex-shrink-0 capitalize`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-2.5">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                        <span className="font-medium">
                          {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                        <span className="font-medium">
                          {mode === "received" ? item.sender.email : item.recipient?.email || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {mode === "received" && item.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all duration-200 font-medium shadow-sm"
                      disabled={!!processingId}
                      onClick={() => decline(item)}
                    >
                      <X className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                      disabled={!!processingId}
                      onClick={() => accept(item)}
                    >
                      {processingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" strokeWidth={2.5} />
                      ) : (
                        <Check className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                      )}
                      Accept Invitation
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

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
        
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
          Invitations
        </h1>
        <p className="text-slate-600 text-sm">
          Manage your incoming and outgoing invitations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "received" | "sent")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 backdrop-blur-sm">
          <TabsTrigger
            value="received"
            className="gap-2 cursor-pointer rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 transition-all duration-200 font-medium data-[state=active]:text-slate-900 text-slate-600"
          >
            <MailOpen className="h-4 w-4" strokeWidth={2} />
            Received
          </TabsTrigger>
          <TabsTrigger
            value="sent"
            className="gap-2 cursor-pointer rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 transition-all duration-200 font-medium data-[state=active]:text-slate-900 text-slate-600"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {renderItems(received, "received")}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {renderItems(sent, "sent")}
        </TabsContent>
      </Tabs>
    </div>
  );
}