# Development vs Production Styling

## The Problem

Next.js processes CSS differently in development (`npm run dev`) vs production (`npm run build`). This can cause styling inconsistencies that make debugging difficult.

## Solutions

### Option 1: Use Production Build Locally (Recommended for Testing)

When you need to test production-like styling, use:

```bash
npm run dev:prod
```

This builds the production version and runs it locally, giving you the exact same styling as production.

**Note:** This is slower than `npm run dev` because it rebuilds on every change, but it's the most accurate way to test production styling.

### Option 2: Regular Dev Mode (Faster Development)

For faster development with hot reloading:

```bash
npm run dev
```

The configuration has been updated to make dev mode more production-like, but some differences may still exist due to:
- CSS optimization/minification
- Hot module replacement
- Source maps
- Different webpack processing

## What Was Changed

1. **next.config.js**: Added production-like optimizations:
   - `swcMinify: true` - Uses SWC minification (same as production)
   - CSS processing optimizations
   - Consistent webpack configuration

2. **package.json**: Added `dev:prod` script that builds and runs production locally

## When to Use Each

- **`npm run dev`**: Use for regular development when you need fast hot reloading
- **`npm run dev:prod`**: Use when you need to verify production styling or debug production-only issues

## Common Styling Differences

If you notice styling differences between dev and production:

1. **CSS Variables**: Make sure CSS variables are defined in `:root` or `.dark` (not conditionally)
2. **CSS Order**: Production minifies CSS, which can change order - use CSS specificity carefully
3. **Tailwind**: Tailwind classes should work the same, but custom CSS might differ
4. **Media Queries**: Test responsive styles in production build
5. **CSS-in-JS**: If using inline styles, they should be identical, but CSS classes might differ

## Debugging Tips

1. **Test in production build first**: If a style works in `dev:prod` but not in deployed production, it's likely an environment variable or build configuration issue
2. **Check CSS specificity**: Production CSS is minified and order might change
3. **Verify CSS variables**: Ensure all CSS variables are properly defined
4. **Test with browser dev tools**: Compare computed styles between dev and production

