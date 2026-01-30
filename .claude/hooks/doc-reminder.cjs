#!/usr/bin/env node
/**
 * DOCUMENTATION REMINDER HOOK
 * Reminds Claude to update docs when creating certain file types.
 * Runs as PreToolUse hook on Write operations.
 *
 * Exit codes:
 * - 0: Allow with reminder (stdout becomes context)
 * - 2: Block (not used here - we just remind)
 */

const DOC_REQUIREMENTS = [
  {
    pattern: /supabase[\/\\]functions[\/\\]([^\/\\]+)[\/\\]index\.ts$/,
    reminder: `
DOCUMENTATION REMINDER: You are creating a new Edge Function.
After creation, you MUST:
1. Add to supabase/config.toml with correct verify_jwt setting
2. Add to supabase/functions/README.md
3. Deploy with: npx supabase functions deploy [name]
`
  },
  {
    pattern: /src[\/\\]contexts?[\/\\].*Context\.tsx$/,
    reminder: `
DOCUMENTATION REMINDER: You are creating a new React Context.
After creation, consider adding to project documentation.
`
  },
  {
    pattern: /src[\/\\]services[\/\\][^\/\\]+\.ts$/,
    reminder: `
DOCUMENTATION REMINDER: You are creating a new Service.
After creation, consider documenting the API.
`
  },
  {
    pattern: /src[\/\\]hooks[\/\\]use[^\/\\]+\.ts$/,
    reminder: `
DOCUMENTATION REMINDER: You are creating a new React Hook.
Consider adding JSDoc comments for usage examples.
`
  }
];

async function main() {
  let inputData = '';

  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(inputData);
  } catch (e) {
    process.exit(0);
  }

  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};

  // Only check Write tool (new files)
  if (toolName !== 'Write') {
    process.exit(0);
  }

  const filePath = toolInput.file_path || '';

  for (const { pattern, reminder } of DOC_REQUIREMENTS) {
    if (pattern.test(filePath)) {
      // Output reminder to stdout - it becomes context for Claude
      console.log(reminder);
      process.exit(0);
    }
  }

  process.exit(0);
}

main();
