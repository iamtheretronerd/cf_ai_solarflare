# AI Privacy Policy Analyzer - Agent Guidelines

## Project Overview

This is a Chrome extension that automatically detects and analyzes privacy policies using Cloudflare Workers AI (Llama 3.3). The project consists of:

- **Frontend**: Chrome Extension (Manifest V3) with content scripts, popup UI, and background worker
- **Backend**: Cloudflare Workers with Durable Objects, Workflows, and Workers AI
- **Tech Stack**: JavaScript, TailwindCSS, Cloudflare infrastructure

## Build/Lint/Test Commands

### Chrome Extension

```bash
# Install dependencies (if using npm)
npm install

# Build for development
npm run build:dev

# Build for production
npm run build:prod

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm test

# Run single test file
npm test -- path/to/test/file.test.js

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Load extension in Chrome (manual process)
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ directory
```

### Cloudflare Backend

```bash
# Navigate to backend directory
cd cloudflare-backend

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler auth login

# Start development server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Run tests
npm test

# Run single test
npm test -- src/__tests__/specific-test.test.js

# Lint code
npm run lint

# Type check (if using TypeScript)
npm run type-check

# Format code
npm run format
```

### Combined Development

```bash
# Start both frontend and backend in development
npm run dev:all

# Run all tests (extension + backend)
npm run test:all

# Build everything for production
npm run build:all
```

## Code Style Guidelines

### JavaScript/TypeScript Standards

#### Imports
```javascript
// Group imports: React/3rd party first, then local
import React, { useState, useEffect } from 'react';
import { fetch } from '@cloudflare/workers';
import { analyzePolicy } from '../utils/analysis';
import { POLICY_PATTERNS } from '../constants';

// Avoid wildcard imports
// ✗ import * as utils from '../utils';
// ✓ import { analyzePolicy, formatResult } from '../utils';
```

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userPreferences = {};
function analyzePolicyContent() {}

// Components: PascalCase
function PrivacyPopup() {}

// Constants: UPPER_SNAKE_CASE
const API_TIMEOUT = 30000;
const POLICY_KEYWORDS = ['privacy', 'terms'];

// Files: kebab-case for components, camelCase for utilities
// ✓ privacy-popup.js, policy-analyzer.js
// ✓ utils/analysisHelpers.js, constants/policyPatterns.js
```

#### Async/Await Patterns
```javascript
// Always use async/await over Promises
async function fetchPolicyAnalysis(url) {
  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Policy analysis failed:', error);
    throw new Error('Failed to analyze privacy policy');
  }
}
```

### React/Vue Components (if used)

#### Component Structure
```javascript
function PrivacyAnalysis({ policy, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const analysis = await analyzePolicy(policy.url);
      setResults(analysis);
      onComplete(analysis);
    } catch (error) {
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="privacy-analysis">
      {/* Component JSX */}
    </div>
  );
}
```

#### Props and State
```javascript
// Use descriptive prop names
// ✓ <PolicyCard policy={policy} showDetails={true} onAnalyze={handleAnalyze} />
// ✗ <Card p={policy} sd={true} oa={handleAnalyze} />

// Destructure props at the top
function PolicyCard({ policy, showDetails, onAnalyze }) {
  // Use destructuring
}
```

### Cloudflare Workers Specific

#### Worker Structure
```javascript
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      switch (url.pathname) {
        case '/api/analyze':
          return handleAnalyze(request, env);
        case '/api/results':
          return handleResults(request, env);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};
```

#### Durable Objects
```javascript
export class PolicyCache {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/store') {
      return this.handleStore(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  async handleStore(request) {
    const data = await request.json();
    await this.state.storage.put(`policy:${data.url}`, data.result);
    return new Response('Stored', { status: 200 });
  }
}
```

### Error Handling

#### Try/Catch Patterns
```javascript
// Always handle errors appropriately
async function processPolicy(url) {
  try {
    const content = await fetchPolicyContent(url);
    const analysis = await analyzeWithAI(content);
    return formatResults(analysis);
  } catch (error) {
    // Log error for debugging
    console.error('Policy processing failed:', error);

    // Re-throw with context
    throw new Error(`Failed to process policy at ${url}: ${error.message}`);
  }
}

// Handle user-facing errors gracefully
function displayError(error) {
  const message = error.message || 'An unexpected error occurred';
  showNotification(message, 'error');
}
```

#### Validation
```javascript
function validatePolicyUrl(url) {
  if (!url) {
    throw new Error('Policy URL is required');
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsedUrl.href;
  } catch {
    throw new Error('Invalid URL format');
  }
}
```

### Formatting and Linting

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### ESLint Configuration
```javascript
module.exports = {
  extends: ['eslint:recommended', '@cloudflare/eslint-config-worker'],
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  env: {
    browser: true,
    es2021: true
  }
};
```

### Testing Guidelines

#### Unit Tests
```javascript
// Use descriptive test names
describe('PolicyDetector', () => {
  describe('analyzeLink()', () => {
    it('should identify privacy policy links', () => {
      const link = { href: '/privacy-policy', textContent: 'Privacy Policy' };
      const result = analyzeLink(link);

      expect(result).toBeDefined();
      expect(result.type).toBe('privacy');
    });

    it('should return null for non-policy links', () => {
      const link = { href: '/about', textContent: 'About Us' };
      const result = analyzeLink(link);

      expect(result).toBeNull();
    });
  });
});
```

#### Integration Tests
```javascript
describe('Privacy Analysis Flow', () => {
  it('should analyze a complete privacy policy', async () => {
    const mockPolicy = {
      url: 'https://example.com/privacy',
      content: 'Sample privacy policy text...'
    };

    const result = await analyzeCompletePolicy(mockPolicy);

    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('recommendations');
    expect(result.keyPoints).toBeInstanceOf(Array);
  });
});
```

### Security Best Practices

#### Input Validation
```javascript
// Always validate and sanitize inputs
function sanitizeHtmlContent(html) {
  // Remove script tags, event handlers, etc.
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// Validate URLs before fetching
function isValidPolicyUrl(url) {
  const allowedDomains = ['example.com', 'trusted-site.org'];
  const parsedUrl = new URL(url);
  return allowedDomains.includes(parsedUrl.hostname);
}
```

#### API Security
```javascript
// Use environment variables for secrets
const API_KEY = env.CLOUDFLARE_API_KEY;

// Implement rate limiting
const RATE_LIMIT = 100; // requests per minute
const userRequests = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute ago

  const userReqs = userRequests.get(userId) || [];
  const recentReqs = userReqs.filter(time => time > windowStart);

  if (recentReqs.length >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded');
  }

  recentReqs.push(now);
  userRequests.set(userId, recentReqs);
}
```

### Performance Guidelines

#### Code Splitting
```javascript
// Lazy load heavy analysis modules
const analyzePolicy = async (content) => {
  const { analyzeWithAI } = await import('./heavy-analysis.js');
  return analyzeWithAI(content);
};
```

#### Caching Strategy
```javascript
// Cache analysis results appropriately
const ANALYSIS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

class AnalysisCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < ANALYSIS_CACHE_TTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### Documentation Standards

#### Code Comments
```javascript
/**
 * Analyzes privacy policy content using AI
 * @param {string} content - The policy text to analyze
 * @param {Object} options - Analysis options
 * @param {boolean} options.detailed - Whether to perform detailed analysis
 * @returns {Promise<Object>} Analysis results with risk scores and recommendations
 */
async function analyzePolicyContent(content, options = {}) {
  // Implementation details...
}
```

#### API Documentation
```javascript
// API Endpoint: POST /api/analyze
// Description: Analyzes a privacy policy URL
// Request Body:
// {
//   "url": "https://example.com/privacy",
//   "options": {
//     "detailed": true
//   }
// }
// Response:
// {
//   "success": true,
//   "result": {
//     "riskScore": "medium",
//     "keyPoints": [...]
//   }
// }
```

## Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/privacy-detection`
2. **Write Tests First**: Implement tests before code
3. **Run Linter**: `npm run lint` before committing
4. **Test Locally**: Ensure extension loads and functions
5. **Commit with Message**: `git commit -m "feat: add automatic policy detection"`
6. **Create PR**: With description of changes and testing done

## Common Patterns

### Message Passing (Extension)
```javascript
// Content script to background
chrome.runtime.sendMessage({
  action: 'policiesDetected',
  data: { policies: detectedPolicies }
});

// Background to content script
chrome.tabs.sendMessage(tabId, {
  action: 'getDetectedPolicies'
});
```

### Worker Response Formatting
```javascript
// Consistent response format
return new Response(JSON.stringify({
  success: true,
  data: result,
  timestamp: Date.now()
}), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
});
```

Remember: This codebase handles sensitive privacy data. Always prioritize user privacy, data security, and transparent practices in all implementations.