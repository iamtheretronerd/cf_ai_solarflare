/**
 * Popup script for AI Privacy Policy Analyzer
 * Handles user interaction and displays analysis results
 */

class PrivacyPopup {
  constructor() {
    this.currentTabId = null;
    this.detectedPolicies = [];
    this.analysisResults = null;
    this.init();
  }

  async init() {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabId = tabs[0]?.id;

      if (!this.currentTabId) {
        this.showError('Unable to access current tab');
        return;
      }

      // Check for detected policies
      await this.checkForDetectedPolicies();

      // Set up event listeners
      this.setupEventListeners();

      // Initial state
      this.updateUI();

    } catch (error) {
      console.error('Popup initialization error:', error);
      this.showError('Failed to initialize extension');
    }
  }

  async checkForDetectedPolicies() {
    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'getDetectedPolicies'
      });

      if (response && response.policies) {
        this.detectedPolicies = response.policies;
      }
    } catch (error) {
      // Content script might not be ready or available
      console.log('Content script not available:', error.message);
      this.detectedPolicies = [];
    }
  }

  setupEventListeners() {
    // Analyze button
    document.getElementById('analyze-btn').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    // Retry button
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.hideError();
      this.analyzeCurrentPage();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // View full analysis
    document.getElementById('view-full-analysis').addEventListener('click', () => {
      this.viewFullAnalysis();
    });

    // Save analysis
    document.getElementById('save-analysis').addEventListener('click', () => {
      this.saveAnalysis();
    });

    // Policy item clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.policy-item')) {
        const item = e.target.closest('.policy-item');
        const policyUrl = item.dataset.policyUrl;
        if (policyUrl) {
          this.analyzeSpecificPolicy(policyUrl);
        }
      }
    });
  }

  async analyzeCurrentPage() {
    try {
      this.showLoading();

      // Get current tab URL
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url;

      if (!currentUrl) {
        throw new Error('Unable to get current page URL');
      }

      // TODO: Replace with actual Cloudflare backend call
      const results = await this.mockAnalysis(currentUrl);

      this.analysisResults = results;
      this.showResults(results);

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(error.message || 'Analysis failed');
    }
  }

  async analyzeSpecificPolicy(policyUrl) {
    try {
      this.showLoading();

      // TODO: Replace with actual Cloudflare backend call
      const results = await this.mockAnalysis(policyUrl);

      this.analysisResults = results;
      this.showResults(results);

    } catch (error) {
      console.error('Policy analysis error:', error);
      this.showError(error.message || 'Policy analysis failed');
    }
  }

  // Mock analysis for development - replace with real API calls
  async mockAnalysis(url) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock response based on URL patterns
    const isMockGoodPolicy = url.includes('google') || url.includes('apple') || Math.random() > 0.5;

    if (isMockGoodPolicy) {
      return {
        overallRisk: 'green',
        executiveSummary: 'This privacy policy appears comprehensive and user-friendly, with clear explanations of data practices and strong user rights.',
        riskBreakdown: {
          regulatory: 'green',
          transparency: 'green',
          userRights: 'yellow'
        },
        keyPoints: [
          'Clear data collection practices',
          'Strong user consent mechanisms',
          'Regular policy updates',
          'Accessible contact information'
        ],
        redFlags: [],
        recommendations: [
          'Review cookie preferences regularly',
          'Consider data portability options',
          'Monitor for policy updates'
        ]
      };
    } else {
      return {
        overallRisk: 'red',
        executiveSummary: 'This privacy policy contains several concerning practices and lacks transparency about data handling.',
        riskBreakdown: {
          regulatory: 'red',
          transparency: 'red',
          userRights: 'red'
        },
        keyPoints: [
          'Broad data collection without clear limits',
          'Data sharing with third parties',
          'Limited user control options'
        ],
        redFlags: [
          'Data sold to third parties without clear opt-out',
          'Vague retention periods',
          'No clear data deletion process'
        ],
        recommendations: [
          'Avoid using this service if privacy is a concern',
          'Consider alternatives with better privacy practices',
          'Limit personal information shared'
        ]
      };
    }
  }

  updateUI() {
    this.updateDetectionStatus();
    this.renderDetectedPolicies();
  }

  updateDetectionStatus() {
    const statusEl = document.getElementById('detection-status');
    const policiesEl = document.getElementById('detected-policies');

    if (this.detectedPolicies.length > 0) {
      statusEl.classList.add('found');
      statusEl.classList.remove('none');
      statusEl.querySelector('.status-text').textContent = `${this.detectedPolicies.length} found`;
      policiesEl.classList.remove('hidden');
    } else {
      statusEl.classList.remove('found');
      statusEl.classList.add('none');
      statusEl.querySelector('.status-text').textContent = 'None detected';
      policiesEl.classList.add('hidden');
    }
  }

  renderDetectedPolicies() {
    const container = document.getElementById('detected-policies');
    container.innerHTML = '';

    this.detectedPolicies.forEach(policy => {
      const item = document.createElement('div');
      item.className = 'policy-item';
      item.dataset.policyUrl = policy.url;

      const typeClass = policy.type === 'privacy' ? 'policy-type-privacy' :
                       policy.type === 'terms' ? 'policy-type-terms' : 'policy-type-both';

      item.innerHTML = `
        <div class="policy-info">
          <div class="policy-name">${policy.text || 'Policy Link'}</div>
          <div class="policy-domain">${new URL(policy.url).hostname}</div>
        </div>
        <div class="policy-type-badge ${typeClass}">
          ${policy.type}
        </div>
      `;

      container.appendChild(item);
    });
  }

  showLoading() {
    this.hideAllSections();
    document.getElementById('loading-section').classList.remove('hidden');
    document.getElementById('analyze-btn').disabled = true;
  }

  hideLoading() {
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('analyze-btn').disabled = false;
  }

  showResults(results) {
    this.hideAllSections();
    document.getElementById('results-section').classList.remove('hidden');

    // Update overall risk score
    const overallEl = document.getElementById('overall-risk-score');
    overallEl.textContent = this.formatRiskScore(results.overallRisk);
    overallEl.className = `score-badge ${this.getRiskClass(results.overallRisk)}`;

    // Update executive summary
    document.getElementById('executive-summary').textContent = results.executiveSummary;

    // Update risk breakdown
    this.updateMetric('regulatory-risk', results.riskBreakdown.regulatory);
    this.updateMetric('transparency-risk', results.riskBreakdown.transparency);
    this.updateMetric('user-rights-risk', results.riskBreakdown.userRights);

    // Update key points
    this.renderList('key-points-list', results.keyPoints);

    // Update red flags
    if (results.redFlags && results.redFlags.length > 0) {
      document.getElementById('red-flags').classList.remove('hidden');
      this.renderList('red-flags-list', results.redFlags);
    } else {
      document.getElementById('red-flags').classList.add('hidden');
    }

    // Update recommendations
    this.renderList('recommendations-list', results.recommendations);
  }

  updateMetric(elementId, riskLevel) {
    const element = document.getElementById(elementId);
    element.textContent = this.formatRiskScore(riskLevel);
    element.className = `metric-value ${this.getRiskClass(riskLevel)}`;
  }

  showError(message) {
    this.hideAllSections();
    document.getElementById('error-section').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
  }

  hideError() {
    document.getElementById('error-section').classList.add('hidden');
  }

  hideAllSections() {
    ['results-section', 'loading-section', 'error-section', 'no-policies-section'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
  }

  renderList(listId, items) {
    const listEl = document.getElementById(listId);
    listEl.innerHTML = '';

    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    });
  }

  formatRiskScore(score) {
    const labels = {
      green: 'Low Risk',
      yellow: 'Medium Risk',
      red: 'High Risk',
      gray: 'Unknown'
    };
    return labels[score] || 'Unknown';
  }

  getRiskClass(score) {
    const classes = {
      green: 'low-risk',
      yellow: 'medium-risk',
      red: 'high-risk',
      gray: ''
    };
    return classes[score] || '';
  }

  viewFullAnalysis() {
    // TODO: Open detailed analysis page
    console.log('View full analysis:', this.analysisResults);
  }

  saveAnalysis() {
    // TODO: Save to local storage or send to backend
    console.log('Save analysis:', this.analysisResults);
    
    // Show a brief save confirmation
    const saveBtn = document.getElementById('save-analysis');
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Saved!</span>
    `;
    saveBtn.disabled = true;
    
    setTimeout(() => {
      saveBtn.innerHTML = originalHTML;
      saveBtn.disabled = false;
    }, 2000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyPopup();
});