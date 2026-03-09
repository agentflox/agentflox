"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useReduxStore';
import { RootState } from '@/stores/store';
import { upsertProposal, setCurrentProposal } from '@/stores/slices/proposal.slice';
import { serializeDates } from '@/stores/utils/serialize';
import { trpc } from '@/lib/trpc';
import Shell from '@/components/layout/Shell';
import Button from '@/components/ui/button';
import SyncWarningBanner from '@/components/ui/sync-warning-banner';
import BackButton from '@/components/navigation/BackButton';
import { normalizeForComparison, deepEqual } from '@/utils/utilities/syncUtils';

const METADATA_FIELDS = ['id', 'createdAt', 'updatedAt', 'cloudSyncedAt', 'userId'] as const;

const checkForDataDifferences = function(local: any, cloud: any) {
  if (!local || !cloud) return false;
  var normalizedLocal = normalizeForComparison(METADATA_FIELDS, local);
  var normalizedCloud = normalizeForComparison(METADATA_FIELDS, cloud);
  return !deepEqual(normalizedLocal, normalizedCloud);
};

const cleanDataForMutation = (data: any) => {
  const cleaned = { ...data };
  const nullableFields = ['projectId', 'expiresAt', 'timezone', 'teamId', 'currency', 'language', 'visibility'];
  nullableFields.forEach(field => {
    if (cleaned[field] === null) delete cleaned[field];
  });
  
  return cleaned;
};

interface ProposalLayoutProps {
  children: React.ReactNode;
}

export default function ProposalLayout({ children }: ProposalLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const proposalId = params?.id as string;
  
  // Use selector with proper memoization
  const localDraft = useAppSelector(
    useCallback((s: RootState) => s.proposals.items[proposalId], [proposalId])
  );
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track if we've done initial sync check to prevent duplicate warnings
  const hasCheckedInitialSync = useRef(false);

  const proposalInput = useMemo(
    () => (proposalId ? { id: proposalId } : { id: "" }),
    [proposalId]
  );

  const { data: cloudData, isLoading: isCloudLoading, refetch } = trpc.proposal.get.useQuery(
    proposalInput,
    {
      enabled: !!proposalId,
      refetchOnWindowFocus: true,
      refetchInterval: 5 * 60 * 1000,
    }
  );

  const updateMutation = trpc.proposal.update.useMutation();
  const saveDraftMutation = trpc.proposal.saveDraft.useMutation();

  // Memoize current status
  const currentStatus = useMemo(
    () => cloudData?.status || localDraft?.status || 'DRAFT',
    [cloudData?.status, localDraft?.status]
  );
  const isPublished = currentStatus === 'PUBLISHED';

  const handleToggleStatus = async () => {
    if (!proposalId) return;
    
    setIsPublishing(true);
    try {
      const newStatus = isPublished ? 'DRAFT' : 'PUBLISHED';
      await updateMutation.mutateAsync({
        id: proposalId,
        status: newStatus
      });
      
      // Update local state
      dispatch(upsertProposal({ 
        id: proposalId, 
        data: { ...localDraft, status: newStatus } 
      }));
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Redirect if no proposalId
  useEffect(() => {
    if (!proposalId) {
      router.push('/dashboard/proposals');
    }
  }, [proposalId, router]);

  // Set current proposal in Redux
  useEffect(() => {
    if (proposalId) {
      dispatch(setCurrentProposal(proposalId));
    }
  }, [dispatch, proposalId]);

  // Load cloud data into Redux if not present locally
  useEffect(() => {
    if (cloudData && !localDraft && proposalId) {
      dispatch(upsertProposal({ id: proposalId, data: serializeDates(cloudData as any) }));
    }
  }, [cloudData, localDraft, proposalId, dispatch]);

  // Check for sync conflicts only once on initial load
  useEffect(() => {
    if (cloudData && localDraft && !hasCheckedInitialSync.current) {
      const hasConflict = checkForDataDifferences(localDraft, cloudData);
      if (hasConflict) {
        setShowSyncWarning(true);
      }
      hasCheckedInitialSync.current = true;
    }
  }, [cloudData, localDraft]);

  // Memoize sync conflict checker
  const checkSyncConflict = useCallback(async (): Promise<boolean> => {
    if (!isCloudLoading && cloudData && localDraft && proposalId) {
      const hasLocalChanges = checkForDataDifferences(localDraft, cloudData);
      
      if (hasLocalChanges) {
        console.log('Sync conflict detected');
        setShowSyncWarning(true);
        return true;
      }
      
      setShowSyncWarning(false);
      return false;
    }
    return false;
  }, [isCloudLoading, cloudData, localDraft, proposalId]);

  const handleSyncAndSave = useCallback(async () => {
    if (!proposalId || !localDraft) return;
    
    setIsSyncing(true);
    try {
      const cleanedData = cleanDataForMutation(localDraft);
      await saveDraftMutation.mutateAsync({
        id: proposalId,
        ...cleanedData,
      });
      await refetch();
      setShowSyncWarning(false);
      hasCheckedInitialSync.current = true; // Reset check after successful sync
    } catch (error) {
      console.error('Failed to sync and save:', error);
      // Consider adding user-facing error notification here
    } finally {
      setIsSyncing(false);
    }
  }, [proposalId, localDraft, saveDraftMutation, refetch]);

  const handleSkipSync = useCallback(() => {
    if (cloudData && proposalId) {
      dispatch(upsertProposal({ id: proposalId, data: serializeDates(cloudData as any) }));
    }
    setShowSyncWarning(false);
    hasCheckedInitialSync.current = true; // Reset check after skipping
  }, [cloudData, proposalId, dispatch]);
  
  return (
    <Shell>
      <SyncWarningBanner
        isVisible={showSyncWarning}
        onSyncAndSave={handleSyncAndSave}
        onSkip={handleSkipSync}
        isLoading={isSyncing}
      />
      
      <div className="flex justify-between">
        <BackButton 
          onBeforeNavigate={checkSyncConflict}
          fallbackPath="/dashboard/proposals"
        >
          Back to Proposals
        </BackButton>
        
        <div className="w-64 bg-muted/50 border-r p-4">
          <div className="space-y-4">
            <h3 className="font-semibold">Proposal Actions</h3>
            <Button
              onClick={handleToggleStatus}
              disabled={isPublishing || updateMutation.isPending}
              variant={isPublished ? "outline" : "primary"}
              className="w-full"
            >
              {isPublishing || updateMutation.isPending 
                ? 'Updating...' 
                : isPublished 
                  ? 'Unpublish' 
                  : 'Publish'
              }
            </Button>
            <div className="text-sm text-muted-foreground">
              Status: <span className="font-medium">{currentStatus}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </Shell>
  );
}