"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Eye, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const { data: notifications, isLoading } = trpc.notification.getNotifications.useQuery({
    unreadOnly: false,
    pageSize: 10,
  });

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery();

  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      toast({
        title: "Notification marked as read",
      });
    },
  });

  const deleteNotificationMutation = trpc.notification.deleteNotification.useMutation({
    onSuccess: () => {
      toast({
        title: "Notification deleted",
      });
    },
  });

  // Real-time: listen for new notifications and refresh caches
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNew = () => {
      utils.notification.getNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    };

    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [socket, isConnected, utils.notification.getNotifications, utils.notification.getUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync({ notificationId });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/notifications");
  };

  const allNotifications = notifications?.notifications || [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200 ${isOpen ? 'ring-2 ring-zinc-200 text-zinc-900' : ''
          }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount && unreadCount.count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 ring-2 ring-white text-[10px] font-bold text-white">
            {unreadCount.count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 z-50">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
            {unreadCount && unreadCount.count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount.count} unread
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                Loading...
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {allNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`group relative p-4 transition-colors hover:bg-zinc-50/80 ${!notification.isRead ? "bg-zinc-50/50" : "bg-white"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.isRead && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? "font-medium text-zinc-900" : "font-normal text-zinc-600"
                          }`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                          {notification.content}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-400">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                            title="Mark as read"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 bg-zinc-50 p-2">
            <Button
              variant="ghost"
              onClick={handleViewAll}
              className="w-full h-8 text-xs justify-center gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
