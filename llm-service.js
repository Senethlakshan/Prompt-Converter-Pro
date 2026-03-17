/**
 * LLM Service - Local Small Language Model for Prompt Enhancement
 * Uses WebLLM to run Phi-3 or Gemma locally in browser (WebGPU)
 * No API costs, runs offline!
 */

class LLMService {
  constructor() {
    this.engine = null;
    this.isLoading = false;
    this.isReady = false;
    this.modelName = 'Phi-3.5-mini-instruct-q4f16_1-MLC';
    this.loadProgress = 0;
  }

  /**
   * Initialize the local LLM
   * Downloads and loads model into browser memory
   */
  async initialize(onProgress = null) {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      // Check if WebGPU is available
      if (!navigator.gpu) {
        console.warn('WebGPU not available, using rule-based enhancement');
        this.isReady = false;
        return false;
      }

      // Dynamically import WebLLM
      const { CreateMLCEngine } = await import('https://esm.run/@anthropic-ai/mlc');

      this.engine = await CreateMLCEngine(this.modelName, {
        initProgressCallback: (progress) => {
          this.loadProgress = Math.round(progress.progress * 100);
          if (onProgress) onProgress(this.loadProgress);
        }
      });

      this.isReady = true;
      this.isLoading = false;
      console.log('LLM Service initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      this.isLoading = false;
      this.isReady = false;
      return false;
    }
  }

  /**
   * Detect prompt type using fast rule-based detection
   * (fallback when LLM not available)
   */
  detectPromptType(text) {
    const lower = text.toLowerCase();

    // Image generation keywords
    const imageKeywords = [
      'camera', 'lens', 'lighting', 'photograph', 'shot', 'angle',
      'aperture', 'iso', 'shutter', 'focal', 'depth of field',
      'hyperrealistic', 'photorealistic', 'cinematic', 'render',
      'composition', 'exposure', 'hdr', '8k', '4k', 'resolution',
      'midjourney', 'dall-e', 'stable diffusion', 'image', 'picture',
      'visual', 'scene', 'subject', 'background', 'foreground',
      'color palette', 'texture', 'mood', 'atmosphere'
    ];

    // Coding keywords
    const codeKeywords = [
      'code', 'function', 'class', 'method', 'variable', 'api',
      'debug', 'implement', 'script', 'program', 'algorithm',
      'javascript', 'python', 'typescript', 'react', 'node',
      'database', 'sql', 'query', 'endpoint', 'authentication'
    ];

    // Writing keywords
    const writingKeywords = [
      'write', 'blog', 'article', 'story', 'essay', 'content',
      'paragraph', 'narrative', 'chapter', 'book', 'novel',
      'copywriting', 'headline', 'description', 'review'
    ];

    // Research keywords
    const researchKeywords = [
      'research', 'analyze', 'study', 'investigate', 'examine',
      'paper', 'academic', 'literature', 'findings', 'methodology'
    ];

    // Count matches
    const imageScore = imageKeywords.filter(k => lower.includes(k)).length;
    const codeScore = codeKeywords.filter(k => lower.includes(k)).length;
    const writingScore = writingKeywords.filter(k => lower.includes(k)).length;
    const researchScore = researchKeywords.filter(k => lower.includes(k)).length;

    // Determine type based on highest score
    const scores = [
      { type: 'image', score: imageScore },
      { type: 'coding', score: codeScore },
      { type: 'writing', score: writingScore },
      { type: 'research', score: researchScore }
    ];

    scores.sort((a, b) => b.score - a.score);

    // If clear winner with score > 1
    if (scores[0].score > 1) {
      return scores[0].type;
    }

    // Default to general
    return 'general';
  }

  /**
   * Enhance prompt using local LLM
   */
  async enhancePrompt(text, promptType = null) {
    // Detect type if not provided
    const type = promptType || this.detectPromptType(text);

    // If LLM is ready, use it for enhancement
    if (this.isReady && this.engine) {
      return this.enhanceWithLLM(text, type);
    }

    // Otherwise use rule-based enhancement
    return this.enhanceWithRules(text, type);
  }

  /**
   * Enhance using local LLM
   */
  async enhanceWithLLM(text, type) {
    const systemPrompt = this.getSystemPromptForType(type);

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        enhanced: response.choices[0].message.content,
        type: type,
        method: 'llm'
      };
    } catch (error) {
      console.error('LLM enhancement failed:', error);
      return this.enhanceWithRules(text, type);
    }
  }

  /**
   * Enhance using rules (fast, no LLM needed)
   */
  enhanceWithRules(text, type) {
    switch (type) {
      case 'image':
        return this.enhanceImagePrompt(text);
      case 'coding':
        return this.enhanceCodingPrompt(text);
      case 'writing':
        return this.enhanceWritingPrompt(text);
      case 'research':
        return this.enhanceResearchPrompt(text);
      default:
        return this.enhanceGeneralPrompt(text);
    }
  }

  /**
   * Get system prompt based on type
   */
  getSystemPromptForType(type) {
    const prompts = {
      image: `You are an expert prompt engineer specializing in AI image generation.
Analyze and enhance image prompts. Extract and structure:
- Subject and main action
- Camera settings (lens, angle, position)
- Lighting setup
- Composition and framing
- Color palette and mood
- Style and quality parameters
- Negative prompts to avoid unwanted elements
Return ONLY the enhanced prompt, no explanations.`,

      coding: `You are a senior software engineer and coding assistant.
Enhance coding prompts by adding:
- Clear requirements and constraints
- Expected input/output examples
- Edge cases to consider
- Best practices to follow
- Error handling suggestions
Return ONLY the enhanced prompt, no explanations.`,

      writing: `You are a professional writer and content strategist.
Enhance writing prompts by adding:
- Target audience considerations
- Tone and style guidelines
- Structure recommendations
- Key points to include
- Engagement techniques
Return ONLY the enhanced prompt, no explanations.`,

      research: `You are an academic researcher and analyst.
Enhance research prompts by adding:
- Clear research questions
- Methodology suggestions
- Sources to consider
- Analysis frameworks
- Expected deliverables
Return ONLY the enhanced prompt, no explanations.`,

      general: `You are a helpful AI assistant.
Enhance the given prompt to be clearer, more specific, and more effective.
Add relevant context, constraints, and quality requirements.
Return ONLY the enhanced prompt, no explanations.`
    };

    return prompts[type] || prompts.general;
  }

  /**
   * Enhance image prompt with structured elements
   */
  enhanceImagePrompt(text) {
    const extracted = this.extractImageElements(text);

    return {
      type: 'image',
      elements: extracted,
      formats: {
        midjourney: this.formatForMidjourney(extracted),
        dalle: this.formatForDALLE(extracted),
        stable_diffusion: this.formatForStableDiffusion(extracted),
        structured_json: this.formatImageJSON(extracted)
      }
    };
  }

  /**
   * Extract image elements from prompt
   */
  extractImageElements(text) {
    const lower = text.toLowerCase();

    // Extract camera info
    const cameraMatch = text.match(/(?:shot on |captured with |camera:?\s*)(sony|canon|nikon|iphone|samsung)?\s*([a-z0-9\- ]+)?/i);
    const lensMatch = text.match(/(\d+mm)|f\/?(\d+\.?\d*)/gi);

    // Extract lighting
    const lightingKeywords = ['natural', 'studio', 'golden hour', 'blue hour', 'cinematic', 'dramatic', 'soft', 'hard', 'ambient', 'tungsten', 'led'];
    const detectedLighting = lightingKeywords.filter(l => lower.includes(l));

    // Extract style
    const styleKeywords = ['photorealistic', 'hyperrealistic', 'cinematic', 'editorial', 'commercial', 'artistic', 'minimalist', 'vintage', 'modern'];
    const detectedStyle = styleKeywords.filter(s => lower.includes(s));

    // Extract quality
    const qualityMatch = text.match(/(\d+)k|ultra\s*hd|high\s*(?:resolution|quality)/i);

    return {
      original: text,
      subject: this.extractSubject(text),
      camera: cameraMatch ? cameraMatch[0] : null,
      lens: lensMatch ? lensMatch.join(', ') : null,
      lighting: detectedLighting.length > 0 ? detectedLighting : ['balanced'],
      style: detectedStyle.length > 0 ? detectedStyle : ['professional'],
      quality: qualityMatch ? qualityMatch[0] : 'high quality',
      mood: this.extractMood(text),
      composition: this.extractComposition(text),
      negativePrompt: this.generateNegativePrompt(text)
    };
  }

  /**
   * Extract main subject from image prompt
   */
  extractSubject(text) {
    // Try to find the main subject
    const subjectPatterns = [
      /(?:image of |picture of |photo of |depicting |showing )([^.]+)/i,
      /^([^.]+?)(?:,|\.|shot|captured|photographed)/i
    ];

    for (const pattern of subjectPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    // Default: first 100 chars
    return text.substring(0, 100).split(/[,.]/)[0].trim();
  }

  /**
   * Extract mood/atmosphere
   */
  extractMood(text) {
    const moods = {
      energetic: ['energetic', 'dynamic', 'vibrant', 'lively', 'active'],
      calm: ['calm', 'peaceful', 'serene', 'tranquil', 'quiet'],
      dramatic: ['dramatic', 'intense', 'powerful', 'bold'],
      mysterious: ['mysterious', 'enigmatic', 'ethereal', 'dreamy'],
      professional: ['professional', 'corporate', 'business', 'clean'],
      creative: ['creative', 'artistic', 'imaginative', 'whimsical']
    };

    const lower = text.toLowerCase();

    for (const [mood, keywords] of Object.entries(moods)) {
      if (keywords.some(k => lower.includes(k))) {
        return mood;
      }
    }

    return 'neutral';
  }

  /**
   * Extract composition info
   */
  extractComposition(text) {
    const lower = text.toLowerCase();
    const composition = {};

    // Rule of thirds
    if (lower.includes('rule of thirds') || lower.includes('thirds')) {
      composition.rule = 'rule of thirds';
    }

    // Angle
    if (lower.includes('low angle') || lower.includes('from below')) {
      composition.angle = 'low angle';
    } else if (lower.includes('high angle') || lower.includes('from above') || lower.includes('bird')) {
      composition.angle = 'high angle';
    } else if (lower.includes('eye level')) {
      composition.angle = 'eye level';
    }

    // View
    if (lower.includes('close-up') || lower.includes('close up')) {
      composition.view = 'close-up';
    } else if (lower.includes('wide') || lower.includes('wide angle')) {
      composition.view = 'wide';
    } else if (lower.includes('portrait')) {
      composition.view = 'portrait';
    }

    return composition;
  }

  /**
   * Generate negative prompt
   */
  generateNegativePrompt(text) {
    const defaultNegatives = [
      'blurry', 'low quality', 'distorted', 'unrealistic',
      'cartoonish', 'overexposed', 'underexposed', 'noisy'
    ];

    // Add context-specific negatives
    const lower = text.toLowerCase();

    if (lower.includes('photograph') || lower.includes('photo')) {
      defaultNegatives.push('illustration', 'drawing', 'painting');
    }

    if (lower.includes('realistic') || lower.includes('photorealistic')) {
      defaultNegatives.push('anime', 'cartoon', '3d render');
    }

    return defaultNegatives.join(', ');
  }

  /**
   * Format for Midjourney
   */
  formatForMidjourney(elements) {
    const parts = [];

    parts.push(elements.subject);

    if (elements.camera) parts.push(elements.camera);
    if (elements.lens) parts.push(elements.lens);
    if (elements.lighting.length > 0) parts.push(`${elements.lighting[0]} lighting`);
    if (elements.style.length > 0) parts.push(elements.style[0]);
    parts.push(elements.quality);

    if (elements.mood !== 'neutral') parts.push(elements.mood + ' mood');

    // Add MJ parameters
    parts.push('--ar 16:9 --v 6 --style raw --q 2');

    return parts.join(', ');
  }

  /**
   * Format for DALL-E 3
   */
  formatForDALLE(elements) {
    const description = [];

    description.push(`A ${elements.style[0] || 'professional'} photograph`);
    description.push(`of ${elements.subject}`);

    if (elements.lighting.length > 0) {
      description.push(`with ${elements.lighting.join(' and ')} lighting`);
    }

    if (elements.mood !== 'neutral') {
      description.push(`creating a ${elements.mood} atmosphere`);
    }

    description.push(`${elements.quality}, highly detailed`);

    return {
      prompt: description.join(' '),
      size: '1792x1024',
      quality: 'hd',
      style: 'natural'
    };
  }

  /**
   * Format for Stable Diffusion
   */
  formatForStableDiffusion(elements) {
    const positive = [];
    const negative = elements.negativePrompt.split(', ');

    positive.push(`(masterpiece:1.3), (best quality:1.3), (ultra detailed:1.2)`);
    positive.push(`(8k, photorealistic:1.4)`);
    positive.push(elements.subject);

    if (elements.camera) positive.push(`(${elements.camera}:1.2)`);
    if (elements.lighting.length > 0) positive.push(`${elements.lighting[0]} lighting`);
    if (elements.style.length > 0) positive.push(`${elements.style[0]} style`);

    return {
      positive_prompt: positive.join(', '),
      negative_prompt: negative.join(', '),
      parameters: {
        steps: 40,
        cfg_scale: 7,
        sampler: 'DPM++ 2M Karras',
        width: 1024,
        height: 768,
        seed: -1
      }
    };
  }

  /**
   * Format image as structured JSON
   */
  formatImageJSON(elements) {
    return {
      prompt_type: 'image_generation',
      scene: {
        subject: elements.subject,
        main_action: null,
        key_props: []
      },
      camera: {
        device: elements.camera,
        lens: elements.lens,
        angle: elements.composition.angle || 'eye level',
        view: elements.composition.view || 'medium'
      },
      lighting: {
        style: elements.lighting.join(', '),
        key_light: null,
        fill_light: null
      },
      style: elements.style,
      mood: elements.mood,
      quality: elements.quality,
      negative_prompt: elements.negativePrompt
    };
  }

  /**
   * Enhance coding prompt
   */
  enhanceCodingPrompt(text) {
    const extracted = {
      original: text,
      type: 'coding',
      requirements: [
        'Write clean, readable code',
        'Follow best practices and conventions',
        'Include error handling',
        'Add comments for complex logic'
      ],
      constraints: [
        'Ensure type safety',
        'Handle edge cases',
        'Write efficient algorithms'
      ],
      output_format: 'Code with explanation'
    };

    return extracted;
  }

  /**
   * Enhance writing prompt
   */
  enhanceWritingPrompt(text) {
    return {
      original: text,
      type: 'writing',
      requirements: [
        'Use clear, engaging language',
        'Maintain consistent tone',
        'Structure with clear paragraphs',
        'Include relevant examples'
      ],
      constraints: [
        'Stay on topic',
        'Be original and creative'
      ],
      output_format: 'Well-structured text'
    };
  }

  /**
   * Enhance research prompt
   */
  enhanceResearchPrompt(text) {
    return {
      original: text,
      type: 'research',
      requirements: [
        'Be accurate and evidence-based',
        'Cite sources when applicable',
        'Consider multiple perspectives',
        'Remain objective'
      ],
      constraints: [
        'Avoid speculation without evidence',
        'Distinguish facts from opinions'
      ],
      output_format: 'Research summary with citations'
    };
  }

  /**
   * Enhance general prompt
   */
  enhanceGeneralPrompt(text) {
    return {
      original: text,
      type: 'general',
      requirements: [
        'Be accurate and helpful',
        'Provide sufficient detail',
        'Be clear and well-organized'
      ],
      constraints: [
        'Stay focused on the task'
      ],
      output_format: 'Clear, helpful response'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMService;
} else {
  window.LLMService = LLMService;
}
