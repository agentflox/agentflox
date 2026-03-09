"use client"
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Check, X, Mail, Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Send, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { permissionsService } from '@/services/permissions.service';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface RequestItem {
    id: string;
    token?: string;
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    type: 'invitation' | 'transfer' | 'access';
    title: string;
    description: string;
    sender: {
        name: string;
        email: string;
        avatar?: string;
    };
    recipient?: {
        name: string;
        email: string;
        avatar?: string;
    };
    metadata: any;
    createdAt: string | Date;
}

export function RequestsView() {
    const { toast } = useToast();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [receivedRequests, setReceivedRequests] = useState<RequestItem[]>([]);
    const [sentRequests, setSentRequests] = useState<RequestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchReceivedRequests = async () => {
        try {
            const response = await permissionsService.invitations.listPending(session);

            if (!response.ok) {
                throw new Error('Failed to fetch requests');
            }

            const data = await response.json();
            setReceivedRequests(data as RequestItem[]);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load received requests."
            });
        }
    };

    const fetchSentRequests = async () => {
        try {
            const response = await permissionsService.invitations.listSent(session);

            if (!response.ok) {
                throw new Error('Failed to fetch sent requests');
            }

            const data = await response.json();
            setSentRequests(data as RequestItem[]);
        } catch (error) {
            console.error(error);
            // Don't show error toast for sent requests as the endpoint might not exist yet
            setSentRequests([]);
        }
    };

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchReceivedRequests(),
                fetchSentRequests()
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchRequests();
        }
    }, [session]);

    const handleAccept = async (request: RequestItem) => {
        if (!request.token) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Invitation token missing. Cannot accept."
            });
            return;
        }

        setProcessingId(request.id);
        try {
            await permissionsService.invitations.accept({ token: request.token }, session);

            toast({
                title: 'Request accepted',
                description: 'You have successfully joined.',
            });
            setReceivedRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'accepted' } : r));
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error processing request',
                description: error.message || 'Failed to accept'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (request: RequestItem) => {
        if (!request.token) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Invitation token missing. Cannot decline."
            });
            return;
        }

        setProcessingId(request.id);
        try {
            await permissionsService.invitations.decline({ token: request.token }, session);

            toast({
                title: 'Request declined',
                description: 'You have declined the invitation.',
            });
            setReceivedRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'cancelled' } : r));
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error processing request',
                description: error.message || 'Failed to decline'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        setProcessingId(inviteId);
        try {
            const response = await permissionsService.invitations.cancel(inviteId, session);

            if (!response.ok) {
                throw new Error('Failed to cancel invitation');
            }

            toast({
                title: 'Invitation cancelled',
                description: 'The invitation has been cancelled.',
            });
            setSentRequests(prev => prev.map(r => r.id === inviteId ? { ...r, status: 'cancelled' } : r));
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to cancel invitation'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleResendInvite = async (inviteId: string) => {
        setProcessingId(inviteId);
        try {
            const response = await permissionsService.invitations.resend(inviteId, session);

            if (!response.ok) {
                throw new Error('Failed to resend invitation');
            }

            toast({
                title: 'Invitation resent',
                description: 'The invitation has been sent again.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to resend invitation'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const renderReceivedRequests = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading requests...</p>
                </div>
            );
        }

        if (receivedRequests.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                        <Mail className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No pending requests</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm">
                        You're all caught up! Invitations and requests will appear here when you receive them.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {receivedRequests.map((request) => (
                    <Card key={request.id}>
                        <div className="flex items-center p-4 gap-4">
                            <Avatar>
                                <AvatarImage src={request.sender.avatar} />
                                <AvatarFallback>{request.sender.name.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{request.title}</h4>
                                    <Badge variant={request.type === 'invitation' ? 'default' : 'secondary'}>
                                        {request.type === 'invitation' ? 'Invite' : 'Request'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground mt-1">
                                    <span className="font-medium">{request.sender.name}</span> {request.description}
                                </p>
                                {request.metadata?.role && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                        Role: {request.metadata.role}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex gap-2 min-w-[120px] justify-end">
                                {request.status === 'pending' ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDecline(request)}
                                            disabled={!!processingId}
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Decline
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAccept(request)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === request.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <Check className="h-4 w-4 mr-1" />
                                            )}
                                            Accept
                                        </Button>
                                    </>
                                ) : request.status === 'accepted' ? (
                                    <div className="flex items-center text-green-600 font-medium px-3 py-1 bg-green-50 rounded-md border border-green-100">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Accepted
                                    </div>
                                ) : request.status === 'cancelled' ? (
                                    <div className="flex items-center text-muted-foreground font-medium px-3 py-1 bg-muted rounded-md border">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Declined
                                    </div>
                                ) : (
                                    <div className="flex items-center text-orange-600 font-medium px-3 py-1 bg-orange-50 rounded-md border border-orange-100">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Expired
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    const renderSentRequests = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading sent invitations...</p>
                </div>
            );
        }

        if (sentRequests.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                        <Send className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No sent invitations</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm">
                        Invitations you send will appear here.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {sentRequests.map((request) => (
                    <Card key={request.id}>
                        <div className="flex items-center p-4 gap-4">
                            <Avatar>
                                <AvatarImage src={request.recipient?.avatar} />
                                <AvatarFallback>{request.recipient?.name?.charAt(0) || request.recipient?.email?.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{request.recipient?.name || request.recipient?.email}</h4>
                                    <Badge variant={request.type === 'invitation' ? 'default' : 'secondary'}>
                                        {request.type === 'invitation' ? 'Invite' : 'Request'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground mt-1">
                                    {request.description || `Invited to ${request.title}`}
                                </p>
                                {request.metadata?.role && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                        Role: {request.metadata.role}
                                    </Badge>
                                )}
                                {request.metadata?.permission && (
                                    <Badge variant="outline" className="mt-2 text-xs ml-2">
                                        Permission: {request.metadata.permission}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex gap-2 min-w-[180px] justify-end">
                                {request.status === 'pending' ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleResendInvite(request.id)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === request.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <RotateCw className="h-4 w-4 mr-1" />
                                            )}
                                            Resend
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleCancelInvite(request.id)}
                                            disabled={!!processingId}
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Cancel
                                        </Button>
                                    </>
                                ) : request.status === 'accepted' ? (
                                    <div className="flex items-center text-green-600 font-medium px-3 py-1 bg-green-50 rounded-md border border-green-100">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Accepted
                                    </div>
                                ) : request.status === 'cancelled' ? (
                                    <div className="flex items-center text-muted-foreground font-medium px-3 py-1 bg-muted rounded-md border">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancelled
                                    </div>
                                ) : (
                                    <div className="flex items-center text-orange-600 font-medium px-3 py-1 bg-orange-50 rounded-md border border-orange-100">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Expired
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4 max-w-3xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Requests & Invitations</h3>
                <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'sent')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="received" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Received
                        {receivedRequests.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                                {receivedRequests.filter(r => r.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="gap-2">
                        <Send className="h-4 w-4" />
                        Sent
                        {sentRequests.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                                {sentRequests.filter(r => r.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="received" className="mt-4">
                    {renderReceivedRequests()}
                </TabsContent>

                <TabsContent value="sent" className="mt-4">
                    {renderSentRequests()}
                </TabsContent>
            </Tabs>
        </div>
    );
}
