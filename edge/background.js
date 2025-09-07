chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToVocabulary',
    title: 'Add to Vocabulary',
    contexts: ['selection']
  });
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToVocabulary' && info.selectionText) {
    const text = info.selectionText.trim();
    if (!text) return;
    chrome.storage.local.get({ vocabulary: [] }, ({ vocabulary }) => {
      const already = vocabulary.includes(text);
      if (!already) {
        vocabulary.push(text);
        chrome.storage.local.set({ vocabulary }, () => {
          chrome.runtime.sendMessage({ type: 'vocabulary-updated' });
          if (tab && tab.id != null) showToast(tab.id, `Added: ${text}`, 1600);
        });
      } else if (tab && tab.id != null) {
        showToast(tab.id, `Already in list: ${text}`, 1400);
      }
    });
  }
});

// Keyboard shortcut command to add current page selection to vocabulary
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'add-to-vocabulary') {
    // Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || tab.id == null) return;
      // Execute script in page to retrieve current selection
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        },
        (results) => {
          const text = results && results[0] && (results[0].result || '').trim();
          if (!text) return;
          chrome.storage.local.get({ vocabulary: [] }, ({ vocabulary }) => {
            const already = vocabulary.includes(text);
            if (!already) {
              vocabulary.push(text);
              chrome.storage.local.set({ vocabulary }, () => {
                chrome.runtime.sendMessage({ type: 'vocabulary-updated' });
                showToast(tab.id, `Added: ${text}`, 1600);
              });
            } else {
              showToast(tab.id, `Already in list: ${text}`, 1400);
            }
          });
        }
      );
    });
  }
});

// Helper: show ephemeral toast in active page
function showToast(tabId, message, visibleMs = 1600) {
  try {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, visible) => {
        try {
          const id = 'vocab-toast-notice';
          document.getElementById(id)?.remove();
          const div = document.createElement('div');
            div.id = id;
            div.textContent = msg;
            Object.assign(div.style, {
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.82)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'system-ui, sans-serif',
              zIndex: 2147483647,
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
              opacity: '0',
              transform: 'translateY(4px)',
              transition: 'opacity 160ms ease, transform 160ms ease'
            });
          document.body.appendChild(div);
          requestAnimationFrame(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
          });
          setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateY(4px)';
          }, visible);
          setTimeout(() => div.remove(), visible + 300);
        } catch (_) { /* ignore */ }
      },
      args: [message, visibleMs]
    });
  } catch (_) { /* ignore */ }
}
