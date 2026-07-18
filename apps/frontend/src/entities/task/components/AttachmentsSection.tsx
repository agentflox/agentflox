'use client';

import * as React from 'react';
import {
    Paperclip, Upload, X, Download, Eye, Trash2,
    FileText, FileImage, FileVideo, FileAudio, File,
    MoreHorizontal, Maximize2, Minimize2, ChevronRight, Plus,
    LayoutGrid, List
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { storageUtils } from '@/utils/storage/storageUtils';

interface AttachmentsSectionProps {
    taskId: string;
}

export function AttachmentsSection({ taskId }: AttachmentsSectionProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('grid');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const utils = trpc.useUtils();

    // Fetch attachments
    const { data: attachments = [] } = trpc.task.attachments.list.useQuery({ taskId });

    // Mutations with optimistic updates
    const createAttachment = trpc.task.attachments.create.useMutation({
        onMutate: async (newAttachment) => {
            // Cancel outgoing refetches
            await utils.task.attachments.list.cancel({ taskId });
            await utils.task.get.cancel({ id: taskId });
            await utils.task.list.cancel();

            // Snapshot previous values
            const previousAttachments = utils.task.attachments.list.getData({ taskId });
            const previousTask = utils.task.get.getData({ id: taskId });

            // Optimistically update attachments list
            utils.task.attachments.list.setData({ taskId }, (old) => {
                const optimisticAttachment = {
                    id: `temp-${Date.now()}`,
                    taskId,
                    filename: newAttachment.filename,
                    url: newAttachment.url,
                    size: BigInt(newAttachment.size),
                    mimeType: newAttachment.mimeType,
                    createdAt: new Date(),
                    uploadedBy: 'current-user',
                    uploader: {
                        id: 'current-user',
                        name: 'You',
                        image: null,
                    },
                };
                return old ? [...old, optimisticAttachment] : [optimisticAttachment];
            });

            // Optimistically update task attachment count
            utils.task.get.setData({ id: taskId }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    _count: {
                        ...old._count,
                        attachments: (old._count?.attachments ?? 0) + 1,
                    },
                };
            });

            // Also update in task list if present
            utils.task.list.setData({}, (old: any) => {
                if (!old?.items) return old;
                return {
                    ...old,
                    items: old.items.map((task: any) => {
                        if (task.id === taskId) {
                            return {
                                ...task,
                                _count: {
                                    ...task._count,
                                    attachments: (task._count?.attachments ?? 0) + 1,
                                },
                            };
                        }
                        return task;
                    }),
                };
            });

            return { previousAttachments, previousTask };
        },
        onError: (error, newAttachment, context) => {
            // Rollback on error
            if (context?.previousAttachments) {
                utils.task.attachments.list.setData({ taskId }, context.previousAttachments);
            }
            if (context?.previousTask) {
                utils.task.get.setData({ id: taskId }, context.previousTask);
            }
            toast.error(error.message || 'Failed to upload file');
        },
        onSuccess: () => {
            toast.success('File uploaded');
        },
        onSettled: () => {
            // Refetch to get the actual server data
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        }
    });

    const deleteAttachment = trpc.task.attachments.delete.useMutation({
        onMutate: async (deletedAttachment) => {
            // Cancel outgoing refetches
            await utils.task.attachments.list.cancel({ taskId });
            await utils.task.get.cancel({ id: taskId });
            await utils.task.list.cancel();

            // Snapshot previous values
            const previousAttachments = utils.task.attachments.list.getData({ taskId });
            const previousTask = utils.task.get.getData({ id: taskId });

            // Optimistically remove the attachment
            utils.task.attachments.list.setData({ taskId }, (old) => {
                return old ? old.filter(att => att.id !== deletedAttachment.id) : [];
            });

            // Optimistically update task attachment count
            utils.task.get.setData({ id: taskId }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    _count: {
                        ...old._count,
                        attachments: Math.max((old._count?.attachments ?? 0) - 1, 0),
                    },
                };
            });

            // Also update in task list if present
            utils.task.list.setData({}, (old: any) => {
                if (!old?.items) return old;
                return {
                    ...old,
                    items: old.items.map((task: any) => {
                        if (task.id === taskId) {
                            return {
                                ...task,
                                _count: {
                                    ...task._count,
                                    attachments: Math.max((task._count?.attachments ?? 0) - 1, 0),
                                },
                            };
                        }
                        return task;
                    }),
                };
            });

            return { previousAttachments, previousTask };
        },
        onError: (error, deletedAttachment, context) => {
            // Rollback on error
            if (context?.previousAttachments) {
                utils.task.attachments.list.setData({ taskId }, context.previousAttachments);
            }
            if (context?.previousTask) {
                utils.task.get.setData({ id: taskId }, context.previousTask);
            }
            toast.error(error.message || 'Failed to delete file');
        },
        onSuccess: () => {
            toast.success('File deleted');
        },
        onSettled: () => {
            // Refetch to ensure we're in sync with the server
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        }
    });

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        await handleFiles(files);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await handleFiles(files);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setUploading(true);

        try {
            for (const file of files) {
                const pathPrefix = `tasks/${taskId}`;
                const path = storageUtils.generateUniquePath(file.name, pathPrefix);

                const result = await storageUtils.upload({
                    file,
                    bucket: 'attachments',
                    path,
                    upsert: true,
                });

                if (result.success && result.url) {
                    await createAttachment.mutateAsync({
                        taskId,
                        filename: file.name,
                        url: result.url,
                        size: file.size,
                        mimeType: file.type,
                    });
                } else {
                    console.error('Upload error:', result.error);
                    toast.error(`Failed to upload ${file.name}: ${result.error}`);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload some files');
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return FileImage;
        if (mimeType.startsWith('video/')) return FileVideo;
        if (mimeType.startsWith('audio/')) return FileAudio;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
        return File;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleDownload = (attachment: any) => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = (attachment: any) => {
        window.open(attachment.url, '_blank');
    };


    return (
        <div className={cn("transition-all duration-200 bg-white", isMaximized ? "absolute inset-0 z-50 p-8 overflow-y-auto flex flex-col" : "relative space-y-3")}>
            {isMaximized && (
                <div className="absolute top-6 right-6">
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => setIsMaximized(false)}>
                        Close <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div 
                className={cn("space-y-3", isMaximized && "max-w-5xl w-full mx-auto mt-12")}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />

            {attachments.length === 0 ? (
                <div className="py-0.5">
                    <Button
                        variant="ghost"
                        className="w-full justify-start h-8 px-2 text-[13px] text-zinc-600 font-normal hover:bg-zinc-100/80"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-4 h-4 mr-2 text-zinc-400" />
                        Attach file
                    </Button>
                </div>
            ) : (
                <>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 group/header">
                    <div
                        className={cn(
                            "flex items-center gap-2",
                            attachments.length > 0 && "cursor-pointer hover:bg-zinc-50 py-1 px-1 -ml-1 rounded transition-colors group"
                        )}
                        onClick={() => attachments.length > 0 && setIsCollapsed(!isCollapsed)}
                    >
                        <ChevronRight className={cn("h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-transform", !isCollapsed && "rotate-90")} />
                        <span className="text-sm font-semibold text-zinc-900">Attachments</span>
                        {attachments.length > 0 && (
                            <span className="text-[13px] text-zinc-400 font-normal">{attachments.length}</span>
                        )}
                    </div>

                    <div className="flex items-center opacity-0 group-hover/header:opacity-100 transition-opacity">
                        <TooltipProvider delayDuration={200}>
                            <div className="flex items-center p-0.5 border border-zinc-200 rounded-md shadow-sm bg-white">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100">
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top">Download all</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className={cn("h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100", viewMode === 'grid' && "bg-zinc-100")}
                                            onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }}
                                        >
                                            <LayoutGrid className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top">Grid view</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className={cn("h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100", viewMode === 'list' && "bg-zinc-100")}
                                            onClick={(e) => { e.stopPropagation(); setViewMode('list'); }}
                                        >
                                            <List className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top">List view</TooltipContent>
                                </Tooltip>
                                {!isMaximized && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                                                onClick={(e) => { e.stopPropagation(); setIsMaximized(true); }}
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                            Maximize
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                            type="button"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                        Upload file
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>
                </div>

                {!isCollapsed && (
                <>
                {/* Drag and Drop Zone */}
                <div 
                    className={cn(
                        "mt-1 border border-dashed rounded-lg py-3 text-center text-[13px] text-zinc-500 transition-colors bg-zinc-50/50",
                        isDragging ? "border-blue-500 bg-blue-50 text-blue-600" : "border-zinc-200"
                    )}
                >
                    Drop files here or <span className="border-b border-zinc-400 border-dotted cursor-pointer hover:text-zinc-800" onClick={() => fileInputRef.current?.click()}>browse</span>
                </div>

                {/* Uploading State */}
                {uploading && (
                    <div className="flex items-center gap-2 p-3 mt-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                        <span className="text-sm text-blue-700">Uploading files...</span>
                    </div>
                )}

                {/* Attachments List / Grid */}
                {viewMode === 'list' ? (
                <div className="mt-3 border border-zinc-100 rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-white border-b border-zinc-100 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-3 py-2 font-normal w-full">Name</th>
                                <th className="px-3 py-2 font-normal whitespace-nowrap min-w-[80px]">Size</th>
                                <th className="px-3 py-2 font-normal whitespace-nowrap min-w-[100px]">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-800">
                                        Modified <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[4.5px] border-b-zinc-500"></div>
                                    </div>
                                </th>
                                <th className="px-3 py-2 font-normal whitespace-nowrap min-w-[100px]">Author</th>
                                <th className="px-2 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {attachments.map((attachment) => {
                                const IconComponent = getFileIcon(attachment.mimeType);
                                const isImage = attachment.mimeType.startsWith('image/');
                                const isOptimistic = attachment.id.startsWith('temp-');

                                return (
                                    <tr key={attachment.id} className={cn("group hover:bg-zinc-50/80 transition-colors", isOptimistic && "opacity-60")}>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-6 w-6 rounded flex items-center justify-center shrink-0 border border-zinc-100 bg-white overflow-hidden shadow-[0_0_2px_rgba(0,0,0,0.1)]">
                                                    {isImage ? (
                                                        <img
                                                            src={attachment.url}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <IconComponent className="h-3 w-3 text-cyan-500" />
                                                    )}
                                                </div>
                                                <span className="truncate text-zinc-600 max-w-[250px] font-medium hover:underline cursor-pointer">
                                                    {attachment.filename}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500 font-medium">
                                            {formatFileSize(Number(attachment.size))}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500">
                                            {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 bg-zinc-600">
                                                    <AvatarImage src={attachment.uploader.image || undefined} />
                                                    <AvatarFallback className="text-[9px] text-white bg-zinc-500 border-none">
                                                        {attachment.uploader.name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isOptimistic && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-32">
                                                            <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                                                                <Download className="h-4 w-4 mr-2" />
                                                                Download
                                                            </DropdownMenuItem>
                                                            {isImage && (
                                                                <DropdownMenuItem onClick={() => handlePreview(attachment)}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    Preview
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => deleteAttachment.mutate({ id: attachment.id })}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                ) : (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {attachments.map((attachment) => {
                        const IconComponent = getFileIcon(attachment.mimeType);
                        const isImage = attachment.mimeType.startsWith('image/');
                        const isOptimistic = attachment.id.startsWith('temp-');

                        return (
                            <div key={attachment.id} className={cn("group relative flex flex-col rounded-xl bg-zinc-100/80 p-2 transition-all hover:bg-zinc-100", isOptimistic && "opacity-60")}>
                                <div className="relative aspect-[4/3] w-full rounded-lg bg-white border border-zinc-100 shadow-sm overflow-hidden flex items-center justify-center mb-2">
                                    {isImage ? (
                                        <img
                                            src={attachment.url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <IconComponent className="h-8 w-8 text-cyan-500" />
                                    )}
                                    {/* Actions on hover */}
                                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        {isImage && !isOptimistic && (
                                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md bg-white/90 hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-zinc-600" onClick={() => handlePreview(attachment)}>
                                                <Maximize2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {!isOptimistic && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md bg-white/90 hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-zinc-600">
                                                        <MoreHorizontal className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                                                        <Download className="h-4 w-4 mr-2" /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteAttachment.mutate({ id: attachment.id })} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col flex-1 px-1">
                                    <div className="text-[13px] font-medium text-zinc-700 truncate hover:underline cursor-pointer" title={attachment.filename}>
                                        {attachment.filename}
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <div className="text-[11px] text-zinc-500">
                                            {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                                        </div>
                                        <Avatar className="h-[18px] w-[18px] bg-zinc-600 shadow-sm shrink-0">
                                            <AvatarImage src={attachment.uploader.image || undefined} />
                                            <AvatarFallback className="text-[8px] text-white bg-zinc-500 border-none">
                                                {attachment.uploader.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
                </>
                )}
            </>
            )}
            </div>
        </div>
    );
}
