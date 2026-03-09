"use client";
import { useState } from 'react';
import Button from '@/components/ui/button';
import { ChevronDown, Edit, Eye, Globe, Lock, Plus, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { PROJECT_PROPOSAL_TYPES } from '../constants';

interface ProjectActionsProps {
  isEditing: boolean;
  isPublished: boolean;
  isPublishing: boolean;
  onToggleEdit: () => void;
  onTogglePublish: () => void;
  onCreateProposal: (type: string) => void;
}

export default function ProjectActions({
  isEditing,
  isPublished,
  isPublishing,
  onToggleEdit,
  onTogglePublish,
  onCreateProposal,
}: ProjectActionsProps) {
  const [isProposalDropdownOpen, setIsProposalDropdownOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);

  return (
    <>
      {/* Desktop View - Show all buttons */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Edit/View Toggle */}
        <Button
          variant={isEditing ? "outline" : "primary"}
          onClick={onToggleEdit}
          className="gap-2"
        >
          {isEditing ? (
            <>
              <Eye className="w-4 h-4" />
              <span className="hidden lg:inline">View</span>
            </>
          ) : (
            <>
              <Edit className="w-4 h-4" />
              <span className="hidden lg:inline">Edit</span>
            </>
          )}
        </Button>

        {/* Publish/Unpublish Toggle */}
        <Button
          variant={isPublished ? "outline" : "primary"}
          onClick={onTogglePublish}
          disabled={isPublishing}
          className="gap-2 min-w-[100px] lg:min-w-[120px]"
        >
          {isPublishing ? (
            <span className="animate-spin">⏳</span>
          ) : isPublished ? (
            <>
              <Lock className="w-4 h-4" />
              <span className="hidden lg:inline">Unpublish</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              <span className="hidden lg:inline">Publish</span>
            </>
          )}
        </Button>

        {/* Create Proposal Dropdown */}
        <DropdownMenu open={isProposalDropdownOpen} onOpenChange={setIsProposalDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 min-w-[140px] lg:min-w-[200px]">
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Create Proposal</span>
              <span className="lg:hidden">Create</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Select Proposal Type
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PROJECT_PROPOSAL_TYPES.map((type) => (
              <DropdownMenuItem
                key={type.value}
                onClick={() => {
                  onCreateProposal(type.value);
                  setIsProposalDropdownOpen(false);
                }}
                className="py-3 cursor-pointer group"
              >
                <span className="mr-3 text-lg">{type.icon}</span>
                <span className="font-medium group-hover:text-foreground">
                  {type.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile View - Single Actions Dropdown */}
      <div className="lg:hidden">
        <DropdownMenu open={isActionsDropdownOpen} onOpenChange={setIsActionsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="h-9 w-9"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open actions menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Edit/View Action */}
            <DropdownMenuItem
              onClick={() => {
                onToggleEdit();
                setIsActionsDropdownOpen(false);
              }}
              className="py-3 cursor-pointer"
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-3" />
                  <span className="font-medium">View Mode</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-3" />
                  <span className="font-medium">Edit Mode</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Publish/Unpublish Action */}
            <DropdownMenuItem
              onClick={() => {
                if (!isPublishing) {
                  onTogglePublish();
                  setIsActionsDropdownOpen(false);
                }
              }}
              disabled={isPublishing}
              className="py-3 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <span className="animate-spin mr-3">⏳</span>
                  <span className="font-medium">Publishing...</span>
                </>
              ) : isPublished ? (
                <>
                  <Lock className="w-4 h-4 mr-3" />
                  <span className="font-medium">Unpublish Project</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-3" />
                  <span className="font-medium">Publish Project</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Create Proposal Section */}
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground py-2">
              Create Proposal
            </DropdownMenuLabel>
            
            {PROJECT_PROPOSAL_TYPES.map((type) => (
              <DropdownMenuItem
                key={type.value}
                onClick={() => {
                  onCreateProposal(type.value);
                  setIsActionsDropdownOpen(false);
                }}
                className="py-3 cursor-pointer group pl-4"
              >
                <span className="mr-3 text-lg">{type.icon}</span>
                <span className="font-medium group-hover:text-foreground text-sm">
                  {type.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
