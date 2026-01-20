# Privacy Policy Analyzer - Cloudflare Backend

This is the Cloudflare Workers backend for the AI-powered Privacy Policy Analyzer Chrome extension. It provides serverless API endpoints for analyzing privacy policies using Llama 3.3.

## Features

- **AI-Powered Analysis**: Uses Cloudflare Workers AI with Llama 3.3 70B model
- **Caching**: Durable Objects for high-performance result caching
- **Rate Limiting**: Built-in protection against abuse
- **User Sessions**: Track analysis history and preferences
- **CORS Support**: Configured for Chrome extension usage

## API Endpoints

### POST `/api/analyze`
Analyzes a privacy policy URL and returns AI-powered insights.

**Request Body:**
```json
{
  "url": "https://example.com/privacy-policy",
  "type": "privacy",
  "options": {
    "detailed": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "url": "https://example.com/privacy-policy",
    "type": "privacy",
    "analysis": {
      "executiveSummary": "...",
      "keyPoints": ["...", "..."],
      "redFlags": ["..."],
      "recommendations": ["..."]
    },
    "riskScores": {
      "overall": "green",
      "regulatory": "green",
      "transparency": "yellow",
      "userRights": "green"
    }
  }
}
```

### POST `/api/detect`
Validates if a URL contains policy content.

### GET `/api/results`
Retrieves cached analysis results.

### GET `/api/health`
Service health check and diagnostics.

## Setup

### Prerequisites

1. **Node.js** 18+
2. **Wrangler CLI**: `npm install -g wrangler`
3. **Cloudflare Account** with Workers AI enabled

### Installation

```bash
cd cloudflare-backend
npm install
```

### Authentication

```bash
wrangler auth login
```

### Configuration

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```env
API_BASE_URL=https://your-worker-name.your-subdomain.workers.dev
ALLOWED_ORIGINS=chrome-extension://*
ANALYSIS_CACHE_TTL_MINUTES=30
# ... other settings
```

## Deployment

### Option 1: Automated Deployment

```bash
./deploy.sh
```

This script will:
- Install dependencies
- Run tests
- Deploy to Cloudflare
- Update your `.env` file and extension configuration automatically

### Option 2: Manual Deployment

```bash
# Install dependencies
npm install

# Deploy
wrangler deploy

# Note the deployed URL and update .env file
```

## Development

### Local Development

```bash
# Start local development server
npm run dev

# The worker will be available at http://localhost:8787
```

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL of the deployed worker | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins | `chrome-extension://*` |
| `ANALYSIS_CACHE_TTL_MINUTES` | Cache duration in minutes | `30` |
| `MAX_CACHE_SIZE_MB` | Maximum cache size | `100` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Rate limit per minute | `10` |
| `LLAMA_MODEL` | AI model to use | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

## Architecture

### Components

1. **Main Worker** (`src/index.js`): Routes requests to appropriate handlers
2. **API Endpoints** (`src/api/`): Handle specific API operations
3. **Durable Objects** (`src/durable-objects/`): Provide persistent storage and caching
4. **LLM Analyzer** (`src/llm/`): AI-powered policy analysis
5. **Utilities** (`src/utils/`): Validation, rate limiting, and helpers

### Data Flow

```
Request → Worker → Rate Limit Check → Cache Check → AI Analysis → Cache Store → Response
```

### Caching Strategy

- **Policy Cache**: Stores analysis results for 30 minutes
- **User Sessions**: Tracks user history and preferences
- **Automatic Cleanup**: Removes expired entries via alarms

## Security

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Sanitizes URLs and request data
- **CORS Protection**: Restricts origins to Chrome extensions
- **Private Keys**: Never expose API keys or sensitive data

## Monitoring

### Health Checks

```bash
curl https://your-worker.workers.dev/api/health
```

Returns service status, cache statistics, and configuration info.

### Logs

View logs in the Cloudflare dashboard or via Wrangler:

```bash
wrangler tail
```

## Troubleshooting

### Common Issues

1. **"AI binding not available"**
   - Ensure Workers AI is enabled in your Cloudflare account
   - Check your billing plan supports AI requests

2. **"Rate limit exceeded"**
   - Increase `RATE_LIMIT_REQUESTS_PER_MINUTE` in environment variables
   - Implement user authentication for higher limits

3. **"Cache not working"**
   - Check Durable Objects are properly configured in `wrangler.toml`
   - Verify storage permissions

### Debug Mode

Add `?debug=true` to API requests for additional logging:

```bash
curl "https://your-worker.workers.dev/api/analyze?debug=true" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/privacy"}'
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages

## License

MIT License - see LICENSE file for details.