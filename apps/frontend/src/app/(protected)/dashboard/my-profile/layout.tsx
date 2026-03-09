"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useReduxStore';
import { RootState } from '@/stores/store';
import { upsertUser } from '@/stores/slices/user.slice';
import { serializeDates } from '@/stores/utils/serialize';
import { trpc } from '@/lib/trpc';
import Shell from '@/components/layout/Shell';
import SyncWarningBanner from '@/components/ui/sync-warning-banner';
import BackButton from '@/components/navigation/BackButton';
import { normalizeForComparison, deepEqual } from '@/utils/utilities/syncUtils';

interface UserProfileLayoutProps {
  children: React.ReactNode;
}

const METADATA_FIELDS = ['id', 'createdAt', 'updatedAt', 'lastActiveAt', 'cloudSyncedAt'] as const;

const checkForDataDifferences = function(local: any, cloud: any) {
  if (!local || !cloud) return false;
  var normalizedLocal = normalizeForComparison(METADATA_FIELDS, local);
  var normalizedCloud = normalizeForComparison(METADATA_FIELDS, cloud);
  return !deepEqual(normalizedLocal, normalizedCloud);
};

const cleanDataForMutation = (data: any) => {
  const cleaned = { ...data };
  const nullableFields = ['firstName', 'lastName', 'username', 'avatar', 'bio', 'phone', 'website', 'location', 'timezone'];
  nullableFields.forEach(field => {
    if (cleaned[field] === null) delete cleaned[field];
  });
  return cleaned;
};

export default function UserProfileLayout({ children }: UserProfileLayoutProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Use selector with proper memoization
  const localUser = useAppSelector(
    useCallback((s: RootState) => s.user.currentUser, [])
  );
  
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track if we've done initial sync check to prevent duplicate warnings
  const hasCheckedInitialSync = useRef(false);

  const { data: cloudData, isLoading: isCloudLoading, refetch } = trpc.user.me.useQuery();

  const updateMutation = trpc.user.update.useMutation();

  // Load cloud data into Redux if not present locally
  useEffect(() => {
    if (cloudData && !localUser) {
      dispatch(upsertUser({ data: serializeDates(cloudData as any) }));
    }
  }, [cloudData, localUser, dispatch]);

  // Check for sync conflicts only once on initial load
  useEffect(() => {
    if (cloudData && localUser && !hasCheckedInitialSync.current) {
      const hasConflict = checkForDataDifferences(localUser, cloudData);
      if (hasConflict) {
        setShowSyncWarning(true);
      }
      hasCheckedInitialSync.current = true;
    }
  }, [cloudData, localUser]);

  // Memoize sync conflict checker
  const checkSyncConflict = useCallback(async (): Promise<boolean> => {
    if (!isCloudLoading && cloudData && localUser) {
      const hasLocalChanges = checkForDataDifferences(localUser, cloudData);
      
      if (hasLocalChanges) {
        console.log('Sync conflict detected');
        setShowSyncWarning(true);
        return true;
      }
      
      setShowSyncWarning(false);
      return false;
    }
    return false;
  }, [isCloudLoading, cloudData, localUser]);

  const handleSyncAndSave = useCallback(async () => {
    if (!localUser) return;
    
    setIsSyncing(true);
    try {
      const cleanedData = cleanDataForMutation(localUser);
      await updateMutation.mutateAsync(cleanedData);
      await refetch();
      setShowSyncWarning(false);
      hasCheckedInitialSync.current = true; // Reset check after successful sync
    } catch (error) {
      console.error('Failed to sync and save:', error);
      // Consider adding user-facing error notification here
    } finally {
      setIsSyncing(false);
    }
  }, [localUser, updateMutation, refetch]);

  const handleSkipSync = useCallback(() => {
    if (cloudData) {
      dispatch(upsertUser({ data: serializeDates(cloudData as any) }));
    }
    setShowSyncWarning(false);
    hasCheckedInitialSync.current = true; // Reset check after skipping
  }, [cloudData, dispatch]);

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
          onBeforeNavigate={() => checkSyncConflict()}
          fallbackPath="/dashboard"
        >
          Back to Dashboard
        </BackButton>
        
      </div>
      
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </Shell>
  );
}
