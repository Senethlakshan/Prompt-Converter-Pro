// Content Script - Prompt Converter Extension
// Adds a floating convert button when text is selected

let floatingButton = null;
let isButtonVisible = false;

// Create floating button element
function createFloatingButton() {
  if (floatingButton) return;

  floatingButton = document.createElement('div');
  floatingButton.id = 'prompt-converter-floating';
  floatingButton.innerHTML = `
    <div class="pc-floating-container">
      <button class="pc-convert-btn" data-format="json" title="Convert to JSON">
        <span>{ }</span>
      </button>
      <button class="pc-convert-btn" data-format="xml" title="Convert to XML">
        <span>< ></span>
      </button>
      <button class="pc-convert-btn" data-format="improved" title="Convert to Improved Text">
        <span>📝</span>
      </button>
      <button class="pc-convert-btn pc-more-btn" title="More options">
        <span>⋯</span>
      </button>
      <div class="pc-more-menu">
        <button class="pc-more-option" data-format="claude">🤖 Claude Style</button>
        <button class="pc-more-option" data-format="gpt">💬 GPT Optimized</button>
      </div>
    </div>
  `;

  document.body.appendChild(floatingButton);

  // Add event listeners
  floatingButton.querySelectorAll('.pc-convert-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = btn.dataset.format;
      if (format) {
        convertSelectedText(format);
      }
    });
  });

  floatingButton.querySelectorAll('.pc-more-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = btn.dataset.format;
      if (format) {
        convertSelectedText(format);
      }
    });
  });

  // More button toggle
  const moreBtn = floatingButton.querySelector('.pc-more-btn');
  const moreMenu = floatingButton.querySelector('.pc-more-menu');

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle('pc-show');
  });

  // Close more menu when clicking outside
  document.addEventListener('click', () => {
    moreMenu.classList.remove('pc-show');
  });
}

// Convert selected text
function convertSelectedText(format) {
  const selectedText = window.getSelection().toString().trim();

  if (!selectedText) {
    showToast('No text selected!');
    return;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'convertPrompt',
    text: selectedText,
    format: format
  });

  // Hide floating button after conversion
  hideFloatingButton();

  // Show toast
  showToast(`Converting to ${format.toUpperCase()}...`);
}

// Show floating button at selection position
function showFloatingButton(x, y) {
  if (!floatingButton) createFloatingButton();

  floatingButton.style.left = `${x}px`;
  floatingButton.style.top = `${y}px`;
  floatingButton.classList.add('pc-visible');
  isButtonVisible = true;
}

// Hide floating button
function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.classList.remove('pc-visible');
    floatingButton.querySelector('.pc-more-menu').classList.remove('pc-show');
    isButtonVisible = false;
  }
}

// Show toast notification
function showToast(message) {
  const existingToast = document.querySelector('.pc-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'pc-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4);
    z-index: 999999999;
    animation: pcSlideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'pcSlideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
  // Don't trigger if clicking on the floating button itself
  if (floatingButton && floatingButton.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      // Get selection position
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position button above the selection
      const x = rect.left + (rect.width / 2) - 100;
      const y = rect.top - 50 + window.scrollY;

      showFloatingButton(x, y);
    } else {
      hideFloatingButton();
    }
  }, 10);
});

// Handle key events
document.addEventListener('keydown', (e) => {
  // Hide on Escape
  if (e.key === 'Escape') {
    hideFloatingButton();
  }
});

// Hide on scroll
document.addEventListener('scroll', () => {
  if (isButtonVisible) {
    hideFloatingButton();
  }
}, { passive: true });

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showToast') {
    showToast(request.message);
  }
});
