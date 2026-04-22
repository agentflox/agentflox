"use client";

import { Card } from "@/components/ui/card";
import { ShieldCheck, Info, AlertTriangle, MessageSquare, HandMetal } from "lucide-react";

export function CommunityGuidelinesView() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-12">
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Community Guidelines
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-500">
          Welcome to the Agentflox Community! We're here to help you build, learn, and grow. 
          To keep this space helpful and welcoming for everyone, please follow these guidelines.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row">
            <div className="bg-indigo-50/50 p-6 sm:w-64 shrink-0 flex flex-col items-center justify-center text-center gap-2 border-b sm:border-b-0 sm:border-r border-indigo-100">
              <HandMetal className="h-10 w-10 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Be Kind & Respectful</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                We are a community of builders. Treat everyone with respect and kindness. 
                Constructive criticism is welcome, but personal attacks, harassment, and 
                disrespectful behavior are not.
              </p>
              <ul className="space-y-2 text-sm text-slate-500 list-disc pl-4">
                <li>Use inclusive language and be welcoming to newcomers.</li>
                <li>Avoid inflammatory or divisive topics that don't relate to building with AI.</li>
                <li>Assume good intentions when interacting with others.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row">
            <div className="bg-amber-50/50 p-6 sm:w-64 shrink-0 flex flex-col items-center justify-center text-center gap-2 border-b sm:border-b-0 sm:border-r border-amber-100">
              <MessageSquare className="h-10 w-10 text-amber-600" />
              <h3 className="font-bold text-slate-900">Keep it Relevant</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Post in the correct sections to keep discussions organized. This helps 
                everyone find the help they need and prevents clutter.
              </p>
              <ul className="space-y-2 text-sm text-slate-500 list-disc pl-4">
                <li>Check existing threads before starting a new one.</li>
                <li>Use descriptive titles for your questions and requests.</li>
                <li>Stay on topic within specific discussion groups.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row">
            <div className="bg-emerald-50/50 p-6 sm:w-64 shrink-0 flex flex-col items-center justify-center text-center gap-2 border-b sm:border-b-0 sm:border-r border-emerald-100">
              <ShieldCheck className="h-10 w-10 text-emerald-600" />
              <h3 className="font-bold text-slate-900">No Spam or Shilling</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                This is a space for learning and building, not for unsolicited sales pitches, 
                affiliate links, or repetitive self-promotion.
              </p>
              <ul className="space-y-2 text-sm text-slate-500 list-disc pl-4">
                <li>No job postings or solicitation of services outside of designated areas.</li>
                <li>Don't spam multiple groups with the same content.</li>
                <li>Relevant demos of what you've built are highly encouraged!</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row">
            <div className="bg-rose-50/50 p-6 sm:w-64 shrink-0 flex flex-col items-center justify-center text-center gap-2 border-b sm:border-b-0 sm:border-r border-rose-100">
              <AlertTriangle className="h-10 w-10 text-rose-600" />
              <h3 className="font-bold text-slate-900">Safety & Privacy</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Protect your privacy and the privacy of others. Never share PII (Personally 
                Identifiable Information) or sensitive credentials.
              </p>
              <ul className="space-y-2 text-sm text-slate-500 list-disc pl-4">
                <li>Don't post API keys, passwords, or private account details.</li>
                <li>Report any suspicious activity or harassment to the moderators.</li>
                <li>Respect the intellectual property of others.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-2xl bg-slate-900 p-8 text-center text-white shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 mb-4">
          <Info className="h-6 w-6 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
        <p className="text-slate-400 mb-6 max-w-lg mx-auto">
          If you're unsure about something or need to report a violation, 
          please reach out to our community management team.
        </p>
        <button 
          onClick={() => window.open("https://docs.agentflox.com/support", "_blank")}
          className="rounded-full bg-indigo-600 px-8 py-3 font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}
