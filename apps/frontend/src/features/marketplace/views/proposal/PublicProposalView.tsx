// components/public/proposal-public-view.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  TrendingUp,
  Briefcase,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Star,
  Award,
} from 'lucide-react';

import Button from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProposalCommentSection from '@/entities/proposals/components/ProposalCommentSection';
// Local format helpers to avoid external deps
const formatDate = (d: string | Date) => new Date(d).toLocaleDateString();
const formatCurrency = (n: number, currency: string = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
import { trpc } from '@/lib/trpc';
import RequestModal from '@/entities/requests/components/RequestModal';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

export default function ProposalPublicView({ proposal }: { proposal: any }) {
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();
  const router = useRouter();
  const { data: currentUser } = trpc.user.me.useQuery();
  const utils = trpc.useUtils();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isInitiallyInterested = useMemo(
    () => (proposal?.likes || []).some((l: any) => l.userId === currentUser?.id),
    [proposal?.likes, currentUser?.id]
  );
  const [isInterested, setIsInterested] = useState<boolean>(isInitiallyInterested);

  const toggleInterestMutation = trpc.proposal.toggleInterest.useMutation({
    onSuccess: () => utils.proposal.getSinglePublicProposal.invalidate({ id: proposal.id }),
  });

  const handleInterest = async () => {
    if (!currentUser?.id) return;
    try {
      await toggleInterestMutation.mutateAsync({ proposalId: proposal.id });
      setIsInterested((v) => !v);
    } catch {
      toast({ title: 'Failed to update interest', variant: 'destructive' });
    }
  };

  const handleRequest = () => {
    if (!currentUser?.id) return;
    if (currentUser.id === proposal.user?.id) {
      toast({ title: 'You cannot request your own proposal', variant: 'destructive' });
      return;
    }
    setShowRequestModal(true);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/proposals/${proposal.id}`);
      toast({ title: 'Link copied to clipboard' });
    } catch {}
  };

  const getProposalTypeConfig = () => {
    const configs = {
      INVESTMENT: {
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
        label: 'Investment Opportunity',
      },
      MENTORSHIP: {
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
        label: 'Mentorship',
      },
      TEAM: {
        icon: Briefcase,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
        label: 'Team Position',
      },
      COFOUNDER: {
        icon: Star,
        color: 'text-amber-600',
        bgColor: 'bg-amber-500/10',
        label: 'Co-Founder',
      },
      PARTNERSHIP: {
        icon: Award,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-500/10',
        label: 'Partnership',
      },
      CUSTOMER: {
        icon: Target,
        color: 'text-pink-600',
        bgColor: 'bg-pink-500/10',
        label: 'Customer/Product',
      },
      MEMBERSHIP: {
        icon: Users,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-500/10',
        label: 'Membership',
      },
    };
    return configs[proposal.category as keyof typeof configs] || configs.TEAM;
  };

  const config = getProposalTypeConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-card">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-5xl"
          >
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/proposals" className="hover:text-foreground">
                Proposals
              </Link>
              <span>/</span>
              <span className="text-foreground">{proposal.category}</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Category Badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={`${config.bgColor} ${config.color} gap-2 border-none px-4 py-2 text-sm font-semibold`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                  <Badge
                    variant={proposal.intent === 'SEEKING' ? 'default' : 'outline'}
                    className="px-3 py-1"
                  >
                    {proposal.intent === 'SEEKING' ? '🔍 Seeking' : '💼 Offering'}
                  </Badge>
                  {proposal.featured && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-white">
                      ⭐ Featured
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                  {proposal.title}
                </h1>

                {/* Short Summary */}
                <p className="text-xl leading-relaxed text-muted-foreground">
                  {proposal.shortSummary}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {formatDate(proposal.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>{proposal.views} views</span>
                  </div>
                  {proposal.expiresAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>
                        Expires {formatDate(proposal.expiresAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <QuickStat
                    icon={Heart}
                    value={proposal._count?.likes || 0}
                    label="Likes"
                  />
                  <QuickStat
                    icon={MessageCircle}
                    value={proposal._count?.comments || 0}
                    label="Comments"
                  />
                  <QuickStat
                    icon={Bookmark}
                    value={proposal.bookmarks}
                    label="Saved"
                  />
                  <QuickStat
                    icon={Share2}
                    value={0}
                    label="Shares"
                  />
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    className={`gap-2 ${isInterested ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : ''}`}
                    disabled={!currentUser?.id || toggleInterestMutation.isPending}
                    onClick={handleInterest}
                  >
                    <Heart className={`h-4 w-4 ${isInterested ? 'fill-current' : ''}`} />
                    {isInterested ? 'Interested' : 'Mark as Interested'}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleRequest} disabled={!currentUser?.id}>
                    <MessageCircle className="h-4 w-4" />
                    Send Request
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Right Column - Creator Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6 border-2 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Posted By
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Link
                      href={`/profile/${proposal.user.username}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16 border-2">
                          <AvatarImage src={proposal.user.avatar || ''} />
                          <AvatarFallback className="text-lg">
                            {proposal.user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold truncate">
                              {proposal.user.name}
                            </p>
                            {proposal.user.verificationLevel !== 'UNVERIFIED' && (
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{proposal.user.username}
                          </p>
                          {proposal.user.credibilityScore > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium">
                                {proposal.user.credibilityScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    <Separator />

                    {proposal.user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {proposal.user.bio}
                      </p>
                    )}

                    <Link href={`/profile/${proposal.user.username}`} className="inline-flex w-full justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                      View Full Profile
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="discussion">Discussion</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-6 space-y-6">
                  {/* Detailed Description */}
                  <Card>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none p-6">
                      <h2 className="text-2xl font-bold">Description</h2>
                      <div
                        className="text-base leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: proposal.detailedDesc.replace(/\n/g, '<br />'),
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Category-Specific Details */}
                  {renderCategoryDetails(proposal)}

                  {/* Budget */}
                  {proposal.budget && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                          <DollarSign className="h-5 w-5" />
                          Budget Information
                        </h3>
                        <div className="space-y-2">
                          {proposal.budget.minAmount && proposal.budget.maxAmount && (
                            <p className="text-lg">
                              <span className="font-semibold">Range: </span>
                              {formatCurrency(proposal.budget.minAmount)} -{' '}
                              {formatCurrency(proposal.budget.maxAmount)}{' '}
                              {proposal.budget.currency}
                            </p>
                          )}
                          {proposal.budget.description && (
                            <p className="text-muted-foreground">
                              {proposal.budget.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline */}
                  {proposal.timeline && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                          <Clock className="h-5 w-5" />
                          Timeline & Commitment
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {proposal.timeline.startDate && (
                            <div>
                              <p className="text-sm text-muted-foreground">Start Date</p>
                              <p className="font-medium">
                                {formatDate(proposal.timeline.startDate)}
                              </p>
                            </div>
                          )}
                          {proposal.timeline.duration && (
                            <div>
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <p className="font-medium">{proposal.timeline.duration}</p>
                            </div>
                          )}
                          {proposal.timeline.commitment && (
                            <div>
                              <p className="text-sm text-muted-foreground">Commitment</p>
                              <p className="font-medium">
                                {proposal.timeline.commitment.replace('_', ' ')}
                              </p>
                            </div>
                          )}
                          {proposal.timeline.urgency && (
                            <div>
                              <p className="text-sm text-muted-foreground">Urgency</p>
                              <Badge
                                variant={
                                  proposal.timeline.urgency === 'HIGH' ||
                                  proposal.timeline.urgency === 'URGENT'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {proposal.timeline.urgency}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Location */}
                  {proposal.location && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                          <MapPin className="h-5 w-5" />
                          Location
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium">
                              {proposal.location.city}, {proposal.location.region},{' '}
                              {proposal.location.country}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {proposal.location.remote && (
                              <Badge variant="secondary">🌍 Remote Available</Badge>
                            )}
                            {proposal.location.hybrid && (
                              <Badge variant="secondary">🏢 Hybrid</Badge>
                            )}
                            {proposal.location.willRelocate && (
                              <Badge variant="secondary">✈️ Open to Relocation</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="requirements" className="mt-6 space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="mb-4 text-2xl font-bold">Requirements & Qualifications</h2>
                      <p className="text-foreground/80">
                        {Array.isArray(proposal.requiredSkills) && proposal.requiredSkills.length > 0
                          ? `Key skills: ${proposal.requiredSkills.join(', ')}`
                          : 'No additional requirements provided.'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="discussion" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <ProposalCommentSection proposalId={proposal.id} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">

              {/* Quick Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Status" value={proposal.status} />
                  <InfoRow label="Visibility" value={proposal.visibility} />
                  <InfoRow label="Language" value={proposal.language.toUpperCase()} />
                  {proposal.currency && (
                    <InfoRow label="Currency" value={proposal.currency} />
                  )}
                </CardContent>
              </Card>

              {/* Industries */}
              {proposal.industry.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Industries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {proposal.industry.map((ind: string) => (
                        <Badge key={ind} variant="outline">
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Keywords/Tags */}
              {proposal.keywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {proposal.keywords.map((keyword: string) => (
                        <Badge key={keyword} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact */}
              {proposal.contact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {proposal.contact.publicProfile && (
                      <>
                        {proposal.contact.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{proposal.contact.email}</p>
                          </div>
                        )}
                        {proposal.contact.linkedin && (
                          <div>
                            <p className="text-sm text-muted-foreground">LinkedIn</p>
                            <a
                              href={proposal.contact.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              View Profile
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Preferred Contact</p>
                      <Badge variant="secondary">
                        {proposal.contact.preferredContact}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Related Project/Team */}
              {(proposal.project || proposal.teamId) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Related To</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {proposal.project && (
                      <Link
                        href={`/projects/${proposal.project.id}`}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted"
                      >
                        {proposal.project.logo && (
                          <Image
                            src={proposal.project.logo}
                            alt={proposal.project.name}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{proposal.project.name}</p>
                          <p className="text-sm text-muted-foreground">View Project</p>
                        </div>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
      {showRequestModal && (
        <RequestModal
          proposalId={proposal.id}
          proposalTitle={proposal.title}
          proposalOwnerId={proposal.user?.id || ''}
          proposalIntent={(proposal.intent === 'SEEKING' || proposal.intent === 'OFFERING') ? proposal.intent : 'OFFERING'}
          proposalType={(['INVESTMENT','MENTORSHIP','TEAM','COFOUNDER','PARTNERSHIP','CUSTOMER','PROJECT'] as const).includes(proposal.category as any) ? proposal.category as any : 'PROJECT'}
          projectId={proposal.projectId || ''}
          teamId={proposal.teamId || ''}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}

// Helper Components
function QuickStat({ icon: Icon, value, label }: any) {
  return (
    <div className="flex flex-col items-center rounded-lg border bg-card p-3">
      <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// Category-specific details rendering
function renderCategoryDetails(proposal: any) {
  switch (proposal.category) {
    case 'INVESTMENT':
      return proposal.investor && <InvestorDetails data={proposal.investor} />;
    case 'MENTORSHIP':
      return proposal.mentor && <MentorDetails data={proposal.mentor} />;
    case 'TEAM':
      return proposal.team && <TeamDetails data={proposal.team} />;
    case 'COFOUNDER':
      return proposal.cofounder && <CofounderDetails data={proposal.cofounder} />;
    case 'PARTNERSHIP':
      return proposal.partner && <PartnerDetails data={proposal.partner} />;
    case 'CUSTOMER':
      return proposal.customer && <CustomerDetails data={proposal.customer} />;
    case 'MEMBERSHIP':
      return proposal.membership && <Card><CardContent className="p-6"><h3 className="mb-4 text-xl font-bold">Membership Details</h3><p className="text-foreground/80">Membership information is provided by the project.</p></CardContent></Card>;
    default:
      return null;
  }
}

function InvestorDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Investment Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {typeof data.fundingNeeded === 'number' && (
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Funding Needed</span><span className="text-sm font-medium">{formatCurrency(data.fundingNeeded)}</span></div>
          )}
          {data.fundingType && (
            <DetailItem label="Funding Type" value={data.fundingType.replace('_', ' ')} />
          )}
          {data.stage && (
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Startup Stage</span><span className="text-sm font-medium">{data.stage}</span></div>
          )}
          {typeof data.equityOffered === 'number' && (
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Equity Offered</span><span className="text-sm font-medium">{`${data.equityOffered}%`}</span></div>
          )}
          {typeof data.currentRevenue === 'number' && (
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Current Revenue</span><span className="text-sm font-medium">{formatCurrency(data.currentRevenue)}</span></div>
          )}
          {typeof data.teamSize === 'number' && (
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Team Size</span><span className="text-sm font-medium">{`${data.teamSize} members`}</span></div>
          )}
        </div>
        {data.useOfFunds && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Use of Funds</p>
            <p className="text-foreground/80">{data.useOfFunds}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MentorDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Mentorship Details</h3>
        {data.guidanceAreas && data.guidanceAreas.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Guidance Areas</p>
            <div className="flex flex-wrap gap-2">
              {data.guidanceAreas.map((area: string) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.expertiseAreas && data.expertiseAreas.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Expertise Areas</p>
            <div className="flex flex-wrap gap-2">
              {data.expertiseAreas.map((area: string) => (
                <Badge key={area} variant="outline">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.yearsExperience && (
          <DetailItem label="Years of Experience" value={`${data.yearsExperience} years`} />
        )}
        {data.compensationExp && (
          <DetailItem label="Compensation" value={data.compensationExp} />
        )}
      </CardContent>
    </Card>
  );
}

function TeamDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Position Details</h3>
        <div className="space-y-4">
          {data.roleTitle && (
            <DetailItem label="Role" value={data.roleTitle} />
          )}
          {data.seniority && (
            <DetailItem label="Seniority Level" value={data.seniority.replace('_', ' ')} />
          )}
          {data.workArrangement && (
            <DetailItem label="Work Arrangement" value={data.workArrangement} />
          )}
          {data.mustHaveSkills && data.mustHaveSkills.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {data.mustHaveSkills.map((skill: string) => (
                  <Badge key={skill} variant="default">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {data.niceToHaveSkills && data.niceToHaveSkills.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Nice to Have</p>
              <div className="flex flex-wrap gap-2">
                {data.niceToHaveSkills.map((skill: string) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CofounderDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Co-Founder Details</h3>
        <div className="space-y-4">
          {data.roleTitle && (
            <DetailItem label="Role" value={data.roleTitle} />
          )}
          {data.equityOffered && (
            <DetailItem label="Equity Offered" value={`${data.equityOffered}%`} />
          )}
          {data.timeCommitment && (
            <DetailItem label="Time Commitment" value={data.timeCommitment} />
          )}
          {data.requiredSkills && data.requiredSkills.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {data.requiredSkills.map((skill: string) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </div>
          )}
          {data.personalityTraits && data.personalityTraits.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Desired Personality Traits
              </p>
              <div className="flex flex-wrap gap-2">
                {data.personalityTraits.map((trait: string) => (
                  <Badge key={trait} variant="outline">
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PartnerDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Partnership Details</h3>
        <div className="space-y-4">
          {data.partnershipType && (
            <DetailItem label="Partnership Type" value={data.partnershipType.replace('_', ' ')} />
          )}
          {data.valueOffered && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Value Offered</p>
              <p className="text-foreground/80">{data.valueOffered}</p>
            </div>
          )}
          {data.valueExpected && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Value Expected</p>
              <p className="text-foreground/80">{data.valueExpected}</p>
            </div>
          )}
          {data.exclusivity && (
            <DetailItem label="Exclusivity" value={data.exclusivity.replace('_', ' ')} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerDetails({ data }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-xl font-bold">Customer Details</h3>
        <div className="space-y-3">
          {data.productService && (
            <DetailItem label="Product/Service" value={data.productService} />
          )}
          {data.pricingModel && (
            <DetailItem label="Pricing Model" value={data.pricingModel} />
          )}
          {data.availability && (
            <DetailItem label="Availability" value={data.availability} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
