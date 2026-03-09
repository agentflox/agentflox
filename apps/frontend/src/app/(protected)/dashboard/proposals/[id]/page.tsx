"use client";
import Shell from "@/components/layout/Shell";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ProposalForm from '@/entities/proposals/components/ProposalForm';
import ProposalView from '@/features/dashboard/views/proposal/ProposalView';
import Button from "@/components/ui/button";

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const search = useSearchParams();
  const [editing, setEditing] = useState(false);
  const { data: proposal, isLoading, error } = trpc.proposal.get.useQuery({ id }, { enabled: !!id });
  const router = useRouter();

  useEffect(() => {
    const shouldEdit = search?.get('edit') === '1';
    if (shouldEdit) setEditing(true);
  }, []);

  // Redirect to dashboard if Proposal doesn't exist
  useEffect(() => {
    if (!isLoading && !proposal && !error) {
      router.push('/dashboard/proposals');
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
    return null; 
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {editing ? "Edit Proposal" : proposal?.title || "Proposal"}
        </h1>
        <Button onClick={() => setEditing((v) => !v)}>
          {editing ? "View" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <ProposalForm proposalId={id} mode="edit" />
      ) : (
        <ProposalView proposal={proposal} />
      )}
    </div>
  );
}