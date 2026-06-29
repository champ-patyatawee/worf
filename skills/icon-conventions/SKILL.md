---
name: icon-conventions
description: Icon usage conventions — lucide-react only, no emoji or other icon packs in UI components
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Enforce the rule: **All icons in the UI must come from `lucide-react`** — no Unicode emoji, no other icon packs (FontAwesome, Heroicons, Fluent, etc.)
- Audit `.tsx` files for emoji-in-UI violations
- Suggest correct `lucide-react` replacements for common emoji patterns

## When to use me
Use when adding new UI features that need icons, reviewing PRs for icon usage, or doing icon consistency audits across the frontend.

## Icon Mapping (Common Patterns)

| Avoid (emoji) | Use (lucide-react) |
|---|---|
| 🏃 (running) | `<Timer />` or `<Play />` |
| 📋 (clipboard) | `<Columns3 />` or `<ClipboardList />` |
| 🎯 (target) | `<Target />` |
| ✅ (check) | `<CheckCircle />` or `<Check />` |
| 📅 (calendar) | `<CalendarDays />` or `<Calendar />` |
| 🔄 (refresh) | `<RefreshCw />` |
| 📝 (memo) | `<FileText />` or `<StickyNote />` |
| 📁 (folder) | `<Folder />` or `<FolderKanban />` |
| 🗑️ (trash) | `<Trash2 />` |
| ✏️ (pencil) | `<Pencil />` |
| 🔍 (search) | `<Search />` |
| ⚙️ (gear) | `<Settings />` or `<Settings2 />` |
| 🔗 (link) | `<Link />` or `<ExternalLink />` |
| 💬 (chat) | `<MessageSquare />` or `<Bot />` |
| 📊 (chart) | `<BarChart />` or `<Activity />` |
| 👤 (user) | `<User />` |
| ⭐ (star) | `<Star />` |
| 💡 (idea) | `<Lightbulb />` |
| 🚀 (rocket) | `<Rocket />` |

## Audit Command

```bash
# Scan for emoji in .tsx files (outputs file:line for any Unicode emoji found)
rg '[🀀-🏿]' --include='*.tsx' src/
```

To scan more broadly (all source files, not just `.tsx`):

```bash
rg '[🀀-🏿]' --include='*.{ts,tsx,js,jsx}' src/
```

## Rule

If you see `{emoji_character}` or `'emoji_string'` in a JSX/TSX file, it should be replaced with the corresponding `lucide-react` `<Icon />` component. The only exception is literal text content in comments or documentation strings.

## Usage Example

**Before (violation):**
```tsx
import { Button } from "@/components/ui/button";

export function SaveButton() {
  return <Button>💾 Save</Button>;
}
```

**After (compliant):**
```tsx
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveButton() {
  return (
    <Button>
      <Save className="h-4 w-4" /> Save
    </Button>
  );
}
```

## Workflow

1. **Identify** — Scan the codebase using the audit command above, or catch emoji during code review
2. **Map** — Use the icon mapping table to find the correct `lucide-react` component
3. **Import** — Add the named import from `lucide-react` (e.g., `import { Search } from "lucide-react"`)
4. **Replace** — Swap the emoji character for the `<Icon />` JSX element, typically with a size class like `className="h-4 w-4"`
5. **Verify** — Re-run the audit command to confirm no violations remain
