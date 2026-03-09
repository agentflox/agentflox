'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, X } from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { useComments } from '@/entities/comments/hooks/useComments';
import { CommentSection } from '../../comments/components/CommentSection';
import { useFormattedTime } from '@/hooks/useFormattedTime';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Post } from '@agentflox/database/src/generated/prisma/client';

// --- Define type that matches your actual attachment shape ---
type MediaAttachment = {
  id: string;
  name: string;
  url: string;
  type: string;
  path?: string;
  size?: number;
};

type PostWithUser = Post & { 
  user: { id: string; name: string | null; image: string | null };
  attachments?: string[];
};

interface PostCardProps {
  post: PostWithUser;
  feedType: 'global' | 'user' | 'project' | 'team';
  feedId?: string;
}

export function PostCard({ post, feedType, feedId }: PostCardProps) {
  const formattedTime = useFormattedTime(post.createdAt);
  const [showComments, setShowComments] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const { likePost, unlikePost } = usePosts(feedType, feedId);
  const { comments } = useComments(post.id);
  const [isLiked, setIsLiked] = useState(false); // TODO: Get from user's likes

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikePost.mutateAsync(post.id);
        setIsLiked(false);
      } else {
        await likePost.mutateAsync(post.id);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // --- Parse attachments safely (handles arrays of JSON strings or objects) ---
  const attachments: MediaAttachment[] = (() => {
    try {
      let raw = post.attachments;

      // If it's a string, try to parse once
      if (typeof raw === 'string') {
        raw = JSON.parse(raw);
      }

      // Ensure we have an array now
      if (!Array.isArray(raw)) return [];

      // Parse each element if it's still a JSON string
      return raw
        .map((item) => {
          try {
            if (typeof item === 'string') {
              return JSON.parse(item);
            }
            return item;
          } catch {
            return null;
          }
        })
        .filter((a): a is MediaAttachment => !!a && typeof a.url === 'string');
    } catch (err) {
      console.error('Invalid attachments format', err);
      return [];
    }
  })();

  const safeAttachments = attachments.filter(
    (a): a is MediaAttachment => !!a?.url && typeof a.type === 'string' && !!a.name
  );

  // Dynamic grid classes based on media count
  const getMediaGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  // Render styled content with hashtags and mentions
  const renderStyledContent = (text: string) => {
    const parts = text.split(/(\s+|#[\w-]+|@[\w-]+)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('#')) {
            return (
              <span key={i} className="text-blue-600 font-medium hover:underline cursor-pointer">
                {part}
              </span>
            );
          }
          if (part.startsWith('@')) {
            return (
              <span key={i} className="text-purple-600 font-medium hover:underline cursor-pointer">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar>
            <AvatarImage src={post.user?.image || ''} />
            <AvatarFallback>{(post.user?.name?.[0] || '?').toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{post.user?.name || 'User'}</h3>
              <span className="text-sm text-muted-foreground">
                {formattedTime || new Date(post.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="whitespace-pre-wrap">{renderStyledContent(post.content)}</p>
        </div>

        {/* Media Attachments */}
        {safeAttachments.length > 0 && (
          <div className={`grid ${getMediaGridClass(safeAttachments.length)} gap-2 mb-4`}>
            {safeAttachments.map((media: MediaAttachment, index: number) => (
              <div
                key={media.id || index}
                className="relative group rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
                onClick={() => setSelectedMedia({ url: media.url, type: media.type })}
              >
                {media?.type?.startsWith('image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.url}
                    alt={media.name || 'Attachment'}
                    className={`w-full object-cover transition-transform group-hover:scale-105 ${
                      attachments.length === 1 ? 'h-96' : 'h-64'
                    }`}
                  />
                ) : media?.type?.startsWith('video') ? (
                  <video
                    src={media.url}
                    className={`w-full object-cover ${
                      attachments.length === 1 ? 'h-96' : 'h-64'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    controls
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-slate-200">
                    <span className="text-sm text-slate-600">{media.name}</span>
                  </div>
                )}
                
                {/* Overlay for images */}
                {media?.type?.startsWith('image') && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                      Click to view
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleLike}
            className={isLiked ? 'text-red-500 text-sm p-2 hover:text-red-600' : 'text-sm p-2'}
          >
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {post.likeCount || 0}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowComments(!showComments)}
            className={`text-sm p-2 ${showComments ? 'text-blue-600' : ''}`}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {comments?.length || 0}
          </Button>

          <Button variant="ghost" className="text-sm p-2">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <CommentSection postId={post.id} feedId={feedId} feedType={feedType} />
          </div>
        )}
      </Card>

      {/* Media Lightbox Dialog */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-7xl w-full p-0 bg-black/95 border-0">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex items-center justify-center min-h-[80vh] p-4">
              {selectedMedia?.type?.startsWith('image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedMedia.url}
                  alt="Full size"
                  className="max-w-full max-h-[85vh] object-contain"
                />
              ) : selectedMedia?.type?.startsWith('video') ? (
                <video
                  src={selectedMedia.url}
                  className="max-w-full max-h-[85vh] object-contain"
                  controls
                  autoPlay
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

