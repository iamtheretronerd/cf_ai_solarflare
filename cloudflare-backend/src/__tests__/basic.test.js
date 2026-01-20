/**
 * Basic tests for Cloudflare Worker functionality
 */

describe('API Endpoints', () => {
  test('should export handleAnalyze function', () => {
    const { handleAnalyze } = require('./src/api/analyze.js');
    expect(typeof handleAnalyze).toBe('function');
  });

  test('should export handleDetect function', () => {
    const { handleDetect } = require('./src/api/detect.js');
    expect(typeof handleDetect).toBe('function');
  });

  test('should export handleHealth function', () => {
    const { handleHealth } = require('./src/api/health.js');
    expect(typeof handleHealth).toBe('function');
  });
});

describe('Utility Functions', () => {
  test('should export validation functions', () => {
    const { validatePolicyUrl, checkRateLimit } = require('./src/utils/validation.js');
    expect(typeof validatePolicyUrl).toBe('function');
    expect(typeof checkRateLimit).toBe('function');
  });
});

describe('Durable Objects', () => {
  test('should export PolicyCache class', () => {
    const { PolicyCache } = require('./src/durable-objects/policy-cache.js');
    expect(typeof PolicyCache).toBe('constructor');
  });

  test('should export UserSession class', () => {
    const { UserSession } = require('./src/durable-objects/user-session.js');
    expect(typeof UserSession).toBe('constructor');
  });
});