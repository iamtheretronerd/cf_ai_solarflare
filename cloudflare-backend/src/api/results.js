/**
 * Results API endpoint
 * Retrieves cached analysis results by ID
 */

export async function handleResults(request, env, ctx) {
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const resultId = url.searchParams.get('id');
    const resultUrl = url.searchParams.get('url');

    if (!resultId && !resultUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either result ID or URL parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get from cache
    const cacheId = env.POLICY_CACHE.idFromName('global-cache');
    const cacheStub = env.POLICY_CACHE.get(cacheId);

    const cacheResponse = await cacheStub.fetch(`${request.url}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: resultId,
        url: resultUrl
      })
    });

    if (cacheResponse.status === 404) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Result not found in cache'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (cacheResponse.status !== 200) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cache retrieval failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cachedData = await cacheResponse.json();

    return new Response(JSON.stringify({
      success: true,
      result: cachedData.result,
      timestamp: cachedData.timestamp,
      expiresAt: cachedData.expiresAt
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Results API error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve results',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}