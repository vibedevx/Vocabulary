let words = [];
let index = 0;
let voiceName = '';
let speechRate = 1.0;

function showWord() {
  const wordDiv = document.getElementById('word');
  if (words.length === 0) {
    wordDiv.textContent = 'No words available';
    document.getElementById('pronounce').disabled = true;
    document.getElementById('next').disabled = true;
  } else {
    wordDiv.textContent = words[index];
    document.getElementById('pronounce').disabled = false;
    document.getElementById('next').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({ vocabulary: [], voiceName: '', speechRate: 1.0 }, data => {
    words = data.vocabulary;
    voiceName = data.voiceName;
    speechRate = data.speechRate;
    showWord();
  });

  document.getElementById('pronounce').addEventListener('click', () => {
    if (!words.length) return;
    const word = words[index];
    chrome.tts.speak(word, {
      lang: 'en-US',
      voiceName: voiceName || undefined,
      rate: speechRate,
    });
  });

  document.getElementById('next').addEventListener('click', () => {
    if (!words.length) return;
    index = (index + 1) % words.length;
    showWord();
  });
});
