import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SelectedMember } from './ChannelMembersSidebar';

interface ContextMemberPickerProps {
    contextName: string;
    availableMembers: any[];
    chatMembers: SelectedMember[];
    onClose: () => void;
    onInvite: (userId: string) => void;
}

export function ContextMemberPicker({
    contextName,
    availableMembers,
    chatMembers,
    onClose,
    onInvite
}: ContextMemberPickerProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredMembers = React.useMemo(() => {
        if (!searchQuery.trim()) return availableMembers;
        return availableMembers.filter(memberItem => {
            const user = memberItem.user || memberItem;
            if (!user || !user.name) return false;
            return user.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [availableMembers, searchQuery]);

    return (
        <div className="flex flex-col max-h-[350px] w-full">
            <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {contextName} Members
                </span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="px-2 pb-2 mb-1">
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 mr-1.5" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search members..."
                        className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-xs shadow-none border-0 placeholder:text-slate-400"
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 px-1 pb-1">
                {filteredMembers?.map((memberItem: any) => {
                    const user = memberItem.user || memberItem;
                    if (!user || !user.id) return null;
                    const isAlreadyMember = chatMembers.some(cm => cm.id === user.id);
                    return (
                        <div key={user.id} className="flex items-center justify-between group px-2 py-1.5 hover:bg-slate-50 rounded-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.image || undefined} />
                                    <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium text-slate-700">{user.name || 'Unknown User'}</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className={cn("h-6 px-2 text-xs cursor-pointer", isAlreadyMember ? "opacity-50 cursor-not-allowed" : "opacity-0 group-hover:opacity-100 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50")}
                                            disabled={isAlreadyMember}
                                            onClick={() => {
                                                onInvite(user.id);
                                            }}
                                        >
                                            {isAlreadyMember ? "Added" : "Add"}
                                        </Button>
                                    </TooltipTrigger>
                                    {isAlreadyMember && (
                                        <TooltipContent side="left">
                                            <p>Already a member of the channel</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    );
                })}
                {(!filteredMembers || filteredMembers.length === 0) && (
                    <p className="text-xs text-center text-slate-500 py-4">No members found.</p>
                )}
            </div>
        </div>
    );
}
