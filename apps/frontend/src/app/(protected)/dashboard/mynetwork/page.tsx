"use client";
import Shell from "@/components/layout/Shell";
import Button from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/entities/shared/components/PageHeader";

export default function MyNetworkPage() {
  const [scope, setScope] = useState<"received" | "sent">("received");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listQuery = trpc.connections.list.useQuery({ scope, page, pageSize });
  const suggestionsQuery = trpc.connections.suggestions.useQuery({ page: 1, pageSize: 8 });

  const acceptMutation = trpc.connections.respond.useMutation({
    onSuccess: async () => {
      toast({ title: "Connection accepted" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["connections", "list"]] as any }),
      ]);
    },
  });
  const declineMutation = trpc.connections.respond.useMutation({
    onSuccess: async () => {
      toast({ title: "Request declined" });
      await queryClient.invalidateQueries({ queryKey: [["connections", "list"]] as any });
    },
  });
  const cancelMutation = trpc.connections.cancel.useMutation({
    onSuccess: async () => {
      toast({ title: "Request cancelled" });
      await queryClient.invalidateQueries({ queryKey: [["connections", "list"]] as any });
    },
  });
  const resendMutation = trpc.connections.resend.useMutation({
    onSuccess: async () => {
      toast({ title: "Request resent" });
      await queryClient.invalidateQueries({ queryKey: [["connections", "list"]] as any });
    },
  });
  const requestMutation = trpc.connections.request.useMutation({
    onSuccess: async () => {
      toast({ title: "Request sent" });
      await queryClient.invalidateQueries({ queryKey: [["connections", "list"]] as any });
    },
  });

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="My Network"
          description="Manage your connections and requests."
        />

        <Tabs value={scope} onValueChange={(v) => { setScope(v as any); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="received">Received Requests</TabsTrigger>
            <TabsTrigger value="sent">Sent Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            <RequestList
              loading={listQuery.isLoading}
              items={(listQuery.data?.items || []).map((c: any) => ({
                id: c.id,
                user: c.requester,
                message: c.message,
                date: c.requestedAt,
                status: c.status,
              }))}
              emptyText="No received requests."
              actions={(id) => (
                <div className="flex gap-2">
                  <Button onClick={() => acceptMutation.mutate({ requesterId: (listQuery.data!.items.find((x: any) => x.id === id)!.requesterId), accept: true })} disabled={acceptMutation.isPending}>
                    {acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                  </Button>
                  <Button variant="outline" onClick={() => declineMutation.mutate({ requesterId: (listQuery.data!.items.find((x: any) => x.id === id)!.requesterId), accept: false })} disabled={declineMutation.isPending}>Decline</Button>
                </div>
              )}
            />
          </TabsContent>
          <TabsContent value="sent">
            <RequestList
              loading={listQuery.isLoading}
              items={(listQuery.data?.items || []).map((c: any) => ({
                id: c.id,
                user: c.receiver,
                message: c.message,
                date: c.requestedAt,
                status: c.status,
              }))}
              emptyText="No sent requests."
              actions={(id) => (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => cancelMutation.mutate({ id })} disabled={cancelMutation.isPending}>Cancel</Button>
                  <Button onClick={() => resendMutation.mutate({ id })} disabled={resendMutation.isPending}>Resend</Button>
                </div>
              )}
            />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Suggested connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(suggestionsQuery.data?.items || []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback>{(u.name || u.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{u.name || u.username}</div>
                      {u.bio && <div className="text-xs text-muted-foreground line-clamp-1">{u.bio}</div>}
                    </div>
                  </div>
                  <Button onClick={() => requestMutation.mutate({ userId: u.id })} disabled={requestMutation.isPending}>Connect</Button>
                </div>
              ))}
              {suggestionsQuery.isLoading && (
                <div className="col-span-full flex items-center justify-center py-8 text-sm text-muted-foreground">Loading...</div>
              )}
              {suggestionsQuery.isSuccess && suggestionsQuery.data!.items.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground">No suggestions right now.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function RequestList({ loading, items, emptyText, actions }: { loading: boolean; items: Array<{ id: string; user: any; message?: string | null; date: string; status: string }>; emptyText: string; actions: (id: string) => React.ReactNode; }) {
  if (loading) return <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">Loading...</div>;
  if (!items.length) return <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">{emptyText}</div>;
  return (
    <div className="divide-y rounded-md border">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={it.user?.avatar || undefined} />
              <AvatarFallback>{(it.user?.name || it.user?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{it.user?.name || it.user?.username}</div>
              {it.message && <div className="text-xs text-muted-foreground line-clamp-1">{it.message}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions(it.id)}
          </div>
        </div>
      ))}
    </div>
  );
}


