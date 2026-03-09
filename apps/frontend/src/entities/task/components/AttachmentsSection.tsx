'use client';

import * as React from 'react';
import {
    Paperclip, Upload, X, Download, Eye, Trash2,
    FileText, FileImage, FileVideo, FileAudio, File,
    MoreHorizontal
} from 'lucide-react';
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
                    size: newAttachment.size,
                    mimeType: newAttachment.mimeType,
                    createdAt: new Date(),
                    uploaderId: 'current-user',
                    uploader: {
                        id: 'current-user',
                        name: 'You',
                        email: '',
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
            utils.task.list.setData(undefined, (old: any) => {
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
            utils.task.list.setData(undefined, (old: any) => {
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Attachments</span>
                    {attachments.length > 0 && (
                        <span className="text-xs text-zinc-500">({attachments.length})</span>
                    )}
                </div>
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
                    isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-zinc-200 hover:border-zinc-300 bg-zinc-50"
                )}
            >
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Upload className={cn(
                        "h-8 w-8",
                        isDragging ? "text-blue-500" : "text-zinc-400"
                    )} />
                    <div>
                        <p className="text-sm font-medium text-zinc-700">
                            {isDragging ? 'Drop files here' : 'Drag and drop files'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                            or click to browse
                        </p>
                    </div>
                </div>
            </div>

            {/* Uploading State */}
            {uploading && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    <span className="text-sm text-blue-700">Uploading files...</span>
                </div>
            )}

            {/* Attachments List */}
            {attachments.length > 0 && (
                <div className="space-y-2">
                    {attachments.map((attachment) => {
                        const IconComponent = getFileIcon(attachment.mimeType);
                        const isImage = attachment.mimeType.startsWith('image/');
                        const isOptimistic = attachment.id.startsWith('temp-');

                        return (
                            <div
                                key={attachment.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 group transition-all",
                                    isOptimistic && "opacity-60"
                                )}
                            >
                                {/* File Icon/Preview */}
                                <div className="shrink-0">
                                    {isImage ? (
                                        <div className="h-12 w-12 rounded overflow-hidden bg-zinc-100">
                                            <img
                                                src={attachment.url}
                                                alt={attachment.filename}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-12 w-12 rounded bg-zinc-100 flex items-center justify-center">
                                            <IconComponent className="h-6 w-6 text-zinc-500" />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-medium text-zinc-900 truncate">
                                            {attachment.filename}
                                        </h4>
                                        {isOptimistic && (
                                            <span className="text-xs text-zinc-500 italic">Uploading...</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                        <span>{formatFileSize(Number(attachment.size))}</span>
                                        <span>•</span>
                                        <span>
                                            {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                                        </span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={attachment.uploader.image || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {attachment.uploader.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{attachment.uploader.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isImage && !isOptimistic && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => handlePreview(attachment)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {!isOptimistic && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => handleDownload(attachment)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {!isOptimistic && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => deleteAttachment.mutate({ id: attachment.id })}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
