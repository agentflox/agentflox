"use client";
import Shell from "@/components/layout/Shell";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import Button from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { openModalWithUser } from "@/stores/slices/messages.slice";

type Profile = {
  id: string;
  name: string;
  title?: string;
  role?: string;
  bio?: string;
  email?: string;
  website?: string;
  linkedin?: string;
};

export default function ProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: profile, isLoading } = trpc.profile.getSinglePublicProfile.useQuery({ id }, { enabled: !!id });
  const { data: me } = trpc.user.me.useQuery();
  const { data: conn } = trpc.connections.status.useQuery({ userId: id }, { enabled: !!id });
  const [showMessage, setShowMessage] = useState(false);
  const requestConn = trpc.connections.request.useMutation();
  const acceptConn = trpc.connections.respond.useMutation();
  const dispatch = useAppDispatch();

  return (
    <Shell>
      <div className="max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-7 w-1/2 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted/50" />
            <div className="h-24 w-full animate-pulse rounded bg-muted/40" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {profile.settings?.profileVisibility !== 'PUBLIC' ? (
              <div className="rounded-md border p-4">
                <h1 className="text-xl font-semibold">This account is private.</h1>
                <p className="text-sm text-muted-foreground">You can't view this profile unless you connect.</p>
                <div className="mt-3 flex gap-2">
                  {conn?.status === 'PENDING' && <Badge variant="secondary">Request pending</Badge>}
                  {conn?.status === 'NONE' && (
                    <Button onClick={() => requestConn.mutate({ userId: id })}>Request Connection</Button>
                  )}
                  {conn?.status === 'ACCEPTED' && (
                    <Button variant="outline" onClick={() => dispatch(openModalWithUser(id))} disabled={!me?.id}>Message</Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username}</h1>
                {profile.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
                <div className="flex gap-2">
                  {conn?.status === 'ACCEPTED' && (
                    <Button variant="outline" onClick={() => dispatch(openModalWithUser(id))} disabled={!me?.id}>Message</Button>
                  )}
                  {conn?.status === 'PENDING' && <Badge variant="secondary">Request pending</Badge>}
                  {conn?.status === 'NONE' && (
                    <Button onClick={() => requestConn.mutate({ userId: id })}>Connect</Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Profile not found.</p>
        )}
      </div>
    </Shell>
  );
}


