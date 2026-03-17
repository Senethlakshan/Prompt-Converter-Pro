// Popup Script - Prompt Converter Pro v3.2
// Fixed: output_format, roles, constraints, prompt cleaning

document.addEventListener('DOMContentLoaded', function() {
  const inputPrompt = document.getElementById('inputPrompt');
  const outputPrompt = document.getElementById('outputPrompt');
  const outputFormat = document.getElementById('outputFormat');
  const taskType = document.getElementById('taskType');
  const convertBtn = document.getElementById('convertBtn');
  const copyBtn = document.getElementById('copyBtn');
  const quickBtns = document.querySelectorAll('.quick-btn');
  const toast = document.getElementById('toast');
  const detectedTypeValue = document.getElementById('detectedTypeValue');
  const aiEnhance = document.getElementById('aiEnhance');
  const initLLMBtn = document.getElementById('initLLM');
  const modelStatus = document.getElementById('modelStatus');

  const llm = new UltraLightLLM();

  // ============================================
  // CORE FUNCTIONS (Same as background.js)
  // ============================================

  function cleanPrompt(text) {
    let cleaned = text.trim();

    const typos = {
      'busines': 'business', 'buisness': 'business',
      'wrie': 'write', 'wrtie': 'write',
      'creat': 'create', 'funciton': 'function'
    };

    for (const [typo, correct] of Object.entries(typos)) {
      cleaned = cleaned.replace(new RegExp(typo, 'gi'), correct);
    }

    // Fix messy grammar
    cleaned = cleaned.replace(/^make\s+(blog|article|post)\s+(.+?)\s+simple\s+and\s+short$/i,
      'write a short and simple $1 about $2');
    cleaned = cleaned.replace(/^give\s+me\s+/i, '');

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  function detectType(text) {
    const lower = text.toLowerCase();

    // Marketing first
    const marketingKeywords = ['landing page', 'headline', 'marketing', 'sales',
      'copy', 'conversion', 'cta', 'benefits', 'value proposition'];
    if (marketingKeywords.some(k => lower.includes(k))) return 'marketing';

    const codingKeywords = ['code', 'function', 'api', 'debug', 'script',
      'python', 'javascript', 'implement'];
    if (codingKeywords.some(k => lower.includes(k))) return 'coding';

    const writingKeywords = ['write', 'blog', 'article', 'story', 'content'];
    if (writingKeywords.some(k => lower.includes(k))) return 'writing';

    const researchKeywords = ['research', 'analyze', 'study', 'paper', 'pros and cons'];
    if (researchKeywords.some(k => lower.includes(k))) return 'research';

    const imageKeywords = ['photo', 'camera', 'lens', 'cinematic', 'realistic'];
    if (imageKeywords.some(k => lower.includes(k))) return 'image';

    if (lower.includes('summarize')) return 'summarization';

    return 'general';
  }

  function selectRole(text, type) {
    const lower = text.toLowerCase();

    // Marketing specific
    const marketingKeywords = ['landing page', 'headline', 'copy', 'marketing',
      'sales', 'conversion', 'cta', 'benefits'];
    if (marketingKeywords.some(k => lower.includes(k))) {
      return 'SaaS marketing copywriter and conversion specialist';
    }

    if (lower.includes('email')) return 'professional email copywriter';

    const roles = {
      coding: 'senior software engineer and coding architect',
      writing: 'professional writer and content strategist',
      research: 'academic researcher and analyst',
      marketing: 'marketing strategist and copywriter',
      image: 'expert visual designer and art director',
      summarization: 'expert summarizer and communicator',
      general: 'helpful AI assistant'
    };

    return roles[type] || roles.general;
  }

  function detectOutputFormat(text) {
    const lower = text.toLowerCase();

    // Numbered formats
    const benefitMatch = text.match(/(\d+)\s*benefits?/i);
    if (benefitMatch) return `bullet list (${benefitMatch[1]} benefits)`;

    const pointMatch = text.match(/(\d+)\s*points?/i);
    if (pointMatch) return `bullet list (${pointMatch[1]} items)`;

    const bulletMatch = text.match(/(\d+)\s*bullet/i);
    if (bulletMatch) return `${bulletMatch[1]} bullet points`;

    const wordMatch = text.match(/(\d+)\s*words?/i);
    if (wordMatch) return `approximately ${wordMatch[1]} words`;

    // Specific structures
    if (lower.includes('pros and cons')) return 'two sections: pros and cons';
    if (lower.includes('headline')) return 'headline + supporting content';
    if (lower.includes('landing page')) return 'headline + benefits + CTA';
    if (lower.includes('email')) return 'subject line + email body';

    // Code
    if (lower.includes('function') || lower.includes('python')) return 'code block with explanation';
    if (lower.includes('api')) return 'API documentation with examples';

    // Summary
    if (lower.includes('one sentence')) return 'one concise sentence';
    if (lower.includes('summarize')) return 'concise summary paragraph';
    if (lower.includes('short') || lower.includes('brief')) return 'concise response';

    // Lists
    if (lower.includes('list') || lower.includes('bullet')) return 'bullet list';
    if (lower.includes('step') || lower.includes('how to')) return 'step-by-step guide';

    // Analysis
    if (lower.includes('analyze') || lower.includes('analysis')) return 'structured analysis';

    // Creative
    if (lower.includes('blog') || lower.includes('article')) return 'structured article with headings';

    return 'well-structured response';
  }

  function generateRequirements(text, type) {
    const lower = text.toLowerCase();

    const reqsByType = {
      coding: ['write clean, readable code', 'follow best practices', 'add error handling'],
      marketing: ['use persuasive, benefit-focused language', 'highlight value proposition', 'optimize for conversion'],
      writing: ['use engaging, clear language', 'structure with clear headings', 'optimize for readability'],
      research: ['provide evidence-based analysis', 'remain objective and balanced'],
      summarization: ['capture key points accurately', 'be concise and clear'],
      image: ['be specific about visual elements', 'describe mood and style'],
      general: ['be accurate and helpful', 'provide clear explanation']
    };

    const requirements = [...(reqsByType[type] || reqsByType.general)];

    if (lower.includes('pros and cons')) {
      requirements.push('present both sides equally');
    }

    return requirements;
  }

  function generateConstraints(text, type) {
    const lower = text.toLowerCase();
    const constraints = [];

    if (lower.includes('one sentence')) constraints.push('do not exceed one sentence');
    if (lower.includes('short') || lower.includes('brief')) constraints.push('keep response concise');
    if (lower.includes('simple') || lower.includes('beginner')) constraints.push('use simple, non-technical language');

    const wordMatch = text.match(/(\d+)\s*words?/i);
    if (wordMatch) constraints.push(`stay within ${wordMatch[1]} word limit`);

    if (constraints.length === 0) constraints.push('avoid unnecessary details');

    return constraints;
  }

  // ============================================
  // CONVERSION FUNCTIONS
  // ============================================

  function convertPrompt(enhanced, format) {
    switch (format) {
      case 'json': return convertJSON(enhanced);
      case 'xml': return convertXML(enhanced);
      case 'improved': return convertText(enhanced);
      case 'claude': return convertClaude(enhanced);
      case 'gpt': return convertGPT(enhanced);
      case 'midjourney': return convertMidjourney(enhanced);
      case 'dalle': return convertDALLE(enhanced);
      case 'stable_diffusion': return convertSD(enhanced);
      default: return convertJSON(enhanced);
    }
  }

  function convertJSON(e) {
    return JSON.stringify({
      role: e.role,
      task: e.task,
      requirements: e.requirements,
      constraints: e.constraints,
      output_format: e.output_format
    }, null, 2);
  }

  function convertXML(e) {
    return `<prompt>
  <role>${escapeXML(e.role)}</role>
  <task>${escapeXML(e.task)}</task>
  <requirements>
    ${e.requirements.map(r => `- ${escapeXML(r)}`).join('\n    ')}
  </requirements>
  <constraints>
    ${e.constraints.map(c => `- ${escapeXML(c)}`).join('\n    ')}
  </constraints>
  <output_format>${escapeXML(e.output_format)}</output_format>
</prompt>`;
  }

  function convertText(e) {
    return `ROLE
You are ${e.role}.

TASK
${e.task}

REQUIREMENTS
${e.requirements.map(r => `- ${r}`).join('\n')}

CONSTRAINTS
${e.constraints.map(c => `- ${c}`).join('\n')}

OUTPUT FORMAT
${e.output_format}`;
  }

  function convertClaude(e) {
    return `<role>
You are ${e.role}.
</role>

<task>
${e.task}
</task>

<requirements>
${e.requirements.map(r => `- ${r}`).join('\n')}
</requirements>

<constraints>
${e.constraints.map(c => `- ${c}`).join('\n')}
</constraints>

<output_format>
${e.output_format}
</output_format>`;
  }

  function convertGPT(e) {
    return `You are ${e.role}.

## Task
${e.task}

## Requirements
${e.requirements.map(r => `- ${r}`).join('\n')}

## Constraints
${e.constraints.map(c => `- ${c}`).join('\n')}

## Output Format
${e.output_format}`;
  }

  function convertMidjourney(e) {
    let prompt = e.original.replace(/\n+/g, ' ').trim();
    if (!prompt.includes('--ar')) prompt += ' --ar 16:9';
    if (!prompt.includes('--v')) prompt += ' --v 6';
    return prompt;
  }

  function convertDALLE(e) {
    return JSON.stringify({
      prompt: e.original,
      size: '1792x1024',
      quality: 'hd',
      style: 'natural'
    }, null, 2);
  }

  function convertSD(e) {
    return JSON.stringify({
      positive_prompt: `(masterpiece:1.3), (best quality:1.3), ${e.original}`,
      negative_prompt: 'blurry, low quality, distorted',
      parameters: { steps: 40, cfg_scale: 7 }
    }, null, 2);
  }

  function escapeXML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============================================
  // UI HANDLERS
  // ============================================

  // Auto-detect on input
  inputPrompt.addEventListener('input', debounce(function() {
    const text = inputPrompt.value.trim();
    if (text.length > 5) {
      const type = detectType(text);
      updateDetectedType(type);
    }
  }, 300));

  // Initialize AI
  initLLMBtn.addEventListener('click', async function() {
    if (llm.isReady || llm.isLoading) return;

    modelStatus.className = 'model-status loading';
    initLLMBtn.disabled = true;

    const success = await llm.initialize((progress, message) => {
      modelStatus.querySelector('.status-text').textContent = `${message} (${progress}%)`;
    });

    modelStatus.className = success ? 'model-status' : 'model-status error';
    modelStatus.querySelector('.status-text').textContent = success ? 'AI: Ready ✓' : 'AI: Rule-based mode';
    initLLMBtn.disabled = false;
    showToast(success ? 'AI loaded!' : 'Using rule-based mode');
  });

  // Convert button
  convertBtn.addEventListener('click', async function() {
    const text = inputPrompt.value.trim();
    if (!text) {
      showToast('Enter a prompt!');
      return;
    }

    convertBtn.classList.add('loading');
    convertBtn.innerHTML = '<span class="btn-icon">⏳</span> Converting...';

    try {
      const cleanedText = cleanPrompt(text);
      const type = taskType.value === 'auto' ? detectType(cleanedText) : taskType.value;

      const enhanced = {
        original: text,
        cleaned: cleanedText,
        detected_type: type,
        role: selectRole(cleanedText, type),
        task: cleanedText,
        requirements: generateRequirements(cleanedText, type),
        constraints: generateConstraints(cleanedText, type),
        output_format: detectOutputFormat(cleanedText)
      };

      const converted = convertPrompt(enhanced, outputFormat.value);

      outputPrompt.value = converted;
      copyBtn.disabled = false;
      updateDetectedType(type);
      showToast('Converted!');

    } catch (error) {
      console.error(error);
      showToast('Error!');
    } finally {
      convertBtn.classList.remove('loading');
      convertBtn.innerHTML = '<span class="btn-icon">⚡</span> Convert';
    }
  });

  // Copy
  copyBtn.addEventListener('click', function() {
    if (outputPrompt.value) copyToClipboard(outputPrompt.value);
  });

  // Quick buttons
  quickBtns.forEach(btn => {
    btn.addEventListener('click', async function() {
      const text = inputPrompt.value.trim();
      if (!text) {
        showToast('Enter a prompt!');
        return;
      }

      const cleanedText = cleanPrompt(text);
      const type = detectType(cleanedText);

      const enhanced = {
        original: text,
        role: selectRole(cleanedText, type),
        task: cleanedText,
        requirements: generateRequirements(cleanedText, type),
        constraints: generateConstraints(cleanedText, type),
        output_format: detectOutputFormat(cleanedText)
      };

      const converted = convertPrompt(enhanced, this.dataset.format);
      copyToClipboard(converted);
      outputPrompt.value = converted;
      copyBtn.disabled = false;
    });
  });

  function updateDetectedType(type) {
    const labels = {
      marketing: '📢 Marketing',
      coding: '💻 Coding',
      writing: '✍️ Writing',
      research: '🔬 Research',
      image: '🎨 Image',
      summarization: '📝 Summary',
      general: '💬 General'
    };
    detectedTypeValue.textContent = labels[type] || labels.general;
    detectedTypeValue.className = 'detect-value ' + type;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function debounce(fn, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  inputPrompt.focus();
});
