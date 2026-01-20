/**
 * Options page script for Privacy Policy Analyzer
 * Manages user preferences and settings
 */

class PrivacyOptions {
  constructor() {
    this.defaults = {
      autoDetect: true,
      showBadges: true,
      detectTerms: true,
      analysisDepth: 'standard',
      cacheResults: true,
      cacheDuration: 60, // minutes
      analytics: false,
      errorReporting: true,
      policyDetected: true,
      highRiskAlert: true,
      apiEnvironment: 'production',
      apiUrl: 'https://solarflare.innotekworker.workers.dev'
    };

    // Environment presets
    this.environments = {
      production: 'https://solarflare.innotekworker.workers.dev',
      staging: 'https://staging-privacy-analyzer.workers.dev',
      development: 'http://localhost:8787',
      custom: '' // Will use custom URL input
    };

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    // Check API status on load
    setTimeout(() => this.testApiConnection(), 500);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaults);
      this.settings = result;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaults };
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings. Please try again.', 'error');
    }
  }

  setupEventListeners() {
    const form = document.getElementById('settings-form');

    // Environment selector change
    document.getElementById('api-environment').addEventListener('change', (e) => {
      this.handleEnvironmentChange(e.target.value);
    });

    // Auto-save on change
    form.addEventListener('change', (e) => {
      const target = e.target;
      const key = this.elementToSettingKey(target.id);

      if (key) {
        if (target.type === 'checkbox') {
          this.settings[key] = target.checked;
        } else if (target.type === 'select-one' && target.id !== 'api-environment') {
          this.settings[key] = target.value;
        } else if (target.type === 'url' || target.type === 'text') {
          this.settings[key] = target.value;
        }
        this.saveSettings();
      }
    });

    // Manual save button
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Test API button
    document.getElementById('test-api').addEventListener('click', (e) => {
      e.preventDefault();
      this.testApiConnection();
    });
  }

  updateUI() {
    // Update form elements with current settings
    Object.keys(this.defaults).forEach(key => {
      const elementId = this.settingKeyToElementId(key);
      const element = document.getElementById(elementId);

      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else if (element.type === 'select-one') {
          element.value = this.settings[key];
        } else if (element.type === 'url' || element.type === 'text') {
          element.value = this.settings[key];
        }
      }
    });

    // Handle environment-specific UI
    this.handleEnvironmentChange(this.settings.apiEnvironment, false); // Don't save during UI update
  }

  elementToSettingKey(elementId) {
    const mapping = {
      'auto-detect': 'autoDetect',
      'show-badges': 'showBadges',
      'detect-terms': 'detectTerms',
      'analysis-depth': 'analysisDepth',
      'cache-results': 'cacheResults',
      'cache-duration': 'cacheDuration',
      'analytics': 'analytics',
      'error-reporting': 'errorReporting',
      'policy-detected': 'policyDetected',
      'high-risk-alert': 'highRiskAlert',
      'api-environment': 'apiEnvironment',
      'api-url': 'apiUrl'
    };
    return mapping[elementId];
  }

  settingKeyToElementId(key) {
    const mapping = {
      autoDetect: 'auto-detect',
      showBadges: 'show-badges',
      detectTerms: 'detect-terms',
      analysisDepth: 'analysis-depth',
      cacheResults: 'cache-results',
      cacheDuration: 'cache-duration',
      analytics: 'analytics',
      errorReporting: 'error-reporting',
      policyDetected: 'policy-detected',
      highRiskAlert: 'high-risk-alert',
      apiEnvironment: 'api-environment',
      apiUrl: 'api-url'
    };
    return mapping[key];
  }

  async resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      this.settings = { ...this.defaults };
      await this.saveSettings();
      this.updateUI();
      this.showStatus('Settings reset to defaults!', 'success');
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message visible ${type}`;

    // Hide after 3 seconds
    setTimeout(() => {
      statusEl.classList.remove('visible');
    }, 3000);
  }

  handleEnvironmentChange(environment, save = true) {
    const customUrlSection = document.getElementById('custom-url-section');

    if (environment === 'custom') {
      customUrlSection.classList.remove('hidden');
    } else {
      customUrlSection.classList.add('hidden');
      // Set URL based on environment
      if (save) {
        this.settings.apiUrl = this.environments[environment];
        this.saveSettings();
      }
    }

    if (save) {
      this.settings.apiEnvironment = environment;
      this.saveSettings();
    }
  }

  async testApiConnection() {
    const testButton = document.getElementById('test-api');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const statusDetails = document.getElementById('status-details');

    // Set testing state
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    statusIndicator.className = 'status-indicator testing';
    statusText.textContent = 'Testing API connection...';
    statusDetails.textContent = 'Sending request to health endpoint';

    try {
      const apiUrl = this.settings.apiUrl;
      const healthUrl = `${apiUrl}/api/health`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'X-Extension-Version': chrome.runtime.getManifest().version,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          statusIndicator.className = 'status-indicator healthy';
          statusText.textContent = 'API Connected';
          statusDetails.textContent = `Healthy - ${data.checks?.ai === 'available' ? 'AI ready' : 'AI unavailable'}`;
        } else {
          throw new Error('API returned unhealthy status');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Connection Failed';
      statusDetails.textContent = error.message;
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test';
    }
  }

  getSettings() {
    return { ...this.settings };
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyOptions();
});