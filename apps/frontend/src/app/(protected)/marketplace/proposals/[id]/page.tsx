"use client";
import Shell from "@/components/layout/Shell";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ProposalView from '@/features/marketplace/views/proposal/PublicProposalView';
import Button from "@/components/ui/button";

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const search = useSearchParams();
  const [editing, setEditing] = useState(false);
  const { data: proposal, isLoading, error } = trpc.proposal.getSinglePublicProposal.useQuery({ id }, { enabled: !!id });
  const router = useRouter();

  // Redirect to dashboard if Proposal doesn't exist
  useEffect(() => {
    if (!isLoading && !proposal && !error) {
      router.push('/marketplace/proposals');
    }
  }, [proposal, isLoading, error, router]);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading Proposal...</p>
        </div>
      </Shell>
    );
  }

  if (!proposal) {
    return null; // Will redirect via useEffect
  }
  return (
    <Shell>
      <ProposalView proposal={proposal} />
    </Shell>
  );
}