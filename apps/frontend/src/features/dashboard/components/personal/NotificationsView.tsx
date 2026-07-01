import { useState, useEffect } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Clock, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string | Date;
    metadata?: any;
}

import type { PersonalTabProps } from './TasksView';

export function NotificationsView({ spaceId, projectId, workspaceId, teamId, context }: PersonalTabProps) {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch notifications on mount
    useEffect(() => {
        if (!socket || !isConnected) return;

        setIsLoading(true);
        socket.emit('notification:fetch', { 
            limit: 50,
            spaceId, projectId, workspaceId, teamId, context
        }, (err: any, response: any) => {
            setIsLoading(false);
            if (err) {
                console.error('Failed to fetch notifications:', err);
                return;
            }
            if (response && response.items) {
                setNotifications(response.items);
            }
        });

        // Listen for new notifications
        const handleNewNotification = (data: any) => {
            // Add new notification to the top
            setNotifications((prev) => [
                {
                    id: data.notificationId || data.id,
                    type: data.type || 'INFO',
                    title: data.title || 'New Notification',
                    message: data.message || '',
                    read: false,
                    createdAt: new Date(),
                    metadata: data.metadata
                },
                ...prev
            ]);

            toast({
                title: "New Notification",
                description: data.title || "You have a new notification",
            });
        };

        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, isConnected, toast]);

    const markAsRead = (id: string) => {
        if (!socket) return;

        socket.emit('notification:mark_read', { notificationId: id });

        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        if (!socket) return;

        socket.emit('notification:mark_all_read');

        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        toast({
            title: "All marked as read",
        });
    };

    const handleDelete = () => {
        if (!notificationToDelete || !socket) return;

        socket.emit('notification:delete', { notificationId: notificationToDelete });

        // Optimistic update
        setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete));

        toast({
            title: "Notification deleted",
        });

        setNotificationToDelete(null);
        setIsDeleteDialogOpen(false);
    };

    const confirmDelete = (id: string) => {
        setNotificationToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="w-full space-y-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            {/* Header Area */}
            <div className="max-w-3xl mx-auto w-full space-y-1.5">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
                    Notification Center
                </h1>
                <p className="text-slate-600 text-sm">
                    Stay updated with the latest alerts, activities, and messages.
                </p>
            </div>

            <div className="max-w-3xl mx-auto w-full space-y-4">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <div className="bg-muted rounded-full p-4 mb-4 animate-pulse">
                            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        </div>
                        <h3 className="text-lg font-medium">Connecting...</h3>
                        <p className="text-muted-foreground mt-2">
                            Establishing connection to notification server
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-4 border border-zinc-100 rounded-2xl bg-white">
                                <div className="flex items-start gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2.5">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                    <div className="flex flex-col justify-between items-end self-stretch min-h-[80px]">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <div className="bg-muted rounded-full p-4 mb-4">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium">No new notifications</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            We'll notify you when something important happens.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-end mb-2">
                            {notifications.some(n => !n.read) && (
                                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-zinc-500 hover:text-indigo-600 transition-colors">
                                    Mark all as read
                                </Button>
                            )}
                        </div>

                        <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <Card
                                        key={notification.id}
                                        className={cn(
                                            "p-4 transition-all hover:shadow-md border border-zinc-100",
                                            !notification.read ? "bg-indigo-50/30 border-l-4 border-l-indigo-500" : "bg-white"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "p-2 rounded-full",
                                                !notification.read ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-400"
                                            )}>
                                                <Bell className="h-5 w-5" />
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <p className={cn("text-[15px] text-zinc-800", !notification.read ? "font-semibold" : "font-medium")}>
                                                    {notification.title}
                                                </p>

                                                <p className="text-sm text-zinc-600 leading-relaxed">
                                                    {notification.message}
                                                </p>

                                                {notification.metadata?.role && (
                                                    <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-wider bg-zinc-100 text-zinc-600 border-none">
                                                        Role: {notification.metadata.role}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex flex-col justify-between items-end self-stretch min-w-[100px] gap-4">
                                                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                                
                                                <div className="flex items-center gap-1">
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                            onClick={() => markAsRead(notification.id)}
                                                            title="Mark as read"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-500/70 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 active:scale-90"
                                                        onClick={() => confirmDelete(notification.id)}
                                                        title="Delete notification"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This notification will be permanently removed from your history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-0">
                        <AlertDialogCancel className="bg-zinc-100 text-zinc-700 border-none hover:bg-zinc-200 hover:text-zinc-900 transition-colors font-medium">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all active:scale-95 font-semibold"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
