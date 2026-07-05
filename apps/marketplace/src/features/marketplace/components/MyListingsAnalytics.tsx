"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Eye, MousePointerClick, Download, Users } from "lucide-react";

export default function MyListingsAnalytics() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-dashed gap-2 group">
          <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" /> 
          My Listings
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl p-6 border-none shadow-2xl bg-card text-card-foreground">
         <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
               Supply Analytics
               <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-2 uppercase text-[10px] tracking-wider">Pro Tier</Badge>
            </DialogTitle>
            <p className="text-muted-foreground">Track impressions, conversions, and match rates across your marketplace listings.</p>
         </DialogHeader>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Impressions" value="124k" change="+14%" icon={Eye} />
            <StatCard title="Total Clicks" value="8.4k" change="+5%" icon={MousePointerClick} />
            <StatCard title="Conversions (Downloads/Applies)" value="1.2k" change="+22%" icon={Download} />
            <StatCard title="Avg. Match Rate" value="92%" change="+2%" icon={Users} />
         </div>

         <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Active Listings Performance</h3>
            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
               
               {/* Analytics Row 1 */}
               <div className="p-4 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">Enterprise SaaS Dashboard Boilerplate</p>
                     <p className="text-xs text-muted-foreground">Template • Active</p>
                  </div>
                  
                  {/* Fake Sparkline */}
                  <div className="hidden md:flex items-end gap-1 h-8 shrink-0">
                     {[30, 40, 35, 50, 45, 60, 55, 70, 80, 95].map((h, i) => (
                        <div key={i} className="w-1.5 bg-emerald-500/80 rounded-t-sm" style={{ height: `${h}%` }} />
                     ))}
                  </div>

                  <div className="flex gap-8 text-sm">
                     <div className="shrink-0"><p className="text-muted-foreground mb-0.5">Views</p><p className="font-semibold">45k</p></div>
                     <div className="shrink-0"><p className="text-muted-foreground mb-0.5">Downloads</p><p className="font-semibold">9.2k</p></div>
                     <div className="shrink-0 text-right"><p className="text-muted-foreground mb-0.5">Conversion</p><p className="font-semibold text-emerald-500">20.4%</p></div>
                  </div>
               </div>

               {/* Analytics Row 2 */}
               <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">Senior React Flow Arch-Agent</p>
                     <p className="text-xs text-muted-foreground">Agent • Active</p>
                  </div>
                  
                  {/* Fake Sparkline */}
                  <div className="hidden md:flex items-end gap-1 h-8 shrink-0">
                     {[20, 25, 30, 40, 45, 30, 40, 50, 60, 65].map((h, i) => (
                        <div key={i} className="w-1.5 bg-cyan-500/80 rounded-t-sm" style={{ height: `${h}%` }} />
                     ))}
                  </div>

                  <div className="flex gap-8 text-sm">
                     <div className="shrink-0"><p className="text-muted-foreground mb-0.5">Views</p><p className="font-semibold">22k</p></div>
                     <div className="shrink-0"><p className="text-muted-foreground mb-0.5">Downloads</p><p className="font-semibold">1.8k</p></div>
                     <div className="shrink-0 text-right"><p className="text-muted-foreground mb-0.5">Conversion</p><p className="font-semibold text-cyan-500">8.1%</p></div>
                  </div>
               </div>

            </div>
         </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, change, icon: Icon }: any) {
   return (
     <div className="p-4 border border-border rounded-xl bg-muted/10 space-y-3">
        <div className="flex justify-between items-start">
           <p className="text-sm text-muted-foreground font-medium">{title}</p>
           <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center">
             <Icon className="h-4 w-4 text-foreground/70" />
           </div>
        </div>
        <div>
           <p className="text-2xl font-bold">{value}</p>
           <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium">
             <TrendingUp className="h-3 w-3 mr-1" /> {change}
           </p>
        </div>
     </div>
   );
}

import { Badge } from "@/components/ui/badge";
