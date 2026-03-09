"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Users, Layout, Settings, FolderKanban } from 'lucide-react';
import { Organization, organizationService } from '@/services/organization.service';
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface OrganizationViewProps {
    organizationId: string;
}

export function OrganizationView({ organizationId }: OrganizationViewProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newDeptName, setNewDeptName] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        if (!organizationId) return;
        loadOrganization();
    }, [organizationId]);

    const loadOrganization = async () => {
        setIsLoading(true);
        try {
            const org = await organizationService.getOrganization(organizationId);
            setOrganization(org);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load organization', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDepartment = async () => {
        if (!newDeptName) return;
        try {
            await organizationService.createDepartment(organizationId, { name: newDeptName });
            toast({ title: 'Success', description: 'Department created successfully' });
            setNewDeptName('');
            setIsCreateOpen(false);
            loadOrganization(); // proper revalidation would be better
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to create department', variant: 'destructive' });
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading Organization...</div>;
    if (!organization) return <div className="p-8 text-center text-red-500">Organization not found.</div>;

    return (
        <div className="h-full flex flex-col space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{organization.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs text-gray-500">
                                {organization.slug}
                            </Badge>
                            {organization.domain && (
                                <Badge variant="secondary" className="text-xs">
                                    {organization.domain}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Department
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Department</DialogTitle>
                                <DialogDescription>
                                    Add a new functional department to {organization.name}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={newDeptName}
                                        onChange={(e) => setNewDeptName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="e.g. Engineering"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateDepartment}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline"><Settings className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="departments" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                {/* Departments Tab */}
                <TabsContent value="departments" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {organization.departments?.map((dept) => (
                            <Card key={dept.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {dept.name}
                                    </CardTitle>
                                    <Layout className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dept._count?.projects || 0}</div>
                                    <p className="text-xs text-muted-foreground">Active Projects</p>

                                    <div className="mt-4 flex gap-2">
                                        <Badge variant="secondary" className="flex gap-1">
                                            <Users className="h-3 w-3" /> {dept._count?.teams || 0}
                                        </Badge>
                                        <Badge variant="secondary" className="flex gap-1">
                                            <Bot className="h-3 w-3" /> {dept._count?.aiAgents || 0}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!organization.departments || organization.departments.length === 0) && (
                            <div className="col-span-full py-12 text-center text-gray-500 border-2 dashed border-gray-200 rounded-lg">
                                No departments found. Create one to get started!
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Workspaces Tab */}
                <TabsContent value="workspaces" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {organization.workspaces?.map((ws) => (
                            <Card key={ws.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderKanban className="h-5 w-5 text-blue-500" />
                                        {ws.name}
                                    </CardTitle>
                                    <CardDescription>{ws.slug}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Additional Workspace stats if available */}
                                    <Button variant="ghost" className="w-full mt-2" size="sm">Enter Workspace</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Members Tab */}
                <TabsContent value="members" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Members</CardTitle>
                            <CardDescription>People with access to this organization.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                { /* Simply mapping standard members assuming similar structure to getOrganization includes */}
                                {/* This would map over organization.members */}
                                <div className="text-sm text-gray-500">Member management coming soon.</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Simple Icon component helper if Bot isn't imported from lucide-react yet
function Bot({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    )
}
