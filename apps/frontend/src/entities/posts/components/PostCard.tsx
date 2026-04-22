'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  X, 
  MoreVertical, 
  Bookmark, 
  Flag, 
  Bell 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { usePosts } from '../hooks/usePosts';
import { useComments } from '@/entities/comments/hooks/useComments';
import { CommentSection } from '../../comments/components/CommentSection';
import { useFormattedTime } from '@/hooks/useFormattedTime';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
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
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportExplanation, setReportExplanation] = useState("");

  const { 
    likePost, 
    unlikePost, 
    bookmarkPost, 
    followPost, 
    reportPost 
  } = usePosts(feedType, feedId);
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

  const handleBookmark = () => {
    bookmarkPost.mutate({ postId: post.id });
  };

  const handleFollow = () => {
    followPost.mutate({ postId: post.id });
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }
    try {
      await reportPost.mutateAsync({ 
        postId: post.id, 
        reason: `${reportReason}${reportExplanation ? `: ${reportExplanation}` : ''}` 
      });
      setIsReportModalOpen(false);
      setReportReason("");
      setReportExplanation("");
      toast({ title: "Post reported", description: "Our moderators will review this content." });
    } catch (error) {
      toast({ 
        title: "Failed to report post", 
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" 
      });
    }
  };

  // --- Strip legacy community markers if present ---
  const cleanedContent = post.content.replace(/^\[\[COMMUNITY_SECTION\]\].*?\n/s, '');

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{post.user?.name || 'User'}</h3>
                <span className="text-sm text-slate-500">
                  {formattedTime || new Date(post.createdAt).toLocaleString()}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer text-slate-400 hover:text-slate-600">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleBookmark} className="cursor-pointer">
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>Bookmark post</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFollow} className="cursor-pointer">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Follow post</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReportModalOpen(true)} className="cursor-pointer text-red-600 focus:text-red-600">
                    <Flag className="mr-2 h-4 w-4" />
                    <span>Report post</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title */}
        {post.title && (
          <h2 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
            {post.title}
          </h2>
        )}

        {/* Content */}
        <div className="mb-4">
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: cleanedContent }} 
          />
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

        {/* Topics/Tags */}
        {post.tags && post.tags.some((tag: string) => tag.startsWith('topic:')) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags
              .filter((tag: string) => tag.startsWith('topic:'))
              .map((tag: string) => {
                const topic = tag.replace('topic:', '').replace(/-/g, ' ');
                return (
                  <Badge key={tag} variant="secondary" className="capitalize text-[10px] py-0 px-2 font-normal text-slate-500 bg-slate-100 border-none">
                    {topic}
                  </Badge>
                );
              })}
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

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Report post</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Reason</Label>
                <p className="text-xs text-slate-500 mb-2">Please select a reason for reporting this content.</p>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 cursor-pointer focus:ring-indigo-100">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Harassment" className="cursor-pointer">Harassment</SelectItem>
                    <SelectItem value="Spam" className="cursor-pointer">Spam</SelectItem>
                    <SelectItem value="Incorrect space/post" className="cursor-pointer">Incorrect space/post</SelectItem>
                    <SelectItem value="Against community guidelines" className="cursor-pointer">Against community guidelines</SelectItem>
                    <SelectItem value="Other" className="cursor-pointer">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Explanation</Label>
                <p className="text-xs text-slate-500 mb-2">Optionally, provide an explanation.</p>
                <Textarea
                  value={reportExplanation}
                  onChange={(e) => setReportExplanation(e.target.value)}
                  placeholder="Provide additional context for the moderators..."
                  className="min-h-[120px] rounded-xl border-slate-200 focus:ring-indigo-100 resize-none p-3"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full cursor-pointer h-11 border-slate-200 hover:bg-slate-50"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white cursor-pointer h-11 shadow-lg"
                  onClick={handleReport}
                  disabled={reportPost.isPending}
                >
                  {reportPost.isPending ? "Reporting..." : "Report"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

