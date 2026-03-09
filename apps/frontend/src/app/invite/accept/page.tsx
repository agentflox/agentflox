"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { permissionsService } from "@/services/permissions.service";

export default function AcceptInvitationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const { toast } = useToast();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "auth-required">("loading");
    const [message, setMessage] = useState("Verifying invitation...");

    useEffect(() => {
        // If no token, show error immediately
        if (!token) {
            setStatus("error");
            setMessage("Invalid invitation link. Token is missing.");
            return;
        }

        // Wait for session to load
        if (sessionStatus === "loading") {
            setStatus("loading");
            setMessage("Checking authentication...");
            return;
        }

        // If not authenticated, prompt user to login
        if (sessionStatus === "unauthenticated") {
            setStatus("auth-required");
            setMessage("Please login to accept this invitation.");
            return;
        }

        // If authenticated, proceed with acceptance
        if (sessionStatus === "authenticated" && session) {
            acceptInvitation();
        }
    }, [token, session, sessionStatus]);

    const acceptInvitation = async () => {
        if (!token) return;

        setStatus("loading");
        setMessage("Accepting invitation...");

        try {
            const response = await permissionsService.invitations.accept({ token }, session);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to accept invitation");
            }

            setStatus("success");
            setMessage("Invitation accepted successfully! Redirecting...");

            toast({
                title: "Success",
                description: "You have joined successfully.",
            });

            // Redirect after short delay
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);

        } catch (error: any) {
            console.error("Accept error:", error);
            setStatus("error");
            setMessage(error.message || "An unexpected error occurred.");

            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to accept invitation"
            });
        }
    };

    const handleLoginRedirect = () => {
        // Preserve the token in the callback URL so user returns here after login
        const callbackUrl = `/invite/accept?token=${token}`;
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Invitation Status</CardTitle>
                    <CardDescription>Processing your invitation to join.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
                    {status === "loading" && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">{message}</p>
                        </div>
                    )}

                    {status === "auth-required" && (
                        <div className="flex flex-col items-center gap-4">
                            <LogIn className="h-16 w-16 text-blue-500" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900">Login Required</h3>
                                <p className="text-gray-600 mt-2">
                                    You need to login with the email address that received this invitation to continue.
                                </p>
                            </div>
                            <Button onClick={handleLoginRedirect} className="mt-2">
                                <LogIn className="h-4 w-4 mr-2" />
                                Login to Accept
                            </Button>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-green-700">Success!</h3>
                                <p className="text-gray-600">{message}</p>
                            </div>
                            <Button onClick={() => router.push("/dashboard")}>
                                Go to Dashboard
                            </Button>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex flex-col items-center gap-4">
                            <XCircle className="h-16 w-16 text-destructive" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-destructive">Failed</h3>
                                <p className="text-gray-600 text-center px-4">{message}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                    Go to Dashboard
                                </Button>
                                <Button variant="outline" onClick={handleLoginRedirect}>
                                    Try Different Account
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
