"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useReduxStore';
import { RootState } from '@/stores/store';
import { upsertTeam, setCurrentTeam } from '@/stores/slices/team.slice';
import { serializeDates } from '@/stores/utils/serialize';
import { trpc } from '@/lib/trpc';
import Shell from '@/components/layout/Shell';
import Button from '@/components/ui/button';
import SyncWarningBanner from '@/components/ui/sync-warning-banner';
import BackButton from '@/components/navigation/BackButton';
import { normalizeForComparison, deepEqual } from '@/utils/utilities/syncUtils';

const METADATA_FIELDS = ['id', 'createdAt', 'updatedAt', 'cloudSyncedAt', 'ownerId'] as const;

const checkForDataDifferences = function (local: any, cloud: any) {
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

interface TeamLayoutProps {
  children: React.ReactNode;
}

export default function TeamLayout({ children }: TeamLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const teamId = params?.id as string;
  const { data: session } = useSession();

  // Use selector with proper memoization
  const localDraft = useAppSelector(
    useCallback((s: RootState) => s.teams.items[teamId], [teamId])
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track if we've done initial sync check to prevent duplicate warnings
  const hasCheckedInitialSync = useRef(false);

  const teamInput = useMemo(
    () => (teamId ? { id: teamId } : { id: "" }),
    [teamId]
  );

  const { data: cloudData, isLoading: isCloudLoading, refetch } = trpc.team.get.useQuery(
    teamInput,
    {
      enabled: !!teamId,
      refetchOnWindowFocus: true,
      refetchInterval: 5 * 60 * 1000,
    }
  );

  const publishMutation = trpc.team.publish.useMutation();
  const saveDraftMutation = trpc.team.saveDraft.useMutation();

  // Memoize current status
  const currentStatus = useMemo(
    () => cloudData?.status || localDraft?.status || 'DRAFT',
    [cloudData?.status, localDraft?.status]
  );
  const isPublished = currentStatus === 'PUBLISHED';

  const isOwner = useMemo(() => {
    return !!(cloudData && (cloudData as any).ownerId && session?.user?.id && (cloudData as any).ownerId === session.user.id);
  }, [cloudData, session?.user?.id]);

  const handleToggleStatus = async () => {
    if (!teamId) return;

    setIsPublishing(true);
    try {
      if (isPublished) {
        // Unpublish - use publish mutation with DRAFT status
        await publishMutation.mutateAsync({
          id: teamId,
          status: 'DRAFT'
        });
      } else {
        // Publish - use publish mutation with PUBLISHED status
        await publishMutation.mutateAsync({
          id: teamId,
          ...localDraft,
          status: 'PUBLISHED'
        });
      }

      // Update local state
      dispatch(upsertTeam({
        id: teamId,
        data: { ...localDraft, status: isPublished ? 'DRAFT' : 'PUBLISHED' }
      }));
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Redirect if no teamId
  useEffect(() => {
    if (!teamId) {
      router.push('/dashboard/teams');
    }
  }, [teamId, router]);

  // Set current team in Redux
  useEffect(() => {
    if (teamId) {
      dispatch(setCurrentTeam(teamId));
    }
  }, [dispatch, teamId]);

  // Load cloud data into Redux if not present locally
  useEffect(() => {
    if (cloudData && !localDraft && teamId) {
      dispatch(upsertTeam({ id: teamId, data: serializeDates(cloudData as any) }));
    }
  }, [cloudData, localDraft, teamId, dispatch]);

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
    if (!isCloudLoading && cloudData && localDraft && teamId) {
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
  }, [isCloudLoading, cloudData, localDraft, teamId]);

  const handleSyncAndSave = useCallback(async () => {
    if (!teamId || !localDraft) return;

    setIsSyncing(true);
    try {
      const cleanedData = cleanDataForMutation(localDraft);
      await saveDraftMutation.mutateAsync({
        id: teamId,
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
  }, [teamId, localDraft, saveDraftMutation, refetch]);

  const handleSkipSync = useCallback(() => {
    if (cloudData && teamId) {
      dispatch(upsertTeam({ id: teamId, data: serializeDates(cloudData as any) }));
    }
    setShowSyncWarning(false);
    hasCheckedInitialSync.current = true; // Reset check after skipping
  }, [cloudData, teamId, dispatch]);

  // Permission gate: show empty state if user is not allowed to view
  if (!isCloudLoading && !cloudData) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-semibold">Permission denied</h2>
            <p className="text-muted-foreground">You don't have access to this team. Ask the owner to add you as a member.</p>
          </div>
        </div>
      </Shell>
    );
  }

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
          fallbackPath={DASHBOARD_ROUTES.TEAMS}
        >
          Back to Teams
        </BackButton>

        <div className="w-64 bg-muted/50 border-r p-4">
          <div className="space-y-4">
            <h3 className="font-semibold">Team Actions</h3>
            <Button
              onClick={handleToggleStatus}
              disabled={isPublishing || publishMutation.isPending}
              variant={isPublished ? "outline" : "primary"}
              className="w-full"
            >
              {isPublishing || publishMutation.isPending
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
