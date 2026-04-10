"use client";

import { useState } from "react";
import { 
    FileText, 
    Star, 
    Search, 
    MoreHorizontal, 
    ChevronsLeft,
    Plus,
    Link as LinkIcon,
    MessageSquare,
    Type,
    Image as ImageIcon,
    Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface DocViewProps {
    listId: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    viewId: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context: string;
}

export function DocView({ listId, spaceId, projectId, viewId }: DocViewProps) {
    const [title, setTitle] = useState("Untitled");
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<string | null>(null);

    return (
        <div className="flex h-full w-full bg-white text-zinc-900 border-t border-zinc-200">
            {/* Sidebar */}
            <div className="w-[260px] border-r border-zinc-200 flex flex-col shrink-0 bg-zinc-50/50">
                <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-sky-500 rounded p-1 flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-sm">Doc</span>
                        <Star className="h-3.5 w-3.5 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
                    </div>
                    <div className="flex items-center gap-0.5 text-zinc-400">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm">
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm">
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-3">
                        <div className="text-[11px] font-semibold text-zinc-500 mb-2 px-2 uppercase tracking-wider">Pages</div>
                        <div className="flex flex-col gap-0.5">
                            <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-200/50 rounded-md text-sm text-zinc-700 transition-colors w-full text-left">
                                <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                                <span className="truncate">Untitled</span>
                            </button>
                            <button className="flex items-center gap-2 px-2 py-1.5 bg-zinc-200/60 rounded-md text-sm font-medium text-zinc-900 transition-colors w-full text-left">
                                <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                                <span className="truncate">Untitled</span>
                            </button>
                            <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-200/50 rounded-md text-sm text-zinc-500 mt-1 transition-colors w-full text-left">
                                <Plus className="h-4 w-4 shrink-0" />
                                <span>Add page</span>
                            </button>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {/* Floating right actions */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-zinc-500 z-10 hidden sm:flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm">
                        <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm">
                        <Type className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm">
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 h-full w-full">
                    <div className="max-w-[900px] w-full mx-auto px-6 md:px-12 pt-16 pb-48">
                        
                        {/* Interactive Cover / Banner block */}
                        <div className="group relative w-full h-40 bg-zinc-100 rounded-lg mb-8 overflow-hidden hover:ring-2 hover:ring-zinc-200 transition-all cursor-pointer border border-zinc-100">
                            {coverImage ? (
                                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="text-sm font-medium">Add Cover</span>
                                </div>
                            )}
                            
                            {/* Hover setting button */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="h-8 bg-white/90 shadow-sm border border-zinc-200 text-xs gap-1.5"
                                >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    Cover Settings
                                </Button>
                            </div>
                        </div>

                        {/* Link task or doc */}
                        <div className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 cursor-pointer mb-6 text-sm font-medium transition-colors w-fit px-1">
                            <LinkIcon className="h-3.5 w-3.5" />
                            Link Task or Doc
                        </div>

                        {/* Title Input */}
                        <Input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Untitled"
                            className="text-4xl font-bold border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 placeholder:text-zinc-200 h-auto mb-4 px-1"
                        />
                        
                        {/* Meta Information */}
                        <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-500 mb-8 pb-6 border-b border-zinc-100 px-1">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-zinc-800 text-white text-[10px]">D</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-zinc-700">Dat nguyen</span>
                            <span>•</span>
                            <span>Last updated Today at 2:09 am</span>
                        </div>

                        {/* DescriptionEditor from shared components */}
                        <div className="px-1 prose-blue max-w-none">
                            <DescriptionEditor 
                                content={content}
                                onChange={setContent}
                                spaceId={spaceId}
                                projectId={projectId}
                                editable={true}
                            />
                        </div>

                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

export default DocView;
