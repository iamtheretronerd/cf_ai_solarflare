/**
 * Policy Analyzer using Cloudflare Workers AI
 * Analyzes privacy policies with Llama 3.3
 */

export class PolicyAnalyzer {
  constructor(env) {
    this.env = env;
    this.model = env.LLAMA_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    this.maxTokens = env.MAX_TOKENS || 4096;
    this.temperature = env.TEMPERATURE || 0.1;
  }

  async analyzePolicy(url, type = 'privacy', options = {}) {
    try {
      // Step 1: Fetch policy content
      console.log(`Fetching policy content from: ${url}`);
      const content = await this.fetchPolicyContent(url);

      // Step 2: Preprocess content
      const processedContent = this.preprocessContent(content, type);

      // Step 3: Chunk content for analysis
      const chunks = this.chunkContent(processedContent);

      // Step 4: Analyze with AI
      const analysis = await this.performAIAnalysis(chunks, type, options);

      // Step 5: Calculate risk scores
      const riskScores = this.calculateRiskScores(analysis);

      return {
        url,
        type,
        contentLength: content.length,
        processedLength: processedContent.length,
        chunksAnalyzed: chunks.length,
        analysis,
        riskScores,
        timestamp: Date.now(),
        version: '1.0.0'
      };

    } catch (error) {
      console.error('Policy analysis error:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  async fetchPolicyContent(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Privacy-Policy-Analyzer/1.0 (+https://github.com/your-repo)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch policy: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('URL does not appear to contain HTML content');
    }

    const html = await response.text();

    // Extract text content from HTML
    return this.extractTextFromHtml(html);
  }

  extractTextFromHtml(html) {
    // Remove script and style elements
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  preprocessContent(content, type) {
    // Remove common navigation/footer text that might interfere with analysis
    const filters = [
      /cookie settings?/i,
      /accept all cookies/i,
      /privacy preferences/i,
      /manage cookies/i,
      /© \d{4}/i,
      /all rights reserved/i,
      /contact us/i,
      /about us/i
    ];

    let processed = content;
    filters.forEach(filter => {
      processed = processed.replace(filter, '');
    });

    // Focus on relevant sections based on type
    if (type === 'privacy') {
      // Keep sections related to data collection, usage, sharing
      const privacyKeywords = ['data collection', 'information we collect', 'how we use', 'data sharing', 'your rights'];
      // This is a simplified approach - in production, you'd use more sophisticated section detection
    }

    return processed.trim();
  }

  chunkContent(content, maxChunkSize = 2000) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50);
  }

  async performAIAnalysis(chunks, type, options) {
    const analysis = {
      executiveSummary: '',
      keyPoints: [],
      redFlags: [],
      recommendations: [],
      compliance: {},
      sections: []
    };

    // Analyze first few chunks to get overview
    const sampleChunks = chunks.slice(0, 3);

    for (const chunk of sampleChunks) {
      try {
        const chunkAnalysis = await this.analyzeChunk(chunk, type);
        analysis.sections.push(chunkAnalysis);

        // Aggregate findings
        if (chunkAnalysis.keyPoints) {
          analysis.keyPoints.push(...chunkAnalysis.keyPoints);
        }
        if (chunkAnalysis.redFlags) {
          analysis.redFlags.push(...chunkAnalysis.redFlags);
        }
        if (chunkAnalysis.compliance) {
          Object.assign(analysis.compliance, chunkAnalysis.compliance);
        }
      } catch (error) {
        console.error('Chunk analysis error:', error);
      }
    }

    // Generate summary analysis
    try {
      const summaryAnalysis = await this.generateSummaryAnalysis(analysis, type);
      analysis.executiveSummary = summaryAnalysis.executiveSummary;
      analysis.recommendations = summaryAnalysis.recommendations;
    } catch (error) {
      console.error('Summary analysis error:', error);
      analysis.executiveSummary = 'Unable to generate summary analysis.';
      analysis.recommendations = ['Review the policy manually'];
    }

    // Limit arrays to prevent excessive size
    analysis.keyPoints = analysis.keyPoints.slice(0, 10);
    analysis.redFlags = analysis.redFlags.slice(0, 5);
    analysis.recommendations = analysis.recommendations.slice(0, 5);

    return analysis;
  }

  async analyzeChunk(chunk, type) {
    const systemPrompt = `You are an expert privacy compliance auditor. Analyze the following ${type} policy text and provide structured findings in JSON format. Focus on user rights, data practices, and compliance issues.`;

    const userPrompt = `Analyze this ${type} policy excerpt:

"${chunk}"

Return JSON with:
{
  "keyPoints": ["array of 2-3 most important points"],
  "redFlags": ["array of concerning practices, if any"],
  "compliance": {
    "gdpr": "compliant/partially/non-compliant",
    "ccpa": "compliant/partially/non-compliant",
    "other": "any other compliance mentions"
  },
  "userRights": ["mentioned user rights or lack thereof"]
}`;

    try {
      const response = await this.env.AI.run(this.model, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const result = JSON.parse(response.response);
      return result;

    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        keyPoints: ['Unable to analyze this section'],
        redFlags: [],
        compliance: { gdpr: 'unknown', ccpa: 'unknown' },
        userRights: []
      };
    }
  }

  async generateSummaryAnalysis(analysis, type) {
    const systemPrompt = 'You are a privacy policy expert. Create a concise executive summary and recommendations.';

    const userPrompt = `Based on this analysis of a ${type} policy:

Key Points: ${analysis.keyPoints.join(', ')}
Red Flags: ${analysis.redFlags.join(', ')}
Compliance: ${JSON.stringify(analysis.compliance)}

Provide:
1. A 2-3 sentence executive summary
2. 3-5 actionable recommendations for users

Return as JSON: {"executiveSummary": "...", "recommendations": ["...", "..."]}`;

    try {
      const response = await this.env.AI.run(this.model, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: this.temperature
      });

      return JSON.parse(response.response);

    } catch (error) {
      console.error('Summary generation error:', error);
      return {
        executiveSummary: 'Analysis completed with limited AI processing.',
        recommendations: ['Review the full policy text', 'Consult with a privacy expert if needed']
      };
    }
  }

  calculateRiskScores(analysis) {
    // Simple risk scoring algorithm
    let regulatoryRisk = 'green';
    let transparencyRisk = 'green';
    let userRightsRisk = 'green';

    // Check for red flags
    if (analysis.redFlags && analysis.redFlags.length > 0) {
      regulatoryRisk = 'red';
      transparencyRisk = 'yellow';
    }

    // Check compliance
    if (analysis.compliance) {
      if (analysis.compliance.gdpr === 'non-compliant' || analysis.compliance.ccpa === 'non-compliant') {
        regulatoryRisk = 'red';
      } else if (analysis.compliance.gdpr === 'partially' || analysis.compliance.ccpa === 'partially') {
        regulatoryRisk = 'yellow';
      }
    }

    // Check user rights
    const hasUserRights = analysis.sections.some(section =>
      section.userRights && section.userRights.length > 0
    );

    if (!hasUserRights) {
      userRightsRisk = 'yellow';
    }

    // Overall risk is the highest of the three
    const risks = [regulatoryRisk, transparencyRisk, userRightsRisk];
    const overallRisk = risks.includes('red') ? 'red' : risks.includes('yellow') ? 'yellow' : 'green';

    return {
      overall: overallRisk,
      regulatory: regulatoryRisk,
      transparency: transparencyRisk,
      userRights: userRightsRisk
    };
  }
}