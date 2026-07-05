"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import {
  ArrowLeft,
  MoreVertical,
  Shield,
  Ban,
  UserMinus,
  Flag,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AppealSkeleton } from "@/features/community/components/GroupSkeletons";

export default function GroupAppealsPage() {
  const params = useParams();
  const groupId = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.communityGroup.listAppeals.useQuery({ groupId }, { enabled: !!groupId });
  const respond = trpc.communityGroup.respondAppeal.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.listAppeals.invalidate({ groupId });
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const report = trpc.communityGroup.reportAppeal.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.listAppeals.invalidate({ groupId });
    },
  });
  const unblock = trpc.communityGroup.unblockMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.listAppeals.invalidate({ groupId });
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const removeMember = trpc.communityGroup.removeMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const blockMember = trpc.communityGroup.blockMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });

  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportExplanation, setReportExplanation] = useState("");

  const appeals = data?.items || [];
  const isOwner = !!data?.isOwner;
  const selectedAppeal = appeals.find(a => a.id === selectedAppealId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 cursor-wait"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Group
          </button>
          <div className="h-6 w-48 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <AppealSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/community/group/${groupId}`)}
          className="group inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Group
        </button>

        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-900">Moderation Appeals</h1>
        </div>
      </div>

      <div className="space-y-4">
        {appeals.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <Clock className="h-12 w-12 text-slate-200" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No appeals yet</h3>
            <p className="mt-1 text-sm text-slate-500">When members appeal their blocks, they will appear here.</p>
          </Card>
        )}

        {appeals.map((appeal) => (
          <Card key={appeal.id} className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 border border-slate-100">
                    <AvatarImage src={appeal.user.image || ""} />
                    <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">
                      {(appeal.user.name?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{appeal.user.name || "Member"}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider px-2 py-0",
                          appeal.status === "PENDING" && "bg-amber-50 text-amber-600 border-amber-100",
                          appeal.status === "RESPONDED" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                          appeal.status === "REJECTED" && "bg-rose-50 text-rose-600 border-rose-100"
                        )}
                      >
                        {appeal.status}
                      </Badge>
                    </div>
                    <p className="text-[15px] leading-relaxed text-slate-700">{appeal.message}</p>

                    {appeal.responseMessage && (
                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 relative">
                        <div className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-100 rounded">
                          Response
                        </div>
                        <p className="text-sm text-slate-600 italic">"{appeal.responseMessage}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-900">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1.5">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => {
                          setSelectedAppealId(appeal.id);
                          setResponseMessage(appeal.responseMessage || "");
                          setResponseDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 text-indigo-500" />
                        Send Response
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => {
                          setSelectedAppealId(appeal.id);
                          setReportDialogOpen(true);
                        }}
                      >
                        <Flag className="h-4 w-4 text-amber-500" />
                        Report Appeal
                      </DropdownMenuItem>
                      <div className="my-1 border-t border-slate-100" />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-emerald-600"
                        onClick={async () => {
                          await unblock.mutateAsync({ groupId, memberUserId: appeal.userId });
                          toast({ title: "Member unblocked successfully" });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve & Unblock
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-rose-600"
                        onClick={async () => {
                          await blockMember.mutateAsync({
                            groupId,
                            memberUserId: appeal.userId,
                            blockPost: true,
                            blockJoin: true,
                            removeFromGroup: true,
                          });
                          toast({ title: "Member block maintained" });
                        }}
                      >
                        <Ban className="h-4 w-4" />
                        Maintain Block
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Response Modal */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Respond to Appeal</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {selectedAppeal && (
              <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 block">Appeal Message</label>
                <p className="text-sm text-indigo-900 leading-relaxed">"{selectedAppeal.message}"</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Your Response</Label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Explain your decision to the member..."
                className="min-h-[160px] rounded-xl border-slate-200 focus:ring-indigo-100 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full cursor-pointer h-11"
                onClick={async () => {
                  if (!selectedAppealId) return;
                  await respond.mutateAsync({
                    appealId: selectedAppealId,
                    status: "REJECTED",
                    responseMessage,
                  });
                  setResponseDialogOpen(false);
                  toast({ title: "Appeal Rejected", description: "The member has been notified." });
                }}
              >
                Reject Appeal
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-full cursor-pointer bg-indigo-600 hover:bg-indigo-700 h-11 shadow-lg shadow-indigo-200"
                onClick={async () => {
                  if (!selectedAppealId) return;
                  await respond.mutateAsync({
                    appealId: selectedAppealId,
                    status: "RESPONDED",
                    responseMessage,
                  });
                  setResponseDialogOpen(false);
                  toast({ title: "Appeal Approved", description: "The member has been unblocked." });
                }}
              >
                Approve & Unblock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Report Appeal</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Reason</Label>
              <p className="text-xs text-slate-500 mb-2">Please select a reason for reporting this content.</p>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 cursor-pointer">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Harassment" className="cursor-pointer">Harassment</SelectItem>
                  <SelectItem value="Spam" className="cursor-pointer">Spam</SelectItem>
                  <SelectItem value="Incorrect space/post" className="cursor-pointer">Incorrect space/post</SelectItem>
                  <SelectItem value="Against community guidelines" className="cursor-pointer">Against community guidelines</SelectItem>
                  <SelectItem value="Other" className="cursor-pointer">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Explanation</Label>
              <p className="text-xs text-slate-500 mb-2">Optionally, provide an explanation.</p>
              <Textarea
                value={reportExplanation}
                onChange={(e) => setReportExplanation(e.target.value)}
                placeholder="Provide additional context for the administrators..."
                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-indigo-100 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full cursor-pointer h-11"
                onClick={() => setReportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white cursor-pointer h-11 shadow-lg"
                onClick={async () => {
                  if (!selectedAppealId) return;
                  await report.mutateAsync({
                    appealId: selectedAppealId,
                  });
                  setReportDialogOpen(false);
                  toast({ title: "Appeal Reported", description: "Our team will review this moderation request." });
                }}
              >
                Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

