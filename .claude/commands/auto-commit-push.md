# Auto Commit and Push

Automatically commit all changes and push to GitHub with a descriptive commit message.

## Usage
Use this command to automatically accept all Claude changes and push them to GitHub without manual intervention.

## Command
```bash
git add .
git commit -m "$(cat <<'EOF'
Auto: Claude Code changes

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push origin master
```
