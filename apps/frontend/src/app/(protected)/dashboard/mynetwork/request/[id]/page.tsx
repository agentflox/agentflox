"use client";
import Shell from "@/components/layout/Shell";
import Button from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";

export default function ConnectionRequestDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { data, isLoading } = trpc.connections.get.useQuery({ id }, { enabled: !!id });
  const accept = trpc.connections.respond.useMutation();
  const cancel = trpc.connections.cancel.useMutation();
  const resend = trpc.connections.resend.useMutation();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const doAccept = async (acceptFlag: boolean) => {
    if (!data) return;
    await accept.mutateAsync({ requesterId: (data as any).requesterId, accept: acceptFlag });
    toast({ title: acceptFlag ? "Accepted" : "Declined" });
    await queryClient.invalidateQueries({ queryKey: [["connections","get"]] as any });
  };

  const doCancel = async () => {
    if (!data) return;
    await cancel.mutateAsync({ id });
    toast({ title: "Cancelled" });
    router.back();
  };

  const doResend = async () => {
    if (!data) return;
    await resend.mutateAsync({ id });
    toast({ title: "Resent" });
    await queryClient.invalidateQueries({ queryKey: [["connections","get"]] as any });
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Connection Request</h1>
          <p className="text-sm text-muted-foreground">View request details and take action.</p>
        </div>
        {isLoading ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : data ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={(data as any).requester?.avatar || undefined} />
                <AvatarFallback>{(((data as any).requester?.name || (data as any).requester?.username || "U").slice(0, 2) || "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm text-muted-foreground">From</div>
                <div className="font-medium">{(data as any).requester?.name || (data as any).requester?.username}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={(data as any).receiver?.avatar || undefined} />
                <AvatarFallback>{(((data as any).receiver?.name || (data as any).receiver?.username || "U").slice(0, 2) || "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm text-muted-foreground">To</div>
                <div className="font-medium">{(data as any).receiver?.name || (data as any).receiver?.username}</div>
              </div>
            </div>
            {(data as any).message && (
              <div>
                <div className="text-sm text-muted-foreground">Message</div>
                <div className="whitespace-pre-wrap text-sm">{(data as any).message}</div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {(data as any).status === "PENDING" && (
                <>
                  {/* Receiver actions */}
                  <Button onClick={() => doAccept(true)} disabled={accept.isPending}>Accept</Button>
                  <Button variant="outline" onClick={() => doAccept(false)} disabled={accept.isPending}>Decline</Button>
                  {/* Requester actions */}
                  <Button variant="ghost" onClick={doCancel} disabled={cancel.isPending}>Cancel</Button>
                </>
              )}
              {(data as any).status === "REJECTED" && (
                <Button onClick={doResend} disabled={resend.isPending}>Resend</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">Not found</div>
        )}
      </div>
    </Shell>
  );
}


