"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, Mail, Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Send, Link2, Inbox, MailOpen, UserPlus, CalendarDays, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

type Scope = "received" | "sent";
type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
type ConnectionStatus = "PENDING" | "ACCEPTED" | "REJECTED";

function userPhoto(u: { image?: string | null; avatar?: string | null }) {
  return u.image || u.avatar || "";
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, { bg: string; text: string; border: string; icon?: any }> = {
    PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertCircle },
    ACCEPTED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
    REJECTED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: XCircle },
    WITHDRAWN: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
    EXPIRED: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: AlertCircle },
  };
  const style = styles[status];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} border font-medium text-xs px-2.5 py-0.5 capitalize flex items-center gap-1`}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {status.toLowerCase()}
    </Badge>
  );
}

function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const styles: Record<ConnectionStatus, { bg: string; text: string; border: string; icon?: any }> = {
    PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertCircle },
    ACCEPTED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
    REJECTED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: XCircle },
  };
  const style = styles[status];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} border font-medium text-xs px-2.5 py-0.5 capitalize flex items-center gap-1`}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {status.toLowerCase()}
    </Badge>
  );
}

function RequestsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="relative overflow-hidden border border-slate-200/60 p-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-200 to-slate-300" />
          <div className="flex items-start gap-5">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-52 rounded-md" />
                  <Skeleton className="h-4 w-[85%] rounded-md" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-[94%] rounded-md" />
              <Skeleton className="h-4 w-[72%] rounded-md" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-3.5 w-40 rounded-md" />
                <Skeleton className="h-3.5 w-36 rounded-md" />
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

export function RequestsView() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<Scope>("received");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const receivedQuery = trpc.request.list.useQuery({ scope: "received", page: 1, pageSize: 50 });
  const sentQuery = trpc.request.list.useQuery({ scope: "sent", page: 1, pageSize: 50 });
  const connReceivedQuery = trpc.connections.list.useQuery({ scope: "received", page: 1, pageSize: 50 });
  const connSentQuery = trpc.connections.list.useQuery({ scope: "sent", page: 1, pageSize: 50 });
  const acceptMutation = trpc.request.accept.useMutation();
  const rejectMutation = trpc.request.reject.useMutation();
  const respondConnMutation = trpc.connections.respond.useMutation();
  const cancelConnMutation = trpc.connections.cancel.useMutation();

  const isLoading =
    receivedQuery.isLoading ||
    sentQuery.isLoading ||
    connReceivedQuery.isLoading ||
    connSentQuery.isLoading;
  const received = receivedQuery.data?.items ?? [];
  const sent = sentQuery.data?.items ?? [];
  const connReceived = connReceivedQuery.data?.items ?? [];
  const connSent = connSentQuery.data?.items ?? [];

  const mergedReceived = useMemo(() => {
    const rows: { sortAt: number; kind: "request" | "connection"; item: (typeof received)[0] | (typeof connReceived)[0] }[] = [];
    for (const r of received) rows.push({ sortAt: new Date(r.createdAt).getTime(), kind: "request", item: r });
    for (const c of connReceived) rows.push({ sortAt: new Date(c.requestedAt).getTime(), kind: "connection", item: c });
    rows.sort((a, b) => b.sortAt - a.sortAt);
    return rows;
  }, [received, connReceived]);

  const mergedSent = useMemo(() => {
    const rows: { sortAt: number; kind: "request" | "connection"; item: (typeof sent)[0] | (typeof connSent)[0] }[] = [];
    for (const r of sent) rows.push({ sortAt: new Date(r.createdAt).getTime(), kind: "request", item: r });
    for (const c of connSent) rows.push({ sortAt: new Date(c.requestedAt).getTime(), kind: "connection", item: c });
    rows.sort((a, b) => b.sortAt - a.sortAt);
    return rows;
  }, [sent, connSent]);

  const refresh = async () => {
    await Promise.all([
      receivedQuery.refetch(),
      sentQuery.refetch(),
      connReceivedQuery.refetch(),
      connSentQuery.refetch(),
    ]);
  };

  const handleAccept = async (id: string) => {
    try {
      setProcessingId(`req:${id}`);
      await acceptMutation.mutateAsync({ id });
      toast({ title: "Request accepted" });
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to accept", description: error?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      setProcessingId(`req:${id}`);
      await rejectMutation.mutateAsync({ id });
      toast({ title: "Request declined" });
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to decline", description: error?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConnectionAccept = async (requesterId: string) => {
    try {
      setProcessingId(`conn:${requesterId}`);
      await respondConnMutation.mutateAsync({ requesterId, accept: true });
      toast({ title: "Connection accepted" });
      await utils.messages.listConversations.invalidate();
      await utils.connections.list.invalidate();
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to accept", description: error?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConnectionDecline = async (requesterId: string) => {
    try {
      setProcessingId(`conn:${requesterId}`);
      await respondConnMutation.mutateAsync({ requesterId, accept: false });
      toast({ title: "Connection request declined" });
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to decline", description: error?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConnectionCancel = async (id: string) => {
    try {
      setProcessingId(`cancel:${id}`);
      await cancelConnMutation.mutateAsync({ id });
      toast({ title: "Connection request withdrawn" });
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to cancel", description: error?.message });
    } finally {
      setProcessingId(null);
    }
  };

  const EmptyState = ({ scope }: { scope: Scope }) => (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-100 blur-2xl opacity-60 rounded-full scale-150" />
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-sm border border-slate-200/50">
          {scope === "received" ? (
            <Inbox className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          ) : (
            <Send className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          )}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {scope === "received" ? "No requests yet" : "No sent requests"}
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-sm leading-relaxed">
        {scope === "received"
          ? "When someone sends you a collaboration request or connection, it will appear here for your review."
          : "Requests and connections you send will be listed here. Track their status and manage your outgoing communications."}
      </p>
    </div>
  );

  const renderItems = (
    rows: { kind: "request" | "connection"; item: (typeof received)[0] | (typeof connReceived)[0] }[],
    scope: Scope,
  ) => {
    if (isLoading) {
      return <RequestsLoadingSkeleton />;
    }

    if (rows.length === 0) {
      return <EmptyState scope={scope} />;
    }

    return (
      <div className="space-y-4">
        {rows.map(({ kind, item }, index) => {
          if (kind === "request") {
            const request = item as (typeof received)[0];
            const peer = scope === "received" ? request.sender : request.receiver;
            const requestTitle = request.project?.name || request.team?.name || (request as { proposal?: { title?: string } }).proposal?.title || "Collaboration request";

            return (
              <Card
                key={`req-${request.id}`}
                className="group relative overflow-hidden border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
                style={{
                  animation: `slideIn 0.4s ease-out ${index * 0.08}s backwards`
                }}
              >
                {/* Subtle gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-blue-50/0 to-indigo-50/0 group-hover:from-slate-50/50 group-hover:via-blue-50/30 group-hover:to-indigo-50/40 transition-all duration-500 pointer-events-none" />

                {/* Status indicator bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${request.status === "PENDING" ? "bg-gradient-to-b from-amber-400 to-amber-600" :
                  request.status === "ACCEPTED" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" :
                    request.status === "REJECTED" ? "bg-gradient-to-b from-rose-400 to-rose-600" :
                      request.status === "WITHDRAWN" ? "bg-gradient-to-b from-slate-300 to-slate-500" :
                        "bg-gradient-to-b from-orange-400 to-orange-600"
                  }`} />

                <div className="relative flex items-start p-6 gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full scale-110" />
                    <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-slate-200/50 relative">
                      <AvatarImage src={peer ? userPhoto(peer) : ""} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 font-semibold text-lg">
                        {(peer?.name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h4 className="font-semibold text-slate-900 text-lg tracking-tight">
                            {requestTitle}
                          </h4>
                          <StatusBadge status={request.status} />
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed mb-2.5 line-clamp-2">
                          {request.message || "No message provided"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                            <span className="font-medium">
                              {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {peer && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                              <span className="font-medium truncate max-w-[200px]">
                                {peer.name || peer.email || "Unknown"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {scope === "received" && request.status === "PENDING" && (
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all duration-200 font-medium shadow-sm"
                          disabled={!!processingId}
                          onClick={() => handleDecline(request.id)}
                        >
                          <X className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                          disabled={!!processingId}
                          onClick={() => handleAccept(request.id)}
                        >
                          {processingId === `req:${request.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" strokeWidth={2.5} />
                          ) : (
                            <Check className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                          )}
                          Accept Request
                        </Button>
                      </div>
                    )}

                    {scope === "received" && request.status !== "PENDING" && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm ${request.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        request.status === "REJECTED" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                          request.status === "EXPIRED" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                            "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                        {request.status === "ACCEPTED" && <CheckCircle className="h-4 w-4" strokeWidth={2} />}
                        {request.status === "REJECTED" && <XCircle className="h-4 w-4" strokeWidth={2} />}
                        {request.status === "EXPIRED" && <AlertCircle className="h-4 w-4" strokeWidth={2} />}
                        {request.status === "ACCEPTED" ? "Accepted" :
                          request.status === "REJECTED" ? "Declined" :
                            request.status === "EXPIRED" ? "Expired" : "Withdrawn"}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          }

          const conn = item as (typeof connReceived)[0];
          const other = scope === "received" ? conn.requester : conn.receiver;
          const busy = !!processingId;

          return (
            <Card
              key={`conn-${conn.id}`}
              className="group relative overflow-hidden border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
              style={{
                animation: `slideIn 0.4s ease-out ${index * 0.08}s backwards`
              }}
            >
              {/* Subtle gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-violet-50/0 to-purple-50/0 group-hover:from-slate-50/50 group-hover:via-violet-50/30 group-hover:to-purple-50/40 transition-all duration-500 pointer-events-none" />

              {/* Status indicator bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${conn.status === "PENDING" ? "bg-gradient-to-b from-amber-400 to-amber-600" :
                conn.status === "ACCEPTED" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" :
                  "bg-gradient-to-b from-rose-400 to-rose-600"
                }`} />

              <div className="relative flex items-start p-6 gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0 mt-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-200 to-purple-200 blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full scale-110" />
                  <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-slate-200/50 relative">
                    <AvatarImage src={other ? userPhoto(other) : ""} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 font-semibold text-lg">
                      {(other?.name || other?.username || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-gradient-to-br from-violet-100 to-purple-100 p-1.5 rounded-lg">
                            <Link2 className="h-4 w-4 text-violet-700" strokeWidth={2} />
                          </div>
                          <h4 className="font-semibold text-slate-900 text-lg tracking-tight">
                            Connection Request
                          </h4>
                        </div>
                        <ConnectionStatusBadge status={conn.status} />
                      </div>

                      {other?.name && (
                        <p className="text-sm font-medium text-slate-700 mb-1.5">
                          {other.name}
                        </p>
                      )}

                      <p className="text-sm text-slate-600 leading-relaxed mb-2.5 line-clamp-2">
                        {conn.message?.trim() || "No message provided"}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                          <span className="font-medium">
                            {format(new Date(conn.requestedAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        {(other?.username || other?.email) && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                            <span className="font-medium truncate max-w-[200px]">
                              {other.username || other.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {scope === "received" && conn.status === "PENDING" && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all duration-200 font-medium shadow-sm"
                        disabled={busy}
                        onClick={() => handleConnectionDecline(conn.requesterId)}
                      >
                        <X className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        disabled={busy}
                        onClick={() => handleConnectionAccept(conn.requesterId)}
                      >
                        {processingId === `conn:${conn.requesterId}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" strokeWidth={2.5} />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                        )}
                        Accept Connection
                      </Button>
                    </div>
                  )}

                  {scope === "sent" && conn.status === "PENDING" && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400 transition-all duration-200 font-medium shadow-sm"
                        disabled={busy}
                        onClick={() => handleConnectionCancel(conn.id)}
                      >
                        {processingId === `cancel:${conn.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" strokeWidth={2.5} />
                        ) : (
                          <X className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                        )}
                        Withdraw Request
                      </Button>
                    </div>
                  )}

                  {conn.status !== "PENDING" && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm ${conn.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                      {conn.status === "ACCEPTED" ? (
                        <>
                          <CheckCircle className="h-4 w-4" strokeWidth={2} />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" strokeWidth={2} />
                          Declined
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
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
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
            Requests & Connections
          </h1>
          <p className="text-slate-600 text-sm">
            Manage your collaboration requests and connection invitations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Scope)} className="w-full">
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
          {renderItems(mergedReceived, "received")}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {renderItems(mergedSent, "sent")}
        </TabsContent>
      </Tabs>
    </div>
  );
}