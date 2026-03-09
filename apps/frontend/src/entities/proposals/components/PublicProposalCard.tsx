"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, Users, Eye, ArrowRight, Share2, Bookmark, MoreVertical } from "lucide-react";
import RequestModal from "../../requests/components/RequestModal";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

interface PublicProposalCardProps {
  proposal: {
    id: string;
    projectId?: string;
    teamId?: string;
    title: string;
    shortSummary: string;
    category: string;
    industry: string[];
    keywords: string[];
    createdAt: string;
    updatedAt: string;
    views: number;
    bookmarks: number;
    user?: {
      id: string;
      name: string | null;
      email: string;
    };
    likes?: Array<{ userId: string }>;
    intent: string;
  };
}

export default function PublicProposalCard({
  proposal,
}: PublicProposalCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: currentUser, isLoading } = trpc.user.me.useQuery();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isInterested, setIsInterested] = useState(
    proposal.likes?.some(like => like.userId === currentUser?.id) || false
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const utils = trpc.useUtils();

  // Measure card width and update compact state
  useEffect(() => {
    const checkWidth = () => {
      if (cardRef.current) {
        const width = cardRef.current.offsetWidth;
        setIsCompact(width < 375);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  console.log("this is projectId", proposal);

  const toggleInterestMutation = trpc.proposal.toggleInterest.useMutation({
    onSuccess: () => {
      utils.proposal.getSinglePublicProposal.invalidate({ id: proposal.id });
    },
  });

  const handleInterest = async () => {
    if (!currentUser?.id) return;
    
    try {
      await toggleInterestMutation.mutateAsync({
        proposalId: proposal.id,
      });
      setIsInterested(!isInterested);
    } catch (error) {
      console.error("Failed to toggle interest:", error);
    }
  };

  const handleView = useCallback(() => {
    if (!proposal.id) return;
    router.push(`/dashboard/proposals/${proposal.id}`)
  }, [router, proposal.id]);

  const handleRequest = () => {
    if (!currentUser?.id) return;
    if ( currentUser.id === proposal.user?.id ) {
      toast({
        title: "You cannot request your own proposal",
        variant: "destructive",
      });
      return;
    }
    setShowRequestModal(true);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    setShowMobileMenu(false);
  };

  const handleShare = () => {
    // Share functionality
    setShowMobileMenu(false);
  };

  const interestCount = proposal.likes?.length || 0;

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50/30 via-white to-cyan-50/20 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl sm:rounded-3xl"
      >
        {/* Cyan accent gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl" 
             style={{ padding: '2px' }}>
          <div className="h-full w-full bg-white rounded-2xl sm:rounded-3xl" />
        </div>
        
        {/* Cyan decorative element */}
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-bl-full opacity-50" />
        
        <div className="relative z-10">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            {/* User info & Meta */}
            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md">
                  {proposal.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">@{proposal.user?.name || 'anonymous'}</p>
                  <p className="text-xs text-slate-500">{getRelativeTime(proposal.createdAt)}</p>
                </div>
              </div>
              
              {/* Mobile Menu Button - Show when compact */}
              {isCompact && (
                <div className="relative">
                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {/* Mobile Dropdown Menu */}
                  {showMobileMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMobileMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterest();
                            setShowMobileMenu(false);
                          }}
                          disabled={!currentUser?.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-cyan-50 transition-colors disabled:opacity-50"
                        >
                          <Heart className={`h-4 w-4 ${isInterested ? "fill-cyan-500 text-cyan-500" : ""}`} />
                          <span>{isInterested ? 'Interested' : 'Mark as interested'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmark();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-cyan-50 transition-colors"
                        >
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-cyan-500 text-cyan-500" : ""}`} />
                          <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-cyan-50 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Desktop Menu Button - Show when not compact */}
              {!isCompact && (
                <button className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="4" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="16" r="1.5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Title */}
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight group-hover:text-cyan-600 transition-colors line-clamp-2">
              {proposal.title}
            </CardTitle>

            {/* Category Badges */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Badge className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-shadow">
                {proposal.category}
              </Badge>
              {proposal.industry?.slice(0, isCompact ? 1 : 2).map((ind: string) => (
                <Badge 
                  key={ind} 
                  className="bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-shadow"
                >
                  {ind}
                </Badge>
              ))}
            </div>

            {/* Summary */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3 sm:mb-4 font-medium line-clamp-3">
              {proposal.shortSummary}
            </p>

            {/* Keywords/Tags */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {proposal.keywords?.slice(0, 3).map((keyword: string) => (
                <span 
                  key={keyword} 
                  className="text-cyan-600 text-xs sm:text-sm font-medium hover:text-cyan-700 transition-colors cursor-pointer"
                >
                  #{keyword}
                </span>
              ))}
              {proposal.keywords?.length > 3 && (
                <span className="text-cyan-500 text-xs sm:text-sm font-medium">
                  +{proposal.keywords.length - 3} more
                </span>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Stats Bar */}
            <div className="flex items-center justify-between py-3 sm:py-4 border-t border-slate-200 mb-3 sm:mb-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold">{proposal.views || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                  <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold">{interestCount}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold">{proposal.bookmarks || 0}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop: Interest, Bookmark, Share Buttons - Hide when compact */}
              {!isCompact && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterest();
                    }}
                    disabled={!currentUser?.id || toggleInterestMutation.isPending}
                    className={`
                      group/btn relative flex items-center justify-center gap-2 p-3 rounded-full font-semibold text-sm
                      transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                      ${isInterested 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600' 
                        : 'bg-white text-cyan-600 border-2 border-cyan-500 hover:bg-cyan-50'
                      }
                    `}
                    aria-label={isInterested ? "Interested" : "Mark as interested"}
                  >
                    <Heart className={`h-4 w-4 transition-transform group-hover/btn:scale-110 ${isInterested ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark();
                    }}
                    className={`
                      p-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg
                      ${isBookmarked 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600'
                      }
                    `}
                    aria-label="Bookmark"
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className="p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg"
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* All Screens: View and Request Buttons */}
              <div className="flex items-center gap-2 sm:gap-2 ml-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView();
                  }}
                  className="p-2.5 sm:p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg"
                  aria-label="View details"
                >
                  <ArrowRight className="h-4 w-4 group-hover/view:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequest();
                  }}
                  disabled={!currentUser?.id}
                  className="group/btn flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send request"
                >
                  <MessageSquare className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  <span>Request</span>
                </button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {showRequestModal && (
        <RequestModal
          proposalId={proposal.id}
          proposalTitle={proposal.title}
          proposalOwnerId={proposal.user?.id || ''}
          proposalIntent={(proposal.intent === "SEEKING" || proposal.intent === "OFFERING") ? proposal.intent : "OFFERING"}
          proposalType={(["INVESTMENT","MENTORSHIP","TEAM","COFOUNDER","PARTNERSHIP","CUSTOMER","PROJECT"] as const).includes(proposal.category as any) ? proposal.category as any : "PROJECT"}
          projectId={proposal.projectId || ''}
          teamId={proposal.teamId || ''}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </>
  );
}
