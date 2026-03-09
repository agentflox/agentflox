"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { List as ListIcon, CheckSquare } from "lucide-react";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";

interface CreateOptionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    spaceId: string;
    workspaceId: string;
    selectedListId?: string;
    selectedFolderId?: string;
    onListCreated?: (list: any) => void;
}

export function CreateOptionsModal({
    open,
    onOpenChange,
    spaceId,
    workspaceId,
    selectedListId,
    selectedFolderId,
    onListCreated,
}: CreateOptionsModalProps) {
    const [showListModal, setShowListModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);

    const handleCreateList = () => {
        onOpenChange(false);
        setShowListModal(true);
    };

    const handleCreateTask = () => {
        onOpenChange(false);
        setShowTaskModal(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New</DialogTitle>
                        <DialogDescription>
                            Choose what you'd like to create
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                        <Button
                            variant="outline"
                            className="h-auto py-6 flex flex-col items-start gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            onClick={handleCreateList}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <ListIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-semibold">List</span>
                                    <span className="text-xs text-muted-foreground">
                                        Create a new list to organize tasks
                                    </span>
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto py-6 flex flex-col items-start gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            onClick={handleCreateTask}
                            disabled={!selectedListId}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-semibold">Task</span>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedListId
                                            ? "Create a new task in the selected list"
                                            : "Select a list first to create a task"}
                                    </span>
                                </div>
                            </div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* List Creation Modal */}
            <ListCreationModal
                context="SPACE"
                contextId={spaceId}
                workspaceId={workspaceId}
                folderId={selectedFolderId}
                open={showListModal}
                onOpenChange={setShowListModal}
                onListCreated={onListCreated}
                trigger={<span className="hidden" />}
            />

            {/* Task Creation Modal */}
            {selectedListId && (
                <TaskCreationModal
                    context="SPACE"
                    contextId={spaceId}
                    defaultListId={selectedListId}
                    workspaceId={workspaceId}
                    open={showTaskModal}
                    onOpenChange={setShowTaskModal}
                    trigger={<span className="hidden" />}
                />
            )}
        </>
    );
}
