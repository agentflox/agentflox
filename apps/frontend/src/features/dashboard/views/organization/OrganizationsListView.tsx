"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Users, FolderKanban } from 'lucide-react';
import { Organization, organizationService } from '@/services/organization.service';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useInterfaceSettings } from '@/hooks/useInterfaceSettings';
import { PageHeader } from '@/entities/shared/components/PageHeader';

export function OrganizationsListView() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const router = useRouter();
    const { t } = useInterfaceSettings();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');
    const [newOrgDomain, setNewOrgDomain] = useState('');

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        setIsLoading(true);
        try {
            const orgs = await organizationService.getMyOrganizations();
            setOrganizations(orgs);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: t("orgs.error.load"), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrganization = async () => {
        if (!newOrgName || !newOrgSlug) {
            toast({ title: 'Error', description: t("orgs.error.required"), variant: 'destructive' });
            return;
        }
        try {
            const org = await organizationService.createOrganization({
                name: newOrgName,
                slug: newOrgSlug,
                domain: newOrgDomain || undefined
            });
            toast({ title: 'Success', description: t("orgs.success.created") });
            setNewOrgName('');
            setNewOrgSlug('');
            setNewOrgDomain('');
            setIsCreateOpen(false);
            loadOrganizations();
        } catch (error) {
            toast({ title: 'Error', description: t("orgs.error.create"), variant: 'destructive' });
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">{t("profile.loading")}</div>;

    return (
        <div className="h-full flex flex-col space-y-6 p-6">
            <PageHeader
                title={t("orgs.title")}
                description={t("orgs.subtitle")}
                actions={
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t("orgs.action.new")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("orgs.create.title")}</DialogTitle>
                                <DialogDescription>
                                    {t("orgs.create.desc")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">{t("orgs.field.name")}</Label>
                                    <Input
                                        id="name"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="slug" className="text-right">{t("orgs.field.slug")}</Label>
                                    <Input
                                        id="slug"
                                        value={newOrgSlug}
                                        onChange={(e) => setNewOrgSlug(e.target.value)}
                                        className="col-span-3"
                                        placeholder="e.g. acme-corp"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="domain" className="text-right">{t("orgs.field.domain")}</Label>
                                    <Input
                                        id="domain"
                                        value={newOrgDomain}
                                        onChange={(e) => setNewOrgDomain(e.target.value)}
                                        className="col-span-3"
                                        placeholder="e.g. acme.com (optional)"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateOrganization}>{t("orgs.action.create")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                    <Card
                        key={org.id}
                        className="hover:shadow-lg transition-all cursor-pointer group border-border bg-card text-card-foreground"
                        onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold">{org.name}</CardTitle>
                                    <Badge variant="outline" className="text-xs mt-1">
                                        {org.slug}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {org.domain && (
                                    <div className="text-sm text-muted-foreground">
                                        🌐 {org.domain}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="flex gap-1">
                                        <Users className="h-3 w-3" /> {org._count?.members || 0} {t("orgs.stat.members")}
                                    </Badge>
                                    <Badge variant="secondary" className="flex gap-1">
                                        <FolderKanban className="h-3 w-3" /> {org._count?.projects || 0} {t("orgs.stat.projects")}
                                    </Badge>
                                </div>
                                <div className="pt-2 border-t border-border">
                                    <div className="text-xs text-muted-foreground">
                                        {org.departments?.length || 0} {t("orgs.stat.departments")} • {org.workspaces?.length || 0} {t("sidebar.workspaces").toLowerCase()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {organizations.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 dashed border-border rounded-lg bg-muted/20">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">{t("orgs.empty.title")}</h3>
                        <p className="text-muted-foreground mb-4">{t("orgs.empty.desc")}</p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> {t("orgs.action.new")}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
