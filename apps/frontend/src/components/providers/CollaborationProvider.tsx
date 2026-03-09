/**
 * Collaboration Provider for Yjs + Socket.IO
 * 
 * Provides realtime collaboration for TipTap editor using Yjs CRDT.
 * Syncs document state via Socket.IO and persists to Redis.
 * 
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket-events';

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

interface CollaborationContextValue {
    getDocument: (documentId: string) => Y.Doc | null;
    joinDocument: (documentId: string, documentType: string) => void;
    leaveDocument: (documentId: string) => void;
    isConnected: boolean;
    activeUsers: Record<string, Set<string>>; // documentId -> Set of userIds
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

interface CollaborationProviderProps {
    children: ReactNode;
    userId: string;
    username: string;
}

export function CollaborationProvider({ children, userId, username }: CollaborationProviderProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState<Record<string, Set<string>>>({});

    // Store Y.Doc instances per document
    const documentsRef = useRef<Map<string, Y.Doc>>(new Map());
    const persistenceRef = useRef<Map<string, IndexeddbPersistence>>(new Map());
    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

    useEffect(() => {
        const socket = getSocket() as Socket<ServerToClientEvents, ClientToServerEvents> | null;
        if (!socket) return;

        socketRef.current = socket;

        // Handle connection events
        const handleConnect = () => {
            console.log('[Collaboration] Socket connected');
            setIsConnected(true);

            // Rejoin all active documents
            documentsRef.current.forEach((_, documentId) => {
                socket.emit('collaboration:join', {
                    documentId,
                    documentType: 'task', // This should be passed properly, but defaults to task for rejoin
                });
            });
        };

        const handleDisconnect = () => {
            console.log('[Collaboration] Socket disconnected');
            setIsConnected(false);
        };

        // Handle collaboration events
        const handleSync = (data: { documentId: string; state: string }) => {
            console.log('[Collaboration] Received sync for document:', data.documentId);

            // Apply update from server
            const doc = documentsRef.current.get(data.documentId);
            if (doc) {
                const stateUpdate = Uint8Array.from(atob(data.state), c => c.charCodeAt(0));
                Y.applyUpdate(doc, stateUpdate);
            }
        };

        const handleUpdate = (data: { documentId: string; update: string; userId: string }) => {
            if (data.userId === userId) return; // Ignore own updates

            // Apply update from server
            const doc = documentsRef.current.get(data.documentId);
            if (doc) {
                const update = Uint8Array.from(atob(data.update), c => c.charCodeAt(0));
                Y.applyUpdate(doc, update);
            }
        };

        const handleAwareness = (data: { documentId: string; states: Record<string, any> }) => {
            console.log('[Collaboration] Received awareness for document:', data.documentId);
            // This will be used to update cursor positions and selections
        };

        const handleUserJoined = (data: { documentId: string; userId: string; username: string }) => {
            console.log('[Collaboration] User joined document:', data);

            setActiveUsers(prev => {
                const currentSet = prev[data.documentId] || new Set();
                const newSet = new Set(currentSet);
                newSet.add(data.userId);
                return { ...prev, [data.documentId]: newSet };
            });
        };

        const handleUserLeft = (data: { documentId: string; userId: string }) => {
            console.log('[Collaboration] User left document:', data);

            setActiveUsers(prev => {
                const currentSet = prev[data.documentId] || new Set();
                const newSet = new Set(currentSet);
                newSet.delete(data.userId);
                return { ...prev, [data.documentId]: newSet };
            });
        };

        // Register event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('collaboration:sync', handleSync);
        socket.on('collaboration:update', handleUpdate);
        socket.on('collaboration:awareness', handleAwareness);
        socket.on('collaboration:user-joined', handleUserJoined);
        socket.on('collaboration:user-left', handleUserLeft);

        // Set initial connection state
        setIsConnected(socket.connected);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('collaboration:sync', handleSync);
            socket.off('collaboration:update', handleUpdate);
            socket.off('collaboration:awareness', handleAwareness);
            socket.off('collaboration:user-joined', handleUserJoined);
            socket.off('collaboration:user-left', handleUserLeft);
        };
    }, [userId]);

    const getDocument = useCallback((documentId: string) => {
        return documentsRef.current.get(documentId) || null;
    }, []);

    const joinDocument = useCallback((documentId: string, documentType: string) => {
        const socket = socketRef.current;
        if (!socket) {
            console.warn('[Collaboration] Socket not available');
            return;
        }

        // Check if already joined
        if (documentsRef.current.has(documentId)) {
            console.log('[Collaboration] Already joined document:', documentId);
            return;
        }

        console.log('[Collaboration] Joining document:', documentId);

        const doc = new Y.Doc();
        documentsRef.current.set(documentId, doc);

        // Set up IndexedDB persistence for offline support
        const persistence = new IndexeddbPersistence(documentId, doc);
        persistenceRef.current.set(documentId, persistence);

        // Listen for local updates and broadcast to server
        doc.on('update', (update: Uint8Array, origin: any) => {
            if (origin !== 'remote') {
                const updateStr = btoa(String.fromCharCode(...update));
                socket.emit('collaboration:update', {
                    documentId,
                    update: updateStr,
                });
            }
        });

        // Emit join event
        socket.emit('collaboration:join', { documentId, documentType });

        // Request initial sync
        socket.emit('collaboration:sync-request', { documentId });
    }, []);

    const leaveDocument = useCallback((documentId: string) => {
        const socket = socketRef.current;
        if (!socket) return;

        console.log('[Collaboration] Leaving document:', documentId);

        // Clean up Y.Doc and persistence
        const doc = documentsRef.current.get(documentId);
        const persistence = persistenceRef.current.get(documentId);

        if (persistence) {
            persistence.destroy();
            persistenceRef.current.delete(documentId);
        }

        if (doc) {
            doc.destroy();
            documentsRef.current.delete(documentId);
        }

        // Emit leave event
        socket.emit('collaboration:leave', { documentId });

        // Clean up active users
        setActiveUsers(prev => {
            const newUsers = { ...prev };
            delete newUsers[documentId];
            return newUsers;
        });
    }, []);

    const value: CollaborationContextValue = {
        getDocument,
        joinDocument,
        leaveDocument,
        isConnected,
        activeUsers,
    };

    return (
        <CollaborationContext.Provider value={value}>
            {children}
        </CollaborationContext.Provider>
    );
}

export function useCollaboration() {
    const context = useContext(CollaborationContext);
    if (!context) {
        throw new Error('useCollaboration must be used within CollaborationProvider');
    }
    return context;
}
