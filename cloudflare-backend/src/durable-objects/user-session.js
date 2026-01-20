/**
 * UserSession Durable Object
 * Tracks user analysis history and preferences
 */

export class UserSession {
  constructor(state) {
    this.state = state;
    this.sessions = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Load sessions from storage
    const stored = await this.state.storage.get('sessions');
    if (stored) {
      this.sessions = new Map(stored);
    }

    this.initialized = true;
  }

  async fetch(request) {
    await this.initialize();

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.endsWith('/create')) {
      return this.handleCreateSession(request);
    }

    if (request.method === 'GET' && url.pathname.endsWith('/history')) {
      return this.handleGetHistory(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/update')) {
      return this.handleUpdateSession(request);
    }

    if (request.method === 'DELETE' && url.pathname.endsWith('/clear')) {
      return this.handleClearHistory(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  async handleCreateSession(request) {
    try {
      const { userId, userAgent, preferences = {} } = await request.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session = {
        userId,
        userAgent,
        preferences,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        analysisCount: 0,
        history: []
      };

      this.sessions.set(userId, session);

      // Persist to storage
      await this.state.storage.put('sessions', Array.from(this.sessions.entries()));

      return new Response(JSON.stringify({
        success: true,
        sessionId: userId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Create session error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleGetHistory(request) {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');
      const limit = parseInt(url.searchParams.get('limit')) || 10;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session = this.sessions.get(userId);
      if (!session) {
        return new Response(JSON.stringify({
          history: [],
          total: 0
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Return recent history
      const history = session.history
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return new Response(JSON.stringify({
        history,
        total: session.history.length,
        preferences: session.preferences
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Get history error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleUpdateSession(request) {
    try {
      const { userId, analysis, preferences } = await request.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session = this.sessions.get(userId);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update session
      session.lastActivity = Date.now();

      if (analysis) {
        session.analysisCount++;
        session.history.push({
          ...analysis,
          timestamp: Date.now()
        });

        // Keep only last 100 analyses
        if (session.history.length > 100) {
          session.history = session.history.slice(-100);
        }
      }

      if (preferences) {
        session.preferences = { ...session.preferences, ...preferences };
      }

      this.sessions.set(userId, session);

      // Persist to storage
      await this.state.storage.put('sessions', Array.from(this.sessions.entries()));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Update session error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleClearHistory(request) {
    try {
      const { userId } = await request.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session = this.sessions.get(userId);
      if (session) {
        session.history = [];
        session.analysisCount = 0;
        this.sessions.set(userId, session);

        // Persist to storage
        await this.state.storage.put('sessions', Array.from(this.sessions.entries()));
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Clear history error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async alarm() {
    // Clean up old sessions (older than 30 days)
    console.log('Running session cleanup alarm');

    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    let removed = 0;

    for (const [userId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(userId);
        removed++;
      }
    }

    if (removed > 0) {
      await this.state.storage.put('sessions', Array.from(this.sessions.entries()));
      console.log(`Cleaned up ${removed} old sessions`);
    }

    // Set next alarm
    await this.state.storage.setAlarm(Date.now() + (24 * 60 * 60 * 1000)); // Daily cleanup
  }
}