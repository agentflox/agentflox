"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, Globe, Twitter, Linkedin, Github } from "lucide-react";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";

export default function OrganizationSettingsView() {
    const { toast } = useToast();
    const { data: org, isLoading, refetch } = trpc.organization.get.useQuery({});
    const updateMutation = trpc.organization.update.useMutation({
        onSuccess: () => {
            toast({ title: "Organization updated successfully" });
            refetch();
        },
        onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" })
    });

    const [form, setForm] = useState({
        name: "",
        description: "",
        website: "",
        twitter: "",
        linkedin: "",
        github: ""
    });

    useEffect(() => {
        if (org) {
            const social = (org.socialLinks as any) || {};
            setForm({
                name: org.name || "",
                description: org.description || "",
                website: org.website || "",
                twitter: social.twitter || "",
                linkedin: social.linkedin || "",
                github: social.github || ""
            });
        }
    }, [org]);

    const handleSave = () => {
        if (!org?.id) return;
        updateMutation.mutate({
            id: org.id,
            name: form.name,
            description: form.description,
            website: form.website || null,
            socialLinks: {
                twitter: form.twitter,
                linkedin: form.linkedin,
                github: form.github
            }
        });
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8">
                <PageHeader
                    title="Organization Settings"
                    description="Manage your organization's public profile and social links."
                />

                <div className="grid gap-8 md:grid-cols-[1fr_250px]">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> Basic Information
                            </h3>
                            <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Enter organization name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Tell us about your organization..."
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-zinc-400" />
                                    <Input
                                        value={form.website}
                                        onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" /> Social Links
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter</Label>
                                    <Input
                                        value={form.twitter}
                                        onChange={e => setForm(f => ({ ...f, twitter: e.target.value }))}
                                        placeholder="@handle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Label>
                                    <Input
                                        value={form.linkedin}
                                        onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                                        placeholder="company/handle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Label>
                                    <Input
                                        value={form.github}
                                        onChange={e => setForm(f => ({ ...f, github: e.target.value }))}
                                        placeholder="org-handle"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button size="lg" onClick={handleSave} disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-zinc-50 p-6 rounded-xl border border-dashed flex flex-col items-center gap-4 text-center">
                            <div className="w-24 h-24 rounded-full bg-white border flex items-center justify-center overflow-hidden">
                                {org?.logo ? <img src={org.logo} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-10 h-10 text-zinc-300" />}
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Organization Logo</p>
                                <p className="text-xs text-zinc-500">Square images work best (400x400)</p>
                            </div>
                            <Button variant="outline" size="sm">Coming Soon</Button>
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
