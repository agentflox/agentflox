"use client";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, Eye, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";

export default function PublicProfileCard({ profile }: { profile: any }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: currentUser } = trpc.user.me.useQuery();
  const [isCompact, setIsCompact] = useState(false);
  const isInitiallyInterested = (profile?.likes || []).some((l: any) => l.userId === currentUser?.id);
  const [isInterested, setIsInterested] = useState<boolean>(isInitiallyInterested);
  const utils = trpc.useUtils();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const checkWidth = () => { if (cardRef.current) setIsCompact(cardRef.current.offsetWidth < 375); };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const toggleInterestMutation = trpc.profile.toggleInterest.useMutation({
    onSuccess: () => utils.profile.getSinglePublicProfile.invalidate({ id: profile.id }),
  });

  const handleInterest = async () => {
    if (!currentUser?.id) return;
    await toggleInterestMutation.mutateAsync({ profileId: profile.id });
    setIsInterested((v) => !v);
  };

  return (
    <Card ref={cardRef} className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50/30 via-white to-cyan-50/20 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl sm:rounded-3xl">
      <div className="relative z-10">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <UserProfileHoverCard userId={profile.id}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white flex items-center justify-center font-semibold cursor-pointer">
                {(profile.firstName || profile.username || 'U').charAt(0).toUpperCase()}
              </div>
            </UserProfileHoverCard>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {profile.firstName || profile.username} {profile.lastName || ''}
              </CardTitle>
              <p className="text-xs text-slate-500">{profile.location || 'Remote'}</p>
            </div>
            <button onClick={handleInterest} className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${isInterested ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Heart className={`inline-block mr-1 h-3.5 w-3.5 ${isInterested ? 'fill-current' : ''}`} />
              {isInterested ? 'Interested' : 'Interest'}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {Array.isArray(profile.memberProfile?.skills) && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {profile.memberProfile.skills.slice(0, isCompact ? 3 : 6).map((s: string) => (
                <Badge key={s} className="bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0 px-3 py-1 rounded-full text-xs font-semibold">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-700 line-clamp-3 mb-3">{profile.bio}</p>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1 text-xs"><Eye className="h-3.5 w-3.5 text-slate-400" /> 0</span>
            </div>
            <button onClick={() => router.push(`/dashboard/profiles/${profile.id}`)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-600 shadow">
              View <ArrowRight className="inline-block ml-1 h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowMessage(true)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-600 shadow">
              <MessageSquare className="inline-block mr-1 h-3.5 w-3.5" /> Message
            </button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}


