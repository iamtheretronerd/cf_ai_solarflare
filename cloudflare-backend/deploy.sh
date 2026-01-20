#!/bin/bash

# Cloudflare Worker Deployment Script
# This script handles the deployment process and updates the extension configuration

set -e

echo "🚀 Starting Cloudflare Worker deployment process..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please login first:"
    echo "wrangler auth login"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🧪 Running tests..."
npm test

echo "🏗️ Building project..."
npm run build

echo "🚀 Deploying to Cloudflare..."
DEPLOY_OUTPUT=$(wrangler deploy 2>&1)

# Extract the deployed URL from wrangler output
DEPLOYED_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*\.workers\.dev' | head -1)

if [ -z "$DEPLOYED_URL" ]; then
    echo "❌ Failed to extract deployed URL from wrangler output"
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Successfully deployed!"
echo "🌐 Worker URL: $DEPLOYED_URL"

# Update the .env file with the new URL
echo "📝 Updating .env file..."
sed -i.bak "s|API_BASE_URL=.*|API_BASE_URL=$DEPLOYED_URL|" .env

# Update extension configuration
echo "🔧 Updating extension configuration..."

# Update service worker
sed -i.bak "s|https://.*workers\.dev|$DEPLOYED_URL|g" ../../extension/background/service-worker.js

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the deployed worker: curl $DEPLOYED_URL/api/health"
echo "2. Load the updated extension in Chrome"
echo "3. Test the privacy policy analysis feature"
echo ""
echo "🔒 Remember: Keep your .env file private and never commit it!"