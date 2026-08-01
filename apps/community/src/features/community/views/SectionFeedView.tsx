"use client";

import { useMemo, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { PostType } from "@agentflox/database/src/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Bookmark, Image as ImageIcon, X as CloseIcon, Filter, Maximize2, Minimize2, Search, ChevronDown, MessageCircleQuestion, Lightbulb, Sparkles, Users, Share } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { storageUtils } from "@/utils/storage/storageUtils";
import { usePosts } from "@/entities/posts/hooks/usePosts";
import { PostCard } from "@/entities/posts/components/PostCard";
import { Editor } from "@/entities/shared/components/Editor";
import { MediaUpload } from "@/components/ui/media-upload";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WELCOME_ITEMS, SUPPORT_ITEMS } from "../components/CommunitySidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Hash, Link as LinkIcon, Video, Play, FileImage, Smile, BarChart3, Mic, Camera } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { PostSkeleton, SectionHeaderSkeleton } from "@/entities/posts/components/PostSkeleton";

const SECTION_MARKER = "[[COMMUNITY_SECTION]]";

const TOPICS = [
  "Agents",
  "Teams",
  "Workforce",
  "Workspace",
  "Project",
  "Task",
  "Tool Integration"
];

interface SectionFeedViewProps {
  sectionKey: string;
  title: string;
  subtitle: string;
  label: string;
  composerEnabled: boolean;
  hideSort?: boolean;
  icon?: any;
}

function parseSectionPost(content: string): { section: string; body: string } | null {
  if (!content.startsWith(SECTION_MARKER)) return null;
  const firstLine = content.split("\n")[0] ?? "";
  const match = firstLine.match(/\[\[COMMUNITY_SECTION\]\]\s+section:([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return {
    section: match[1],
    body: content.split("\n").slice(1).join("\n").trim(),
  };
}

export function SectionFeedView({
  sectionKey,
  title,
  subtitle,
  label,
  composerEnabled,
  hideSort = false,
  icon: Icon,
}: SectionFeedViewProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [postBody, setPostBody] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [selectedSpaceKey, setSelectedSpaceKey] = useState(sectionKey);
  const [spaceSearch, setSpaceSearch] = useState("");

  const { data: me } = trpc.user.me.useQuery();
  const { data: allGroups } = trpc.communityGroup.list.useQuery({});
  const myGroups = allGroups?.filter((g) => g.isMember) || [];

  const isAdmin = me?.role === "ADMIN" || me?.role === "OWNER";
  const searchParams = useSearchParams();
  const activeSpace = searchParams.get("space") || searchParams.get("section") || sectionKey;
  const feedKey = `community-section-${activeSpace}`;
  const { posts, isLoading, createPost, likePost, unlikePost, bookmarkPost, followPost, reportPost } = usePosts("global", feedKey);

  const sectionPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      const parsed = parseSectionPost(post.content);
      const tags = Array.isArray((post as any).tags) ? ((post as any).tags as string[]) : [];
      const hasSectionTag = tags.includes(`community:${sectionKey}`);

      const matchesTopic = !topicFilter || tags.includes(`topic:${topicFilter.toLowerCase().replace(/\s+/g, '-')}`);

      return (hasSectionTag || parsed?.section === sectionKey) && matchesTopic;
    });

    switch (sortBy) {
      case "oldest":
        return [...filtered].sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "new-activity":
        return [...filtered].sort(
          (a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
      case "popular":
      case "likes":
        return [...filtered].sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));
      case "alphabetical":
        return [...filtered].sort((a: any, b: any) => (a.title || a.content || "").localeCompare(b.title || b.content || ""));
      case "latest":
      default:
        return [...filtered].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }, [posts, sectionKey, sortBy, topicFilter]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const path = storageUtils.generateUniquePath(file.name, "community-posts");
      const result = await storageUtils.upload({ file, bucket: "community-posts", path });

      if (result.success && result.url) {
        setCoverImage(result.url);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload cover image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleCreatePost = async () => {
    const bodyValue = postBody.trim();

    if (!bodyValue || bodyValue === "<p></p>") {
      toast({ title: "Post content is required", variant: "destructive" });
      return;
    }

    const needsTitle = selectedSpaceKey === "questions" || selectedSpaceKey === "feature-requests";
    if (needsTitle && !postTitle.trim()) {
      toast({ title: "Post title is required", variant: "destructive" });
      return;
    }

    const newPostId = uuidv4();
    const isGroup = !["start-here", "introductions", "announcements", "questions", "feature-requests"].includes(selectedSpaceKey);

    const finalContent = isGroup ? bodyValue : `${SECTION_MARKER} section:${selectedSpaceKey}\n${bodyValue}`;

    const tags = isGroup ? [] : [`community:${selectedSpaceKey}`];
    selectedTopics.forEach(topic => tags.push(`topic:${topic.toLowerCase().replace(/\s+/g, '-')}`));

    try {
      await createPost.mutateAsync({
        id: newPostId,
        title: postTitle.trim() || undefined,
        content: finalContent,
        tags,
        coverImage: coverImage || undefined,
        type: PostType.POST,
        communityGroupId: isGroup ? selectedSpaceKey : undefined,
      } as any);

      setIsComposerOpen(false);
      setPostBody("");
      setPostTitle("");
      setSelectedTopics([]);
      setCoverImage(null);
      setSelectedSpaceKey(sectionKey);
    } catch (e) {
      // Error handled by usePosts
    }
  };

  const currentSpace = useMemo(() => {
    const allSpaces = [...WELCOME_ITEMS, ...SUPPORT_ITEMS];
    const section = allSpaces.find(s => s.key === selectedSpaceKey);
    if (section) return section;
    const group = myGroups.find(g => g.id === selectedSpaceKey);
    if (group) return { key: group.id, label: group.name, icon: Users };
    return { key: sectionKey, label: label, icon: Icon || Sparkles };
  }, [selectedSpaceKey, myGroups, sectionKey, label, Icon]);

  const filteredSpaces = useMemo(() => {
    const query = spaceSearch.toLowerCase();
    const filter = (item: any) => item.label.toLowerCase().includes(query) || (item.name?.toLowerCase().includes(query));

    return {
      welcome: WELCOME_ITEMS.filter(filter),
      support: SUPPORT_ITEMS.filter(filter),
      groups: myGroups.filter(g => g.name.toLowerCase().includes(query))
    };
  }, [spaceSearch, myGroups]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {!hideSort && <SectionHeaderSkeleton />}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hideSort && (
        <Card className="p-4 border-slate-200/60 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-indigo-500" />}
              <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {(sectionKey === "questions" || sectionKey === "feature-requests") && (
                <Select value={topicFilter || "all"} onValueChange={(v) => setTopicFilter(v === "all" ? null : v)}>
                  <SelectTrigger className="w-auto h-8 gap-2 cursor-pointer border-none shadow-none bg-transparent hover:bg-slate-100 px-2 transition-colors font-medium text-slate-600">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all">All Topics</SelectItem>
                    {TOPICS.map(topic => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto h-8 gap-2 cursor-pointer border-none shadow-none bg-transparent hover:bg-slate-100 px-2 transition-colors font-medium text-slate-600">
                  <SelectValue placeholder="Latest" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="new-activity">New activity</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>

              {composerEnabled && isAdmin && (
                <Button type="button" size="sm" className="cursor-pointer" onClick={() => setIsComposerOpen(true)}>
                  New post
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {sectionKey === "announcements" && (
        <Card className="p-8 border-slate-200 bg-white shadow-sm mb-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                From us, to you
              </h1>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed">
              <p className="text-[15px]">
                This space is for updates and announcements from the AgentFlox team — including new features, improvements, and what&apos;s coming next 🚀
              </p>

              <div className="space-y-4">
                <p className="flex items-start gap-3">
                  <span className="mt-1">💬</span>
                  <span>We&apos;d <em>love</em> your feedback on anything we share here. Your input helps shape what we build.</span>
                </p>

                <p className="flex items-start gap-3">
                  <span className="mt-1">❓</span>
                  <span>Have a question? Please post it over in our <span className="text-indigo-600 font-medium">Questions section</span> so we can keep things organized.</span>
                </p>
              </div>

              <p className="pt-4 font-medium text-slate-800">
                Thanks for being here! 🧑‍💻
              </p>
            </div>
          </div>
        </Card>
      )}

      {sectionKey === "introductions" && (
        <Card className="p-8 border-slate-200 bg-white shadow-sm">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Introduce yourself to the AgentFlox Community! 👋
              </h1>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed">
              <p className="text-[15px]">
                We&apos;re stoked to have you here! This is your space to connect, learn, and build alongside fellow AI builders and enthusiasts.
              </p>

              <div className="space-y-4">
                <p className="font-semibold text-slate-800">Drop an intro and tell us:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="mt-1">👤</span>
                    <span><strong>Who you are</strong> — your name, role, or just your vibe</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">🌍</span>
                    <span><strong>Where you&apos;re based</strong> — your city, country, or corner of the world</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">🛠️</span>
                    <span><strong>What you do</strong> — the work that keeps you busy (or the work you&apos;re delegating away to AI Agents!)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">⚙️</span>
                    <span><strong>What you&apos;re building</strong> — the AI projects, agents, or experiments you&apos;re tinkering with on Relevance AI</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">❗</span>
                    <span><strong>Where you&apos;re stuck</strong> — the challenges you&apos;re facing or the help you need</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">🔗</span>
                    <span><strong>How to connect</strong> — drop your LinkedIn, portfolio, or wherever you hang out online</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-sm italic text-slate-500">
                  This is more than just a forum—it&apos;s where ideas spark, problems get solved, and you&apos;ll find people who actually <span className="font-medium">get</span> what you&apos;re building. Jump in, say hi, and let&apos;s make some cool stuff together!
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {sectionKey === "questions" && (
        <Card className="p-8 border-slate-200 bg-white shadow-sm mb-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900">
                How to get help from our Community
              </h1>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-[15px]">
              <p>
                You can use this space to get help with the issues you&apos;re facing in AgentFlox, ask for advice on how to build your Agents, and share your feedback on our platform.
              </p>

              <p>
                Your questions will be visible to the rest of the Community, and can be answered by other AgentFlox users, Partners, and the team at AgentFlox.
              </p>

              <div className="space-y-4">
                <p className="font-semibold text-slate-800">To make sure it&apos;s as easy as possible to help you out, make sure you do the following:</p>
                <ol className="space-y-4 ml-1">
                  <li className="flex gap-3">
                    <span className="font-bold text-slate-400">1.</span>
                    <span>Consult our <span className="text-indigo-600 font-medium">documentation</span> before raising your question to make sure that your question isn&apos;t answered by our docs (we also have an Agent in our documentation to help you!)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-slate-400">2.</span>
                    <span>Search the Community in case someone has already asked the same question as you and gotten it answered.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-slate-400">3.</span>
                    <span>Provide as much detail as you can on your question that you&apos;re happy to share publicly about the issue you&apos;re facing. Loom (screen recording) links, screenshots, details on the Agent you&apos;re building, what you&apos;ve already tried, what research you&apos;ve done, etc. will help your fellow Community members help you!</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <p>
                  <strong>Please note that this space is primarily monitored by our Community members, and is considered a peer to peer Community space.</strong> If your question has been left unanswered, you are welcome to <span className="text-indigo-600 font-medium">reach out to our support team</span> for help.
                </p>

                <p className="text-sm text-slate-500">
                  This space is not for pitching agent building or consulting services. These posts will be deleted by our team.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-sm">
                <span className="text-lg">⚠️</span>
                <p>
                  We cannot assist with log-in, account, or billing issues in the Community, or any other issues that involve PII. Please reach out to our support team for help with these questions.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {sectionKey === "feature-requests" && (
        <Card className="p-8 border-slate-200 bg-white shadow-sm mb-8">
          <div className="max-w-4xl">
            <div className="flex items-start justify-between mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Raise feature requests for AgentFlox here!
              </h1>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-[15px]">
              <p>
                You can use this space to share feature requests you have on the AgentFlox platform. Please follow this process to share your ideas.
              </p>

              <ol className="space-y-4 ml-1">
                <li className="flex gap-4">
                  <span className="font-bold text-slate-400 shrink-0">1.</span>
                  <span>Use the search bar at the top of the Community to check if your request already exists - if so, please like and comment on that post</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-slate-400 shrink-0">2.</span>
                  <span>You can also use the topics to filter and find requests</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-slate-400 shrink-0">3.</span>
                  <span>Like and comment on the posts of feature requests you&apos;d like us to prioritize shipping</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-slate-400 shrink-0">4.</span>
                  <span>If your feature request doesn&apos;t exist yet, create a new post in this space with as much detail on what it is you&apos;d like us to add to the platform</span>
                </li>
              </ol>

              <div className="flex items-center gap-2.5 p-4 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-800 font-medium">
                <span className="text-lg">⚠️</span>
                <span>Please note that duplicate posts will be deleted.</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {hideSort && composerEnabled && isAdmin && (
        <div className="flex justify-end">
          <Button type="button" className="cursor-pointer" onClick={() => setIsComposerOpen(true)}>
            New post
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {sectionPosts.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-600">No posts yet in this section.</Card>
        )}
        {sectionPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post as any}
            feedType="global"
            feedId={feedKey}
            likePost={likePost}
            unlikePost={unlikePost}
            bookmarkPost={bookmarkPost}
            followPost={followPost}
            reportPost={reportPost}
          />
        ))}
      </div>

      <Dialog open={isComposerOpen} onOpenChange={(open) => {
        setIsComposerOpen(open);
        if (!open) setIsMaximized(false);
      }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-h-[90vh] overflow-y-auto p-0 custom-scrollbar transition-all duration-300",
            isMaximized
              ? "sm:max-w-[100vw] sm:h-screen sm:max-h-screen top-0 left-0 translate-x-0 translate-y-0 rounded-none"
              : "sm:max-w-[700px] rounded-xl"
          )}
        >
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center justify-between p-4 px-6">
            <DialogTitle className="text-lg font-bold text-slate-800">Create post</DialogTitle>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <TooltipProvider>
                {!coverImage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add cover image</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      onClick={() => setIsMaximized(!isMaximized)}
                    >
                      {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMaximized ? "Restore" : "Maximize"}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      onClick={() => setIsComposerOpen(false)}
                    >
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="p-0 space-y-0">
            {/* Cover Image Display */}
            {coverImage && (
              <div className="relative group w-full aspect-[21/9] border-b border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="cursor-pointer font-medium"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Change Cover"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer font-medium"
                    onClick={() => setCoverImage(null)}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <div className={cn("p-6 space-y-4", coverImage && "pt-4")}>
              {/* Title for specific sections */}
              {(selectedSpaceKey === "questions" || selectedSpaceKey === "feature-requests") && (
                <div className="space-y-1">
                  <Input
                    id="post-title"
                    placeholder="Title (optional)"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="text-lg font-bold border border-transparent shadow-none px-2 focus-visible:ring-2 focus-visible:ring-indigo-100/50 focus-visible:border-indigo-200 placeholder:text-slate-400 transition-all bg-transparent h-10 rounded-md"
                  />
                </div>
              )}

              {/* Content Editor */}
              <div className="space-y-1.5 focus-within:ring-2 focus-within:ring-indigo-100/50 focus-within:border-indigo-200 border border-transparent rounded-md transition-all">
                <Editor
                  onContentChange={setPostBody}
                  initialContent={postBody}
                  placeholder="Share more details..."
                  minHeight={300}
                  editorClassName="prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[300px]"
                />
              </div>

              {/* Topics Selection - New Style */}
              {(selectedSpaceKey === "questions" || selectedSpaceKey === "feature-requests") && (
                <div className="space-y-3 pt-2 border-t border-slate-50">
                  <div className="flex flex-col gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-600 transition-colors py-1">
                          Choose up to 5 topics
                        </div>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[200px] p-1">
                        <div className="space-y-1">
                          {TOPICS.filter(t => !selectedTopics.includes(t)).map(topic => (
                            <button
                              key={topic}
                              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 transition-colors"
                              onClick={() => {
                                if (selectedTopics.length < 5) {
                                  setSelectedTopics([...selectedTopics, topic]);
                                }
                              }}
                            >
                              {topic}
                            </button>
                          ))}
                          {TOPICS.filter(t => !selectedTopics.includes(t)).length === 0 && (
                            <div className="px-3 py-1.5 text-xs text-slate-400">All topics selected</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {selectedTopics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedTopics.map(topic => (
                          <Badge 
                            key={topic} 
                            variant="outline" 
                            className="bg-white text-slate-700 border-slate-200 px-3 py-1 gap-1.5 hover:bg-slate-50 transition-colors font-medium rounded-full cursor-pointer"
                          >
                            {topic}
                            <CloseIcon 
                              className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" 
                              onClick={() => setSelectedTopics(selectedTopics.filter(t => t !== topic))}
                            />
                          </Badge>
                        ))}
                        <button 
                          onClick={() => setSelectedTopics([])}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors ml-1"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-4 px-6 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">Posting in:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 text-[15px] font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer outline-none">
                        <span>{currentSpace.label}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[280px] p-0 overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 px-2.5 bg-slate-50 rounded-md border border-slate-100 focus-within:border-indigo-200 transition-colors">
                          <Search className="h-4 w-4 text-slate-400 shrink-0" />
                          <input
                            placeholder="Search space..."
                            className="w-full h-9 bg-transparent border-none outline-none text-sm placeholder:text-slate-400"
                            value={spaceSearch}
                            onChange={(e) => setSpaceSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div
                        className="max-h-[300px] overflow-y-auto custom-scrollbar p-1"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {filteredSpaces.welcome.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Welcome</div>
                            {filteredSpaces.welcome.map(space => (
                              <button
                                key={space.key}
                                onClick={() => {
                                  setSelectedSpaceKey(space.key);
                                  setSpaceSearch("");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                  selectedSpaceKey === space.key ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                              >
                                <space.icon className="h-4 w-4 text-indigo-500" />
                                <span>{space.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredSpaces.support.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Support and Resources</div>
                            {filteredSpaces.support.map(space => (
                              <button
                                key={space.key}
                                onClick={() => {
                                  setSelectedSpaceKey(space.key);
                                  setSpaceSearch("");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                  selectedSpaceKey === space.key ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                              >
                                <space.icon className="h-4 w-4 text-indigo-500" />
                                <span>{space.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredSpaces.groups.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discussion Groups</div>
                            {filteredSpaces.groups.map(group => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  setSelectedSpaceKey(group.id);
                                  setSpaceSearch("");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                  selectedSpaceKey === group.id ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                              >
                                <Users className="h-4 w-4 text-indigo-500" />
                                <span className="truncate">{group.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button 
                  onClick={handleCreatePost} 
                  disabled={createPost.isPending} 
                  className="cursor-pointer min-w-[100px] h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-8"
                >
                  {createPost.isPending ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
