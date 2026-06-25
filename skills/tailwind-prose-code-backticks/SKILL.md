---
name: tailwind-prose-code-backticks
description: Debug and fix spurious backtick characters around inline <code> elements in prose-styled markdown previews (ReactMarkdown + @tailwindcss/typography)
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Diagnose and fix extraneous backtick (`` ` ``) characters appearing around inline code (`` `<code>` ``) in `prose`-styled ReactMarkdown previews
- Explain the root cause: `@tailwindcss/typography` adds `::before` and `::after` pseudo-elements to `<code>` elements that render literal backtick characters
- Provide the exact CSS utility classes needed to suppress the pseudo-elements

## When to use me
Use when:
- You see literal backtick characters (`\``) appearing around inline code blocks in a Tailwind `prose`-wrapped container
- A ReactMarkdown (or similar) preview shows `\``Ctrl + S`\`` instead of just `Ctrl + S`
- You're debugging why `<code>` elements have unexpected characters that aren't in the source Markdown
- You're adding a new `prose`-styled markdown preview component and want to prevent this issue

## Root Cause

The `@tailwindcss/typography` plugin (via its `prose` class) adds the following CSS pseudo-elements to all `<code>` elements:

```css
code::before {
  content: "`";
}
code::after {
  content: "`";
}
```

This is intentional — it's a typographic convention to visually distinguish inline code from surrounding text. However, when rendering Markdown that **already** contains backtick-delimited inline code (e.g., `` `Ctrl + S` `` in Markdown source), the rendered `<code>` element gets these pseudo-elements **on top of** the already-rendered code content, resulting in **double** backticks: `` ` ``Ctrl + S`` ` ``.

## How to Detect

1. **Open Browser DevTools** (F12 / Cmd+Option+I)
2. **Inspect the `<code>` element** that has the spurious backticks
3. Switch to the **Computed Styles** panel
4. Look for the `::before` and `::after` pseudo-elements in the styles list
5. Verify they have `content: "`"` — this confirms the root cause

## How to Fix

### Option 1: Utility classes on the prose container (recommended)

Add these classes to any element that has the `prose` class:

```tsx
// Before (broken — shows extra backticks)
<div className="prose prose-sm max-w-none">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>

// After (fixed — no extra backticks)
<div className="prose prose-sm max-w-none prose-code:before:content-none prose-code:after:content-none">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

The utilities `prose-code:before:content-none` and `prose-code:after:content-none` are Tailwind v3 arbitrary value variants that generate:

```css
.prose code::before {
  content: none;
}
.prose code::after {
  content: none;
}
```

### Option 2: Custom CSS (alternative)

Add to your global CSS or component-level style:

```css
.prose code::before,
.prose code::after {
  content: none !important;
}
```

## Affected Components

In this project, the following components were affected:

| Component | File | Usage |
|---|---|---|
| `NoteEditor` (preview pane) | `src/components/notes/NoteEditor.tsx` | Renders markdown note content |
| `AIMessage` (chat message) | `src/components/ai-chat/AIMessage.tsx` | Renders AI chat responses |

Any component that wraps `<ReactMarkdown>` (or similar) inside a `prose` container is susceptible.

## Prevention Checklist

When adding a new markdown preview component, always:

1. ✅ Wrap in a `prose` container for typography styling
2. ✅ **Add** `prose-code:before:content-none prose-code:after:content-none`
3. ✅ Verify in DevTools that no `::before`/`::after` pseudo-elements appear on `<code>`
4. ✅ Test with inline code that includes special characters (e.g., `` `Ctrl + S` ``, `` `git commit -m` ``)

## Workflow

1. **Observe** — User reports or you notice extra backtick characters around inline code in a prose-styled markdown preview
2. **Diagnose** — Inspect the `<code>` element in browser DevTools → check `::before`/`::after` pseudo-elements
3. **Confirm** — Verify the pseudo-elements have `content: "`"` (a literal backtick character)
4. **Fix** — Add `prose-code:before:content-none prose-code:after:content-none` to the `className` of the prose container
5. **Verify** — Rebuild and confirm the backticks are gone
6. **Audit** — Check for other `prose` containers in the codebase that may have the same issue (grep for `className.*prose` in `.tsx` files)