"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, Zap, Clock, DollarSign, User } from "lucide-react";
import { MarketplaceListing } from "../types/marketplace.types";
import { useToast } from "@/hooks/useToast";

interface ApplyToListingModalProps {
  listing: MarketplaceListing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ApplyStep = 'form' | 'submitting' | 'success';

export function ApplyToListingModal({ listing, open, onOpenChange }: ApplyToListingModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<ApplyStep>('form');
  const [pitch, setPitch] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");

  const isConnect = ['talent', 'team'].includes(listing.type);
  const actionLabel = isConnect ? 'Connect' : 'Apply';

  const handleSubmit = async () => {
    if (!pitch.trim()) {
      toast({ title: "Pitch required", description: "Tell them why you're the right fit.", variant: "destructive" });
      return;
    }

    setStep('submitting');

    try {
      // TODO: Wire to real API when backend endpoint is available
      // await trpc.marketplace.applyToListing.mutate({ listingId: listing.id, pitch, targetRate, estimatedDuration });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated delay
      setStep('success');
    } catch (err: any) {
      toast({ title: "Application failed", description: err.message, variant: "destructive" });
      setStep('form');
    }
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state after close animation
      setTimeout(() => { setStep('form'); setPitch(""); setTargetRate(""); setEstimatedDuration(""); }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl">
        {/* Header Accent */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

        <DialogHeader className="px-6 pt-5 pb-2">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight">
                {actionLabel} for: <span className="text-indigo-600 truncate">{listing.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                by {listing.author.name}
              </DialogDescription>
            </div>
          </div>

          {/* Listing requirements preview */}
          {listing.skills.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-muted/60 border border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                Required Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {listing.skills.map(skill => (
                  <Badge key={skill} variant="outline" className="text-xs px-2 py-0.5 bg-background">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === 'form' && (
            <div className="space-y-4 mt-4 animate-in fade-in duration-300">
              {/* Pitch */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your {isConnect ? 'Introduction' : 'Pitch'} *
                </label>
                <Textarea
                  value={pitch}
                  onChange={e => setPitch(e.target.value)}
                  placeholder={isConnect
                    ? "Introduce yourself and explain why you'd be a great collaboration partner..."
                    : "Why are you the right person for this? Highlight relevant experience and your approach..."
                  }
                  className="min-h-[120px] text-sm resize-none leading-relaxed"
                />
              </div>

              {/* Rate + Duration (only for task/project, not team/talent connects) */}
              {!isConnect && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" /> Rate / Budget
                    </label>
                    <Input
                      value={targetRate}
                      onChange={e => setTargetRate(e.target.value)}
                      placeholder="e.g. $50/hr or $2,000 fixed"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Est. Duration
                    </label>
                    <Input
                      value={estimatedDuration}
                      onChange={e => setEstimatedDuration(e.target.value)}
                      placeholder="e.g. 2 weeks, 3 months"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4 animate-in fade-in">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
                </div>
                <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Sending your application...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Application Sent!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Your {isConnect ? 'connection request' : 'application'} has been submitted. You'll be notified once reviewed.
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Track it under <strong>Personal → Applications</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {step === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'form' && (
            <Button
              onClick={handleSubmit}
              disabled={!pitch.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Send className="h-4 w-4" />
              Submit {actionLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
