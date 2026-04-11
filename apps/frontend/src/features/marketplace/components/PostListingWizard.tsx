"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Wand2, ArrowRight, CheckCircle2 } from "lucide-react";
import { ListingType } from "../types/marketplace.types";
import { Badge } from "@/components/ui/badge";

export default function PostListingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Type, 2: Draft, 3: AI Magic, 4: Preview

  // Form State
  const [selectedType, setSelectedType] = useState<ListingType | null>(null);
  const [roughDraft, setRoughDraft] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // AI Output
  const [polishedTitle, setPolishedTitle] = useState("");
  const [polishedDescription, setPolishedDescription] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [suggestedBudget, setSuggestedBudget] = useState("");

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const simulateAiDrafting = () => {
    setIsAiProcessing(true);
    setStep(3);
    
    setTimeout(() => {
      setPolishedTitle(selectedType === 'task' ? "Optimize React Rendering Performance in Complex Grid" : "Premium Custom Tool Integration");
      setPolishedDescription("We are looking for an expert to optimize our complex grid rendering. The current implementation suffers from unnecessary re-renders. Requirements includes knowledge of React.memo, useMemo, and perhaps windowing solutions.\n\nLooking for immediate start and clean, thoroughly documented code.");
      setSuggestedSkills(["React", "Performance", "Optimization", "TypeScript"]);
      setSuggestedBudget("$800 - $1,500");
      setIsAiProcessing(false);
    }, 2500);
  };

  const submitListing = () => {
    setOpen(false);
    setStep(1);
    setSelectedType(null);
    setRoughDraft("");
    // Here we'd actually call the backend trpc/api
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-900 text-white hover:bg-zinc-800 gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Post Listing
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        {/* Wizard Header Progress */}
        <div className="bg-muted/40 px-6 py-4 border-b border-border flex gap-2">
           {[1, 2, 3, 4].map(s => (
             <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? (step === 3 && isAiProcessing ? 'bg-amber-400 animate-pulse' : 'bg-primary') : 'bg-zinc-200 dark:bg-zinc-800'}`} />
           ))}
        </div>

        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold">
            {step === 1 && "What are you posting?"}
            {step === 2 && "Tell us the details"}
            {step === 3 && (isAiProcessing ? "AI is writing your listing..." : "Review AI Suggestions")}
            {step === 4 && "Final Preview"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 min-h-[300px]">
          {/* Step 1: Select Type */}
          {step === 1 && (
             <div className="grid grid-cols-2 gap-4 mt-6">
                {[
                  { id: 'task', label: 'Post a Task', desc: 'Hire someone for a job' },
                  { id: 'agent', label: 'Publish Agent', desc: 'Share your automated bot' },
                  { id: 'talent', label: 'Offer Services', desc: 'List yourself for hire' },
                  { id: 'template', label: 'Sell Template', desc: 'Monetize a boilerplate' },
                  { id: 'tool', label: 'Offer Tool', desc: 'Share your modular script' },
                  { id: 'team', label: 'Offer Team', desc: 'List a group for hire' },
                  { id: 'workforce', label: 'Publish Workforce', desc: 'Share an AI Swarm' }
                ].map(t => (
                   <div 
                     key={t.id}
                     onClick={() => setSelectedType(t.id as ListingType)}
                     className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedType === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                   >
                      <h4 className="font-semibold mb-1">{t.label}</h4>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                   </div>
                ))}
             </div>
          )}

          {/* Step 2: Rough Draft */}
          {step === 2 && (
             <div className="mt-4 space-y-4">
               <p className="text-sm text-muted-foreground">Don't worry about being perfect. Just dump your thoughts and our AI will format, polish, and optimize it for the marketplace.</p>
               <Textarea 
                 className="min-h-[160px] text-base leading-relaxed" 
                 placeholder="e.g. I need a react dev to fix my weird table bug. It's making the whole page freeze when there's 1000 rows. Probably need it done this week. Will pay like 500 bucks."
                 value={roughDraft}
                 onChange={e => setRoughDraft(e.target.value)}
               />
             </div>
          )}

          {/* Step 3: AI Processing & Review */}
          {step === 3 && (
             <div className="mt-6 flex flex-col items-center justify-center text-center space-y-6">
                {isAiProcessing ? (
                  <>
                     <div className="relative">
                        <Wand2 className="h-16 w-16 text-amber-500 animate-bounce" />
                        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                     </div>
                     <p className="text-muted-foreground animate-pulse">Extracting skills, estimating budget, writing copy...</p>
                  </>
                ) : (
                  <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Polished Title</label>
                        <Input value={polishedTitle} onChange={(e) => setPolishedTitle(e.target.value)} />
                     </div>
                     
                     <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Target Budget</label>
                        <Input value={suggestedBudget} onChange={(e) => setSuggestedBudget(e.target.value)} />
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Extracted Skills</label>
                        <div className="flex flex-wrap gap-2">
                           {suggestedSkills.map(skill => (
                             <Badge key={skill} variant="secondary" className="gap-1 px-2.5 py-1">
                               {skill}
                             </Badge>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
             </div>
          )}

          {/* Step 4: Final Preview */}
          {step === 4 && (
             <div className="mt-6 p-6 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="capitalize">{selectedType}</Badge>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{suggestedBudget}</span>
                </div>
                <h3 className="text-2xl font-bold">{polishedTitle}</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{polishedDescription}</p>
                <div className="flex gap-2 pt-4">
                    {suggestedSkills.map(skill => (
                      <Badge key={skill} variant="outline" className="bg-background">{skill}</Badge>
                    ))}
                </div>
             </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-between">
           {step > 1 && !isAiProcessing ? (
             <Button variant="ghost" onClick={handleBack}>Back</Button>
           ) : <div />}
           
           {step === 1 && (
             <Button onClick={handleNext} disabled={!selectedType}>Continue <ArrowRight className="h-4 w-4 ml-2" /></Button>
           )}
           {step === 2 && (
             <Button onClick={simulateAiDrafting} disabled={roughDraft.length < 10} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0">
               <Wand2 className="h-4 w-4 ml-2 mr-2" /> Auto-Write with AI
             </Button>
           )}
           {step === 3 && !isAiProcessing && (
             <Button onClick={handleNext}>Looks Good <ArrowRight className="h-4 w-4 ml-2" /></Button>
           )}
           {step === 4 && (
             <Button onClick={submitListing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Publish to Marketplace
             </Button>
           )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
