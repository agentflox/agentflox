"use client";
import { useState } from 'react';
import { AlertTriangle, Save, SkipForward } from 'lucide-react';
import Button from './button';

interface SyncWarningBannerProps {
  isVisible: boolean;
  onSyncAndSave: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function SyncWarningBanner({ 
  isVisible, 
  onSyncAndSave, 
  onSkip, 
  isLoading = false 
}: SyncWarningBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Data Sync Warning
            </h3>
            <p className="text-gray-600 mb-4">
              Your local changes are not synced with the database. You have unsaved changes that may be lost.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={onSyncAndSave}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Syncing...' : 'Sync & Save Draft'}
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <SkipForward className="h-4 w-4" />
                Skip & Load from Database
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
