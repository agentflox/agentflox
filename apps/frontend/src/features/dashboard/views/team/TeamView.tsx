"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Tag, Building2, Globe, Hash } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function TeamView({ team }: { team: any }) {
  if (!team) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg border-dashed border-zinc-200">
        <p className="text-sm text-muted-foreground">No team data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              {team.title}
              {team.status && (
                <Badge variant="outline" className="ml-2 font-normal text-xs uppercase bg-zinc-50 border-zinc-200 text-zinc-600">
                  {team.status}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-base text-zinc-500 mt-2">
              {team.shortSummary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="my-4 bg-zinc-100" />
            <div className="prose prose-zinc max-w-none text-zinc-600">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">About the Team</h3>
              <div className="whitespace-pre-wrap leading-relaxed">
                {team.detailedDesc || "No detailed description provided."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Details */}
      <div className="space-y-6">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-900">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-500">Type</p>
                <p className="text-sm font-medium text-zinc-900">{team.category || team.type || "N/A"}</p>
              </div>
            </div>

            <Separator className="bg-zinc-100" />

            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-500">Industry</p>
                <p className="text-sm font-medium text-zinc-900">
                  {Array.isArray(team.industry) ? team.industry.join(", ") : team.industry || "N/A"}
                </p>
              </div>
            </div>

            <Separator className="bg-zinc-100" />

            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-500">Keywords</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.isArray(team.keywords) && team.keywords.length > 0 ? (
                    team.keywords.map((k: string) => (
                      <Badge key={k} variant="secondary" className="px-1.5 py-0 text-[10px] bg-zinc-100 text-zinc-600 border-zinc-200">
                        {k}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-900">None</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-10 w-10 text-zinc-400 mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-1">Join this Team</h3>
              <p className="text-sm text-zinc-300 mb-4">Interested in contributing? Apply to join this project team.</p>
              <button className="w-full py-2 bg-white text-zinc-900 rounded-md text-sm font-medium hover:bg-zinc-100 transition-colors">
                Apply Now
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


