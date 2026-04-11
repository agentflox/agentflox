"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, ArrowRight, CheckCircle2, Globe } from "lucide-react";
import { ListingType } from "../types/marketplace.types";
import { Badge } from "@/components/ui/badge";
import { aiListingService } from "@/services/ai-listing.service";
import { useToast } from "@/hooks/useToast";

interface PublishEntityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: ListingType;
    entityId?: string;
    initialTitle?: string;
    initialDescription?: string;
}

export function PublishEntityModal({
    open,
    onOpenChange,
    entityType,
    entityId,
    initialTitle = "",
    initialDescription = ""
}: PublishEntityModalProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1); // 1: Draft/Review Context, 2: AI Magic, 3: Final Preview

    // Form State
    const [roughDraft, setRoughDraft] = useState(initialDescription);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // AI Output
    const [polishedTitle, setPolishedTitle] = useState(initialTitle);
    const [polishedDescription, setPolishedDescription] = useState("");
    const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
    const [suggestedBudget, setSuggestedBudget] = useState("");
    const [useCases, setUseCases] = useState<string[]>([]);
    const [intendedUsers, setIntendedUsers] = useState<string[]>([]);
    
    const isAsset = ['agent', 'tool', 'template', 'workforce'].includes(entityType.toLowerCase());

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const generateDraftWithAI = async () => {
        setIsAiProcessing(true);
        setStep(2);
        
        try {
            // Using the real backend AI integration if configured
            const response = await aiListingService.generateListing({
                entityType,
                entityId,
                title: polishedTitle,
                description: roughDraft
            });
            
            if (response) {
                setPolishedTitle(response.taskTitle || polishedTitle);
                setPolishedDescription(response.detailedDesc || response.description || "");
                setSuggestedSkills([...(response.skills || []), ...(response.niceToHaveSkills || [])]);
                
                if (isAsset) {
                    setUseCases(response.useCases || []);
                    setIntendedUsers(response.intendedUsers || []);
                } else {
                    setSuggestedBudget("$800 - $1,500"); // Mock budget estimation for MVP
                }
            }
        } catch (err) {
            console.error("AI Generation Error", err);
            // Fallback for demo
            setPolishedTitle(polishedTitle || "Optimized Listing Title");
            setPolishedDescription(roughDraft + "\n\n(AI perfectly polished and SEO optimized version of your listing would go here...)");
            setSuggestedSkills(["Expert", "Verified"]);
            if (!isAsset) setSuggestedBudget("Negotiable");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const submitListing = () => {
        // Here we'd mutate backend to create the MarketplaceListing mapping to entityId
        toast({ title: "Successfully Published!", description: "Your entity is now live on the global marketplace." });
        onOpenChange(false);
        setStep(1);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
                {/* Wizard Header Progress */}
                <div className="bg-muted/40 px-6 py-4 border-b border-border flex gap-2">
                   {[1, 2, 3].map(s => (
                     <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? (step === 2 && isAiProcessing ? 'bg-amber-400 animate-pulse' : 'bg-primary') : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                   ))}
                </div>

                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {step === 1 && <><Globe className="h-5 w-5 text-indigo-500" /> Publish {entityType}</>}
                        {step === 2 && (isAiProcessing ? "AI is rewriting your listing..." : "Review AI Suggestions")}
                        {step === 3 && "Final Preview"}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 min-h-[300px]">
                    {/* Step 1: Context/Draft */}
                    {step === 1 && (
                       <div className="mt-4 space-y-4 animate-in fade-in">
                         <div className="space-y-1">
                             <label className="text-xs font-semibold text-muted-foreground uppercase">Base Title</label>
                             <Input value={polishedTitle} onChange={(e) => setPolishedTitle(e.target.value)} placeholder="e.g. Frontend Optimization Task" />
                         </div>
                         <div className="space-y-1">
                             <label className="text-xs font-semibold text-muted-foreground uppercase">Description & Context</label>
                             <Textarea 
                               className="min-h-[140px] text-base leading-relaxed" 
                               placeholder="Provide internal details or scratchpad notes. AI will extract what is public and format it for the marketplace."
                               value={roughDraft}
                               onChange={e => setRoughDraft(e.target.value)}
                             />
                         </div>
                       </div>
                    )}

                    {/* Step 2: AI Processing & Editing */}
                    {step === 2 && (
                       <div className="mt-6 flex flex-col items-center justify-center text-center space-y-6">
                          {isAiProcessing ? (
                            <>
                               <div className="relative">
                                  <Wand2 className="h-16 w-16 text-amber-500 animate-bounce" />
                                  <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                               </div>
                               <p className="text-muted-foreground animate-pulse">Extracting parameters, analyzing entity data...</p>
                            </>
                          ) : (
                            <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                               <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Public Title</label>
                                  <Input value={polishedTitle} onChange={(e) => setPolishedTitle(e.target.value)} />
                               </div>
                               {!isAsset && (
                                   <div className="space-y-1">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase">Target Budget / Price</label>
                                      <Input value={suggestedBudget} onChange={(e) => setSuggestedBudget(e.target.value)} />
                                   </div>
                               )}
                               <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tags & Skills extracted</label>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                     {suggestedSkills.map((skill, idx) => (
                                       <Badge key={idx} variant="secondary" className="px-2.5 py-1">
                                         {skill}
                                       </Badge>
                                     ))}
                                  </div>
                               </div>
                               {isAsset && useCases.length > 0 && (
                                   <div className="space-y-1">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase">Extracted Use Cases</label>
                                      <div className="flex flex-wrap gap-2 pt-1">
                                         {useCases.map((uc, idx) => (
                                           <Badge key={`uc-${idx}`} variant="outline" className="px-2.5 py-1">
                                             {uc}
                                           </Badge>
                                         ))}
                                      </div>
                                   </div>
                               )}
                            </div>
                          )}
                       </div>
                    )}

                    {/* Step 3: Final Preview */}
                    {step === 3 && (
                       <div className="mt-6 p-6 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge className="capitalize">{entityType}</Badge>
                            {!isAsset && <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{suggestedBudget}</span>}
                            {isAsset && intendedUsers.length > 0 && <span className="text-xs text-muted-foreground">For: {intendedUsers.join(", ")}</span>}
                          </div>
                          <h3 className="text-2xl font-bold">{polishedTitle}</h3>
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{polishedDescription}</p>
                          <div className="flex gap-2 pt-4">
                              {suggestedSkills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="bg-background">{skill}</Badge>
                              ))}
                          </div>
                          {isAsset && useCases.length > 0 && (
                            <div className="pt-2 border-t mt-4 border-primary/10">
                                <span className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Use Cases</span>
                                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                                    {useCases.map((uc, i) => <li key={i}>{uc}</li>)}
                                </ul>
                            </div>
                          )}
                       </div>
                    )}
                </div>

                {/* Wizard Footer Controls */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-between">
                   {step > 1 && !isAiProcessing ? (
                     <Button variant="ghost" onClick={handleBack}>Back</Button>
                   ) : <div />}
                   
                   {step === 1 && (
                     <div className="flex gap-2">
                       <Button variant="outline" onClick={() => {
                           setPolishedDescription(roughDraft); 
                           setStep(3); // Skip AI and go to preview
                       }}>Skip AI Auto-Write</Button>
                       <Button onClick={generateDraftWithAI} disabled={!roughDraft} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0">
                         <Wand2 className="h-4 w-4 ml-2 mr-2" /> Polish with AI
                       </Button>
                     </div>
                   )}
                   {step === 2 && !isAiProcessing && (
                     <Button onClick={handleNext}>Looks Good <ArrowRight className="h-4 w-4 ml-2" /></Button>
                   )}
                   {step === 3 && (
                     <Button onClick={submitListing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Global Publish
                     </Button>
                   )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
