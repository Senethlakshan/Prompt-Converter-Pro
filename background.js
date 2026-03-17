// Background Service Worker - Prompt Converter Pro v3.2
// Fixed: output_format, roles, constraints, prompt cleaning

// ============================================
// PROMPT CLEANING
// ============================================

function cleanPrompt(text) {
  let cleaned = text.trim();

  // Fix common typos
  const typos = {
    'busines': 'business',
    'buisness': 'business',
    'wrie': 'write',
    'wrtie': 'write',
    'creat': 'create',
    'funciton': 'function',
    'funtion': 'function',
  };

  for (const [typo, correct] of Object.entries(typos)) {
    cleaned = cleaned.replace(new RegExp(typo, 'gi'), correct);
  }

  // Fix messy grammar
  const grammarFixes = [
    { pattern: /^make\s+(blog|article|post)\s+(.+?)\s+simple\s+and\s+short$/i,
      replace: 'write a short and simple $1 about $2' },
    { pattern: /^make\s+(.+?)\s+(simple|short|quick)$/i,
      replace: 'create a $2 $1' },
    { pattern: /^give\s+me\s+/i, replace: '' },
    { pattern: /^pls\s+/i, replace: 'please ' },
    { pattern: /^plz\s+/i, replace: 'please ' },
  ];

  for (const fix of grammarFixes) {
    cleaned = cleaned.replace(fix.pattern, fix.replace);
  }

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return cleaned;
}

// ============================================
// ROLE SELECTION
// ============================================

function selectRole(text, type) {
  const lower = text.toLowerCase();

  // Marketing specific roles
  const marketingKeywords = ['landing page', 'headline', 'copy', 'marketing',
    'sales', 'conversion', 'cta', 'benefits', 'features', 'value proposition'];
  if (marketingKeywords.some(k => lower.includes(k))) {
    return 'SaaS marketing copywriter and conversion specialist';
  }

  // Email specific
  if (lower.includes('email')) {
    return 'professional email copywriter';
  }

  // Product specific
  if (lower.includes('product') && (lower.includes('description') || lower.includes('launch'))) {
    return 'product marketing manager';
  }

  // Role by type
  const rolesByType = {
    coding: 'senior software engineer and coding architect',
    writing: 'professional writer and content strategist',
    research: 'academic researcher and analyst',
    image: 'expert visual designer and art director',
    summarization: 'expert summarizer and communicator',
    general: 'helpful AI assistant'
  };

  return rolesByType[type] || rolesByType.general;
}

// ============================================
// TASK TYPE DETECTION
// ============================================

function detectType(text) {
  const lower = text.toLowerCase();

  // Marketing (check first - more specific)
  const marketingKeywords = ['landing page', 'headline', 'marketing', 'sales',
    'copy', 'conversion', 'cta', 'benefits', 'value proposition', 'persuade'];
  if (marketingKeywords.some(k => lower.includes(k))) {
    return 'marketing';
  }

  // Coding
  const codingKeywords = ['code', 'function', 'api', 'debug', 'script',
    'program', 'implement', 'algorithm', 'python', 'javascript', 'class'];
  if (codingKeywords.some(k => lower.includes(k))) {
    return 'coding';
  }

  // Writing
  const writingKeywords = ['write', 'blog', 'article', 'story', 'content',
    'essay', 'post', 'narrative'];
  if (writingKeywords.some(k => lower.includes(k))) {
    return 'writing';
  }

  // Research
  const researchKeywords = ['research', 'analyze', 'analysis', 'study',
    'paper', 'investigate', 'examine', 'pros and cons', 'compare'];
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
// OUTPUT FORMAT DETECTION
// ============================================

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

  const paraMatch = text.match(/(\d+)\s*paragraphs?/i);
  if (paraMatch) return `${paraMatch[1]} paragraphs`;

  // Specific structures
  if (lower.includes('pros and cons')) return 'two sections: pros and cons';
  if (lower.includes('headline')) return 'headline + supporting content';
  if (lower.includes('landing page')) return 'headline + benefits + CTA';
  if (lower.includes('email')) return 'subject line + email body';

  // Code formats
  if (lower.includes('function') || lower.includes('python') || lower.includes('javascript')) {
    return 'code block with explanation';
  }
  if (lower.includes('api') || lower.includes('endpoint')) {
    return 'API documentation with examples';
  }
  if (lower.includes('debug') || lower.includes('fix')) {
    return 'problem analysis + solution code';
  }

  // Summary formats
  if (lower.includes('one sentence')) return 'one concise sentence';
  if (lower.includes('summarize') || lower.includes('summary')) return 'concise summary paragraph';
  if (lower.includes('brief') || lower.includes('short')) return 'concise response';
  if (lower.includes('detailed') || lower.includes('comprehensive')) return 'detailed analysis';

  // List formats
  if (lower.includes('list') || lower.includes('bullet')) return 'bullet list';
  if (lower.includes('step') || lower.includes('how to')) return 'step-by-step guide';

  // Comparison
  if (lower.includes('compare') || lower.includes('versus') || lower.includes('vs')) {
    return 'comparison table or sections';
  }

  // Analysis
  if (lower.includes('analyze') || lower.includes('analysis')) {
    return 'structured analysis with sections';
  }

  // Q&A
  if (lower.includes('explain') || lower.includes('what is')) {
    return 'explanation with examples';
  }

  // Creative
  if (lower.includes('blog') || lower.includes('article')) {
    return 'structured article with headings';
  }

  return 'well-structured response';
}

// ============================================
// REQUIREMENTS GENERATION
// ============================================

function generateRequirements(text, type) {
  const lower = text.toLowerCase();
  const requirements = [];

  switch (type) {
    case 'coding':
      requirements.push('write clean, readable code');
      requirements.push('follow language best practices');
      if (lower.includes('function')) {
        requirements.push('include function documentation');
      }
      requirements.push('add error handling');
      break;

    case 'marketing':
      requirements.push('use persuasive, benefit-focused language');
      requirements.push('highlight unique value proposition');
      requirements.push('optimize for conversion');
      if (lower.includes('headline')) {
        requirements.push('create attention-grabbing headline');
      }
      break;

    case 'writing':
      requirements.push('use engaging, clear language');
      requirements.push('structure with clear headings');
      if (lower.includes('blog') || lower.includes('article')) {
        requirements.push('include introduction and conclusion');
      }
      requirements.push('optimize for readability');
      break;

    case 'research':
      requirements.push('provide evidence-based analysis');
      requirements.push('remain objective and balanced');
      if (lower.includes('pros and cons')) {
        requirements.push('present both sides equally');
      }
      break;

    case 'summarization':
      requirements.push('capture key points accurately');
      requirements.push('maintain original meaning');
      requirements.push('be concise and clear');
      break;

    case 'image':
      requirements.push('be specific about visual elements');
      requirements.push('describe mood, style, and composition');
      break;

    default:
      requirements.push('be accurate and helpful');
      requirements.push('provide clear explanation');
  }

  return requirements;
}

// ============================================
// CONSTRAINTS GENERATION
// ============================================

function generateConstraints(text, type) {
  const lower = text.toLowerCase();
  const constraints = [];

  // Format-based constraints
  if (lower.includes('one sentence')) {
    constraints.push('do not exceed one sentence');
  }

  if (lower.includes('short') || lower.includes('brief')) {
    constraints.push('keep response concise');
  }

  if (lower.includes('simple') || lower.includes('beginner')) {
    constraints.push('use simple, non-technical language');
  }

  // Number constraints
  const wordMatch = text.match(/(\d+)\s*words?/i);
  if (wordMatch) {
    constraints.push(`stay within ${wordMatch[1]} word limit`);
  }

  // If no constraints added, add a meaningful default
  if (constraints.length === 0) {
    constraints.push('avoid unnecessary details');
  }

  return constraints;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

function convertJSON(text, type, cleanedText) {
  const role = selectRole(text, type);
  const outputFormat = detectOutputFormat(text);
  const requirements = generateRequirements(text, type);
  const constraints = generateConstraints(text, type);

  return JSON.stringify({
    role: role,
    task: cleanedText,
    requirements: requirements,
    constraints: constraints,
    output_format: outputFormat
  }, null, 2);
}

function convertXML(text, type, cleanedText) {
  const role = selectRole(text, type);
  const outputFormat = detectOutputFormat(text);
  const requirements = generateRequirements(text, type);
  const constraints = generateConstraints(text, type);

  return `<prompt>
  <role>${role}</role>
  <task>${cleanedText}</task>
  <requirements>
    ${requirements.map(r => `- ${r}`).join('\n    ')}
  </requirements>
  <constraints>
    ${constraints.map(c => `- ${c}`).join('\n    ')}
  </constraints>
  <output_format>${outputFormat}</output_format>
</prompt>`;
}

function convertText(text, type, cleanedText) {
  const role = selectRole(text, type);
  const outputFormat = detectOutputFormat(text);
  const requirements = generateRequirements(text, type);
  const constraints = generateConstraints(text, type);

  return `ROLE
You are ${role}.

TASK
${cleanedText}

REQUIREMENTS
${requirements.map(r => `- ${r}`).join('\n')}

CONSTRAINTS
${constraints.map(c => `- ${c}`).join('\n')}

OUTPUT FORMAT
${outputFormat}`;
}

// Image conversions
function convertMidjourney(text) {
  let prompt = text.replace(/\n+/g, ' ').trim();
  if (!prompt.includes('--ar')) prompt += ' --ar 16:9';
  if (!prompt.includes('--v')) prompt += ' --v 6';
  return prompt;
}

function convertDALLE(text) {
  return JSON.stringify({
    prompt: text,
    size: '1792x1024',
    quality: 'hd',
    style: 'natural'
  }, null, 2);
}

function convertSD(text) {
  return JSON.stringify({
    positive_prompt: `(masterpiece:1.3), (best quality:1.3), ${text}`,
    negative_prompt: 'blurry, low quality, distorted, unrealistic',
    parameters: { steps: 40, cfg_scale: 7, sampler: 'DPM++ 2M Karras' }
  }, null, 2);
}

// ============================================
// CONTEXT MENU SETUP
// ============================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'promptConverter',
    title: '🔧 Convert Prompt',
    contexts: ['selection']
  });

  chrome.contextMenus.create({ id: 'convert-json', parentId: 'promptConverter', title: '📋 JSON', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'convert-xml', parentId: 'promptConverter', title: '📋 XML', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'convert-text', parentId: 'promptConverter', title: '📝 Improved Text', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'sep1', parentId: 'promptConverter', type: 'separator', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'convert-mj', parentId: 'promptConverter', title: '🎨 Midjourney', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'convert-dalle', parentId: 'promptConverter', title: '🎨 DALL-E 3', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'convert-sd', parentId: 'promptConverter', title: '🎨 Stable Diffusion', contexts: ['selection'] });

  console.log('Prompt Converter v3.2 ready');
});

// ============================================
// HANDLE MENU CLICKS
// ============================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText;
  if (!text) return;

  const cleanedText = cleanPrompt(text);
  const type = detectType(cleanedText);

  let converted;
  switch (info.menuItemId) {
    case 'convert-json': converted = convertJSON(text, type, cleanedText); break;
    case 'convert-xml': converted = convertXML(text, type, cleanedText); break;
    case 'convert-text': converted = convertText(text, type, cleanedText); break;
    case 'convert-mj': converted = convertMidjourney(cleanedText); break;
    case 'convert-dalle': converted = convertDALLE(cleanedText); break;
    case 'convert-sd': converted = convertSD(cleanedText); break;
    default: return;
  }

  // Copy and notify
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (data, promptType) => {
      navigator.clipboard.writeText(data);

      const icons = {
        marketing: '📢',
        coding: '💻',
        writing: '✍️',
        research: '🔬',
        image: '🎨',
        general: '✨'
      };

      const toast = document.createElement('div');
      toast.innerHTML = `✅ ${icons[promptType] || '✨'} Copied!`;
      toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        color: white; padding: 15px 25px; border-radius: 10px;
        font-family: sans-serif; font-weight: 600; z-index: 999999;
        animation: slideIn 0.3s ease;
      `;
      const style = document.createElement('style');
      style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
      document.head.appendChild(style);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    },
    args: [converted, type]
  });
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  });

  const text = result[0]?.result;
  if (!text) return;

  const cleanedText = cleanPrompt(text);
  const type = detectType(cleanedText);

  let converted;
  switch (command) {
    case 'convert-to-json': converted = convertJSON(text, type, cleanedText); break;
    case 'convert-to-xml': converted = convertXML(text, type, cleanedText); break;
    default: return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (data) => navigator.clipboard.writeText(data),
    args: [converted]
  });
});
