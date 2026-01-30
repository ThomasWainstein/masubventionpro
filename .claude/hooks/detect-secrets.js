#!/usr/bin/env node
/**
 * SECRETS DETECTION HOOK - Blocks Claude from hardcoding API keys
 * Runs after Write/Edit operations and blocks if secrets are detected.
 */

const SECRET_PATTERNS = [
  // Supabase JWT service role keys (base64 "role":"service_role")
  {
    pattern: /eyJ[A-Za-z0-9_-]+cm9sZSI6InNlcnZpY2Vfcm9sZSI[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    description: 'Supabase SERVICE_ROLE key (use process.env.SUPABASE_SERVICE_ROLE_KEY)'
  },

  // Stripe live keys
  {
    pattern: /sk_live_[A-Za-z0-9]{20,}/g,
    description: 'Stripe LIVE secret key (use process.env.STRIPE_SECRET_KEY)'
  },
  {
    pattern: /rk_live_[A-Za-z0-9]{20,}/g,
    description: 'Stripe LIVE restricted key'
  },

  // Stripe test keys (still shouldn't hardcode)
  {
    pattern: /sk_test_[A-Za-z0-9]{20,}/g,
    description: 'Stripe TEST secret key (use environment variable)'
  },

  // AWS credentials
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: 'AWS Access Key ID'
  },

  // GitHub tokens
  {
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    description: 'GitHub Personal Access Token'
  },
  {
    pattern: /gho_[A-Za-z0-9]{36}/g,
    description: 'GitHub OAuth Token'
  },

  // OpenAI/Anthropic API keys
  {
    pattern: /sk-[A-Za-z0-9]{48}/g,
    description: 'OpenAI API key'
  },
  {
    pattern: /sk-ant-[A-Za-z0-9-]{20,}/g,
    description: 'Anthropic API key'
  },

  // Private keys
  {
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY/g,
    description: 'Private key block'
  }
];

// Files/patterns to skip
const SKIP_PATTERNS = [
  '.env',
  '.env.local',
  '.env.example',
  'detect-secrets',
  'SECURITY-NOTICE',
  '/migrations/',
  '.mcp.json'  // MCP config may need keys
];

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function checkForSecrets(content, filePath) {
  if (shouldSkipFile(filePath)) {
    return [];
  }

  const findings = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip if line uses environment variable
    if (line.includes('process.env') || line.includes('os.environ') || line.includes('$env:') || line.includes('Deno.env')) {
      continue;
    }

    for (const { pattern, description } of SECRET_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;

      if (pattern.test(line)) {
        findings.push({
          line: lineNum + 1,
          type: description,
          preview: line.length > 80 ? line.substring(0, 80) + '...' : line
        });
      }
    }
  }

  return findings;
}

async function main() {
  let inputData = '';

  // Read from stdin
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(inputData);
  } catch (e) {
    process.exit(0); // If no valid input, allow
  }

  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};

  // Only check Write and Edit tools
  if (!['Write', 'Edit'].includes(toolName)) {
    process.exit(0);
  }

  const filePath = toolInput.file_path || '';
  const content = toolInput.content || toolInput.new_string || '';

  if (!content) {
    process.exit(0);
  }

  const findings = checkForSecrets(content, filePath);

  if (findings.length > 0) {
    console.error('='.repeat(60));
    console.error('BLOCKED: HARDCODED SECRETS DETECTED');
    console.error('='.repeat(60));
    console.error(`\nFile: ${filePath}\n`);

    for (const finding of findings) {
      console.error(`Line ${finding.line}: ${finding.type}`);
      console.error(`  ${finding.preview}\n`);
    }

    console.error('-'.repeat(60));
    console.error('FIX: Use environment variables instead:');
    console.error('  JS/TS: process.env.YOUR_SECRET_NAME');
    console.error('  Deno: Deno.env.get("YOUR_SECRET_NAME")');
    console.error('  Shell: $YOUR_SECRET_NAME');
    console.error('-'.repeat(60));

    // Exit code 2 = block and show error to Claude
    process.exit(2);
  }

  // Exit code 0 = allow
  process.exit(0);
}

main();
