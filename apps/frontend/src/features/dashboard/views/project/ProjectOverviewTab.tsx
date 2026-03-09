"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users,
  Settings,
  TrendingUp,
  Activity,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for UI demonstration if project data is missing
const mockActivities = [
  { id: 1, user: "Alex Chen", action: "deployed to", target: "production", time: "2h ago", icon: Zap, color: "text-amber-500 bg-amber-50" },
  { id: 2, user: "Sarah Jones", action: "completed task", target: "User Authentication", time: "4h ago", icon: CheckCircle2, color: "text-green-500 bg-green-50" },
  { id: 3, user: "System", action: "alerted", target: "High Memory Usage", time: "5h ago", icon: AlertCircle, color: "text-red-500 bg-red-50" },
];

export function ProjectOverviewTab({ project }: { project: any }) {
  if (!project) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-zinc-100 p-4">
          <Activity className="h-8 w-8 text-zinc-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-zinc-900">No project selected</h3>
          <p className="text-sm text-zinc-500">Select a project to view its overview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{project.name || "Untitled Project"}</h1>
            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
              Active
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-base text-zinc-500">
            {project.description || "Enter a description for this project to help your team understand its goals and scope."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800">
            <Zap className="h-4 w-4" />
            Deploy
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">$45,231.89</div>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <span className="text-green-600 font-medium flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +20.1%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">Active Tasks</CardTitle>
              <Target className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">{project._count?.tasks || 0}</div>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <span className="text-zinc-600 font-medium">{project.members?.length || 0}</span> project members
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">Team Velocity</CardTitle>
              <Activity className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">84.5</div>
              <p className="text-xs text-zinc-500 mt-1">Story points per sprint</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">Deadline</CardTitle>
              <Calendar className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">14 Days</div>
              <p className="text-xs text-zinc-500 mt-1">Until next release</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Progress */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-zinc-900">Project Progress</CardTitle>
                <CardDescription>Overall completion status across all milestones.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-700">Frontend Development</span>
                      <span className="text-zinc-500">75%</span>
                    </div>
                    <Progress value={75} className="h-2 bg-zinc-100" indicatorClassName="bg-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-700">Backend API</span>
                      <span className="text-zinc-500">45%</span>
                    </div>
                    <Progress value={45} className="h-2 bg-zinc-100" indicatorClassName="bg-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-700">Design System</span>
                      <span className="text-zinc-500">90%</span>
                    </div>
                    <Progress value={90} className="h-2 bg-zinc-100" indicatorClassName="bg-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-zinc-900">Recent Activity</CardTitle>
                  <CardDescription>What's happening in your project right now.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", activity.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 '))}>
                        <activity.icon className={cn("h-4 w-4", activity.color.split(' ')[0])} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-zinc-700">
                          <span className="font-medium text-zinc-900">{activity.user}</span>{" "}
                          {activity.action}{" "}
                          <span className="font-medium text-zinc-900">{activity.target}</span>
                        </p>
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            {/* Team Snapshot */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-900">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {(project.members || []).slice(0, 4).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600 border border-zinc-200">
                          {m.user?.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 leading-none">{m.user?.name || "Unknown"}</p>
                          <p className="text-xs text-zinc-500 mt-1">{m.role || "Member"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!project.members || project.members.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <Users className="h-8 w-8 text-zinc-200 mb-2" />
                      <p className="text-sm text-zinc-500">No members yet</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Link href="?tab=members">Manage Team</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-900">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="#" className="flex items-center justify-between rounded-md p-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                  <span>Repository</span>
                  <ArrowUpRight className="h-3 w-3 text-zinc-400" />
                </Link>
                <Link href="#" className="flex items-center justify-between rounded-md p-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                  <span>Documentation</span>
                  <ArrowUpRight className="h-3 w-3 text-zinc-400" />
                </Link>
                <Link href="#" className="flex items-center justify-between rounded-md p-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                  <span>Design Assets</span>
                  <ArrowUpRight className="h-3 w-3 text-zinc-400" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
