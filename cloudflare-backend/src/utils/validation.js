/**
 * Utility functions for validation and rate limiting
 */

/**
 * Validates if a URL is properly formatted and safe
 */
export function validatePolicyUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }

    // Check hostname (basic validation)
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      throw new Error('URL must have a valid hostname');
    }

    // Block localhost/private IPs for security
    const privateIpPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^fc00:/,
      /^fe80:/
    ];

    if (privateIpPatterns.some(pattern => pattern.test(parsedUrl.hostname))) {
      throw new Error('Private/localhost URLs are not allowed');
    }

    return parsedUrl.href;

  } catch (error) {
    if (error instanceof Error && error.message.includes('URL')) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Simple rate limiting implementation
 * In production, consider using a more robust solution
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, env) {
  const now = Date.now();
  const windowMs = (env.RATE_LIMIT_WINDOW_MINUTES || 1) * 60 * 1000;
  const maxRequests = env.RATE_LIMIT_REQUESTS_PER_MINUTE || 10;

  const userRequests = rateLimitStore.get(identifier) || [];

  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }

  // Add current request
  validRequests.push(now);
  rateLimitStore.set(identifier, validRequests);

  // Clean up old entries periodically (simple implementation)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupRateLimitStore(now, windowMs);
  }
}

function cleanupRateLimitStore(now, windowMs) {
  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(time => now - time < windowMs);
    if (validRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validRequests);
    }
  }
}

/**
 * Sanitizes text content for safe processing
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove excessive whitespace
  let sanitized = text.replace(/\s+/g, ' ').trim();

  // Limit length to prevent abuse
  const maxLength = 100000; // 100KB
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Extracts domain from URL for categorization
 */
export function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks if content appears to be a privacy policy
 */
export function isLikelyPolicyContent(text) {
  const policyIndicators = [
    /privacy\s+policy/i,
    /terms\s+of\s+service/i,
    /terms\s+and\s+conditions/i,
    /data\s+privacy/i,
    /information\s+we\s+collect/i,
    /how\s+we\s+use\s+your\s+information/i,
    /your\s+rights/i,
    /cookie\s+policy/i,
    /data\s+processing/i
  ];

  const matches = policyIndicators.filter(pattern => pattern.test(text));
  return matches.length >= 2; // Require at least 2 matches
}

/**
 * Generates a simple hash for caching keys
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validates extension origin and metadata
 */
export function validateExtensionRequest(request, env) {
  // Check CORS origin (already handled by CORS headers)
  const origin = request.headers.get('Origin');
  if (origin && !origin.startsWith('chrome-extension://')) {
    return { valid: false, error: 'Invalid origin' };
  }

  // Check User-Agent for extension signature
  const userAgent = request.headers.get('User-Agent') || '';
  if (!userAgent.includes('Chrome') && !userAgent.includes('Extension')) {
    // Allow for testing, but log suspicious requests
    console.log('Suspicious User-Agent:', userAgent);
  }

  // Check for extension-specific headers
  const extensionVersion = request.headers.get('X-Extension-Version');

  // Require extension version header (added by our extension)
  if (!extensionVersion) {
    return { valid: false, error: 'Extension authentication required' };
  }

  // Validate extension version format (basic check)
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!versionPattern.test(extensionVersion)) {
    return { valid: false, error: 'Invalid extension version' };
  }

  return { valid: true };
}