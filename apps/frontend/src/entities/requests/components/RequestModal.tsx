"use client";

import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useSocket } from "@/components/providers/SocketProvider";
import { Protect } from "@/features/permissions/components/Protect";
import { Capability } from "@/features/permissions/capabilities";

interface RequestModalProps {
  proposalId: string;
  projectId: string;
  teamId: string;
  proposalTitle: string;
  proposalOwnerId: string;
  proposalIntent: 'SEEKING' | 'OFFERING';
  proposalType: 'INVESTMENT' | 'MENTORSHIP' | 'TEAM' | 'COFOUNDER' | 'PARTNERSHIP' | 'CUSTOMER' | 'PROJECT';
  onClose: () => void;
}

const roleMap: Record<string, string> = {
  INVESTMENT: "INVESTOR",
  MENTORSHIP: "MENTOR",
  PARTNERSHIP: "PARTNER",
  TEAM: 'TEAM',
  COFOUNDER: "COFOUNDER",
  CUSTOMER: "CUSTOMER"
};

export default function RequestModal({
  proposalId,
  projectId,
  teamId,
  proposalTitle,
  proposalIntent,
  proposalType,
  proposalOwnerId,
  onClose,
}: RequestModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Memoized requirement checks
  const requiresProject = useMemo(() => {
    if (proposalIntent !== 'OFFERING') return false;
    const t = String(proposalType).toUpperCase();
    return [
      'INVESTOR',
      'MENTOR',
      'COFOUNDER',
      'PARTNER',
      'CUSTOMER',
    ].includes(t);
  }, [proposalIntent, proposalType]);

  const requiresTeam = useMemo(() => {
    if (proposalIntent !== 'OFFERING') return false;
    const t = String(proposalType).toUpperCase();
    return t === 'TEAM' || t === 'MEMBER';
  }, [proposalIntent, proposalType]);

  // Load owned projects/teams for selection when required
  const { data: projectList, isLoading: isLoadingProjects } = trpc.project.list.useQuery(
    { scope: 'owned', page: 1, pageSize: 100 },
    {
      enabled: requiresProject,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  const { data: teamList, isLoading: isLoadingTeams } = trpc.team.list.useQuery(
    { scope: 'owned', page: 1, pageSize: 100 },
    {
      enabled: requiresTeam,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  // Wait for socket connection
  const waitForConnection = useCallback(() => {
    return new Promise<any>((resolve, reject) => {
      if (!socket) {
        return reject(new Error('Socket not initialized'));
      }

      if (socket.connected) {
        return resolve(socket);
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, 5000);

      const handleConnect = () => {
        cleanup();
        resolve(socket);
      };

      const handleError = (err: any) => {
        cleanup();
        reject(new Error(err?.message || 'Connection failed'));
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleError);
      };

      socket.once('connect', handleConnect);
      socket.once('connect_error', handleError);
    });
  }, [socket]);

  // Send notification via socket
  const sendNotification = useCallback(async (notificationId: string) => {
    if (!socket || !isConnected) {
      console.warn('Socket not connected, skipping real-time notification');
      return;
    }

    try {
      const s = await waitForConnection();

      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Notification send timeout'));
        }, 5000);

        s.emit('notification:send',
          { userId: proposalOwnerId, notificationId },
          (err: any) => {
            clearTimeout(timeoutId);
            if (err) {
              console.error('Failed to send notification:', err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
      // Don't throw - notification failure shouldn't block the request
    }
  }, [socket, isConnected, waitForConnection, proposalOwnerId]);

  // Mutation
  const sendRequestMutation = trpc.proposal.sendRequest.useMutation({
    onSuccess: async (res) => {
      toast({
        title: "Request Sent",
        description: "Your request has been sent to the proposal owner.",
      });

      // Send real-time notification
      if (res?.notificationId) {
        try {
          await sendNotification(res.notificationId);
        } catch (error) {
          console.error('Real-time notification failed:', error);
          // Continue anyway - the request was successful
        }
      }

      // Refresh sender "sent" list immediately
      queryClient.invalidateQueries({
        queryKey: [["request", "list"], { scope: "sent" }] as any
      });

      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Validation helper
  const validateForm = useCallback(() => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and message fields.",
        variant: "destructive",
      });
      return false;
    }

    if (requiresProject && !selectedProjectId) {
      toast({
        title: "Project Required",
        description: "Please select a project to send with your request.",
        variant: "destructive",
      });
      return false;
    }

    if (requiresTeam && !selectedTeamId) {
      toast({
        title: "Team Required",
        description: "Please select a team to send with your request.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [title, message, requiresProject, selectedProjectId, requiresTeam, selectedTeamId, toast]);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await sendRequestMutation.mutateAsync({
        proposalId,
        proposalOwnerId,
        title: title.trim(),
        message: message.trim(),
        projectId: selectedProjectId || undefined,
        teamId: selectedTeamId || undefined,
        intent: proposalIntent,
        roleApplied: (roleMap[String(proposalType).toUpperCase()] as
          | 'INVESTOR'
          | 'MENTOR'
          | 'TEAM'
          | 'COFOUNDER'
          | 'PARTNER'
          | 'CUSTOMER')
      });
    } catch (error) {
      // Error is handled in onError callback
      console.error('Failed to send request:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm,
    sendRequestMutation,
    proposalId,
    proposalOwnerId,
    title,
    message,
    selectedProjectId,
    selectedTeamId,
    proposalIntent,
    proposalType
  ]);

  // Form validation state
  const isFormValid = useMemo(() => {
    return (
      title.trim().length > 0 &&
      message.trim().length > 0 &&
      (!requiresProject || selectedProjectId) &&
      (!requiresTeam || selectedTeamId)
    );
  }, [title, message, requiresProject, selectedProjectId, requiresTeam, selectedTeamId]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Request</DialogTitle>
          <DialogDescription>
            Send a request to the owner of "{proposalTitle}"
          </DialogDescription>
        </DialogHeader>

        <Protect
          permission={Capability.MARKETPLACE_REQUEST_JOIN}
          fallback={
            <div className="p-4 text-center text-muted-foreground">
              You do not have permission to send requests. Please upgrade your account or contact support.
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {requiresProject && (
              <div className="space-y-2">
                <Label htmlFor="project">
                  Project <span className="text-destructive">*</span>
                </Label>
                <select
                  id="project"
                  className="w-full border rounded-md h-9 px-3 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isLoadingProjects || isSubmitting}
                  required
                >
                  <option value="">
                    {isLoadingProjects ? "Loading projects..." : "Select a project"}
                  </option>
                  {(projectList?.items || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {requiresTeam && (
              <div className="space-y-2">
                <Label htmlFor="team">
                  Team <span className="text-destructive">*</span>
                </Label>
                <select
                  id="team"
                  className="w-full border rounded-md h-9 px-3 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={isLoadingTeams || isSubmitting}
                  required
                >
                  <option value="">
                    {isLoadingTeams ? "Loading teams..." : "Select a team"}
                  </option>
                  {(teamList?.items || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">
                Request Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter a brief title for your request"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Explain your interest and what you're looking for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1000 characters
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </Protect>
      </DialogContent>
    </Dialog>
  );
}
