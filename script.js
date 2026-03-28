// ─── State ────────────────────────────────────────────────────────────────────
let detector = null;
let modelLoading = false;
let originalText = '';
let humanizedText = '';
let originalScore = 0;

// ─── Groq key ────────────────────────────────────────────────────────────────
const keyInput = document.getElementById('groq-key');
const keyStatus = document.getElementById('key-status');

// Load saved key from browser storage
const savedKey = localStorage.getItem('groq_key');
if (savedKey) { keyInput.value = savedKey; keyStatus.classList.add('ok'); }

window.checkKey = () => {
  const k = keyInput.value.trim();
  localStorage.setItem('groq_key', k);
  keyStatus.classList.toggle('ok', k.startsWith('gsk_') && k.length > 20);
};

// ─── Word count ───────────────────────────────────────────────────────────────
window.updateWC = () => {
  const t = document.getElementById('main-input').value.trim();
  const w = t ? t.split(/\s+/).length : 0;
  document.getElementById('wc').textContent = w + ' words';
};

// ─── Step bar ─────────────────────────────────────────────────────────────────
function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step-' + i);
    el.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
  }
}

// ─── Load Transformers.js model ──────────────────────────────────────────────
async function loadModel() {
  if (detector) return detector;
  if (modelLoading) {
    while (modelLoading) await new Promise(r => setTimeout(r, 200));
    return detector;
  }
  modelLoading = true;
  document.getElementById('model-status').style.display = 'flex';
  document.getElementById('foot-hint').style.display = 'none';

  const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
  env.allowLocalModels = false;

  document.getElementById('model-status-text').textContent = 'Downloading model (~50MB, one-time only)...';
  detector = await pipeline('text-classification', 'Xenova/roberta-base-openai-detector', { quantized: true });

  modelLoading = false;
  document.getElementById('model-status').style.display = 'none';
  document.getElementById('foot-hint').style.display = 'block';
  return detector;
}

// ─── Heuristic scorer (per-sentence) ─────────────────────────────────────────
function heuristicScore(sentence) {
  const s = sentence.toLowerCase();
  let score = 0;

  const aiPhrases = [
    'furthermore','moreover','additionally','consequently','nevertheless',
    'nonetheless','therefore','thus','hence','subsequently',
    'in conclusion','to summarize','to conclude','it is worth noting',
    'it is important to note','it should be noted','as a result',
    'in addition','on the other hand','in today\'s world','in the modern era',
    'plays a crucial role','plays an important role','delve into',
    'at the end of the day','when it comes to','it is essential to',
    'a comprehensive','a wide range of','the fact that','one must consider',
    'in terms of','with respect to','pertaining to','it goes without saying',
    'needless to say','it is clear that','it is evident that',
    'in light of this','building upon','leveraging','utilize','facilitate',
    'demonstrate','illustrate','encompasses','comprises'
  ];
  aiPhrases.forEach(p => { if (s.includes(p)) score += 18; });

  // Passive voice
  if (/\b(is|are|was|were|be|been|being)\s+\w+ed\b/.test(s)) score += 12;

  // Perfect sentence structure (no contractions = AI flag)
  if (!/\b(i'm|i've|don't|can't|won't|isn't|aren't|wasn't|weren't|it's|that's|there's|they're|we're|you're|wouldn't|couldn't|shouldn't)\b/.test(s)) score += 8;

  // Very formal / no casual language
  const casualMarkers = ['yeah','yep','nope','kinda','sorta','gonna','wanna','gotta','basically','literally','actually','honestly','tbh','btw'];
  if (!casualMarkers.some(c => s.includes(c))) score += 5;

  // Starts with an AI transition
  const firstWord = s.trim().split(/\s+/)[0].replace(/,$/,'');
  const aiStarters = ['furthermore','moreover','additionally','however','nevertheless','consequently','therefore','thus','overall','ultimately','importantly'];
  if (aiStarters.includes(firstWord)) score += 15;

  return Math.min(Math.round(score), 100);
}

// ─── Scan logic ───────────────────────────────────────────────────────────────
window.startScan = async () => {
  const text = document.getElementById('main-input').value.trim();
  if (!text || text.split(/\s+/).length < 15) {
    showError('Please enter at least 15 words to analyze.');
    return;
  }
  originalText = text;
  await runScan(text, false);
};

async function runScan(text, isRescan) {
  hideError();
  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  document.getElementById('loader').style.display = 'block';
  document.getElementById('loader-text').textContent = isRescan ? 'RE-SCANNING HUMANIZED TEXT...' : 'LOADING MODEL...';
  if (!isRescan) {
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('humanized-section').style.display = 'none';
  }
  setStep(2);

  try {
    const model = await loadModel();
    document.getElementById('loader-text').textContent = isRescan ? 're-scanning...' : 'ANALYZING TEXT...';

    // Truncate to ~512 tokens (~350 words) — model limit
    const truncated = text.split(/\s+/).slice(0, 350).join(' ');
    const output = await model(truncated);

    // RoBERTa labels: Real = human, Fake = AI
    let aiScore;
    const fakeResult = output.find(o => o.label === 'Fake') || output.find(o => o.label === 'LABEL_1');
    const realResult = output.find(o => o.label === 'Real') || output.find(o => o.label === 'LABEL_0');
    if (fakeResult) {
      aiScore = Math.round(fakeResult.score * 100);
    } else if (realResult) {
      aiScore = Math.round((1 - realResult.score) * 100);
    } else {
      aiScore = Math.round(output[0].score * 100);
    }

    // Blend with heuristics for a balanced score
    const hScore = computeHeuristics(text);
    const blendedScore = Math.round(aiScore * 0.7 + hScore * 0.3);

    if (!isRescan) {
      originalScore = blendedScore;
      renderResults(blendedScore, text);
      setStep(3);
    } else {
      renderRescan(blendedScore);
      setStep(4);
    }

  } catch (e) {
    showError('Detection failed: ' + e.message + '. Make sure you are connected to the internet for model download.');
    console.error(e);
    setStep(1);
  } finally {
    btn.disabled = false;
    document.getElementById('loader').style.display = 'none';
  }
}

function computeHeuristics(text) {
  const sentences = splitSentences(text);
  if (!sentences.length) return 0;

  // Burstiness — std deviation of sentence lengths
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const mean = lengths.reduce((a,b) => a+b, 0) / lengths.length;
  const variance = lengths.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const burstinessScore = Math.max(0, 60 - stdDev * 4); // Low stddev → high AI score

  // Sentence-level heuristic avg
  const sentScores = sentences.map(heuristicScore);
  const avgHeuristic = sentScores.reduce((a,b) => a+b, 0) / sentScores.length;

  return Math.round((burstinessScore * 0.4 + avgHeuristic * 0.6));
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || text.split('\n').filter(Boolean);
}

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(score, text) {
  // Circle
  const circumference = 289;
  const offset = circumference - (score / 100) * circumference;
  const ring = document.getElementById('score-ring');
  ring.style.strokeDashoffset = offset;
  const col = score >= 65 ? 'var(--red)' : score >= 40 ? 'var(--orange)' : 'var(--green)';
  ring.style.stroke = col;
  document.getElementById('score-val').textContent = score + '%';
  document.getElementById('score-val').style.color = col;

  // Verdict
  const pill = document.getElementById('verdict-pill');
  const lbl = document.getElementById('verdict-lbl');
  const desc = document.getElementById('verdict-desc');
  if (score >= 65) {
    pill.className = 'verdict-pill verd-ai';
    lbl.textContent = 'Likely AI-Generated';
    desc.textContent = 'The text shows strong AI writing patterns — uniform structure, formal transitions, and low linguistic burstiness.';
  } else if (score >= 35) {
    pill.className = 'verdict-pill verd-mixed';
    lbl.textContent = 'Mixed / AI-Assisted';
    desc.textContent = 'The text shows some AI patterns mixed with human-like variation. May have been AI-generated then edited.';
  } else {
    pill.className = 'verdict-pill verd-human';
    lbl.textContent = 'Likely Human Written';
    desc.textContent = 'The text shows natural human writing patterns — varied structure, casual tone, and linguistic burstiness.';
  }

  // Meters
  const aiP = score;
  const humP = Math.max(0, 100 - score - Math.round(score * 0.2));
  const mixP = 100 - aiP - humP;
  setMeter('m-ai','mf-ai', aiP);
  setMeter('m-mix','mf-mix', mixP);
  setMeter('m-hum','mf-hum', humP);

  // Sentence highlights
  const sentences = splitSentences(text);
  const sentHTML = sentences.map(s => {
    const sc = heuristicScore(s);
    const cls = sc >= 50 ? 's-ai' : sc >= 25 ? 's-mixed' : 's-human';
    const tip = sc >= 50 ? 'AI-like' : sc >= 25 ? 'Mixed' : 'Human-like';
    return `<span class="${cls}" title="${tip} (${sc}% AI)">${s}</span>`;
  }).join(' ');
  document.getElementById('sent-body').innerHTML = sentHTML;

  // Signals
  const signals = generateSignals(text, score);
  document.getElementById('signals-list').innerHTML = signals.map(sig => {
    const ic = sig.type === 'positive'
      ? { icon: '✓', bg: 'var(--green-dim)', color: 'var(--green)' }
      : sig.type === 'negative'
        ? { icon: '✗', bg: 'var(--red-dim)', color: 'var(--red)' }
        : { icon: '○', bg: 'rgba(255,255,255,0.05)', color: 'var(--muted2)' };
    return `<div class="signal-row">
      <div class="sig-icon" style="background:${ic.bg};color:${ic.color}">${ic.icon}</div>
      <p>${sig.text}</p>
    </div>`;
  }).join('');

  document.getElementById('results-section').style.display = 'block';
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setMeter(valId, barId, pct) {
  document.getElementById(valId).textContent = pct + '%';
  setTimeout(() => { document.getElementById(barId).style.width = pct + '%'; }, 100);
}

function generateSignals(text, score) {
  const signals = [];
  const lower = text.toLowerCase();
  const sentences = splitSentences(text);
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const stdDev = lengths.length > 1
    ? Math.sqrt(lengths.reduce((a,b) => a + Math.pow(b - (lengths.reduce((x,y)=>x+y,0)/lengths.length), 2), 0) / lengths.length)
    : 0;

  const aiCount = ['furthermore','moreover','additionally','consequently','nevertheless','therefore','delve','comprehensive','utilize','facilitate'].filter(w => lower.includes(w)).length;
  const hasContractions = /\b(i'm|don't|can't|won't|isn't|it's|that's|they're)\b/.test(lower);
  const passiveCount = (lower.match(/\b(is|are|was|were)\s+\w+ed\b/g) || []).length;
  const avgLen = lengths.reduce((a,b) => a+b, 0) / (lengths.length || 1);

  if (stdDev < 4) signals.push({ type: 'negative', text: `Sentence length is very uniform (std dev: ${stdDev.toFixed(1)} words) — AI text tends to have low variation.` });
  else signals.push({ type: 'positive', text: `Good sentence length variation detected (std dev: ${stdDev.toFixed(1)} words) — a human writing trait.` });

  if (aiCount >= 2) signals.push({ type: 'negative', text: `Found ${aiCount} AI-common transition/formal words (e.g. "furthermore", "utilize", "delve").` });
  else if (aiCount === 0) signals.push({ type: 'positive', text: 'No AI-typical transition words or filler phrases detected.' });

  if (!hasContractions) signals.push({ type: 'negative', text: 'No contractions found (e.g. "don\'t", "it\'s") — AI tends to write in full formal form.' });
  else signals.push({ type: 'positive', text: 'Natural contractions present — a common human writing marker.' });

  if (passiveCount >= 3) signals.push({ type: 'negative', text: `High passive voice usage (${passiveCount} instances) — AI text tends to overuse passive constructions.` });

  if (avgLen > 22) signals.push({ type: 'negative', text: `Average sentence length is ${Math.round(avgLen)} words — longer sentences can indicate AI generation.` });

  return signals.slice(0, 5);
}

// ─── Humanize ─────────────────────────────────────────────────────────────────
window.humanizeText = () => humanize(originalText);
window.humanizeAgain = () => humanize(humanizedText || originalText);

async function humanize(text) {
  const key = document.getElementById('groq-key').value.trim();
  if (!key || !key.startsWith('gsk_')) {
    showError('Please enter a valid Groq API key (starts with gsk_) in the top bar. Get one free at console.groq.com');
    return;
  }

  document.getElementById('humanize-btn').disabled = true;
  const againBtn = document.getElementById('humanize-again-btn');
  if (againBtn) againBtn.disabled = true;
  document.getElementById('humanize-loader').style.display = 'block';
  document.getElementById('humanized-section').style.display = 'none';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.85,
        messages: [
          {
            role: 'system',
            content: `You are an expert writing editor who rewrites AI-generated text to sound authentically human. Your rewrites must:
1. Vary sentence lengths dramatically — mix short punchy sentences with longer ones
2. Add natural imperfections: occasional contractions, informal connectors (also, plus, but, so)
3. Remove all AI-typical phrases: "furthermore", "moreover", "it is worth noting", "delve into", "comprehensive", "utilize", "facilitate", "in today's world", "plays a crucial role"
4. Break up perfectly structured paragraphs — add a casual observation, a direct statement, or an aside
5. Use active voice over passive
6. Occasionally start sentences with "And", "But", "So" — real humans do this
7. Keep the same core meaning and facts
8. Do NOT add bullet points or headers — keep it as flowing prose
Return ONLY the rewritten text, nothing else.`
          },
          { role: 'user', content: `Rewrite this to sound like a real human wrote it:\n\n${text}` }
        ]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    humanizedText = data.choices[0].message.content.trim();

    document.getElementById('original-text-display').textContent = text;
    document.getElementById('humanized-text-display').textContent = humanizedText;
    document.getElementById('humanized-section').style.display = 'block';
    document.getElementById('humanized-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Auto re-scan
    document.getElementById('rescan-panel').style.display = 'none';
    await runScan(humanizedText, true);

  } catch (e) {
    showError('Groq API error: ' + e.message);
    console.error(e);
  } finally {
    document.getElementById('humanize-btn').disabled = false;
    if (againBtn) againBtn.disabled = false;
    document.getElementById('humanize-loader').style.display = 'none';
  }
}

function renderRescan(newScore) {
  document.getElementById('sc-before').textContent = originalScore + '%';
  document.getElementById('sc-after').textContent = newScore + '%';

  const diff = originalScore - newScore;
  const badge = document.getElementById('improvement-badge');
  if (diff > 0) {
    badge.textContent = '↓ ' + diff + '% reduced';
    badge.className = 'improvement imp-good';
  } else if (diff < 0) {
    badge.textContent = '↑ ' + Math.abs(diff) + '% increased';
    badge.className = 'improvement imp-bad';
  } else {
    badge.textContent = 'No change';
    badge.className = 'improvement';
    badge.style.background = 'rgba(255,255,255,0.05)';
    badge.style.color = 'var(--muted2)';
  }

  // Rescan ring
  const offset = 289 - (newScore / 100) * 289;
  const ring = document.getElementById('rescan-ring');
  ring.style.strokeDashoffset = offset;
  const col = newScore >= 65 ? 'var(--red)' : newScore >= 40 ? 'var(--orange)' : 'var(--green)';
  ring.style.stroke = col;
  document.getElementById('rescan-val').textContent = newScore + '%';
  document.getElementById('rescan-val').style.color = col;

  const pill = document.getElementById('rescan-pill');
  const lbl = document.getElementById('rescan-lbl');
  const desc = document.getElementById('rescan-desc');
  if (newScore >= 65) {
    pill.className = 'verdict-pill verd-ai'; lbl.textContent = 'Still AI-like';
    desc.textContent = 'Still shows strong AI patterns. Try clicking "Humanize Again" for a more aggressive rewrite.';
  } else if (newScore >= 35) {
    pill.className = 'verdict-pill verd-mixed'; lbl.textContent = 'Mixed — Improved';
    desc.textContent = 'Significantly improved but some AI patterns remain. One more humanization pass may help.';
  } else {
    pill.className = 'verdict-pill verd-human'; lbl.textContent = 'Passes as Human';
    desc.textContent = 'Excellent! The text now reads as human-written. Copy and use it freely.';
  }

  document.getElementById('rescan-panel').style.display = 'block';
}

// ─── Copy ─────────────────────────────────────────────────────────────────────
window.copyHumanized = () => {
  if (!humanizedText) return;
  navigator.clipboard.writeText(humanizedText).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 8V2a1 1 0 011-1h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Copy`; btn.style.color = ''; }, 2000);
  });
};

// ─── Reset ────────────────────────────────────────────────────────────────────
window.resetAll = () => {
  document.getElementById('main-input').value = '';
  document.getElementById('wc').textContent = '0 words';
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('humanized-section').style.display = 'none';
  document.getElementById('humanize-loader').style.display = 'none';
  hideError();
  originalText = ''; humanizedText = ''; originalScore = 0;
  setStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ─── Error ────────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('err-box');
  el.textContent = msg; el.style.display = 'block';
}
function hideError() {
  document.getElementById('err-box').style.display = 'none';
}
window.showError = showError;

// ─── Preload model in background (starts immediately) ────────────────────────
let preloadStartTime = null;

window.addEventListener('load', () => {
  preloadStartTime = Date.now();
  console.log('🚀 Starting background model preload...');
  
  // Start loading immediately (no delay)
  loadModel()
    .then(() => {
      const elapsed = Date.now() - preloadStartTime;
      console.log(`✅ Model preloaded successfully in ${(elapsed/1000).toFixed(1)}s`);
    })
    .catch((e) => {
      console.warn('⚠️  Background preload failed (will retry on scan):', e);
    });
});
