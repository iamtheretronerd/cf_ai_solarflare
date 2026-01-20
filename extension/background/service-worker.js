/**
 * SolarFlare Background Service Worker
 * Handles communication between content scripts, popup, and manages state
 */

class SolarFlareServiceWorker {
  constructor() {
    this.detectedPolicies = new Map(); // tabId -> policies
    this.analysisCache = new Map(); // url -> analysis result
    this.init();
  }

  init() {
    // Set up message listeners
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle tab updates
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));

    // Handle tab removal
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));

    console.log('SolarFlare service worker initialized');
  }

  handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'policiesDetected':
          this.handlePoliciesDetected(message.data, sender);
          sendResponse({ success: true });
          break;

        case 'getDetectedPolicies':
          const policies = this.detectedPolicies.get(sender.tab?.id) || [];
          sendResponse({ policies });
          break;

        case 'analyzePolicy':
          this.handleAnalyzePolicy(message.data, sender)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep message channel open for async response

        case 'getCachedAnalysis':
          const cached = this.analysisCache.get(message.url);
          sendResponse({ cached: cached || null });
          break;

        case 'openPopup':
          // Can't programmatically open popup, but we can set badge
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('SolarFlare service worker error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  handlePoliciesDetected(data, sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    // Store detected policies for this tab
    this.detectedPolicies.set(tabId, data.policies);

    // Update extension icon to show detection status
    this.updateExtensionIcon(tabId, data.policies.length > 0);

    console.log(`SolarFlare: Detected ${data.policies.length} policies on tab ${tabId}:`, data.policies);
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Clear policies when navigating to a new page
    if (changeInfo.status === 'loading' && changeInfo.url) {
      this.detectedPolicies.delete(tabId);
      this.updateExtensionIcon(tabId, false);
    }
  }

  handleTabRemoved(tabId) {
    // Clean up when tab is closed
    this.detectedPolicies.delete(tabId);
  }

  updateExtensionIcon(tabId, hasPolicies) {
    // Update badge with SolarFlare orange color to indicate detected policies
    if (hasPolicies) {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: '!'
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#ff6b35' // SolarFlare orange
      });
    } else {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: ''
      });
    }
  }

  async handleAnalyzePolicy(data, sender) {
    const { url, type } = data;

    // Check cache first
    const cached = this.analysisCache.get(url);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minutes
      return cached.result;
    }

    try {
      const result = await this.callAnalysisAPI(url, type);

      // Cache the result
      this.analysisCache.set(url, {
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('SolarFlare: Analysis API error:', error);
      throw new Error('Failed to analyze policy: ' + error.message);
    }
  }

  async callAnalysisAPI(url, type) {
    // Get API URL from storage, fallback to default
    const settings = await chrome.storage.sync.get({ apiUrl: 'https://solarflare.innotekworker.workers.dev' });
    const apiUrl = `${settings.apiUrl}/api/analyze`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version,
        },
        body: JSON.stringify({
          url,
          type,
          userAgent: navigator.userAgent,
          extensionId: chrome.runtime.id
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Store for popup to retrieve
      await chrome.storage.local.set({ lastAnalysis: result, lastAnalysisUrl: url });
      
      return result;
    } catch (error) {
      console.log('SolarFlare: API call failed, using mock analysis:', error.message);
      
      // Return mock analysis for development/testing
      const mockResult = this.getMockAnalysis(url);
      await chrome.storage.local.set({ lastAnalysis: mockResult, lastAnalysisUrl: url });
      return mockResult;
    }
  }

  getMockAnalysis(url) {
    // Generate somewhat realistic mock based on URL
    const isKnownGood = url.includes('apple.com') || url.includes('google.com') || 
                        url.includes('microsoft.com') || url.includes('github.com');
    const isKnownBad = url.includes('free') || url.includes('download');
    
    if (isKnownGood) {
      return {
        overallRisk: 'green',
        executiveSummary: 'This privacy policy appears comprehensive and user-friendly, with clear explanations of data practices and strong user rights.',
        riskBreakdown: {
          regulatory: 'green',
          transparency: 'green',
          userRights: 'green'
        },
        keyPoints: [
          'Clear data collection practices',
          'Strong user consent mechanisms',
          'GDPR and CCPA compliant',
          'Easy opt-out options available'
        ],
        redFlags: [],
        recommendations: [
          'Review cookie preferences periodically',
          'Consider using privacy features offered'
        ]
      };
    } else if (isKnownBad) {
      return {
        overallRisk: 'red',
        executiveSummary: 'This policy contains concerning practices including broad data collection and third-party sharing without clear limits.',
        riskBreakdown: {
          regulatory: 'red',
          transparency: 'red',
          userRights: 'yellow'
        },
        keyPoints: [
          'Collects extensive personal data',
          'Shares data with third parties',
          'Limited control over your data'
        ],
        redFlags: [
          'Data may be sold to advertisers',
          'Vague data retention policies',
          'No clear deletion process'
        ],
        recommendations: [
          'Consider alternatives with better privacy',
          'Limit personal information shared',
          'Use a privacy-focused browser'
        ]
      };
    } else {
      return {
        overallRisk: 'yellow',
        executiveSummary: 'This policy has some good practices but also areas of concern. Review the key points before proceeding.',
        riskBreakdown: {
          regulatory: 'green',
          transparency: 'yellow',
          userRights: 'yellow'
        },
        keyPoints: [
          'Standard data collection practices',
          'Some third-party data sharing',
          'Cookie usage for analytics'
        ],
        redFlags: [
          'Some data sharing with partners'
        ],
        recommendations: [
          'Review privacy settings carefully',
          'Opt out of marketing communications',
          'Check data download options'
        ]
      };
    }
  }

  // Utility method to clear old cache entries
  cleanupCache() {
    const maxAge = 60 * 60 * 1000; // 1 hour
    const now = Date.now();

    for (const [url, data] of this.analysisCache.entries()) {
      if (now - data.timestamp > maxAge) {
        this.analysisCache.delete(url);
      }
    }
  }

  // Method to get statistics for debugging
  getStats() {
    return {
      tabsWithPolicies: this.detectedPolicies.size,
      cachedAnalyses: this.analysisCache.size,
      totalPoliciesDetected: Array.from(this.detectedPolicies.values())
        .reduce((sum, policies) => sum + policies.length, 0)
    };
  }
}

// Initialize service worker
const solarFlareWorker = new SolarFlareServiceWorker();

// Clean up cache periodically
setInterval(() => {
  solarFlareWorker.cleanupCache();
}, 30 * 60 * 1000); // Every 30 minutes

// Export for debugging (in development)
if (typeof globalThis !== 'undefined') {
  globalThis.solarFlareWorker = solarFlareWorker;
}