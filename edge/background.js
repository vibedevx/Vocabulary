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

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'addToVocabulary' && info.selectionText) {
    const text = info.selectionText.trim();
    if (text) {
      chrome.storage.local.get({ vocabulary: [] }, ({ vocabulary }) => {
        if (!vocabulary.includes(text)) {
          vocabulary.push(text);
          chrome.storage.local.set({ vocabulary }, () => {
            chrome.runtime.sendMessage({ type: 'vocabulary-updated' });
          });
        }
      });
    }
  }
});
