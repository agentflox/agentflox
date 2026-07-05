/**
 * useCollaborativeEditor Hook
 * 
 * Integrates Yjs collaboration with TipTap editor for realtime editing.
 * Handles document sync, awareness (cursors/selections), and active users.
 * 
 * NOTE: This hook requires collaboration packages to be installed first.
 * See CollaborationProvider.tsx for installation instructions.
 */

'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useCollaboration } from '@/components/providers/CollaborationProvider';
import type { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';

interface UseCollaborativeEditorOptions {
    documentId: string;
    documentType: 'task' | 'project' | 'space' | 'comment' | 'doc';
    enabled?: boolean;
    user: {
        id: string;
        name: string;
        color?: string;
    };
}

interface CollaborativeEditorReturn {
    // TipTap extensions to add to editor
    extensions: any[];
    // Active users editing this document
    activeUsers: string[];
    // Whether collaboration is active
    isActive: boolean;
    // Manually trigger sync
    syncNow: () => void;
}

export function useCollaborativeEditor({
    documentId,
    documentType,
    enabled = false,
    user,
}: UseCollaborativeEditorOptions): CollaborativeEditorReturn {
    const { getDocument, joinDocument, leaveDocument, isConnected, activeUsers } = useCollaboration();
    const [isActive, setIsActive] = useState(false);

    // Join document when enabled
    useEffect(() => {
        if (!enabled || !documentId) return;

        console.log('[useCollaborativeEditor] Joining document:', documentId);
        joinDocument(documentId, documentType);
        setIsActive(true);

        return () => {
            console.log('[useCollaborativeEditor] Leaving document:', documentId);
            leaveDocument(documentId);
            setIsActive(false);
        };
    }, [enabled, documentId, documentType, joinDocument, leaveDocument]);

    // Get Y.Doc for this document
    const doc = useMemo(() => {
        if (!enabled || !documentId) return null;
        return getDocument(documentId);
    }, [enabled, documentId, getDocument]);

    // Create TipTap extensions for collaboration
    const extensions = useMemo(() => {
        if (!enabled || !doc) return [];

        // Create extensions
        return [
            Collaboration.configure({
                document: doc,
                field: 'prosemirror',
            }),
            CollaborationCursor.configure({
                provider: null, // We're using custom socket sync
                user: {
                    name: user.name,
                    color: user.color || '#' + Math.floor(Math.random() * 16777215).toString(16),
                },
            }),
        ];
    }, [enabled, doc, user]);

    const syncNow = useCallback(() => {
        if (!enabled || !documentId || !isConnected) return;

        console.log('[useCollaborativeEditor] Manual sync requested for', documentId);
        // Socket emit will be handled by CollaborationProvider
    }, [enabled, documentId, isConnected]);

    const documentActiveUsers = useMemo(() => {
        if (!documentId || !activeUsers[documentId]) return [];
        return Array.from(activeUsers[documentId]);
    }, [documentId, activeUsers]);

    return {
        extensions,
        activeUsers: documentActiveUsers,
        isActive: isActive && isConnected,
        syncNow,
    };
}
