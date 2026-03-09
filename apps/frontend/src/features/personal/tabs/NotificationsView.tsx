import { useState, useEffect } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string | Date;
    metadata?: any;
}

export function NotificationsView() {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Fetch notifications on mount
    useEffect(() => {
        if (!socket || !isConnected) return;

        setIsLoading(true);
        socket.emit('notification:fetch', { limit: 50 }, (err: any, response: any) => {
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

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="bg-muted rounded-full p-4 mb-4 animate-pulse">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Connecting...</h3>
                <p className="text-muted-foreground mt-2">
                    Establishing connection to notification server
                </p>
            </div>
        );
    }

    if (notifications.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="bg-muted rounded-full p-4 mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No new notifications</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    We'll notify you when something important happens.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">Recent Notifications</h3>
                {notifications.some(n => !n.read) && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={cn(
                                "p-4 transition-colors hover:bg-muted/30",
                                !notification.read && "bg-muted/10 border-l-4 border-l-primary"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    !notification.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    <Bell className="h-5 w-5" />
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className={cn("font-medium", !notification.read && "font-semibold")}>
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {notification.message}
                                    </p>

                                    {notification.metadata?.role && (
                                        <Badge variant="outline" className="mt-2 text-xs">
                                            Role: {notification.metadata.role}
                                        </Badge>
                                    )}
                                </div>

                                {!notification.read && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => markAsRead(notification.id)}
                                        title="Mark as read"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
