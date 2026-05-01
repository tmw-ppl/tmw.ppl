# UI Styling Refactor Guide for Cursor

Use this document as the source of truth when refactoring the web app UI.

The goal is to make the app look clean, consistent, and intentional by removing one-off styling and replacing it with a reusable design system.

## Core Principle

Do not invent new CSS for every component.

Instead, compose the UI from a small set of reusable tokens, classes, and components.

The main problem to avoid is inconsistent AI-generated styling:

- Random button sizes
- Mismatched border radii
- Inconsistent spacing
- Arbitrary colors
- Different shadows on every card
- Icons that do not align with text
- Components that look like they came from different apps

The fix is to create a small design system and force all UI to use it.

---

# Refactor Goals

Cursor should refactor the app so that:

1. Buttons use consistent variants and sizes.
2. Icons use consistent sizing, alignment, and stroke width.
3. Cards, panels, forms, inputs, and modals share the same styling patterns.
4. Colors come from design tokens, not random hardcoded values.
5. Spacing, radius, shadows, and borders are standardized.
6. Components are built from reusable primitives whenever possible.
7. The visual style is clean, modern, understated, and professional.

---

# Design System Rules

## 1. Do not use arbitrary one-off styles

Avoid styling like this:

```tsx
<button className="bg-purple-600 px-5 py-2 rounded-xl shadow-lg text-white hover:bg-purple-700">
  Save
</button>
```

Prefer styling like this:

```tsx
<Button variant="primary" size="md">
  Save
</Button>
```

Or, if using CSS classes:

```html
<button class="btn btn-primary">
  Save
</button>
```

## 2. Use tokens for visual values

Do not hardcode colors, shadows, or border radii throughout the app.

Bad:

```css
background: #7c3aed;
border-radius: 13px;
box-shadow: 0 9px 21px rgba(0, 0, 0, 0.22);
```

Good:

```css
background: var(--color-primary);
border-radius: var(--radius-md);
box-shadow: var(--shadow-soft);
```

## 3. Prefer reusable UI components

All common UI should be built from primitives such as:

- `Button`
- `IconButton`
- `Card`
- `Input`
- `Textarea`
- `Select`
- `Badge`
- `Modal`
- `DropdownMenu`
- `Tooltip`
- `Tabs`
- `EmptyState`
- `PageHeader`

If the app already has a component system, improve and standardize it.

If it does not, create one under:

```txt
/components/ui
```

---

# Recommended Stack

If this is a React or Next.js app, prefer this stack:

```txt
Tailwind CSS
shadcn/ui
lucide-react
class-variance-authority
clsx
tailwind-merge
```

Use shadcn/ui components whenever possible instead of hand-rolling everything.

Use `lucide-react` for icons.

---

# Button Rules

All buttons should use one consistent `Button` component.

## Button variants

Use these variants:

```txt
primary
secondary
ghost
destructive
outline
link
```

## Button sizes

Use these sizes:

```txt
sm
md
lg
icon
```

## Button behavior

Buttons should:

- Use `inline-flex`
- Align items center
- Justify content center
- Have consistent height
- Have consistent horizontal padding
- Use a consistent gap between icon and text
- Use smooth but subtle transitions
- Avoid heavy shadows
- Avoid loud gradients unless explicitly part of the brand

## Example Button API

```tsx
<Button variant="primary" size="md">
  Save changes
</Button>

<Button variant="secondary" size="sm">
  Cancel
</Button>

<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>
```

---

# Icon Rules

Use icons consistently.

## Icon library

Use:

```txt
lucide-react
```

## Icon sizing

Default icon sizes:

```txt
Inline with text: h-4 w-4
Standalone icon button: h-4 w-4 or h-5 w-5
Large empty-state icon: h-8 w-8 or h-10 w-10
```

## Icon styling

Icons should:

- Usually inherit text color
- Be vertically aligned with labels
- Use consistent size within the same section
- Avoid random colors
- Avoid mixing multiple icon libraries

## Example

```tsx
<Button variant="primary" size="sm" className="gap-2">
  <Plus className="h-4 w-4" />
  Add item
</Button>
```

---

# CSS Token Example

If the project uses regular CSS, add or normalize tokens like this:

```css
:root {
  --color-bg: #0b0f14;
  --color-surface: #111827;
  --color-surface-hover: #1f2937;
  --color-border: #293241;

  --color-text: #f9fafb;
  --color-muted: #9ca3af;
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-danger: #dc2626;
  --color-danger-hover: #b91c1c;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.18);
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.08);
}
```

Adjust these values to fit the app’s actual brand and theme.

---

# CSS Class Example

If the app does not use Tailwind or shadcn, create reusable CSS classes like this:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    opacity 120ms ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.btn-destructive {
  background: var(--color-danger);
  color: white;
}

.btn-destructive:hover:not(:disabled) {
  background: var(--color-danger-hover);
}

.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.btn-md {
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
}

.btn-lg {
  height: 48px;
  padding: 0 20px;
  font-size: 15px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  padding: 0;
}
```

---

# React Component Example

If using React, create a reusable Button component instead of scattering button classes everywhere.

Example:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

---

# Card Rules

Cards should be consistent.

Use cards for grouped content, not random bordered divs.

Cards should generally have:

- Consistent background
- Consistent border
- Consistent radius
- Consistent padding
- Optional subtle shadow
- Clear header/body/footer structure when needed

Example API:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
    <CardDescription>Manage the main configuration for this project.</CardDescription>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
</Card>
```

---

# Form Rules

Forms should be calm and readable.

Inputs should:

- Have consistent height
- Have consistent border color
- Have visible focus states
- Use labels
- Use helper text where needed
- Use error text consistently

Avoid:

- Inputs with different heights on the same page
- Random focus rings
- Placeholder-only labels
- Bright red errors unless necessary

---

# Layout Rules

Use consistent spacing.

Suggested spacing scale:

```txt
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

Page sections should not use random margins.

Prefer structure like:

```tsx
<main className="mx-auto w-full max-w-6xl px-4 py-8">
  <PageHeader title="Dashboard" description="Overview of your workspace." />
  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    ...
  </div>
</main>
```

---

# Visual Style Direction

The desired style is:

```txt
Clean
Modern
Calm
Professional
Consistent
Slightly premium
Not flashy
Not over-designed
```

Avoid:

```txt
Excessive gradients
Heavy shadows
Random glassmorphism
Huge border radii everywhere
Too many colors
Inconsistent icon sizes
Overly large buttons
Tiny unreadable text
Dense unstructured layouts
```

---

# Cursor Refactor Instructions

When refactoring, follow this order:

## Step 1: Audit current UI patterns

Find all repeated UI patterns:

- Buttons
- Icon buttons
- Cards
- Inputs
- Badges
- Headers
- Modals
- Dropdowns
- Empty states

Identify places where styles are duplicated or inconsistent.

## Step 2: Create or improve UI primitives

Create or update shared components under:

```txt
/components/ui
```

Focus first on:

```txt
Button
IconButton
Card
Input
Badge
PageHeader
EmptyState
```

## Step 3: Replace one-off styling

Replace custom button/card/input markup with reusable components.

Bad:

```tsx
<button className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700">
  Submit
</button>
```

Good:

```tsx
<Button variant="primary">
  Submit
</Button>
```

## Step 4: Normalize icons

Make all icons use consistent sizing.

For lucide-react icons:

```tsx
<Settings className="h-4 w-4" />
```

Use:

```tsx
<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>
```

## Step 5: Remove hardcoded design values

Replace arbitrary colors, shadows, borders, and radii with tokens or design-system classes.

## Step 6: Check visual consistency page by page

After refactoring, review each page for:

- Button consistency
- Icon alignment
- Spacing consistency
- Card consistency
- Form consistency
- Hover/focus states
- Mobile responsiveness

---

# Cursor Prompt

Paste this into Cursor after adding this file to the repo:

```txt
Please refactor the UI styling in this app using the rules in `ui-style-guide-cursor.md`.

Start by auditing the current button, icon, card, input, and layout styles. Then create or improve reusable UI primitives under `/components/ui` and replace one-off styling throughout the app.

Important rules:
- Do not invent one-off styles for every component.
- Use reusable UI primitives wherever possible.
- Normalize all buttons, icon buttons, cards, inputs, badges, and page headers.
- Use design tokens or theme variables instead of arbitrary colors and shadows.
- Use consistent icon sizing and alignment.
- Keep the visual style clean, modern, calm, professional, and understated.
- Avoid excessive gradients, heavy shadows, random colors, and inconsistent border radii.

Make the smallest safe refactor first, then continue page by page. Preserve existing functionality.
```

---

# Optional: Stricter Cursor Prompt

Use this if Cursor keeps creating random styles:

```txt
You are not allowed to create new ad hoc visual styles unless absolutely necessary.

Before adding any className or CSS, check whether an existing UI primitive, design token, or variant already handles it.

If a reusable primitive is missing, create the primitive first, then use it.

Do not use arbitrary colors, arbitrary shadows, arbitrary border radius values, or inconsistent spacing.

The UI should look like one coherent product, not a collection of independently styled components.
```

---

# Acceptance Criteria

The refactor is successful when:

- Most buttons use one shared `Button` component or shared button classes.
- Icon buttons are consistently sized.
- Icons align cleanly with button text.
- Cards look like they belong to the same system.
- Inputs and forms share consistent styling.
- Colors are pulled from tokens/theme values.
- Hardcoded random styles are minimized.
- The app feels visually coherent across pages.
- Existing functionality is preserved.

