import type { Socket } from 'socket.io-client';

const feedSubscriptionCounts = new Map<string, number>();
const commentRoomCounts = new Map<string, number>();

function feedKey(feedType: string, feedId?: string) {
  return `feed:${feedType}:${feedId ?? ''}`;
}

function commentRoomKey(entityType: string, targetId: string) {
  return `comment:${entityType}:${targetId}`;
}

export type PostSocketHandlers = {
  onCreated: (data: unknown) => void;
  onUpdated: (data: unknown) => void;
  onDeleted: (data: unknown) => void;
  onLiked: (data: unknown) => void;
};

const postEventHandlerSets = new Map<string, Set<PostSocketHandlers>>();
const postEventListenerCounts = new Map<string, number>();
let attachedPostSocket: Socket | null = null;

function dispatchPostEvent(
  invoke: (handlers: PostSocketHandlers) => void
) {
  for (const handlers of postEventHandlerSets.values()) {
    for (const handler of handlers) {
      invoke(handler);
    }
  }
}

const globalPostSocketHandlers = {
  onCreated: (data: unknown) => dispatchPostEvent((h) => h.onCreated(data)),
  onUpdated: (data: unknown) => dispatchPostEvent((h) => h.onUpdated(data)),
  onDeleted: (data: unknown) => dispatchPostEvent((h) => h.onDeleted(data)),
  onLiked: (data: unknown) => dispatchPostEvent((h) => h.onLiked(data)),
  onUnliked: (data: unknown) => dispatchPostEvent((h) => h.onLiked(data)),
};

function detachGlobalPostListeners(socket: Socket) {
  socket.off('post:created', globalPostSocketHandlers.onCreated);
  socket.off('post:updated', globalPostSocketHandlers.onUpdated);
  socket.off('post:deleted', globalPostSocketHandlers.onDeleted);
  socket.off('post:liked', globalPostSocketHandlers.onLiked);
  socket.off('post:unliked', globalPostSocketHandlers.onUnliked);
  if (attachedPostSocket === socket) {
    attachedPostSocket = null;
  }
}

function ensureGlobalPostListeners(socket: Socket) {
  if (postEventHandlerSets.size === 0) return;

  if (attachedPostSocket && attachedPostSocket !== socket) {
    detachGlobalPostListeners(attachedPostSocket);
  }

  if (attachedPostSocket === socket) return;

  attachedPostSocket = socket;
  socket.on('post:created', globalPostSocketHandlers.onCreated);
  socket.on('post:updated', globalPostSocketHandlers.onUpdated);
  socket.on('post:deleted', globalPostSocketHandlers.onDeleted);
  socket.on('post:liked', globalPostSocketHandlers.onLiked);
  socket.on('post:unliked', globalPostSocketHandlers.onUnliked);
}

/**
 * Ref-counted post:* socket listeners per feed.
 * One socket.on registration per event; dispatches to all acquired handler sets.
 */
export function acquirePostEventListeners(
  socket: Socket,
  feedType: string,
  feedId: string | undefined,
  handlers: PostSocketHandlers
): () => void {
  const key = feedKey(feedType, feedId);

  let handlerSet = postEventHandlerSets.get(key);
  if (!handlerSet) {
    handlerSet = new Set();
    postEventHandlerSets.set(key, handlerSet);
  }
  handlerSet.add(handlers);

  postEventListenerCounts.set(key, (postEventListenerCounts.get(key) ?? 0) + 1);
  ensureGlobalPostListeners(socket);

  return () => {
    handlerSet!.delete(handlers);
    if (handlerSet!.size === 0) {
      postEventHandlerSets.delete(key);
    }

    const count = (postEventListenerCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      postEventListenerCounts.delete(key);
    } else {
      postEventListenerCounts.set(key, count);
    }

    if (postEventHandlerSets.size === 0 && attachedPostSocket) {
      detachGlobalPostListeners(attachedPostSocket);
    }
  };
}

/** Ref-counted feed:subscribe / feed:unsubscribe */
export function acquireFeedSubscription(
  socket: Socket,
  feedType: string,
  feedId?: string
): () => void {
  const key = feedKey(feedType, feedId);
  const next = (feedSubscriptionCounts.get(key) ?? 0) + 1;
  feedSubscriptionCounts.set(key, next);

  if (next === 1) {
    socket.emit('feed:subscribe', { feedType, feedId });
  }

  return () => {
    const count = (feedSubscriptionCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      feedSubscriptionCounts.delete(key);
      socket.emit('feed:unsubscribe', { feedType, feedId });
    } else {
      feedSubscriptionCounts.set(key, count);
    }
  };
}

/** Ref-counted post:subscribe / listing comment room */
export function acquireCommentRoom(
  socket: Socket,
  entityType: 'post' | 'listing',
  targetId: string
): () => void {
  const key = commentRoomKey(entityType, targetId);
  const next = (commentRoomCounts.get(key) ?? 0) + 1;
  commentRoomCounts.set(key, next);

  if (next === 1) {
    if (entityType === 'listing') {
      socket.emit('listing:comment:subscribe', { listingId: targetId });
    } else {
      socket.emit('post:subscribe' as any, { postId: targetId });
    }
  }

  return () => {
    const count = (commentRoomCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      commentRoomCounts.delete(key);
      if (entityType === 'listing') {
        socket.emit('listing:comment:unsubscribe', { listingId: targetId });
      } else {
        socket.emit('post:unsubscribe' as any, { postId: targetId });
      }
    } else {
      commentRoomCounts.set(key, count);
    }
  };
}

export type CommentSocketHandlers = {
  onCreated: (data: unknown) => void;
  onUpdated: (data: unknown) => void;
  onDeleted: (data: unknown) => void;
  onVoted: (data: unknown) => void;
};

const commentEventHandlerSets = new Map<string, Set<CommentSocketHandlers>>();
const commentEventListenerCounts = new Map<string, number>();
let attachedCommentSocket: Socket | null = null;

function dispatchCommentEvent(
  entityType: 'post' | 'listing',
  invoke: (handlers: CommentSocketHandlers) => void
) {
  for (const [key, handlers] of commentEventHandlerSets.entries()) {
    if (!key.startsWith(`comment:${entityType}:`)) continue;
    for (const handler of handlers) {
      invoke(handler);
    }
  }
}

const globalCommentSocketHandlers = {
  onPostCreated: (data: unknown) => dispatchCommentEvent('post', (h) => h.onCreated(data)),
  onPostUpdated: (data: unknown) => dispatchCommentEvent('post', (h) => h.onUpdated(data)),
  onPostDeleted: (data: unknown) => dispatchCommentEvent('post', (h) => h.onDeleted(data)),
  onPostVoted: (data: unknown) => dispatchCommentEvent('post', (h) => h.onVoted(data)),
  onListingCreated: (data: unknown) => dispatchCommentEvent('listing', (h) => h.onCreated(data)),
};

function detachGlobalCommentListeners(socket: Socket) {
  socket.off('comment:created', globalCommentSocketHandlers.onPostCreated);
  socket.off('comment:updated', globalCommentSocketHandlers.onPostUpdated);
  socket.off('comment:deleted', globalCommentSocketHandlers.onPostDeleted);
  socket.off('comment:voted', globalCommentSocketHandlers.onPostVoted);
  socket.off('listing:comment:created', globalCommentSocketHandlers.onListingCreated);
  if (attachedCommentSocket === socket) {
    attachedCommentSocket = null;
  }
}

function ensureGlobalCommentListeners(socket: Socket) {
  if (commentEventHandlerSets.size === 0) return;

  if (attachedCommentSocket && attachedCommentSocket !== socket) {
    detachGlobalCommentListeners(attachedCommentSocket);
  }

  if (attachedCommentSocket === socket) return;

  attachedCommentSocket = socket;
  socket.on('comment:created', globalCommentSocketHandlers.onPostCreated);
  socket.on('comment:updated', globalCommentSocketHandlers.onPostUpdated);
  socket.on('comment:deleted', globalCommentSocketHandlers.onPostDeleted);
  socket.on('comment:voted', globalCommentSocketHandlers.onPostVoted);
  socket.on('listing:comment:created', globalCommentSocketHandlers.onListingCreated);
}

/**
 * Ref-counted comment:* socket listeners per post/listing room.
 * One socket.on registration per event; dispatches to all acquired handler sets.
 */
export function acquireCommentEventListeners(
  socket: Socket,
  entityType: 'post' | 'listing',
  targetId: string,
  handlers: CommentSocketHandlers
): () => void {
  const key = commentRoomKey(entityType, targetId);

  let handlerSet = commentEventHandlerSets.get(key);
  if (!handlerSet) {
    handlerSet = new Set();
    commentEventHandlerSets.set(key, handlerSet);
  }
  handlerSet.add(handlers);

  commentEventListenerCounts.set(key, (commentEventListenerCounts.get(key) ?? 0) + 1);
  ensureGlobalCommentListeners(socket);

  return () => {
    handlerSet!.delete(handlers);
    if (handlerSet!.size === 0) {
      commentEventHandlerSets.delete(key);
    }

    const count = (commentEventListenerCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      commentEventListenerCounts.delete(key);
    } else {
      commentEventListenerCounts.set(key, count);
    }

    if (commentEventHandlerSets.size === 0 && attachedCommentSocket) {
      detachGlobalCommentListeners(attachedCommentSocket);
    }
  };
}

export type MessageSocketHandlers = {
  onReceived: (data: unknown) => void;
  onSent: (data: unknown) => void;
  onReadAck: (data: unknown) => void;
  onReacted: (data: unknown) => void;
};

const messageEventHandlers = new Set<MessageSocketHandlers>();
let attachedMessageSocket: Socket | null = null;

function dispatchMessageEvent(invoke: (handlers: MessageSocketHandlers) => void) {
  for (const handler of messageEventHandlers) {
    invoke(handler);
  }
}

const globalMessageSocketHandlers = {
  onReceived: (data: unknown) => dispatchMessageEvent((h) => h.onReceived(data)),
  onSent: (data: unknown) => dispatchMessageEvent((h) => h.onSent(data)),
  onReadAck: (data: unknown) => dispatchMessageEvent((h) => h.onReadAck(data)),
  onReacted: (data: unknown) => dispatchMessageEvent((h) => h.onReacted(data)),
};

function detachGlobalMessageListeners(socket: Socket) {
  socket.off('message:received', globalMessageSocketHandlers.onReceived);
  socket.off('message:sent', globalMessageSocketHandlers.onSent);
  socket.off('message:read:ack', globalMessageSocketHandlers.onReadAck);
  socket.off('message:reacted', globalMessageSocketHandlers.onReacted);
  if (attachedMessageSocket === socket) {
    attachedMessageSocket = null;
  }
}

function ensureGlobalMessageListeners(socket: Socket) {
  if (messageEventHandlers.size === 0) return;

  if (attachedMessageSocket && attachedMessageSocket !== socket) {
    detachGlobalMessageListeners(attachedMessageSocket);
  }

  if (attachedMessageSocket === socket) return;

  attachedMessageSocket = socket;
  socket.on('message:received', globalMessageSocketHandlers.onReceived);
  socket.on('message:sent', globalMessageSocketHandlers.onSent);
  socket.on('message:read:ack', globalMessageSocketHandlers.onReadAck);
  socket.on('message:reacted', globalMessageSocketHandlers.onReacted);
}

/** Ref-counted message:* socket listeners. One registration per event; dispatches to all handler sets. */
export function acquireMessageEventListeners(
  socket: Socket,
  handlers: MessageSocketHandlers
): () => void {
  messageEventHandlers.add(handlers);
  ensureGlobalMessageListeners(socket);

  return () => {
    messageEventHandlers.delete(handlers);
    if (messageEventHandlers.size === 0 && attachedMessageSocket) {
      detachGlobalMessageListeners(attachedMessageSocket);
    }
  };
}

export type ChannelSocketHandlers = {
  onReceived: (data: unknown) => void;
  onReaction: (data: unknown) => void;
  onEdited: (data: unknown) => void;
};

const channelRoomCounts = new Map<string, number>();
const channelEventHandlerSets = new Map<string, Set<ChannelSocketHandlers>>();
let attachedChannelSocket: Socket | null = null;

function channelKey(channelId: string) {
  return `channel:${channelId}`;
}

function dispatchChannelEvent(channelId: string, invoke: (handlers: ChannelSocketHandlers) => void) {
  const handlers = channelEventHandlerSets.get(channelKey(channelId));
  if (!handlers) return;
  for (const handler of handlers) {
    invoke(handler);
  }
}

const globalChannelSocketHandlers = {
  onReceived: (data: any) => {
    const channelId = data?.channelId;
    if (!channelId) return;
    dispatchChannelEvent(channelId, (h) => h.onReceived(data));
  },
  onReaction: (data: any) => {
    const channelId = data?.channelId;
    if (channelId) {
      dispatchChannelEvent(channelId, (h) => h.onReaction(data));
      return;
    }
    for (const handlers of channelEventHandlerSets.values()) {
      for (const handler of handlers) {
        handler.onReaction(data);
      }
    }
  },
  onEdited: (data: any) => {
    const channelId = data?.channelId;
    if (channelId) {
      dispatchChannelEvent(channelId, (h) => h.onEdited(data));
      return;
    }
    for (const handlers of channelEventHandlerSets.values()) {
      for (const handler of handlers) {
        handler.onEdited(data);
      }
    }
  },
};

function detachGlobalChannelListeners(socket: Socket) {
  socket.off('channel:message:received', globalChannelSocketHandlers.onReceived);
  socket.off('channel:message:sent', globalChannelSocketHandlers.onReceived);
  socket.off('channel:message:reaction', globalChannelSocketHandlers.onReaction);
  socket.off('channel:message:edited', globalChannelSocketHandlers.onEdited);
  if (attachedChannelSocket === socket) {
    attachedChannelSocket = null;
  }
}

function ensureGlobalChannelListeners(socket: Socket) {
  if (channelEventHandlerSets.size === 0) return;

  if (attachedChannelSocket && attachedChannelSocket !== socket) {
    detachGlobalChannelListeners(attachedChannelSocket);
  }

  if (attachedChannelSocket === socket) return;

  attachedChannelSocket = socket;
  socket.on('channel:message:received', globalChannelSocketHandlers.onReceived);
  socket.on('channel:message:sent', globalChannelSocketHandlers.onReceived);
  socket.on('channel:message:reaction', globalChannelSocketHandlers.onReaction);
  socket.on('channel:message:edited', globalChannelSocketHandlers.onEdited);
}

/** Ref-counted channel:join / channel:leave */
export function acquireChannelRoom(socket: Socket, channelId: string): () => void {
  const key = channelKey(channelId);
  const next = (channelRoomCounts.get(key) ?? 0) + 1;
  channelRoomCounts.set(key, next);

  if (next === 1) {
    socket.emit('channel:join', { channelId });
  }

  return () => {
    const count = (channelRoomCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      channelRoomCounts.delete(key);
    } else {
      channelRoomCounts.set(key, count);
    }
  };
}

/** Ref-counted channel:message:* listeners per channel room. */
export function acquireChannelEventListeners(
  socket: Socket,
  channelId: string,
  handlers: ChannelSocketHandlers
): () => void {
  const key = channelKey(channelId);

  let handlerSet = channelEventHandlerSets.get(key);
  if (!handlerSet) {
    handlerSet = new Set();
    channelEventHandlerSets.set(key, handlerSet);
  }
  handlerSet.add(handlers);

  ensureGlobalChannelListeners(socket);

  return () => {
    handlerSet!.delete(handlers);
    if (handlerSet!.size === 0) {
      channelEventHandlerSets.delete(key);
    }

    if (channelEventHandlerSets.size === 0 && attachedChannelSocket) {
      detachGlobalChannelListeners(attachedChannelSocket);
    }
  };
}
