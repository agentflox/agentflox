"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Bell, Check, CheckCheck, Trash2, Eye } from "lucide-react";
import { PageHeader } from "@/entities/shared/components/PageHeader";

export default function NotificationDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const { data: notifications, isLoading, refetch } = trpc.notification.getNotifications.useQuery({
    unreadOnly: activeTab === "unread",
  });

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      toast({
        title: "All notifications marked as read",
      });
      refetch();
    },
  });

  const deleteNotificationMutation = trpc.notification.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      toast({
        title: "Notification marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync({ notificationId });
      toast({
        title: "Notification deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with your latest alerts and notifications"
        actions={
          unreadCount && unreadCount.count > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount && unreadCount.count > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount.count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notifications?.notifications.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications?.notifications.map((notification: any) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {notifications?.notifications.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No unread notifications</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications?.notifications.map((notification: any) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
    readAt?: Date | null;
    relatedId?: string | null;
    relatedType?: string | null;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPLICATION_RECEIVED":
        return "📝";
      case "APPLICATION_STATUS":
        return "✅";
      case "MESSAGE_RECEIVED":
        return "💬";
      case "CONNECTION_REQUEST":
        return "🤝";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "APPLICATION_RECEIVED":
        return "bg-blue-50 border-blue-200";
      case "APPLICATION_STATUS":
        return "bg-green-50 border-green-200";
      case "MESSAGE_RECEIVED":
        return "bg-purple-50 border-purple-200";
      case "CONNECTION_REQUEST":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{getNotificationIcon(notification.type)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                  {!notification.isRead && (
                    <Badge variant="secondary" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!notification.isRead && (
                  <Button
                    variant="outline"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onDelete(notification.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
