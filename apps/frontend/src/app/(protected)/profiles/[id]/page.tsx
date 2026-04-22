"use client";
import Shell from "@/components/layout/Shell";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Button from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { openModalWithUser } from "@/stores/slices/messages.slice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link as LinkIcon, Share2, UserPlus, Globe, Shield, Pencil, LockKeyhole, Mail, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";
import { renderHtml } from "@/utils/renderHtml";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper to generate a consistent, beautiful gradient based on the user's ID
const generateGradient = (seed: string) => {
  const colors = [
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-blue-400 via-indigo-500 to-purple-600",
    "from-emerald-400 via-teal-500 to-cyan-500",
    "from-rose-400 via-fuchsia-500 to-indigo-500",
    "from-violet-500 via-fuchsia-500 to-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: profile, isLoading } = trpc.profile.getSinglePublicProfile.useQuery({ id }, { enabled: !!id });
  const { data: me } = trpc.user.me.useQuery();
  const { data: conn } = trpc.connections.status.useQuery({ userId: id }, { enabled: !!id });
  const requestConn = trpc.connections.request.useMutation();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const isMe = me?.id === id;
  const isConnected = conn?.status === 'ACCEPTED';
  const isPublic = profile?.settings?.profileVisibility === 'PUBLIC';
  const isConnectionsOnly = profile?.settings?.profileVisibility === 'CONNECTIONS_ONLY';
  const canView = isMe || isPublic || (isConnectionsOnly && isConnected);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.username || "Unknown User";
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const coverGradient = useMemo(() => generateGradient(id || "default"), [id]);

  const handleShare = async () => {
    if (!profile) return;
    if (!isPublic) {
      toast({
        title: "Profile is private",
        description: "Set profile visibility to public before sharing.",
        variant: "destructive",
      });
      return;
    }
    const link = `${window.location.origin}/profiles/${profile.id}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Profile link copied to clipboard." });
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white">
              {/* Banner skeleton */}
              <div className="h-48 w-full bg-zinc-100/50" />
              <div className="px-6 pb-6 sm:px-10 sm:pb-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                  {/*
                    Avatar skeleton: half the avatar height above the banner edge.
                    Avatar is h-32 (128px) on mobile, h-40 (160px) on sm+.
                    So we pull up by half: -mt-16 (64px) on mobile, -mt-20 (80px) on sm+.
                  */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                    <div className="-mt-16 sm:-mt-20 h-32 w-32 rounded-full ring-4 ring-white bg-zinc-100 sm:h-40 sm:w-40" />
                    <div className="mb-1 space-y-3">
                      <div className="h-8 w-64 bg-zinc-100 rounded-md" />
                      <div className="h-6 w-32 bg-zinc-100 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Card Skeleton */}
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-100" />
                <div className="h-6 w-24 bg-zinc-100 rounded-md" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-zinc-100/80 rounded-md" />
                <div className="h-4 w-[92%] bg-zinc-100/80 rounded-md" />
                <div className="h-4 w-[75%] bg-zinc-100/80 rounded-md" />
              </div>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {!canView ? (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/60 py-24 text-center shadow-sm backdrop-blur-xl">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 ring-8 ring-indigo-50/50">
                    <LockKeyhole className="h-8 w-8 text-indigo-500" strokeWidth={1.5} />
                  </div>
                  <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">Private Profile</h1>
                  <p className="max-w-sm text-base text-zinc-500">
                    This account is private. Connect with {profile.firstName || profile.username || "this user"} to view their full profile.
                  </p>
                  <div className="mt-8 flex items-center gap-3">
                    {conn?.status === 'NONE' && (
                      <Button
                        onClick={() => requestConn.mutate({ userId: id })}
                        className="gap-2 rounded-full bg-indigo-600 px-6 font-medium shadow-sm hover:bg-indigo-700"
                      >
                        <UserPlus className="h-4 w-4" /> Request Connection
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Header Card */}
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm transition-all hover:shadow-md">
                  {/* Banner */}
                  <div className={`h-48 w-full bg-gradient-to-tr ${coverGradient} opacity-90 transition-opacity group-hover:opacity-100`} />

                  <div className="relative px-6 pb-6 sm:px-10 sm:pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                      {/* Avatar & Name Info */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 w-full">
                        {/* Avatar */}
                        <div className="-mt-16 sm:-mt-20 flex-shrink-0 relative z-10">
                          <Avatar className="h-32 w-32 sm:h-40 sm:w-40 rounded-full ring-4 ring-white shadow-xl transition-transform duration-300 hover:scale-[1.02] bg-white">
                            <AvatarImage src={profile.avatar ?? undefined} className="object-cover" />
                            <AvatarFallback className="text-4xl font-light text-zinc-600 bg-zinc-50">{initials}</AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Name Info & Actions container */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between flex-1 min-w-0 pt-2 sm:pt-4 gap-4">
                          <div className="min-w-0 space-y-2">
                            <h1 className="break-words text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{fullName}</h1>

                            {profile.headline && (
                              <p className="text-sm font-medium text-zinc-600">{profile.headline}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-1">
                              <TooltipProvider>
                                {profile.website && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={profile.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-full text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                      >
                                        <LinkIcon className="h-5 w-5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white border-none">
                                      {profile.website}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {profile.linkedinUrl && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={profile.linkedinUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-full text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                      >
                                        <Linkedin className="h-5 w-5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white border-none">
                                      LinkedIn Profile
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {profile.twitterUrl && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={profile.twitterUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-full text-zinc-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
                                      >
                                        <Twitter className="h-5 w-5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white border-none">
                                      Twitter/X Profile
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {profile.facebookUrl && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={profile.facebookUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-full text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                      >
                                        <Facebook className="h-5 w-5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white border-none">
                                      Facebook Profile
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {profile.instagramUrl && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={profile.instagramUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-full text-zinc-400 hover:text-pink-600 hover:bg-pink-50 transition-all"
                                      >
                                        <Instagram className="h-5 w-5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white border-none">
                                      Instagram Profile
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              {profile.username && (
                                <span className="text-base font-medium text-zinc-500">@{profile.username}</span>
                              )}
                              <Badge
                                variant="secondary"
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-700'}`}
                              >
                                {isPublic ? <Globe className="mr-1.5 h-3.5 w-3.5" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
                                {isPublic ? "Public Profile" : "Private Profile"}
                              </Badge>
                            </div>
                          </div>

                          {/* Header Actions */}
                          <div className="flex items-start gap-3 mt-2 sm:mt-0 flex-shrink-0">
                            {isMe ? (
                              <>
                                <Button
                                  variant="outline"
                                  className="rounded-full shadow-sm bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                                  onClick={handleShare}
                                  disabled={!isPublic}
                                >
                                  <Share2 className="mr-2 h-4 w-4" /> Share
                                </Button>
                            <Button asChild className="rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800">
                              <Link href="/dashboard/personal?tab=profile">
                                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <>
                            {conn?.status === 'NONE' && (
                              <Button
                                className="rounded-full bg-indigo-600 shadow-sm hover:bg-indigo-700"
                                onClick={() => requestConn.mutate({ userId: id })}
                              >
                                <UserPlus className="mr-2 h-4 w-4" /> Connect
                              </Button>
                            )}
                            {isConnected && (
                              <Button
                                variant="outline"
                                className="rounded-full shadow-sm bg-white"
                                onClick={() => dispatch(openModalWithUser(id))}
                                disabled={!me?.id}
                              >
                                <Mail className="mr-2 h-4 w-4" /> Message
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>

                {/* About Content - Full Width */}
                <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Shield className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900">About</h2>
                  </div>

                  {profile.bio ? (
                    <div
                      className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed"
                      dangerouslySetInnerHTML={renderHtml(profile.bio)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-50 rounded-2xl">
                      <p className="text-zinc-400 font-medium italic">This user hasn't written a bio yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <Shield className="h-12 w-12 text-zinc-200 mb-4" />
            <h2 className="text-xl font-bold text-zinc-900">Profile Not Found</h2>
            <p className="mt-2 text-zinc-500">This profile doesn't exist or is unavailable.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}