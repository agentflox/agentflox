"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, Zap, FileText } from "lucide-react";
import { MarketplaceListing } from "../types/marketplace.types";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ApplyStep = "form" | "submitting" | "success";

export function ApplyToListingForm({
  listing,
  onDone,
  onCancel,
  className,
}: {
  listing: MarketplaceListing;
  onDone?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<ApplyStep>("form");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const applyMutation = trpc.marketplace.applyToListing.useMutation();
  const { data: existingApplication, isLoading: checkingExisting } =
    trpc.marketplace.myApplicationForListing.useQuery(
      { listingId: listing.id },
      { enabled: !!listing.id, staleTime: 60_000, gcTime: 5 * 60_000 }
    );

  const isConnect = ["talent", "team"].includes(listing.type);
  const actionLabel = isConnect ? "Connect" : "Apply";

  const submissionFields = useMemo(() => {
    const schemaFields = (listing.applicationSchema ?? listing.proposalSchema)?.fields;
    if (schemaFields?.length) return schemaFields;

    return [
      {
        id: "submission_title",
        type: "text",
        label: "Title",
        required: true,
        placeholder: "Add a short title for your submission",
        description: "Required for every applicant submission.",
      },
      {
        id: "proposal_content",
        type: "textarea",
        label: "Proposal content",
        required: true,
        placeholder: "Describe your experience, approach, and why you are a fit.",
        description: "Required for every applicant submission.",
      },
      ...(!listing.isFree
        ? [
          {
            id: "submission_budget",
            type: "currency",
            label: "Budget",
            required: true,
            placeholder: "e.g. 1200 USD or 40 USD/hour",
            description: "Required for paid listings only.",
          },
        ]
        : []),
    ];
  }, [listing]);

  const handleSubmit = async () => {
    if (!String(answers["submission_title"] ?? "").trim()) {
      toast({
        title: "Title required",
        description: "Add a short title for your submission.",
        variant: "destructive",
      });
      return;
    }

    if (!String(answers["proposal_content"] ?? "").trim()) {
      toast({
        title: "Proposal content required",
        description: "Describe your experience and plan.",
        variant: "destructive",
      });
      return;
    }

    setStep("submitting");
    try {
      const submissionTitle = String(answers["submission_title"] ?? "").trim();
      const proposalContent = String(answers["proposal_content"] ?? "").trim();
      const submissionBudget = String(answers["submission_budget"] ?? "").trim();

      await applyMutation.mutateAsync({
        listingId: listing.id,
        pitch: proposalContent,
        targetRate: submissionBudget || undefined,
        proposalText: submissionTitle
          ? `${submissionTitle}${proposalContent ? `\n\n${proposalContent}` : ""}`
          : proposalContent || undefined,
        answers,
      });

      setStep("success");
      onDone?.();
    } catch (err: any) {
      toast({
        title: "Application failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
      setStep("form");
    }
  };

  const canSubmit =
    !!String(answers["submission_title"] ?? "").trim() &&
    !!String(answers["proposal_content"] ?? "").trim();

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="px-8 pt-8 pb-6 border-b border-border bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex flex-col justify-center pt-0.5">
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                {actionLabel} for: <span className="text-indigo-600 dark:text-indigo-400">{listing.title}</span>
              </h1>
              <p className="text-[13px] font-mono text-muted-foreground mt-1.5 font-medium">ID: {listing.id}</p>
            </div>
          </div>

          {(listing.skills?.length ?? 0) > 0 && listing.skills && (
            <div className="mt-4 p-3 rounded-lg bg-muted/60 border border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                Required Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {listing.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs px-2 py-0.5 bg-background">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-8">
          {existingApplication && step === "form" && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              You have already submitted an application for this listing. You can continue the conversation in{" "}
              <strong>Messages</strong> or under <strong>Personal → Applications</strong>.
            </div>
          )}
          {step === "form" && (
            <div className="space-y-6">
              <div className="space-y-5 rounded-xl border border-border/80 bg-zinc-50/50 dark:bg-zinc-900/20 p-6">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Application Form Fields
                </label>
                <div className="space-y-5">
                  {submissionFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={answers[field.id] || ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.placeholder || "Enter your answer..."}
                          className="min-h-[150px] text-[15px] resize-none leading-relaxed bg-white dark:bg-zinc-900/50 shadow-sm focus-visible:ring-indigo-500/30"
                        />
                      ) : (
                        <Input
                          value={answers[field.id] || ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.placeholder || "Enter your answer..."}
                          className="h-11 text-[15px] bg-white dark:bg-zinc-900/50 shadow-sm focus-visible:ring-indigo-500/30"
                        />
                      )}
                      {field.description && (
                        <p className="text-[11.5px] font-medium text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
                </div>
                <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Sending your application...</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Application Sent!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Your {isConnect ? "connection request" : "application"} has been submitted. You'll be notified once reviewed.
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Track it under <strong>Personal → Applications</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-border bg-muted/30 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === "success") onCancel?.();
              else onCancel?.();
            }}
            className="font-medium cursor-pointer"
          >
            {step === "success" ? "Back" : "Cancel"}
          </Button>
          {step === "form" && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || !!existingApplication || checkingExisting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm px-6 h-10"
            >
              <Send className="h-4 w-4" />
              Submit {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

