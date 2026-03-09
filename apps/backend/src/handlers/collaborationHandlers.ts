import { Server, Socket } from 'socket.io';
import { CollaborationService } from '@/services/socket/collaborationService';
import { logger } from '@agentflox/logger';
import * as Y from 'yjs';

export function registerCollaborationHandlers(io: Server, socket: Socket) {
    const userId = socket.data.userId;
    const username = socket.data.username;

    // Handle document join
    socket.on('collaboration:join', async (data) => {
        try {
            const { documentId, documentType } = data;

            // Join document room
            await socket.join(`doc:${documentId}`);

            // Track active user
            await CollaborationService.addActiveUser(documentId, userId, socket.id);

            // Broadcast user joined
            socket.to(`doc:${documentId}`).emit('collaboration:user-joined', {
                documentId,
                userId,
                username,
            });

            // Send current document state
            const state = await CollaborationService.getDocumentState(documentId);
            if (state) {
                socket.emit('collaboration:sync', { documentId, state });
            }

            logger.info('User joined document', { userId, documentId });
        } catch (error) {
            logger.error('Failed to join document', { error });
            socket.emit('error', { message: 'Failed to join document' });
        }
    });

    // Handle document updates
    socket.on('collaboration:update', async (data) => {
        try {
            const { documentId, update } = data;

            // Broadcast update to other users in the room
            socket.to(`doc:${documentId}`).emit('collaboration:update', {
                documentId,
                update,
                userId,
            });

            // Get current state and apply update
            const currentState = await CollaborationService.getDocumentState(documentId);
            let doc: Y.Doc;

            if (currentState) {
                doc = new Y.Doc();
                const stateUpdate = Uint8Array.from(atob(currentState), c => c.charCodeAt(0));
                Y.applyUpdate(doc, stateUpdate);
            } else {
                doc = new Y.Doc();
            }

            // Apply new update
            const updateBytes = Uint8Array.from(atob(update), c => c.charCodeAt(0));
            Y.applyUpdate(doc, updateBytes);

            // Save updated state
            const newState = btoa(String.fromCharCode(...Y.encodeStateAsUpdate(doc)));
            await CollaborationService.storeDocumentState(
                documentId,
                newState,
                'task', // Default to task for now, could be passed in data
                userId
            );

        } catch (error) {
            logger.error('Failed to process update', { error });
        }
    });

    // Handle sync requests
    socket.on('collaboration:sync-request', async (data) => {
        try {
            const { documentId } = data;
            const state = await CollaborationService.getDocumentState(documentId);

            if (state) {
                socket.emit('collaboration:sync', { documentId, state });
            }
        } catch (error) {
            logger.error('Failed to sync document', { error });
        }
    });

    // Handle awareness updates (cursor positions)
    socket.on('collaboration:awareness-update', async (data) => {
        try {
            const { documentId, awareness } = data;

            // Store awareness
            await CollaborationService.storeAwareness(documentId, userId, awareness);

            // Broadcast to others
            socket.to(`doc:${documentId}`).emit('collaboration:awareness', {
                documentId,
                states: { [userId]: awareness },
            });
        } catch (error) {
            logger.error('Failed to update awareness', { error });
        }
    });

    // Handle document leave
    socket.on('collaboration:leave', async (data) => {
        try {
            const { documentId } = data;

            await socket.leave(`doc:${documentId}`);
            await CollaborationService.removeActiveUser(documentId, userId);
            await CollaborationService.removeAwareness(documentId, userId);

            socket.to(`doc:${documentId}`).emit('collaboration:user-left', {
                documentId,
                userId,
            });

            logger.info('User left document', { userId, documentId });
        } catch (error) {
            logger.error('Failed to leave document', { error });
        }
    });
}
