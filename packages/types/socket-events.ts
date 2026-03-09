export interface ServerToClientEvents {
  // Post events
  'post:created': (data: PostCreatedEvent) => void;
  'post:updated': (data: PostUpdatedEvent) => void;
  'post:deleted': (data: PostDeletedEvent) => void;
  'post:liked': (data: PostLikedEvent) => void;
  'post:unliked': (data: PostUnlikedEvent) => void;

  // Comment events
  'comment:created': (data: CommentCreatedEvent) => void;
  'comment:updated': (data: CommentUpdatedEvent) => void;
  'comment:deleted': (data: CommentDeletedEvent) => void;
  'comment:voted': (data: CommentVotedEvent) => void;

  // Activity log events
  'log:created': (data: LogCreatedEvent) => void;

  // Notification events
  'notification:new': (data: NotificationEvent) => void;

  // Presence events
  'user:online': (data: UserPresenceEvent) => void;
  'user:offline': (data: UserPresenceEvent) => void;
  'user:typing': (data: TypingEvent) => void;
  // Messaging events
  'message:new': (data: { id: string; senderId: string; receiverId: string; content: string; attachments?: string[]; isRead?: boolean; createdAt: string }) => void;
  'message:received': (data: { fromUserId: string; preview?: string; at: string }) => void;
  'message:sent': (data: { id?: string; toUserId: string; content?: string; attachments?: string[]; at: string }) => void;
  'message:read:ack': (data: { byUserId: string; at: string; messageIds?: string[] }) => void;

  // Collaboration events
  'collaboration:sync': (data: { documentId: string; state: string }) => void;
  'collaboration:update': (data: { documentId: string; update: string; userId: string }) => void;
  'collaboration:awareness': (data: { documentId: string; states: Record<string, any> }) => void;
  'collaboration:user-joined': (data: { documentId: string; userId: string; username: string }) => void;
  'collaboration:user-left': (data: { documentId: string; userId: string }) => void;

  // Error events
  'error': (data: ErrorEvent) => void;
}

export interface ClientToServerEvents {
  // Authentication
  'auth:join': (data: { userId: string; token: string }) => void;

  // Subscribe to feeds
  'feed:subscribe': (data: SubscribeFeedData) => void;
  'feed:unsubscribe': (data: UnsubscribeFeedData) => void;

  // Post actions
  'post:create': (data: CreatePostData) => void;
  'post:update': (data: UpdatePostData) => void;
  'post:delete': (data: DeletePostData) => void;
  'post:like': (data: LikePostData) => void;
  'post:unlike': (data: UnlikePostData) => void;

  // Comment actions
  'comment:create': (data: CreateCommentData) => void;
  'comment:update': (data: UpdateCommentData) => void;
  'comment:delete': (data: DeleteCommentData) => void;
  'comment:vote': (data: VoteCommentData) => void;

  // Typing indicators
  'typing:start': (data: TypingData) => void;
  'typing:stop': (data: TypingData) => void;

  // Notification triggers
  'notification:send': (data: { userId: string; notificationId?: string }) => void;
  // Messaging relay
  'message:create': (data: { toUserId: string; content: string; attachments?: string[] }, ack?: (err: any, response?: any) => void) => void;
  'message:notify': (data: { toUserId: string; preview?: string }) => void;
  'message:read': (data: { fromUserId: string }) => void;

  // Collaboration events
  'collaboration:join': (data: { documentId: string; documentType: string }) => void;
  'collaboration:leave': (data: { documentId: string }) => void;
  'collaboration:update': (data: { documentId: string; update: string }) => void;
  'collaboration:sync-request': (data: { documentId: string; stateVector?: string }) => void;
  'collaboration:awareness-update': (data: { documentId: string; awareness: any }) => void;

  // Heartbeat
  'heartbeat': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  workspaceId: string | null;
  workspaceRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null;
  permissions?: string[];
  rooms: Set<string>;
}

// Event data interfaces
export interface PostCreatedEvent {
  post: {
    id: string;
    userId: string;
    title?: string;
    content: string;
    type: string;
    visibility: string;
    projectId?: string;
    teamId?: string;
    proposalId?: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  };
}

export interface PostUpdatedEvent {
  postId: string;
  title?: string;
  content: string;
  isEdited: boolean;
  editedAt: string;
}

export interface PostDeletedEvent {
  postId: string;
}

export interface PostLikedEvent {
  postId: string;
  userId: string;
  likeCount: number;
}

export interface PostUnlikedEvent {
  postId: string;
  userId: string;
  likeCount: number;
}

export interface CommentCreatedEvent {
  comment: {
    id: string;
    postId: string;
    userId: string;
    parentId?: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  };
}

export interface CommentUpdatedEvent {
  commentId: string;
  content: string;
  isEdited: boolean;
  editedAt: string;
}

export interface CommentDeletedEvent {
  commentId: string;
  postId: string;
}

export interface CommentVotedEvent {
  commentId: string;
  userId: string;
  voteType: 'UPVOTE' | 'DOWNVOTE';
  upvotes: number;
  downvotes: number;
}

export interface LogCreatedEvent {
  log: {
    id: string;
    action: string;
    category: string;
    severity: string;
    title: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    projectId?: string;
    teamId?: string;
    createdAt: string;
  };
}

export interface NotificationEvent {
  notification: {
    id: string;
    type: string;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
    createdAt: string;
  };
}

export interface UserPresenceEvent {
  userId: string;
  username: string;
  workspaceId: string;
  status: 'online' | 'offline';
  timestamp: string;
}

export interface TypingEvent {
  userId: string;
  postId?: string;
  commentId?: string;
  channelId?: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

// Client to server data interfaces
export interface SubscribeFeedData {
  feedType: 'global' | 'user' | 'project' | 'team' | 'proposal';
  feedId?: string;
}

export interface UnsubscribeFeedData {
  feedType: 'global' | 'user' | 'project' | 'team' | 'proposal';
  feedId?: string;
}

export interface CreatePostData {
  id: string;
  title?: string;
  content: string;
  topic: PostTopic,
  tags: string[],
  type: string;
  visibility: string;
  projectId?: string;
  teamId?: string;
  proposalId?: string;
  attachments?: string[];
}

export interface UpdatePostData {
  postId: string;
  title?: string;
  content: string;
}

export interface DeletePostData {
  postId: string;
}

export interface LikePostData {
  postId: string;
}

export interface UnlikePostData {
  postId: string;
}

export interface CreateCommentData {
  id: string;
  postId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  commentId: string;
  content: string;
}

export interface DeleteCommentData {
  commentId: string;
}

export interface VoteCommentData {
  commentId: string;
  voteType: 'UPVOTE' | 'DOWNVOTE';
}

export interface TypingData {
  postId?: string;
  commentId?: string;
  channelId?: string;
}

export enum PostTopic {
  FEATURE = 'FEATURE',
  DESIGN = 'DESIGN',
  IMPLEMENTATION = 'IMPLEMENTATION',
  BUG = 'BUG',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  ISSUE = 'ISSUE',
  OTHERS = 'OTHERS',
}

export enum NotificationType {
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  REQUEST_STATUS = 'REQUEST_STATUS',
  INVITATION_RECEIVED = 'INVITATION_RECEIVED',
  INVITATION_STATUS = 'INVITATION_STATUS',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  CONNECTION_REQUEST = 'CONNECTION_REQUEST',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  INVESTMENT_UPDATE = 'INVESTMENT_UPDATE',
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
  TEAM_INVITATION = 'TEAM_INVITATION',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  VERIFICATION_STATUS = 'VERIFICATION_STATUS',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  USAGE_ALERT = 'USAGE_ALERT',
  FEATURE_UPDATE = 'FEATURE_UPDATE',
  BILLING = 'BILLING',
  MAINTENANCE = 'MAINTENANCE',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  USAGE_OVER_LIMIT = 'USAGE_OVER_LIMIT',
  USAGE_APPROACHING_LIMIT = 'USAGE_APPROACHING_LIMIT',
  PACKAGE_EXPIRED = 'PACKAGE_EXPIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  MATCH_FOUND = 'MATCH_FOUND',
}
