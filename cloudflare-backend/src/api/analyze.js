/**
 * Analyze API endpoint
 * Handles privacy policy analysis requests using AI
 */

import { PolicyAnalyzer } from '../llm/analyzer.js';
import { PolicyCache } from '../durable-objects/policy-cache.js';
import { validatePolicyUrl, checkRateLimit } from '../utils/validation.js';

export async function handleAnalyze(request, env, ctx) {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { url, type = 'privacy', options = {} } = body;

    // Validate inputs
    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      validatePolicyUrl(url);
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting (simple implementation)
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    try {
      checkRateLimit(clientIP, env);
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const cacheId = env.POLICY_CACHE.idFromName('global-cache');
    const cacheStub = env.POLICY_CACHE.get(cacheId);

    const cacheResponse = await cacheStub.fetch(`${request.url}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (cacheResponse.status === 200) {
      const cachedData = await cacheResponse.json();
      return new Response(JSON.stringify({
        success: true,
        result: cachedData.result,
        cached: true,
        timestamp: cachedData.timestamp
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Perform analysis
    console.log(`Analyzing policy: ${url}`);

    const analyzer = new PolicyAnalyzer(env);
    const analysisResult = await analyzer.analyzePolicy(url, type, options);

    // Cache the result
    await cacheStub.fetch(`${request.url}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        result: analysisResult,
        ttlMinutes: env.ANALYSIS_CACHE_TTL_MINUTES || 30
      })
    });

    return new Response(JSON.stringify({
      success: true,
      result: analysisResult,
      cached: false,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analyze API error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Analysis failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}