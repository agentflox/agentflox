import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Sparkles,
    X,
    Briefcase,
    Globe2,
    Banknote,
    CalendarDays,
    Zap,
    ChevronRight,
} from 'lucide-react';
import { aiService, GenerateProposalResponse } from '@/services/ai.service';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from '@/constants/shares';
import { type Task } from '@/entities/tasks/types';
import { cn } from '@/lib/utils';

interface PublishTaskToMarketplaceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: Task;
    projectId?: string;
}

export function PublishTaskToMarketplaceModal({
    open,
    onOpenChange,
    task,
    projectId,
}: PublishTaskToMarketplaceModalProps) {
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [customSkill, setCustomSkill] = useState('');

    const [formData, setFormData] = useState({
        title: task?.title || '',
        detailedDesc: task?.description || '',
        dueDate: task?.dueDate || '',
        skills: [] as string[],
        experience: '' as 'Junior' | 'Mid-Level' | 'Senior' | '',
        jobType: 'REMOTE',
        country: 'United States',
        currency: 'USD',
        budgetMin: '',
        budgetMax: '',
    });

    const createProposalMutation = trpc.proposal.create.useMutation({
        onSuccess: () => {
            toast.success('Task published successfully');
            onOpenChange(false);
        },
        onError: (err) => toast.error(`Publishing failed: ${err.message}`),
    });

    const handleAiGenerate = async () => {
        setLoading(true);
        try {
            const response = await aiService.generateProposal({
                taskTitle: formData.title,
                taskDescription: formData.detailedDesc,
                dueDate: formData.dueDate,
                projectId,
            });

            const result = (await response.json()) as GenerateProposalResponse;

            if (!response.ok) throw new Error('Failed to generate');

            setFormData((prev) => ({
                ...prev,
                detailedDesc: result.detailedDesc || prev.detailedDesc,
                skills: result.skills || [],
                experience: result.experience || prev.experience,
                dueDate: result.dueDate || prev.dueDate,
            }));
            setGenerated(true);
            toast.success('AI refined your listing');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const addSkill = () => {
        if (customSkill.trim() && !formData.skills.includes(customSkill)) {
            setFormData((prev) => ({ ...prev, skills: [...prev.skills, customSkill.trim()] }));
            setCustomSkill('');
        }
    };

    const handleSubmit = () => {
        if (!formData.title || !formData.detailedDesc || !formData.skills.length) {
            toast.error('Required: Title, Description, and at least one Skill.');
            return;
        }
        createProposalMutation.mutate({
            title: formData.title,
            shortSummary: formData.detailedDesc.slice(0, 150) + '...',
            detailedDesc: formData.detailedDesc,
            category: 'TEAM',
            status: 'PUBLISHED',
            intent: 'SEEKING',
            projectId: projectId || undefined,
        });
    };

    const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
        <div className="flex items-center gap-2 mb-4 group">
            <div className="p-1.5 rounded-md bg-secondary text-secondary-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-600 transition-colors">
                <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                {title}
            </h3>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-background ring-1 ring-border/50">
                {/* Visual Header Accent */}
                <div className="pt-8 px-8 pb-6 bg-gradient-to-b from-secondary/20 to-transparent border-b border-border/40">
                    <DialogHeader className="flex-row items-center justify-between space-y-0">
                        <div className="space-y-4">
                            <DialogTitle className="text-2xl font-semibold tracking-tight">
                                Marketplace Listing
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2">
                                Convert task to public job
                            </DialogDescription>
                        </div>
                        <Button
                            onClick={handleAiGenerate}
                            disabled={loading}
                            variant="outline"
                            className={cn(
                                "relative transition-all duration-300 border-indigo-200 hover:border-indigo-400 bg-white shadow-sm hover:shadow-md max-w-40",
                                generated && "text-emerald-600 border-emerald-200"
                            )}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Sparkles className={cn("h-4 w-4 mr-2 text-indigo-500", generated && "text-emerald-500")} />
                            )}
                            {generated ? 'Refine Again' : 'Auto Fill'}
                        </Button>
                    </DialogHeader>
                </div>

                <div className="px-8 py-6 max-h-[60vh] overflow-y-auto space-y-10 scrollbar-thin scrollbar-thumb-border">
                    {/* Basic Info */}
                    <section>
                        <SectionHeader icon={Briefcase} title="Classification" />
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-foreground ml-1">Job Listing Title</Label>
                                <Input
                                    className="bg-secondary/30 border-none h-12 text-lg font-medium focus-visible:ring-1 focus-visible:ring-indigo-500/50"
                                    value={formData.title}
                                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-foreground ml-1">Experience Level</Label>
                                    <Select value={formData.experience} onValueChange={(val: any) => setFormData(p => ({...p, experience: val}))}>
                                        <SelectTrigger className="bg-secondary/30 border-none h-10!">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Junior">Junior</SelectItem>
                                            <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                                            <SelectItem value="Senior">Senior</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-foreground ml-1">Proposed Deadline</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            className="bg-secondary/30 border-none h-10 pl-10"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Budget & Location */}
                    <section className="p-6 rounded-2xl bg-secondary/10 border border-border/50 ring-1 ring-black/[0.02]">
                        <SectionHeader icon={Banknote} title="Compensation" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-xs font-medium">Budget Range ({formData.currency})</Label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-1 top-2.5 text-xs text-muted-foreground">$</span>
                                        <Input type="number" className="pl-6 h-10 border-border/60" placeholder="Min" value={formData.budgetMin} onChange={e => setFormData(p => ({...p, budgetMin: +e.target.value}))} />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    <div className="relative flex-1">
                                        <span className="absolute left-1 top-2.5 text-xs text-muted-foreground">$</span>
                                        <Input type="number" className="pl-6 h-10 border-border/60" placeholder="Max" value={formData.budgetMax} onChange={e => setFormData(p => ({...p, budgetMax: +e.target.value}))} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-medium items-center gap-1.5 text-foreground">
                                    Target Region
                                </Label>
                                <Select value={formData.country} onValueChange={(val) => setFormData(p => ({...p, country: val}))}>
                                    <SelectTrigger className="h-10! w-full border-border/60 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </section>

                    {/* Scope */}
                    <section>
                        <SectionHeader icon={Zap} title="Listing Scope" />
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-foreground ml-1">Details & Context</Label>
                                <Textarea
                                    className="min-h-[140px] bg-secondary/30 border-none p-4 leading-relaxed focus-visible:ring-indigo-500/30"
                                    value={formData.detailedDesc}
                                    onChange={(e) => setFormData((p) => ({ ...p, detailedDesc: e.target.value }))}
                                    placeholder="What does a successful delivery look like?"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-foreground ml-1">Stack & Skills</Label>
                                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-dashed border-border hover:border-indigo-300 transition-colors bg-secondary/10">
                                    <AnimatePresence>
                                        {formData.skills.map((skill) => (
                                            <motion.div
                                                key={skill}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                            >
                                                <Badge className="bg-background border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all cursor-default px-2 py-1 gap-1 group">
                                                    {skill}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer opacity-50 group-hover:opacity-100"
                                                        onClick={() => setFormData(p => ({...p, skills: p.skills.filter(s => s !== skill)}))}
                                                    />
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <input
                                        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60"
                                        placeholder="Add required skill..."
                                        value={customSkill}
                                        onChange={(e) => setCustomSkill(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <DialogFooter className="px-8 py-5 bg-secondary/20 border-t border-border/40 gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createProposalMutation.isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 shadow-lg shadow-indigo-500/20"
                    >
                        {createProposalMutation.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Publish'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
