/**
 * Health check API endpoint
 * Provides service status and diagnostics
 */

export async function handleHealth(request, env, ctx) {
  try {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '1.0.0',
      uptime: 'N/A', // Would need to be tracked separately
      checks: {}
    };

    // Check AI binding
    try {
      if (env.AI) {
        health.checks.ai = 'available';
      } else {
        health.checks.ai = 'unavailable';
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.ai = 'error';
      health.status = 'degraded';
    }

    // Check Durable Objects
    try {
      if (env.POLICY_CACHE && env.USER_SESSIONS) {
        health.checks.durableObjects = 'available';
      } else {
        health.checks.durableObjects = 'unavailable';
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.durableObjects = 'error';
      health.status = 'degraded';
    }

    // Check environment variables
    health.checks.environment = {
      apiBaseUrl: env.API_BASE_URL ? 'configured' : 'missing',
      allowedOrigins: env.ALLOWED_ORIGINS ? 'configured' : 'missing',
      cacheTtl: env.ANALYSIS_CACHE_TTL_MINUTES ? 'configured' : 'missing',
      rateLimit: env.RATE_LIMIT_REQUESTS_PER_MINUTE ? 'configured' : 'missing'
    };

    // Get cache stats
    try {
      const cacheId = env.POLICY_CACHE.idFromName('global-cache');
      const cacheStub = env.POLICY_CACHE.get(cacheId);

      const statsResponse = await cacheStub.fetch(`${request.url}/stats`, {
        method: 'GET'
      });

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        health.checks.cache = stats;
      } else {
        health.checks.cache = 'error';
      }
    } catch (error) {
      health.checks.cache = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(health, null, 2), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health check error:', error);

    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error.message
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}