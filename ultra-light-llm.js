/**
 * Ultra-Light LLM Service v3.2 - Improved based on testing
 *
 * Fixes:
 * - Specific output_format detection (not "clear response")
 * - Better role selection (marketing, product, etc.)
 * - Remove useless "stay focused" constraint
 * - Prompt cleaning for messy input
 * - Smarter requirements per task
 */

class UltraLightLLM {
  constructor() {
    this.pipeline = null;
    this.featureExtractor = null;
    this.classifier = null;
    this.isLoading = false;
    this.isReady = false;
  }

  // ============================================
  // SMART OUTPUT FORMAT DETECTION
  // ============================================

  detectOutputFormat(text) {
    const lower = text.toLowerCase();

    // Specific format patterns
    const formatRules = [
      // Numbered formats
      { patterns: [/(\d+)\s*benefits?/, /(\d+)\s*points?/], format: (m) => `bullet list (${m[1]} items)` },
      { patterns: [/(\d+)\s*bullet\s*points?/], format: (m) => `${m[1]} bullet points` },
      { patterns: [/(\d+)\s*paragraphs?/], format: (m) => `${m[1]} paragraphs` },
      { patterns: [/(\d+)\s*words?/], format: (m) => `~${m[1]} words` },

      // Specific structures
      { patterns: [/pros?\s*and\s*cons?/], format: () => 'two sections: pros and cons' },
      { patterns: [/headlines?/], format: () => 'headline + supporting content' },
      { patterns: [/landing\s*page/], format: () => 'headline + benefits + CTA' },
      { patterns: [/email/], format: () => 'subject line + email body' },

      // Code formats
      { patterns: [/function/, /python/, /javascript/, /code/], format: () => 'code block + explanation' },
      { patterns: [/api/, /endpoint/], format: () => 'API structure with examples' },
      { patterns: [/debug/, /fix\s*(this|the)/], format: () => 'problem analysis + solution code' },

      // Summary formats
      { patterns: [/one\s*sentence/, /single\s*sentence/], format: () => 'one sentence' },
      { patterns: [/summarize/, /summary/], format: () => 'concise paragraph' },
      { patterns: [/brief/, /short/], format: () => 'concise response' },
      { patterns: [/detailed/, /comprehensive/, /thorough/], format: () => 'detailed analysis' },

      // List formats
      { patterns: [/list/, /bullet/], format: () => 'bullet list' },
      { patterns: [/step[\s-]*by[\s-]*step/, /how\s*to/], format: () => 'step-by-step guide' },

      // Comparison
      { patterns: [/compare/, /versus/, /vs\.?/], format: () => 'comparison table or sections' },
      { patterns: [/analyze/, /analysis/], format: () => 'structured analysis' },

      // Q&A
      { patterns: [/explain/, /what\s*is/], format: () => 'explanation with examples' },

      // Creative
      { patterns: [/blog/, /article/], format: () => 'structured article with headings' },
      { patterns: [/story/, /narrative/], format: () => 'narrative format' },
    ];

    for (const rule of formatRules) {
      for (const pattern of rule.patterns) {
        const match = text.match(pattern);
        if (match) {
          return rule.format(match);
        }
      }
    }

    // Default based on detected type
    return 'structured response';
  }

  // ============================================
  // BETTER ROLE SELECTION
  // ============================================

  selectRole(text, taskType) {
    const lower = text.toLowerCase();

    // Marketing roles
    if (lower.includes('landing') || lower.includes('headline') ||
        lower.includes('copy') || lower.includes('sales') ||
        lower.includes('marketing') || lower.includes('cta') ||
        lower.includes('conversion')) {
      return 'SaaS marketing copywriter and conversion specialist';
    }

    if (lower.includes('email') && (lower.includes('client') || lower.includes('customer'))) {
      return 'professional business communication specialist';
    }

    // Product roles
    if (lower.includes('product') || lower.includes('feature') ||
        lower.includes('user story') || lower.includes('roadmap')) {
      return 'product manager and strategist';
    }

    // Technical writing
    if (lower.includes('documentation') || lower.includes('docs') ||
        lower.includes('technical') && lower.includes('write')) {
      return 'technical writer';
    }

    // Social media
    if (lower.includes('social') || lower.includes('twitter') ||
        lower.includes('linkedin') || lower.includes('post')) {
      return 'social media content strategist';
    }

    // Default by task type
    const roleMap = {
      coding: 'senior software engineer',
      writing: 'professional writer and content strategist',
      research: 'academic researcher and analyst',
      image: 'expert visual designer and art director',
      marketing: 'marketing strategist and copywriter',
      general: 'helpful AI assistant'
    };

    return roleMap[taskType] || roleMap.general;
  }

  // ============================================
  // SMART CONSTRAINTS (NOT USELESS!)
  // ============================================

  generateConstraints(text, taskType) {
    const lower = text.toLowerCase();
    const constraints = [];

    // Format-based constraints
    if (lower.includes('simple') || lower.includes('beginner')) {
      constraints.push('use simple, non-technical language');
    }

    if (lower.includes('short') || lower.includes('brief') || lower.includes('concise')) {
      constraints.push('keep it concise, avoid unnecessary details');
    }

    if (lower.includes('detailed') || lower.includes('comprehensive')) {
      constraints.push('provide thorough coverage');
    }

    // Audience constraints
    if (lower.includes('beginner') || lower.includes('newbie')) {
      constraints.push('explain technical terms');
    }

    if (lower.includes('professional') || lower.includes('executive')) {
      constraints.push('maintain professional tone');
    }

    // Task-specific constraints
    if (taskType === 'coding') {
      constraints.push('include error handling');
      constraints.push('add comments for clarity');
    }

    if (taskType === 'research') {
      constraints.push('distinguish facts from opinions');
    }

    if (taskType === 'marketing') {
      constraints.push('focus on benefits, not features');
    }

    // Only add if we have meaningful constraints
    if (constraints.length === 0) {
      constraints.push('address the specific request directly');
    }

    return constraints;
  }

  // ============================================
  // BETTER REQUIREMENTS BY TASK
  // ============================================

  generateRequirements(text, taskType) {
    const lower = text.toLowerCase();
    const requirements = [];

    // Task-specific requirements
    switch (taskType) {
      case 'coding':
        requirements.push('write clean, readable code');
        requirements.push('follow language best practices');
        if (lower.includes('function')) {
          requirements.push('include input/output examples');
        }
        if (lower.includes('api')) {
          requirements.push('document endpoints and parameters');
        }
        break;

      case 'writing':
        requirements.push('use clear, engaging language');
        if (lower.includes('blog')) {
          requirements.push('include compelling headline');
          requirements.push('structure with subheadings');
        }
        if (lower.includes('seo')) {
          requirements.push('optimize for search engines');
        }
        break;

      case 'research':
        requirements.push('be evidence-based');
        requirements.push('remain objective');
        if (lower.includes('pros') && lower.includes('cons')) {
          requirements.push('present balanced perspective');
        }
        break;

      case 'marketing':
        requirements.push('use persuasive, benefit-focused language');
        requirements.push('include clear value proposition');
        if (lower.includes('landing')) {
          requirements.push('strong headline + benefits + CTA');
        }
        break;

      case 'image':
        requirements.push('specify visual details clearly');
        requirements.push('describe style and mood');
        break;

      default:
        requirements.push('be accurate and helpful');
        if (lower.includes('explain')) {
          requirements.push('use examples for clarity');
        }
    }

    return requirements;
  }

  // ============================================
  // PROMPT CLEANING / NORMALIZATION
  // ============================================

  cleanPrompt(text) {
    let cleaned = text.trim();

    // Fix common typos and shortcuts
    const fixes = {
      'busines': 'business',
      'buisness': 'business',
      'teh': 'the',
      'ur': 'your',
      'u ': 'you ',
      'pls': 'please',
      'thx': 'thanks',
      'w/': 'with ',
      'w/o': 'without ',
      'b/c': 'because ',
      'ur ': 'your ',
    };

    for (const [wrong, right] of Object.entries(fixes)) {
      cleaned = cleaned.replace(new RegExp(wrong, 'gi'), right);
    }

    // Expand shortcuts
    const expansions = [
      { pattern: /^make\s+blog\s+(.+)$/i, replacement: 'write a blog post about $1' },
      { pattern: /^make\s+article\s+(.+)$/i, replacement: 'write an article about $1' },
      { pattern: /^write\s+email\s+(.+)$/i, replacement: 'write an email $1' },
      { pattern: /^create\s+function\s+(.+)$/i, replacement: 'create a function that $1' },
      { pattern: /^code\s+for\s+(.+)$/i, replacement: 'write code for $1' },
    ];

    for (const { pattern, replacement } of expansions) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, replacement);
        break;
      }
    }

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // Add period if missing
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  // ============================================
  // DETECTION LOGIC
  // ============================================

  detectTaskType(text) {
    const lower = text.toLowerCase();

    // Marketing (check first - often missed)
    const marketingKeywords = ['landing', 'headline', 'copy', 'sales', 'marketing',
      'cta', 'conversion', 'benefits', 'value prop', 'landing page', 'pitch'];
    if (marketingKeywords.some(k => lower.includes(k))) {
      return 'marketing';
    }

    // Coding
    const codingKeywords = ['code', 'function', 'api', 'debug', 'script', 'program',
      'implement', 'algorithm', 'class', 'method', 'python', 'javascript',
      'remove duplicate', 'sort', 'filter'];
    if (codingKeywords.some(k => lower.includes(k))) {
      return 'coding';
    }

    // Writing
    const writingKeywords = ['write', 'blog', 'article', 'story', 'content', 'essay',
      'post', 'narrative'];
    if (writingKeywords.some(k => lower.includes(k))) {
      return 'writing';
    }

    // Research
    const researchKeywords = ['research', 'analyze', 'analysis', 'study', 'paper',
      'investigate', 'examine', 'pros and cons', 'compare'];
    if (researchKeywords.some(k => lower.includes(k))) {
      return 'research';
    }

    // Image
    const imageKeywords = ['photo', 'image', 'camera', 'lens', 'lighting',
      'realistic', 'cinematic', 'render', 'shot'];
    if (imageKeywords.some(k => lower.includes(k))) {
      return 'image';
    }

    // Summarization
    if (lower.includes('summarize') || lower.includes('summary')) {
      return 'summarization';
    }

    return 'general';
  }

  // ============================================
  // MAIN ENHANCE FUNCTION
  // ============================================

  enhancePrompt(text) {
    // Step 1: Clean the prompt
    const cleanedText = this.cleanPrompt(text);

    // Step 2: Detect task type
    const taskType = this.detectTaskType(cleanedText);

    // Step 3: Select role
    const role = this.selectRole(cleanedText, taskType);

    // Step 4: Detect output format (specific!)
    const outputFormat = this.detectOutputFormat(cleanedText);

    // Step 5: Generate requirements
    const requirements = this.generateRequirements(cleanedText, taskType);

    // Step 6: Generate constraints (meaningful!)
    const constraints = this.generateConstraints(cleanedText, taskType);

    // Step 7: Separate context if present
    const { context, instruction } = this.separateContext(cleanedText);

    return {
      original: text,
      cleaned: cleanedText,
      detected_type: taskType,
      role: role,
      context: context,
      task: instruction || cleanedText,
      requirements: requirements,
      constraints: constraints,
      output_format: outputFormat
    };
  }

  separateContext(text) {
    const paragraphs = text.split(/\n\n+/);

    if (paragraphs.length >= 2) {
      const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
      const instructionWords = ['summarize', 'explain', 'rewrite', 'analyze'];

      for (const word of instructionWords) {
        if (lastParagraph.includes(word) && lastParagraph.length < 150) {
          return {
            context: paragraphs.slice(0, -1).join('\n\n'),
            instruction: paragraphs[paragraphs.length - 1]
          };
        }
      }
    }

    return { context: null, instruction: text };
  }

  // ============================================
  // AI MODEL LOADING (Optional)
  // ============================================

  async initialize(onProgress = null) {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
      env.allowLocalModels = false;

      if (onProgress) onProgress(10, 'Loading semantic model...');
      this.featureExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      if (onProgress) onProgress(60, 'Loading classifier...');
      this.classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');

      this.isReady = true;
      this.isLoading = false;
      if (onProgress) onProgress(100, 'Ready!');

      return true;
    } catch (error) {
      console.error('Model load failed:', error);
      this.isLoading = false;
      if (onProgress) onProgress(0, 'Using rule-based mode');
      return false;
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UltraLightLLM;
} else {
  window.UltraLightLLM = UltraLightLLM;
}
