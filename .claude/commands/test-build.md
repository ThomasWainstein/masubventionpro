# Test Build

Run build and type checks to ensure code quality before deployment.

## Usage
`/project:test-build`

## Command

```bash
# Type check
echo "=== TypeScript Check ==="
npx tsc --noEmit

# Build
echo "=== Vite Build ==="
npm run build

echo "=== Build Complete ==="
```

## What This Checks

1. **TypeScript errors** - Catches type mismatches before runtime
2. **Import errors** - Ensures all imports resolve correctly
3. **Build errors** - Vite bundling issues, missing assets, etc.

## Common Issues

- Missing type imports → Add `import type { ... }`
- Unused variables → Remove or prefix with `_`
- Missing dependencies → Run `npm install`
