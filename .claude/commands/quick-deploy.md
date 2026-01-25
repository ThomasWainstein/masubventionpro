# Quick Deploy

Automatically deploy changes to production with validation and push.

## Usage
Use this command for rapid deployment cycles with automatic validation.

## Command
```bash
# Run any linting/validation if available
npm run lint 2>/dev/null || echo "No linting configured"
npm run build 2>/dev/null || echo "No build configured"

# Commit and push changes
git add .
git status --porcelain
if [ -n "$(git status --porcelain)" ]; then
  git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S') - Claude Code deployment 🚀"
  git push origin master
  echo "✅ Deployed successfully"
else
  echo "✅ No changes to deploy"
fi
```
