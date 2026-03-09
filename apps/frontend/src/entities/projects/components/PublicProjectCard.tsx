"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, Users, Eye, ArrowRight, Share2, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import RequestModal from "@/entities/requests/components/RequestModal";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

export default function PublicProjectCard({ project }: { project: any }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: currentUser } = trpc.user.me.useQuery();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const isInitiallyInterested = (project?.likes || []).some((l: any) => l.userId === currentUser?.id);
  const [isInterested, setIsInterested] = useState(isInitiallyInterested);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const utils = trpc.useUtils();
  useEffect(() => {
    const checkWidth = () => {
      if (cardRef.current) setIsCompact(cardRef.current.offsetWidth < 375);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const toggleInterestMutation = trpc.project.toggleInterest.useMutation({
    onSuccess: () => utils.project.getSinglePublicProject.invalidate({ id: project.id }),
  });

  const handleInterest = async () => {
    if (!currentUser?.id) return;
    await toggleInterestMutation.mutateAsync({ projectId: project.id });
    setIsInterested((v: boolean) => !v);
  };

  const handleView = useCallback(() => {
    if (!project?.id) return;
    router.push(DASHBOARD_ROUTES.PROJECT(project.id));
  }, [router, project?.id]);

  const handleRequest = () => setShowRequestModal(true);
  const handleBookmark = () => setIsBookmarked((b) => !b);
  const handleShare = () => { };

  const interestCount = project.likes?.length || 0;

  return (
    <>
      <div ref={cardRef}>
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50/30 via-white to-cyan-50/20 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl sm:rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl" style={{ padding: '2px' }}>
            <div className="h-full w-full bg-white rounded-2xl sm:rounded-3xl" />
          </div>
          <div className="relative z-10">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md">
                    {project.owner?.name?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">@{project.owner?.name || 'anonymous'}</p>
                    <p className="text-xs text-slate-500">Updated</p>
                  </div>
                </div>
                {!isCompact && (
                  <button className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                  </button>
                )}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight group-hover:text-cyan-600 transition-colors line-clamp-2">
                {project.name}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {project.stage && (
                  <Badge className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-shadow">
                    {project.stage}
                  </Badge>
                )}
                {(project.industry || []).slice(0, isCompact ? 1 : 2).map((ind: string) => (
                  <Badge key={ind} className="bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-shadow">
                    {ind}
                  </Badge>
                ))}
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3 sm:mb-4 font-medium line-clamp-3">
                {project.description}
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex items-center justify-between py-3 sm:py-4 border-t border-slate-200 mb-3 sm:mb-4">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                    <span className="text-xs sm:text-sm font-semibold">{project.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                    <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                    <span className="text-xs sm:text-sm font-semibold">{interestCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                    <span className="text-xs sm:text-sm font-semibold">{project.bookmarks || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {!isCompact && (
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); handleInterest(); }} disabled={!currentUser?.id || toggleInterestMutation.isPending} className={`group/btn relative flex items-center justify-center gap-2 p-3 rounded-full font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isInterested ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600' : 'bg-white text-cyan-600 border-2 border-cyan-500 hover:bg-cyan-50'}`} aria-label={isInterested ? "Interested" : "Mark as interested"}>
                      <Heart className={`h-4 w-4 transition-transform group-hover/btn:scale-110 ${isInterested ? "fill-current" : ""}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleBookmark(); }} className={`p-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg ${isBookmarked ? 'bg-cyan-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600'}`} aria-label="Bookmark">
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg" aria-label="Share">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-2 ml-auto">
                  <button onClick={(e) => { e.stopPropagation(); handleView(); }} className="p-2.5 sm:p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg" aria-label="View details">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowRequestModal(true); }} disabled={!currentUser?.id} className="group/btn flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Send request">
                    <MessageSquare className="h-4 w-4" />
                    <span>Request</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {showRequestModal && (
        <RequestModal
          proposalId={undefined as any}
          proposalTitle={project.name}
          proposalOwnerId={project.owner?.id || ''}
          proposalIntent={undefined as any}
          proposalType={undefined as any}
          projectId={project.id}
          teamId={undefined as any}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </>
  );
}


