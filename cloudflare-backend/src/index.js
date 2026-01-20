/**
 * Main Cloudflare Worker for Privacy Policy Analyzer
 * Routes API requests and handles core functionality
 */

import { handleAnalyze } from './api/analyze.js';
import { handleDetect } from './api/detect.js';
import { handleResults } from './api/results.js';
import { handleHealth } from './api/health.js';
import { PolicyCache } from './durable-objects/policy-cache.js';
import { UserSession } from './durable-objects/user-session.js';
import { validateExtensionRequest } from './utils/validation.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Basic security checks
      const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

      // Log suspicious patterns (for monitoring)
      if (request.url.includes('admin') || request.url.includes('config') || request.url.includes('debug')) {
        console.log('Suspicious request pattern from IP:', clientIP);
      }

      // Enable CORS for Chrome extension
      const corsHeaders = {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Version',
        'Access-Control-Max-Age': '86400',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Only allow POST for analyze endpoint, GET for others
      const allowedMethods = ['GET', 'POST'];
      if (!allowedMethods.includes(request.method)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const url = new URL(request.url);

      // Health endpoint is public
      if (url.pathname === '/api/health') {
        return handleHealth(request, env, ctx);
      }

      // Content-Type validation for POST requests
      if (request.method === 'POST') {
        const contentType = request.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Content-Type must be application/json'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Request size limit (prevent abuse)
        const contentLength = parseInt(request.headers.get('Content-Length') || '0');
        if (contentLength > 1024 * 10) { // 10KB limit
          return new Response(JSON.stringify({
            success: false,
            error: 'Request too large'
          }), {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // Validate extension request
      const extensionValidation = validateExtensionRequest(request, env);
      if (!extensionValidation.valid) {
        console.log('Extension validation failed from IP:', clientIP, 'Error:', extensionValidation.error);
        return new Response(JSON.stringify({
          success: false,
          error: extensionValidation.error
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Route to appropriate handler
      switch (url.pathname) {
        case '/api/analyze':
          return handleAnalyze(request, env, ctx);
        case '/api/detect':
          return handleDetect(request, env, ctx);
        case '/api/results':
          return handleResults(request, env, ctx);
        default:
          return new Response(JSON.stringify({
            success: false,
            error: 'Endpoint not found',
            available: ['/api/analyze', '/api/detect', '/api/results', '/api/health']
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

/**
 * Handle cron triggers for cleanup tasks
 */
export async function scheduled(event, env, ctx) {
  console.log('Running scheduled cleanup task');

  try {
    // Clean up old cache entries
    const cacheId = env.POLICY_CACHE.idFromName('global-cache');
    const cacheStub = env.POLICY_CACHE.get(cacheId);

    await cacheStub.fetch('https://internal/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttlMinutes: env.ANALYSIS_CACHE_TTL_MINUTES || 30 })
    });

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Scheduled task error:', error);
  }
}

// Export Durable Objects
export { PolicyCache, UserSession };