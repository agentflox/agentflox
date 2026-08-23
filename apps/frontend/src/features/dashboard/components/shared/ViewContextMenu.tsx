import {
    Copy, Lock, Star, Edit, Pin, EyeOff, Save,
    CopyPlus, Trash2, Shield
} from "lucide-react";
import {
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Switch } from "@/components/ui/switch";
import { ViewType } from "@/features/dashboard/components/modals/AddViewModal";

export interface ViewContextMenuProps {
    view: any;
    onRename: (view: any) => void;
    onDelete: (view: any) => void;
    onDuplicate: (view: any) => void;
    onTogglePin: (view: any) => void;
    onTogglePrivate: (view: any) => void;
    onToggleLock: (view: any) => void;
    onToggleDefault: (view: any) => void;
    onCopyLink: (view: any) => void;
    onShare?: (view: any) => void;
    onSaveTemplate?: (view: any) => void;
}

const OverviewMenu = ({ view, onToggleLock, onToggleDefault, onCopyLink, onShare }: ViewContextMenuProps) => (
    <>
        <ContextMenuItem onClick={() => onCopyLink(view)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link to view
        </ContextMenuItem>
        {onShare && (
            <ContextMenuItem onClick={() => onShare(view)}>
                <Shield className="mr-2 h-4 w-4" />
                Permissions
            </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onToggleLock(view)} onSelect={(e) => e.preventDefault()}>
            <Lock className="mr-2 h-4 w-4" />
            Protect view
            <Switch checked={view.isLocked} className="ml-auto" />
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleDefault(view)} onSelect={(e) => e.preventDefault()}>
            <Star className="mr-2 h-4 w-4" />
            Set as default view
            <Switch checked={view.isDefault} className="ml-auto" />
        </ContextMenuItem>
    </>
);

const StandardMenu = ({
    view,
    onRename,
    onDelete,
    onDuplicate,
    onTogglePin,
    onTogglePrivate,
    onToggleLock,
    onToggleDefault,
    onCopyLink,
    onShare,
    onSaveTemplate
}: ViewContextMenuProps) => (
    <>
        <ContextMenuItem onClick={() => onRename(view)} disabled={view.isLocked}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopyLink(view)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link to view
        </ContextMenuItem>
        {onShare && (
            <ContextMenuItem onClick={() => onShare(view)}>
                <Shield className="mr-2 h-4 w-4" />
                Permissions
            </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); onTogglePin(view); }}>
            <div className="flex items-center">
                <Pin className="mr-2 h-4 w-4" />
                Pin view
            </div>
            <Switch checked={view.isPinned} />
        </ContextMenuItem>

        <ContextMenuItem className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); onTogglePrivate(view); }}>
            <div className="flex items-center">
                <EyeOff className="mr-2 h-4 w-4" />
                Private view
            </div>
            <Switch checked={view.isPrivate} />
        </ContextMenuItem>

        <ContextMenuItem className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); onToggleLock(view); }}>
            <div className="flex items-center">
                <Lock className="mr-2 h-4 w-4" />
                Protect view
            </div>
            <Switch checked={view.isLocked} />
        </ContextMenuItem>

        <ContextMenuItem className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); onToggleDefault(view); }}>
            <div className="flex items-center">
                <Star className="mr-2 h-4 w-4" />
                Set as default view
            </div>
            <Switch checked={view.isDefault} />
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => onDuplicate(view)}>
            <CopyPlus className="mr-2 h-4 w-4" />
            Duplicate view
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onSaveTemplate?.(view)}>
            <Save className="mr-2 h-4 w-4" />
            Save as template
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={() => onDelete(view)}
            disabled={view.isLocked}
        >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete view
        </ContextMenuItem>
    </>
);

const ViewMenus: Partial<Record<ViewType, React.FC<ViewContextMenuProps>>> = {
    OVERVIEW: OverviewMenu,
};

export const ViewContextMenu = (props: ViewContextMenuProps) => {
    const viewType = props.view.type as ViewType;
    const MenuComponent = ViewMenus[viewType] || StandardMenu;

    return (
        <ContextMenuContent className="w-72">
            <MenuComponent {...props} />
        </ContextMenuContent>
    );
};

// Aliases for compatibility
export const SpaceViewContextMenu = ViewContextMenu;
export type SpaceViewContextMenuProps = ViewContextMenuProps;
export const ProjectViewContextMenu = ViewContextMenu;
export type ProjectViewContextMenuProps = ViewContextMenuProps;
export const TeamViewContextMenu = ViewContextMenu;
export type TeamViewContextMenuProps = ViewContextMenuProps;
