// Export vocabulary as JSON file
function exportVocabulary() {
  chrome.storage.local.get({ vocabulary: [] }, data => {
    const blob = new Blob([JSON.stringify(data.vocabulary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
}

// Import vocabulary from JSON file
function importVocabulary(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      // Remove duplicates and trim
      const clean = Array.from(new Set(imported.map(w => w.trim()).filter(Boolean)));
      chrome.storage.local.set({ vocabulary: clean }, () => {
        renderList(clean);
      });
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
}
let voiceName = '';
let speechRate = 1.0;

function save(words) {
  chrome.storage.local.set({ vocabulary: words }, () => {
    renderList(words);
  });
}

function renderList(words) {
  const list = document.getElementById('list');
  list.innerHTML = '';
  words.forEach((word, index) => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.textContent = word;
    span.className = 'word';
    li.appendChild(span);

    const pronounceBtn = document.createElement('button');
    pronounceBtn.textContent = '🔊';
    pronounceBtn.title = 'Pronounce';
    pronounceBtn.addEventListener('click', () => {
      chrome.tts.speak(word, {
        lang: 'en-US',
        voiceName: voiceName || undefined,
        rate: speechRate,
      });
    });
    li.appendChild(pronounceBtn);

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => {
      const updated = prompt('Edit word', word);
      if (!updated) return;
      const newWord = updated.trim();
      if (!newWord) return;
      if (words.some((w, i) => i !== index && w === newWord)) {
        return;
      }
      words[index] = newWord;
      save(words);
    });
    li.appendChild(editBtn);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '🗑️';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => {
      words.splice(index, 1);
      save(words);
    });
    li.appendChild(removeBtn);

    list.appendChild(li);
  });
}

function load() {
  chrome.storage.local.get({ vocabulary: [] }, data => {
    renderList(data.vocabulary);
  });
}

function setupTabs() {
  document.getElementById('tab-vocab').addEventListener('click', () => showSection('vocab'));
  document.getElementById('tab-dict').addEventListener('click', () => showSection('dict'));
}

function showSection(section) {
  document.getElementById('vocab-section').hidden = section !== 'vocab';
  document.getElementById('dict-section').hidden = section !== 'dict';
  document.getElementById('tab-vocab').classList.toggle('active', section === 'vocab');
  document.getElementById('tab-dict').classList.toggle('active', section === 'dict');
}

function initSettings() {
  const voiceSelect = document.getElementById('voice-select');
  const rateSlider = document.getElementById('speech-rate');
  const rateLabel = document.getElementById('rate-label');

  chrome.tts.getVoices(voices => {
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceName;
      opt.textContent = `${v.voiceName} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });

    chrome.storage.local.get({ voiceName: '', speechRate: 1.0 }, data => {
      voiceName = data.voiceName;
      speechRate = data.speechRate;
      if (voiceName) voiceSelect.value = voiceName;
      rateSlider.value = speechRate;
      rateLabel.textContent = speechRate.toFixed(1);
    });
  });

  voiceSelect.addEventListener('change', () => {
    voiceName = voiceSelect.value;
    chrome.storage.local.set({ voiceName });
  });

  rateSlider.addEventListener('input', () => {
    speechRate = parseFloat(rateSlider.value);
    rateLabel.textContent = speechRate.toFixed(1);
    chrome.storage.local.set({ speechRate });
  });
}

function setupDictionary() {
  const input = document.getElementById('lookup-input');
  const btn = document.getElementById('lookup-btn');
  const pronounceBtn = document.getElementById('lookup-pronounce');
  const defDiv = document.getElementById('definition');

  async function lookup() {
    const word = input.value.trim();
    if (!word) return;
    defDiv.textContent = 'Loading...';
    pronounceBtn.disabled = true;
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      defDiv.textContent = meaning || 'No definition found.';
      pronounceBtn.disabled = false;
      pronounceBtn.onclick = () =>
        chrome.tts.speak(word, {
          lang: 'en-US',
          voiceName: voiceName || undefined,
          rate: speechRate,
        });
    } catch (e) {
      defDiv.textContent = 'Definition not found.';
    }
  }

  btn.addEventListener('click', lookup);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') lookup();
  });
}

function setupStudy() {
  const btn = document.getElementById('study-mode');
  btn.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('study.html')
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  load();
  setupTabs();
  setupDictionary();
  setupStudy();
  // Setup import/export buttons
  const exportBtn = document.getElementById('export-vocab');
  const importBtn = document.getElementById('import-vocab');
  const importFile = document.getElementById('import-file');
  if (exportBtn) exportBtn.addEventListener('click', exportVocabulary);
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', e => {
      if (importFile.files && importFile.files[0]) {
        importVocabulary(importFile.files[0]);
        importFile.value = '';
      }
    });
  }
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'vocabulary-updated') {
    load();
  }
});
