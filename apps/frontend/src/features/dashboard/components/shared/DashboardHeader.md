# DashboardHeader Component

Enterprise-grade reusable header component for dashboard views.

## Features

- ✅ **Flexible Action System** - Easily add or remove action items
- ✅ **Built-in Common Actions** - Copy link, Settings, Agent, Ask AI, Share
- ✅ **Custom Actions Support** - Add custom actions to left or right side
- ✅ **Responsive Design** - Adapts to different screen sizes
- ✅ **Accessible** - Full ARIA support and keyboard navigation
- ✅ **TypeScript** - Fully typed for better DX
- ✅ **Dropdown Support** - Actions can have dropdown menus
- ✅ **Badge Support** - Show notifications or counts on actions
- ✅ **Preset Configurations** - Quick setup for common scenarios

## Basic Usage

```tsx
import { DashboardHeader } from "@/features/dashboard/components/shared/DashboardHeader";

function MyDashboard() {
  return (
    <DashboardHeader
      entityName="Marketing Campaign"
      entityType="project"
      onSettingsClick={() => console.log("Settings clicked")}
      onAgentClick={() => console.log("Agent clicked")}
      onAskAIClick={() => console.log("Ask AI clicked")}
      onShareClick={() => console.log("Share clicked")}
    />
  );
}
```

## Advanced Usage

### With Custom Actions

```tsx
<DashboardHeader
  entityName="Product Roadmap"
  entityType="project"
  isStarred={true}
  onToggleStar={() => toggleFavorite()}
  leftActions={[
    {
      id: "export",
      label: "Export",
      icon: Download,
      onClick: () => handleExport(),
      tooltip: "Export project data"
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      onClick: () => handleArchive(),
      variant: "outline"
    }
  ]}
  rightActions={[
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => openNotifications(),
      badge: 5
    }
  ]}
/>
```

### With Dropdown Actions

```tsx
<DashboardHeader
  entityName="Team Dashboard"
  entityType="team"
  leftActions={[
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
      onClick: () => {},
      dropdownItems: [
        {
          id: "duplicate",
          label: "Duplicate",
          icon: Copy,
          onClick: () => handleDuplicate()
        },
        {
          id: "separator-1",
          label: "",
          separator: true
        },
        {
          id: "delete",
          label: "Delete",
          icon: Trash,
          onClick: () => handleDelete(),
          variant: "destructive"
        }
      ]
    }
  ]}
/>
```

### Using Presets

```tsx
import { DashboardHeader, DashboardHeaderPresets } from "@/features/dashboard/components/shared/DashboardHeader";

// Minimal header
<DashboardHeader
  entityName="Quick View"
  {...DashboardHeaderPresets.minimal}
/>

// Viewer mode (read-only)
<DashboardHeader
  entityName="Shared Report"
  {...DashboardHeaderPresets.viewer}
  onAskAIClick={() => openAI()}
/>
```

### Hiding Specific Actions

```tsx
<DashboardHeader
  entityName="Public Space"
  showSettings={false}
  showAgent={false}
  showCopyLink={true}
  showAskAI={true}
  showShare={true}
/>
```

## Props Reference

### DashboardHeaderProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityName` | `string` | **required** | Name of the entity (project, space, team, etc.) |
| `entityType` | `"project" \| "space" \| "team" \| "workspace"` | `"project"` | Type of entity for context |
| `entityIcon` | `React.ReactNode` | `undefined` | Optional icon to display before entity name |
| `isStarred` | `boolean` | `false` | Whether the entity is favorited |
| `onToggleStar` | `() => void` | `undefined` | Handler for star/favorite toggle |
| `shareUrl` | `string` | `window.location.href` | URL to copy when clicking "Copy Link" |
| `onSettingsClick` | `() => void` | `undefined` | Handler for settings button |
| `onAgentClick` | `() => void` | `undefined` | Handler for agent button |
| `onAskAIClick` | `() => void` | `undefined` | Handler for Ask AI button |
| `onShareClick` | `() => void` | `undefined` | Handler for share button |
| `leftActions` | `HeaderAction[]` | `[]` | Custom actions for left side |
| `rightActions` | `HeaderAction[]` | `[]` | Custom actions for right side |
| `className` | `string` | `undefined` | Additional CSS classes |
| `showCopyLink` | `boolean` | `true` | Show/hide copy link button |
| `showSettings` | `boolean` | `true` | Show/hide settings button |
| `showAgent` | `boolean` | `true` | Show/hide agent button |
| `showAskAI` | `boolean` | `true` | Show/hide Ask AI button |
| `showShare` | `boolean` | `true` | Show/hide share button |

### HeaderAction

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier |
| `label` | `string` | Display label |
| `icon` | `React.ComponentType` | Icon component (from lucide-react) |
| `onClick` | `() => void` | Click handler |
| `tooltip` | `string` | Optional tooltip text |
| `variant` | `"default" \| "outline" \| "ghost" \| "primary"` | Visual variant |
| `disabled` | `boolean` | Whether action is disabled |
| `badge` | `string \| number` | Optional badge content |
| `dropdownItems` | `HeaderDropdownItem[]` | Optional dropdown menu items |

## Design Principles

1. **Consistency** - Uses design system tokens and components
2. **Flexibility** - Easy to customize without modifying core component
3. **Accessibility** - ARIA labels, keyboard navigation, focus management
4. **Performance** - Optimized re-renders, memoization where needed
5. **Maintainability** - Clear prop types, comprehensive documentation
6. **Scalability** - Supports unlimited custom actions without bloat

## Integration Examples

See the implementation in:
- `ProjectDashboardView.tsx`
- `SpaceDashboardView.tsx`
- `TeamDashboardView.tsx`
