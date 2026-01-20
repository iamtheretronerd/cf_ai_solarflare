/**
 * Detect API endpoint
 * Validates if a URL contains policy content
 */

import { validatePolicyUrl } from '../utils/validation.js';

export async function handleDetect(request, env, ctx) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic URL validation
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

    // Simple heuristic check - fetch and look for policy keywords
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Privacy-Policy-Analyzer/1.0'
        }
      });

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unable to fetch URL'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const content = await response.text();
      const contentType = response.headers.get('content-type') || '';

      // Check if it's HTML
      if (!contentType.includes('text/html')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'URL does not appear to be an HTML page'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Look for privacy policy indicators
      const policyIndicators = [
        /privacy\s+policy/i,
        /terms\s+of\s+service/i,
        /terms\s+and\s+conditions/i,
        /data\s+privacy/i,
        /cookie\s+policy/i
      ];

      const hasPolicyContent = policyIndicators.some(pattern =>
        pattern.test(content)
      );

      return new Response(JSON.stringify({
        success: true,
        isPolicy: hasPolicyContent,
        url: url,
        contentLength: content.length,
        indicators: policyIndicators.map(p => p.source).filter(p =>
          new RegExp(p, 'i').test(content)
        )
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch URL',
        details: fetchError.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Detect API error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Detection failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}