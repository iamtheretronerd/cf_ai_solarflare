/**
 * PolicyCache Durable Object
 * Caches analyzed privacy policies for performance
 */

export class PolicyCache {
  constructor(state) {
    this.state = state;
    this.cache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Load cache from storage
    const stored = await this.state.storage.get('cache');
    if (stored) {
      this.cache = new Map(stored);
    }

    this.initialized = true;
  }

  async fetch(request) {
    await this.initialize();

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.endsWith('/store')) {
      return this.handleStore(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/check')) {
      return this.handleCheck(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/get')) {
      return this.handleGet(request);
    }

    if (request.method === 'GET' && url.pathname.endsWith('/stats')) {
      return this.handleStats(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/cleanup')) {
      return this.handleCleanup(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  async handleStore(request) {
    try {
      const { url, result, ttlMinutes = 30 } = await request.json();

      if (!url || !result) {
        return new Response(JSON.stringify({ error: 'URL and result are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
      const cacheEntry = {
        result,
        timestamp: Date.now(),
        expiresAt,
        ttlMinutes
      };

      this.cache.set(url, cacheEntry);

      // Persist to storage
      await this.state.storage.put('cache', Array.from(this.cache.entries()));

      // Set up alarm for cleanup
      await this.state.storage.setAlarm(expiresAt);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Store error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleCheck(request) {
    try {
      const { url } = await request.json();

      if (!url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const cached = this.cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(JSON.stringify({
          result: cached.result,
          timestamp: cached.timestamp,
          expiresAt: cached.expiresAt
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });

    } catch (error) {
      console.error('Check error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleGet(request) {
    try {
      const { id, url } = await request.json();

      let cacheKey = url;
      if (id) {
        // If ID is provided, we need to find by ID (not implemented yet)
        // For now, assume URL is provided
        cacheKey = url;
      }

      if (!cacheKey) {
        return new Response(JSON.stringify({ error: 'URL or ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(JSON.stringify({
          result: cached.result,
          timestamp: cached.timestamp,
          expiresAt: cached.expiresAt
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });

    } catch (error) {
      console.error('Get error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleStats(request) {
    try {
      const stats = {
        totalEntries: this.cache.size,
        activeEntries: Array.from(this.cache.values()).filter(entry =>
          entry.expiresAt > Date.now()
        ).length,
        expiredEntries: Array.from(this.cache.values()).filter(entry =>
          entry.expiresAt <= Date.now()
        ).length,
        totalSize: JSON.stringify(Array.from(this.cache.entries())).length
      };

      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Stats error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleCleanup(request) {
    try {
      const { ttlMinutes } = await request.json();
      const cutoff = Date.now() - (ttlMinutes * 60 * 1000);

      let removed = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < cutoff) {
          this.cache.delete(key);
          removed++;
        }
      }

      // Persist updated cache
      await this.state.storage.put('cache', Array.from(this.cache.entries()));

      return new Response(JSON.stringify({
        success: true,
        removed,
        remaining: this.cache.size
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Cleanup error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async alarm() {
    // Called when alarm triggers - clean up expired entries
    console.log('Running cache cleanup alarm');

    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      await this.state.storage.put('cache', Array.from(this.cache.entries()));
      console.log(`Cleaned up ${removed} expired cache entries`);
    }

    // Set next alarm if there are still entries
    if (this.cache.size > 0) {
      const nextExpiry = Math.min(...Array.from(this.cache.values()).map(e => e.expiresAt));
      await this.state.storage.setAlarm(nextExpiry);
    }
  }
}