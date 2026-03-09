"use client"
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, ListTodo } from 'lucide-react';

export function TasksView() {
    const [activeTab, setActiveTab] = useState("assigned");

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900">My Tasks</h3>
                    <p className="text-sm text-zinc-500">Manage your assigned tasks and personal to-do lists.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Task
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
                    <TabsTrigger value="lists">My Lists</TabsTrigger>
                </TabsList>

                <TabsContent value="assigned" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Tasks</CardTitle>
                            <CardDescription>
                                Tasks assigned to you across all workspaces.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {/* Placeholder for Task List */}
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg border-zinc-200">
                                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-zinc-400" />
                                </div>
                                <h4 className="text-sm font-medium text-zinc-900">No tasks assigned</h4>
                                <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                                    You have no pending tasks assigned to you at the moment.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="lists" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Lists</CardTitle>
                            <CardDescription>
                                Your private to-do lists and collections.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg border-zinc-200">
                                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                                    <ListTodo className="h-6 w-6 text-zinc-400" />
                                </div>
                                <h4 className="text-sm font-medium text-zinc-900">No personal lists</h4>
                                <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                                    Create a personal list to organize your private tasks.
                                </p>
                                <Button variant="outline" size="sm" className="mt-4">
                                    Create List
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
