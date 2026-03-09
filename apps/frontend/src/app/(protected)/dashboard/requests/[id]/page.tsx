"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar, 
  Briefcase, 
  FileText, 
  Target,
  Clock,
  Mail,
  MapPin,
  Globe,
  ArrowLeft,
  ExternalLink,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useSocket } from "@/components/providers/SocketProvider";

export default function RequestDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { toast } = useToast();
  const router = useRouter();
  
  const { data, isLoading, refetch } = trpc.request.get.useQuery(
    { id }, 
    { 
      enabled: !!id,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );
  
  const { socket, isConnected, waitForConnection } = useSocket();

  // Send notification via socket
  const sendNotification = useCallback(async (userId: string) => {
    if (!socket || !isConnected) {
      console.warn('Socket not connected, skipping real-time notification');
      return;
    }

    try {
      const s = await waitForConnection();
      
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Notification send timeout'));
        }, 5000);

        s.emit('notification:send', { userId }, (err: any) => {
          clearTimeout(timeoutId);
          if (err) {
            console.error('Failed to send notification:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
    }
  }, [socket, isConnected, waitForConnection]);
  
  const acceptMutation = trpc.request.accept.useMutation({
    onSuccess: async () => {
      toast({ 
        title: "Request Accepted", 
        description: "You have successfully accepted this collaboration request." 
      });

      // Send real-time notification to sender
      if (data?.sender?.id) {
        try {
          await sendNotification(data.sender.id);
        } catch (error) {
          console.error('Real-time notification failed:', error);
          // Continue anyway - the request was successful
        }
      }

      await refetch();
    },
    onError: (e: any) => {
      toast({ 
        title: "Error", 
        description: e.message || "Failed to accept request. Please try again.", 
        variant: "destructive" 
      });
    },
  });
  
  const rejectMutation = trpc.request.reject.useMutation({
    onSuccess: async () => {
      toast({ 
        title: "Request Rejected", 
        description: "You have rejected this collaboration request." 
      });

      // Send real-time notification to sender
      if (data?.sender?.id) {
        try {
          await sendNotification(data.sender.id);
        } catch (error) {
          console.error('Real-time notification failed:', error);
          // Continue anyway - the request was successful
        }
      }

      router.back();
    },
    onError: (e: any) => {
      toast({ 
        title: "Error", 
        description: e.message || "Failed to reject request. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  // Memoized handlers
  const handleAccept = useCallback(() => {
    if (!id) return;
    acceptMutation.mutate({ id });
  }, [id, acceptMutation]);

  const handleReject = useCallback(() => {
    if (!id) return;
    rejectMutation.mutate({ id });
  }, [id, rejectMutation]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Memoized computed values
  const canAct = useMemo(() => data?.status === "PENDING", [data?.status]);

  const statusColor = useMemo(() => {
    const map = {
      PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      ACCEPTED: "bg-green-500/10 text-green-700 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 border-red-500/20",
    } as const;
    const key = (data?.status || "PENDING") as keyof typeof map;
    return map[key] || map.PENDING;
  }, [data?.status]);

  const formatDate = useCallback((date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getInitials = useCallback((email: string) => {
    return email.charAt(0).toUpperCase();
  }, []);

  const isActionLoading = useMemo(() => 
    acceptMutation.isPending || rejectMutation.isPending,
    [acceptMutation.isPending, rejectMutation.isPending]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The collaboration request you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-4 -ml-2"
            disabled={isActionLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Collaboration Request
              </h1>
              <p className="text-muted-foreground text-lg">
                Review and respond to this collaboration opportunity
              </p>
            </div>
            <Badge variant="outline" className={`${statusColor} px-4 py-2 text-sm font-semibold`}>
              {data.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sender Information Card */}
            <Card className="p-6 border-2 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={data.sender?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(data.sender?.email || "U")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {data.sender?.name || data.sender?.email}
                    </h2>
                    {data.sender?.userType && (
                      <Badge variant="secondary" className="mb-2">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {data.sender.userType}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {data.sender?.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{data.sender.email}</span>
                      </div>
                    )}
                    
                    {data.sender?.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{data.sender.location}</span>
                      </div>
                    )}
                    
                    {data.sender?.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <a 
                          href={data.sender.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary transition-colors"
                        >
                          {data.sender.website}
                        </a>
                      </div>
                    )}
                    
                    {data.sender?.createdAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>Joined {formatDate(data.sender.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  {data.sender?.bio && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {data.sender.bio}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Message Card */}
            <Card className="p-6 border-2">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Message</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {data.message || "No message provided."}
                </p>
              </div>
            </Card>

            {/* Proposed Terms (if available) */}
            {data.proposedTerms && (
              <Card className="p-6 border-2">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Proposed Terms</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {JSON.stringify(data.proposedTerms, null, 2)}
                  </pre>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            {canAct && (
              <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20">
                <h3 className="text-lg font-semibold mb-4">Take Action</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 h-12 text-base"
                    disabled={isActionLoading}
                    onClick={handleAccept}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {acceptMutation.isPending ? "Accepting..." : "Accept Request"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base"
                    disabled={isActionLoading}
                    onClick={handleReject}
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
                  </Button>
                </div>
              </Card>
            )}

            {!canAct && data.response && (
              <Card className="p-6 bg-muted/30">
                <h3 className="text-lg font-semibold mb-3">Response</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {data.response}
                </p>
                {data.respondedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Responded on {formatDate(data.respondedAt)}
                  </p>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Request Details Card */}
            <Card className="p-6 border-2 sticky top-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Request Details
              </h3>
              
              <div className="space-y-4">
                {data.targetType && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Request Type
                    </label>
                    <p className="text-sm font-semibold mt-1">{data.targetType}</p>
                  </div>
                )}

                {data.targetType && <Separator />}

                {data.roleApplied && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Role Applied For
                      </label>
                      <Badge variant="outline" className="mt-2">
                        {data.roleApplied}
                      </Badge>
                    </div>
                    <Separator />
                  </>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Submitted On
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(data.createdAt)}</p>
                  </div>
                </div>

                {/* Project Info with Link */}
                {data.project && data.projectId && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Project
                      </label>
                      <Link 
                        href={`/marketplace/projects/${data.projectId}`}
                        className="group mt-2 flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold flex-1 group-hover:text-primary transition-colors">
                          {data.project.name}
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </div>
                  </>
                )}

                {/* Team Info with Link */}
                {data.team && data.teamId && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Team
                      </label>
                      <Link 
                        href={`/marketplace/teams/${data.teamId}`}
                        className="group mt-2 flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Users className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold flex-1 group-hover:text-primary transition-colors">
                          {data.team.name}
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </div>
                  </>
                )}

                {/* Proposal Info */}
                {data.proposal && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Related Proposal
                      </label>
                      <div className="mt-2 p-3 rounded-lg border bg-muted/30">
                        <p className="text-sm font-semibold mb-2">{data.proposal.title}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {data.proposal.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {data.proposal.intent}
                          </Badge>
                        </div>
                        {data.proposal.industry && data.proposal.industry.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1.5">Industries:</p>
                            <div className="flex flex-wrap gap-1">
                              {data.proposal.industry.map((ind: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {ind}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Verification Status */}
            {data.sender && (
              <Card className="p-6 border-2">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Sender Verification
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Email Verified</span>
                    {data.sender.isVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>KYC Verified</span>
                    {data.sender.isKycVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Credibility Score</span>
                    <Badge variant="outline">
                      {data.sender.credibilityScore || 0}/100
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}