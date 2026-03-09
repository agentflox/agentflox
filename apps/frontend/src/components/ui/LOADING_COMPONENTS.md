# Loading Components

A comprehensive, enterprise-grade loading component system for consistent loading states throughout the Agentflox platform.

## Overview

The loading component library provides multiple variants and specialized components to handle different loading scenarios, from inline spinners to full-page loading states. All components follow modern SaaS design patterns with proper accessibility attributes, smooth animations, and consistent styling.

## Components

### 1. LoadingSpinner

A simple animated spinner for inline loading states.

**Props:**
- `size`: `"xs" | "sm" | "md" | "lg" | "xl" | "2xl"` (default: `"md"`)
- `variant`: `"default" | "muted" | "white" | "current"` (default: `"default"`)
- `label`: `string` (default: `"Loading..."`)
- `showLabel`: `boolean` (default: `false`)

**Usage:**
```tsx
import { LoadingSpinner } from "@/components/ui/loading";

// Simple spinner
<LoadingSpinner />

// With label
<LoadingSpinner size="lg" showLabel label="Processing..." />

// Muted variant
<LoadingSpinner variant="muted" size="sm" />
```

**When to use:**
- Inline loading states
- Button loading states
- Small UI elements that need a loading indicator

---

### 2. LoadingContainer

A centered loading state with optional label and description.

**Props:**
- `variant`: `"default" | "card" | "overlay" | "fullscreen"` (default: `"default"`)
- `padding`: `"none" | "sm" | "md" | "lg"` (default: `"md"`)
- `label`: `string` (default: `"Loading..."`)
- `description`: `string` (optional)
- `spinnerSize`: Same as LoadingSpinner size (default: `"lg"`)
- `showLabel`: `boolean` (default: `true`)

**Usage:**
```tsx
import { LoadingContainer } from "@/components/ui/loading";

// Basic centered loading
<LoadingContainer label="Loading spaces..." />

// With description
<LoadingContainer 
  label="Fetching data..." 
  description="This may take a few moments"
/>

// Card variant
<LoadingContainer 
  variant="card" 
  label="Loading content..."
  className="min-h-[400px]"
/>

// Overlay variant
<LoadingContainer 
  variant="overlay" 
  label="Saving changes..."
/>
```

**When to use:**
- Page sections
- Card content areas
- Modal content
- Any area that needs a centered loading state

---

### 3. LoadingSkeleton

A skeleton loading state with animated shimmer effect.

**Props:**
- `lines`: `number` (default: `3`)
- `showAvatar`: `boolean` (default: `false`)

**Usage:**
```tsx
import { LoadingSkeleton } from "@/components/ui/loading";

// Basic skeleton
<LoadingSkeleton lines={5} />

// With avatar
<LoadingSkeleton lines={3} showAvatar />
```

**When to use:**
- List items with predictable structure
- Content that has a known layout
- When you want to show the structure while loading

---

### 4. LoadingDots

Three animated dots for a subtle loading indicator.

**Props:**
- `size`: `"sm" | "md" | "lg"` (default: `"md"`)
- `variant`: `"default" | "muted"` (default: `"default"`)

**Usage:**
```tsx
import { LoadingDots } from "@/components/ui/loading";

// Basic dots
<LoadingDots />

// Small muted dots
<LoadingDots size="sm" variant="muted" />
```

**When to use:**
- Subtle loading indicators
- Chat interfaces
- Real-time updates
- Minimalist designs

---

### 5. LoadingProgress

A progress bar for determinate or indeterminate loading.

**Props:**
- `progress`: `number` (0-100, default: `0`)
- `indeterminate`: `boolean` (default: `false`)
- `label`: `string` (optional)
- `showPercentage`: `boolean` (default: `false`)

**Usage:**
```tsx
import { LoadingProgress } from "@/components/ui/loading";

// Indeterminate progress
<LoadingProgress indeterminate label="Processing..." />

// Determinate progress
<LoadingProgress 
  progress={65} 
  label="Uploading file..." 
  showPercentage 
/>
```

**When to use:**
- File uploads
- Long-running operations
- Multi-step processes
- When progress can be tracked

---

## Specialized Components

### LoadingPage

Full-page loading state for initial page loads or route transitions.

**Usage:**
```tsx
import { LoadingPage } from "@/components/ui/loading";

<LoadingPage 
  label="Loading workspace..." 
  description="Setting up your environment"
/>
```

---

### LoadingCard

Card-style loading state for loading within card components.

**Usage:**
```tsx
import { LoadingCard } from "@/components/ui/loading";

<LoadingCard 
  label="Loading analytics..." 
  className="min-h-[300px]"
/>
```

---

### LoadingOverlay

Overlay loading state to show loading over existing content.

**Usage:**
```tsx
import { LoadingOverlay } from "@/components/ui/loading";

<div className="relative">
  {/* Your content */}
  {isLoading && <LoadingOverlay label="Saving..." />}
</div>
```

---

### LoadingInline

Inline loading state with spinner and text.

**Usage:**
```tsx
import { LoadingInline } from "@/components/ui/loading";

<LoadingInline label="Saving changes..." size="sm" />
```

---

## Design Principles

### 1. **Consistency**
All loading components use the same design tokens, animations, and styling to ensure a consistent experience across the platform.

### 2. **Accessibility**
- All components include proper ARIA attributes (`role="status"`, `aria-live="polite"`, `aria-label`)
- Screen reader friendly labels
- Keyboard navigation support where applicable

### 3. **Performance**
- CSS-based animations for smooth 60fps performance
- Minimal DOM elements
- Optimized re-renders

### 4. **Flexibility**
- Multiple size variants
- Color variants for different contexts
- Composable components
- Customizable via className prop

### 5. **Modern Aesthetics**
- Smooth animations
- Professional appearance
- Follows top SaaS design patterns (Linear, Stripe, Notion)

---

## Best Practices

### 1. Choose the Right Component

- **LoadingSpinner**: For small, inline loading states
- **LoadingContainer**: For centered loading in sections/cards
- **LoadingSkeleton**: When you know the content structure
- **LoadingDots**: For subtle, minimalist loading
- **LoadingProgress**: When you can show progress
- **LoadingPage**: For full-page loading
- **LoadingOverlay**: To overlay existing content

### 2. Provide Meaningful Labels

```tsx
// ❌ Bad
<LoadingContainer label="Loading..." />

// ✅ Good
<LoadingContainer label="Loading your spaces..." />
```

### 3. Use Descriptions for Context

```tsx
<LoadingContainer 
  label="Importing project..." 
  description="This may take a few moments for large projects"
/>
```

### 4. Match the Loading State to Content

```tsx
// For a list of items
<LoadingSkeleton lines={5} showAvatar />

// For a centered section
<LoadingContainer label="Loading data..." />
```

### 5. Consider User Experience

- Show loading states immediately (no delay)
- Use skeleton screens for content with known structure
- Provide progress feedback for long operations
- Use overlays for actions that don't navigate away

---

## Migration Guide

### Replacing Old Loading States

**Before:**
```tsx
{isLoading ? (
  <div className="flex items-center justify-center py-8">
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
) : (
  // content
)}
```

**After:**
```tsx
import { LoadingContainer } from "@/components/ui/loading";

{isLoading ? (
  <LoadingContainer label="Loading..." />
) : (
  // content
)}
```

---

## Examples

### Example 1: Sidebar Loading

```tsx
import { LoadingContainer } from "@/components/ui/loading";

<div className="flex-1 overflow-y-auto px-2 py-2">
  {isLoading ? (
    <LoadingContainer 
      label="Loading spaces..." 
      spinnerSize="md"
      padding="md"
    />
  ) : (
    // content
  )}
</div>
```

### Example 2: Card Loading

```tsx
import { LoadingCard } from "@/components/ui/loading";

<div className="grid grid-cols-3 gap-4">
  {isLoading ? (
    <>
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
    </>
  ) : (
    projects.map(project => <ProjectCard key={project.id} {...project} />)
  )}
</div>
```

### Example 3: Button Loading

```tsx
import { LoadingSpinner } from "@/components/ui/loading";

<Button disabled={isLoading}>
  {isLoading ? (
    <LoadingSpinner size="sm" variant="white" />
  ) : (
    "Save Changes"
  )}
</Button>
```

### Example 4: File Upload

```tsx
import { LoadingProgress } from "@/components/ui/loading";

{uploadProgress > 0 && (
  <LoadingProgress 
    progress={uploadProgress} 
    label="Uploading file..." 
    showPercentage 
  />
)}
```

---

## Animations

All animations are defined in `globals.css`:

- **Spinner**: Uses Lucide's `Loader2` icon with `animate-spin`
- **Dots**: Uses `animate-bounce` with staggered delays
- **Progress**: Uses custom `loading-progress` keyframe animation
- **Skeleton**: Uses `animate-pulse` from Tailwind

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- ✅ Proper ARIA roles and attributes
- ✅ Screen reader announcements
- ✅ Sufficient color contrast
- ✅ Keyboard accessible
- ✅ Reduced motion support (respects `prefers-reduced-motion`)

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Contributing

When adding new loading variants:

1. Follow the existing naming conventions
2. Use `cva` for variant management
3. Include proper TypeScript types
4. Add accessibility attributes
5. Document in this README
6. Add usage examples

---

## Related Components

- **Skeleton**: For content placeholders
- **Progress**: For determinate progress
- **Spinner**: For simple loading states
- **Empty State**: For when there's no data

---

## Support

For questions or issues with loading components, please contact the design system team or create an issue in the repository.
