# AI Privacy Policy Analyzer

A Chrome extension that automatically detects and analyzes privacy policies and terms of service on websites using Cloudflare Workers AI (Llama 3.3). Makes legal documents accessible and understandable for everyday users.

## Features

### 🔍 Automatic Detection
- Detects privacy policy and terms of service links on any webpage
- Shows visual indicators when policies are found
- Smart pattern recognition for various policy link formats

### 🤖 AI-Powered Analysis
- Uses Llama 3.3 via Cloudflare Workers AI for intelligent analysis
- Provides executive summaries, risk assessments, and key points
- Identifies red flags and compliance issues
- Color-coded risk scoring (Green/Yellow/Red)

### 🚀 User-Friendly Interface
- Clean popup interface with expandable sections
- One-click analysis of detected policies
- Detailed results with actionable recommendations
- Settings page for customization

### ☁️ Cloudflare Backend
- Serverless API endpoints for policy analysis
- Durable Objects for caching and state management
- Workflows for multi-step analysis orchestration

## Installation

### Chrome Extension

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension/` directory
5. The extension should now be installed and active

### Cloudflare Backend

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler auth login`
3. Navigate to `cloudflare-backend/`
4. Install dependencies: `npm install`
5. Start development server: `npm run dev`

## Usage

1. **Browse websites** - The extension automatically scans for privacy policies
2. **Click the extension icon** when policies are detected (badge appears)
3. **Select a policy** from the detected list or analyze the current page
4. **Review the AI analysis** including risk score, key points, and recommendations

## Project Structure

```
privacy-policy-analyzer/
├── extension/                 # Chrome extension files
│   ├── manifest.json         # Extension manifest (v3)
│   ├── background/           # Service worker
│   ├── content/              # Content scripts for detection
│   ├── popup/                # Extension popup UI
│   ├── options/              # Settings page
│   └── assets/               # Icons and static assets
├── cloudflare-backend/       # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.js          # Main worker
│   │   ├── workflows/        # Analysis workflows
│   │   ├── durable-objects/  # Caching and state
│   │   └── api/              # API endpoints
│   └── wrangler.toml         # Cloudflare config
├── AGENTS.md                 # Guidelines for AI coding agents
├── package.json              # Project dependencies
└── README.md                 # This file
```

## Development

### Prerequisites
- Node.js 18+
- Chrome browser
- Cloudflare account (for backend deployment)

### Setup
```bash
# Install dependencies
npm install

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm test
```

## Architecture

### Chrome Extension
- **Manifest V3** for modern extension standards
- **Content Script** scans pages for policy links
- **Service Worker** manages communication and caching
- **Popup UI** provides the main user interface

### Cloudflare Backend
- **Workers** handle API requests and AI integration
- **Durable Objects** cache analysis results
- **Workflows** orchestrate multi-step analysis
- **Workers AI** provides Llama 3.3 model access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure code passes linting and formatting
5. Submit a pull request

## Privacy & Security

This extension is designed with privacy in mind:
- All analysis happens server-side via Cloudflare
- No user data is stored locally
- Policies are cached temporarily for performance
- Users have full control over analysis settings

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions:
- Open an issue on GitHub
- Check the AGENTS.md file for development guidelines
- Review the Cloudflare Workers documentation

---

**Built with ❤️ using Cloudflare Workers AI**