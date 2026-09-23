/* GUEST NAME FROM URL */
(function(){
  const params = new URLSearchParams(window.location.search);
  let guest = params.get('to');
  if (!guest) guest = 'Tamu Terhormat';
  guest = guest.trim();
  if (guest.length > 60) guest = guest.substring(0, 60);
  
  const coverName = document.getElementById('guestCover');
  if (coverName) coverName.textContent = guest;
})();

/* OPEN INVITATION + MUSIC */
const openButton = document.getElementById('openInvitation');
const opening = document.getElementById('opening');
const music = document.getElementById('weddingMusic');
const musicButton = document.getElementById('musicButton');
let musicPlaying = false;
let musicUserPaused = false;
let musicFadeFrame = null;
let musicFadeToken = 0;
let activePanelName = 'home';

const MUSIC_LEVELS = {
  home: 0.48, couple: 0.44, prayer: 0.28, etiquette: 0.42, gallery: 0.46, wishes: 0.35, closing: 0.20
};

function targetMusicLevel() {
  if (document.body.classList.contains('closing-final')) return 0.01;
  return MUSIC_LEVELS[activePanelName] || 0.42;
}

function fadeMusicTo(target, duration, onComplete) {
  if (!music) return;
  const safeTarget = Math.max(0, Math.min(1, Number(target) || 0));
  const safeDuration = Math.max(0, Number(duration) || 0);
  const token = ++musicFadeToken;

  if (musicFadeFrame !== null) {
    window.cancelAnimationFrame(musicFadeFrame);
    musicFadeFrame = null;
  }

  const from = Number.isFinite(music.volume) ? music.volume : 0;
  if (safeDuration === 0 || Math.abs(from - safeTarget) < 0.002) {
    music.volume = safeTarget;
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  const start = performance.now();
  function step(now) {
    if (token !== musicFadeToken) return;
    const progress = Math.min((now - start) / safeDuration, 1);
    const eased = progress * progress * (3 - 2 * progress);
    music.volume = from + ((safeTarget - from) * eased);

    if (progress < 1) {
      musicFadeFrame = window.requestAnimationFrame(step);
    } else {
      musicFadeFrame = null;
      music.volume = safeTarget;
      if (typeof onComplete === 'function') onComplete();
    }
  }
  musicFadeFrame = window.requestAnimationFrame(step);
}

function syncAmbientAudio(duration) {
  if (!music || !musicPlaying || musicUserPaused) return;
  if (document.hidden) {
    ++musicFadeToken;
    if (musicFadeFrame !== null) { window.cancelAnimationFrame(musicFadeFrame); musicFadeFrame = null; }
    music.volume = Math.min(music.volume, 0.06);
    return;
  }
  fadeMusicTo(targetMusicLevel(), duration || 1200);
}

function startAmbientAudio() {
  if (!music || !music.currentSrc) return;
  musicUserPaused = false;
  ++musicFadeToken;
  if (musicFadeFrame !== null) { window.cancelAnimationFrame(musicFadeFrame); musicFadeFrame = null; }
  music.volume = 0;
  music.play().then(function(){
    musicPlaying = true;
    if (musicButton) musicButton.innerHTML = '♫';
    fadeMusicTo(targetMusicLevel(), 2600);
  }).catch(function(){
    musicPlaying = false;
    if (musicButton) musicButton.innerHTML = '♪';
  });
}

/* SECTION NAVIGATION */
const weddingPanels = document.querySelectorAll('.wedding-panel');
const navButtons = document.querySelectorAll('.nav-button');
const weddingNav = document.getElementById('weddingNav');
const navTrack = document.getElementById('navTrack');
const navIndicator = document.getElementById('navIndicator');

function updateNavIndicator(activeButton) {
  if (!navIndicator || !activeButton || !navTrack) return;
  const x = activeButton.offsetLeft;
  navIndicator.style.width = activeButton.offsetWidth + 'px';
  navIndicator.style.setProperty('--nav-x', x + 'px');
}

function applyOpenedInvitationUI() {
  if (opening) opening.classList.add('closed');
  document.body.classList.remove('locked');
  document.body.classList.add('invitation-open');
  if (weddingNav) weddingNav.classList.add('nav-visible');
  if (musicButton) musicButton.classList.add('show');
}
function markInvitationOpen() { applyOpenedInvitationUI(); }
function repairRestoredInvitationUI() {
  const domLooksOpened = document.body.classList.contains('invitation-open') || (opening && opening.classList.contains('closed'));
  if (!domLooksOpened) return;
  document.body.classList.remove('locked');
  document.body.classList.add('invitation-open');
  if (opening) opening.classList.add('closed');
  if (weddingNav) weddingNav.classList.add('nav-visible');
  if (musicButton) musicButton.classList.add('show');
}

window.addEventListener('pageshow', function(event){
  if (event.persisted) { window.requestAnimationFrame(repairRestoredInvitationUI); }
});
document.addEventListener('visibilitychange', function(){
  if (!document.hidden && document.body.classList.contains('invitation-open')) {
    window.requestAnimationFrame(repairRestoredInvitationUI);
  }
  if (!music || musicUserPaused) return;
  if (document.hidden) { syncAmbientAudio(0); return; }
  if (document.body.classList.contains('invitation-open')) {
    if (music.paused && musicPlaying) {
      music.volume = 0.06;
      music.play().then(function(){ fadeMusicTo(targetMusicLevel(), 1600); }).catch(function(){});
    } else if (musicPlaying) {
      fadeMusicTo(targetMusicLevel(), 1600);
    }
  }
});

function stableRevealLayerFor(panel) {
  if (!panel) return null;
  if (panel.id === 'closingPanel') return null; 
  if (panel.id === 'homePanel') return panel.querySelector('.hero-inner');
  return panel.querySelector('.container');
}

function prepareStablePanelReveal(panel, animateReveal) {
  const layer = stableRevealLayerFor(panel);
  if (!layer) return null;
  layer.classList.add('stable-reveal-layer');
  layer.classList.remove('stable-reveal-run');
  if (animateReveal === false) { layer.classList.remove('stable-reveal-prep'); return layer; }
  layer.classList.add('stable-reveal-prep');
  return layer;
}

let stableRevealRAF = 0;
let stableRevealToken = 0;
function startStablePanelReveal(layer, animateReveal) {
  if (!layer || animateReveal === false) return;
  stableRevealToken += 1;
  const token = stableRevealToken;
  if (stableRevealRAF) cancelAnimationFrame(stableRevealRAF);
  layer.classList.remove('stable-reveal-prep');
  layer.style.opacity = '0';
  let lastTime = 0;
  let virtualElapsed = 0;
  const duration = document.documentElement.classList.contains('android-safe') ? 620 : 760;

  function frame(now) {
    if (token !== stableRevealToken) return;
    if (!lastTime) lastTime = now;
    const delta = Math.min(Math.max(now - lastTime, 0), 34);
    lastTime = now;
    virtualElapsed += delta;
    const raw = Math.min(virtualElapsed / duration, 1);
    const eased = raw * raw * (3 - 2 * raw);
    layer.style.opacity = String(eased);
    if (raw < 1) { stableRevealRAF = requestAnimationFrame(frame); } 
    else { stableRevealRAF = 0; layer.style.opacity = ''; }
  }
  stableRevealRAF = requestAnimationFrame(function(){ stableRevealRAF = requestAnimationFrame(frame); });
}

function showWeddingPanel(panelName, animateReveal) {
  let targetPanel = Array.from(weddingPanels).find(function(panel){ return panel.getAttribute('data-panel') === panelName; }) || null;
  const stableRevealLayer = prepareStablePanelReveal(targetPanel, animateReveal);
  activePanelName = panelName;
  document.body.setAttribute('data-active-panel', panelName);

  const closingTarget = document.getElementById('closingPanel');
  if (panelName === 'closing') {
    document.body.classList.remove('closing-final');
    if (closingTarget) {
      closingTarget.classList.remove('closing-final-frame', 'cinematic-active');
      void closingTarget.offsetHeight;
      window.requestAnimationFrame(function(){ closingTarget.classList.add('cinematic-active'); });
    }
  } else {
    document.body.classList.remove('closing-final');
    if (closingTarget) { closingTarget.classList.remove('closing-final-frame', 'cinematic-active'); }
  }
  if (document.body.classList.contains('invitation-open') && weddingNav) { weddingNav.classList.add('nav-visible'); }

  weddingPanels.forEach(function(panel){
    const isTarget = panel.getAttribute('data-panel') === panelName;
    panel.classList.toggle('is-active', isTarget);
    panel.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
    if (isTarget) {
      panel.scrollTop = 0;
      if (panelName === 'closing') {
        resetClosingSignoff();
        window.requestAnimationFrame(function(){ window.requestAnimationFrame(scheduleClosingSignoffCheck); });
      }
    }
  });

  navButtons.forEach(function(button){
    const isTarget = button.getAttribute('data-target') === panelName;
    button.classList.toggle('is-active', isTarget);
    button.setAttribute('aria-current', isTarget ? 'page' : 'false');
    if (isTarget) {
      button.scrollIntoView({behavior: 'auto', block: 'nearest', inline: 'center'});
      window.requestAnimationFrame(function(){ updateNavIndicator(button); });
    }
  });

  if (targetPanel) {
    targetPanel.querySelectorAll('.reveal').forEach(function(element){ element.classList.add('active'); });
    startStablePanelReveal(stableRevealLayer, animateReveal);
  }

  if (document.body.classList.contains('invitation-open')) {
    syncAmbientAudio(panelName === 'closing' ? 1800 : (panelName === 'prayer' ? 1500 : 1100));
  }
}

navButtons.forEach(function(button){
  button.addEventListener('click', function(){ showWeddingPanel(button.getAttribute('data-target'), true); });
});

/* ==========================================
   SUPABASE GUESTBOOK (WISHES) INTEGRATION
   ========================================== */
const SUPABASE_URL = "https://nzmhtadlfzfyxjoagwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_UyQyTKnZvE-jSHBsqGvZxQ_PWFSUxG9";

const wishesForm = document.querySelector('#wishesForm'); 
const messagesList = document.querySelector('.messages-list');

// Fungsi untuk mengambil data ucapan dari Supabase
async function loadWishes() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/wishes?select=*&order=id.desc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    
    if (messagesList && Array.isArray(data)) {
      messagesList.innerHTML = '';
      data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'message-card';
        card.innerHTML = `
          <div class="message-name">${escapeHtml(item.name)}</div>
          <div class="message-text collapsed">${escapeHtml(item.message)}</div>
          <span class="message-time">${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : 'Baru saja'}</span>
        `;
        messagesList.appendChild(card);
        setupMessageCard(card, item.message);
      });
    }
  } catch (error) {
    console.error('Gagal memuat ucapan:', error);
  }
}

// Fungsi untuk tombol "Read More / Selengkapnya" pada kartu pesan
function setupMessageCard(cardElement, textContent) {
  const textDiv = cardElement.querySelector('.message-text');
  if (textContent && textContent.length > 120) {
    textDiv.classList.add('collapsed');
    const btn = document.createElement('button');
    btn.className = 'read-more-btn';
    btn.textContent = 'Selengkapnya';
    
    let isExpanded = false;
    btn.addEventListener('click', function() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        textDiv.classList.remove('collapsed');
        btn.textContent = 'Sembunyikan';
      } else {
        textDiv.classList.add('collapsed');
        btn.textContent = 'Selengkapnya';
      }
    });
    textDiv.after(btn);
  }
}

// Fungsi untuk mengirim ucapan baru saat form disubmit
if (wishesForm) {
  wishesForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nameInput = wishesForm.querySelector('input[name="name"]') || document.getElementById('wishName');
    const messageInput = wishesForm.querySelector('textarea[name="message"]') || document.getElementById('wishText');
    
    if (!nameInput || !messageInput) return;

    const payload = {
      name: nameInput.value.trim(),
      message: messageInput.value.trim()
    };

    if (!payload.name || !payload.message) {
      alert("Nama dan pesan wajib diisi!");
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/wishes`, {
        method: 'POST',
        headers: { 
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        nameInput.value = '';
        messageInput.value = '';
        alert("Ucapan berhasil dikirim!");
        loadWishes(); // Refresh otomatis daftar ucapan
      } else {
        alert("Gagal mengirim ucapan.");
      }
    } catch (error) {
      console.error('Gagal mengirim ucapan:', error);
    }
  });
}

// Fungsi keamanan untuk mencegah celah HTML Injection
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Panggil fungsi muat ucapan saat halaman pertama dibuka
loadWishes();

/* WEDDING DAY SCROLL REVEAL */
const homePanel = document.getElementById('homePanel');
const eventScrollReveals = document.querySelectorAll('.event-section .scroll-reveal');
if ('IntersectionObserver' in window && homePanel) {
  const eventRevealObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        eventRevealObserver.unobserve(entry.target);
      }
    });
  }, { root: homePanel, threshold: 0.08, rootMargin: '0px 0px 4% 0px' });
  eventScrollReveals.forEach(function(element){ eventRevealObserver.observe(element); });
} else {
  eventScrollReveals.forEach(function(element){ element.classList.add('active'); });
}

const eventTimeline = document.getElementById('eventTimeline');
if (eventTimeline) {
  const activateTimeline = function(){ eventTimeline.classList.add('active'); };
  if ('IntersectionObserver' in window && homePanel) {
    const timelineObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) { activateTimeline(); timelineObserver.disconnect(); }
      });
    }, {root: homePanel, threshold: .14});
    timelineObserver.observe(eventTimeline);
  } else { activateTimeline(); }
}

window.addEventListener('resize', function(){
  const activeButton = document.querySelector('.nav-button.is-active');
  if (activeButton) window.requestAnimationFrame(function(){ updateNavIndicator(activeButton); });
}, {passive:true});
if (navTrack) {
  navTrack.addEventListener('scroll', function(){
    const activeButton = document.querySelector('.nav-button.is-active');
    if (activeButton) updateNavIndicator(activeButton);
  }, {passive:true});
}

/* CLOSING SIGN-OFF SCROLL REVEAL */
const closingPanel = document.getElementById('closingPanel');
const closingSignoffBlock = document.getElementById('closingSignoffBlock');
const closingSignoffLines = closingSignoffBlock ? Array.prototype.slice.call(closingSignoffBlock.querySelectorAll('.closing-signoff-fade')) : [];
let closingSignoffRevealed = false;
let closingSignoffFrame = null;
let closingSignoffAnimationFrame = null;
let closingSignoffRunId = 0;

function resetClosingSignoff() {
  closingSignoffRunId += 1;
  closingSignoffRevealed = false;
  document.body.classList.remove('closing-final');
  if (closingPanel) closingPanel.classList.remove('closing-final-frame');
  if (closingSignoffAnimationFrame !== null) { window.cancelAnimationFrame(closingSignoffAnimationFrame); closingSignoffAnimationFrame = null; }
  closingSignoffLines.forEach(function(item){ item.style.opacity = '0'; item.classList.remove('is-visible'); });
  if (closingSignoffBlock) void closingSignoffBlock.offsetHeight;
}

function revealClosingSignoff() {
  if (!closingSignoffBlock || closingSignoffRevealed || closingSignoffLines.length < 3) return;
  closingSignoffRevealed = true;
  const runId = ++closingSignoffRunId;
  const startOffsets = [0, 700, 1400];
  const fadeDurations = [1350, 1850, 1500];

  closingSignoffLines.forEach(function(item){ item.style.opacity = '0'; });
  void closingSignoffBlock.offsetHeight;

  window.requestAnimationFrame(function(){
    if (runId !== closingSignoffRunId) return;
    window.requestAnimationFrame(function(){
      if (runId !== closingSignoffRunId) return;
      let virtualElapsed = 0;
      let previousFrame = null;

      function animateSignoffFrame(now) {
        if (runId !== closingSignoffRunId) return;
        if (previousFrame === null) previousFrame = now;
        let delta = now - previousFrame;
        previousFrame = now;
        if (!Number.isFinite(delta) || delta < 0) delta = 16.67;
        delta = Math.min(delta, 34);
        virtualElapsed += delta;
        let animationRunning = false;

        closingSignoffLines.forEach(function(item, index){
          const localTime = virtualElapsed - startOffsets[index];
          if (localTime <= 0) { item.style.opacity = '0'; animationRunning = true; return; }
          const progress = Math.min(localTime / fadeDurations[index], 1);
          const eased = progress * progress * (3 - (2 * progress));
          item.style.opacity = eased.toFixed(4);
          if (progress < 1) animationRunning = true;
        });

        if (animationRunning) {
          closingSignoffAnimationFrame = window.requestAnimationFrame(animateSignoffFrame);
        } else {
          closingSignoffLines.forEach(function(item){ item.style.opacity = '1'; });
          closingSignoffAnimationFrame = null;
          if (closingPanel && closingPanel.classList.contains('is-active')) {
            closingPanel.classList.add('closing-final-frame');
            document.body.classList.add('closing-final');
            if (musicPlaying && !musicUserPaused) { fadeMusicTo(0.11, 2600); }
          }
        }
      }
      closingSignoffAnimationFrame = window.requestAnimationFrame(animateSignoffFrame);
    });
  });
}

function checkClosingSignoffPosition() {
  closingSignoffFrame = null;
  if (!closingPanel || !closingSignoffBlock || closingSignoffRevealed) return;
  if (!closingPanel.classList.contains('is-active')) return;
  const panelRect = closingPanel.getBoundingClientRect();
  const blockRect = closingSignoffBlock.getBoundingClientRect();
  const triggerLine = panelRect.top + (panelRect.height * 0.80);
  if (blockRect.top <= triggerLine && blockRect.bottom >= panelRect.top) { revealClosingSignoff(); }
}

function scheduleClosingSignoffCheck() {
  if (closingSignoffFrame !== null) return;
  closingSignoffFrame = window.requestAnimationFrame(checkClosingSignoffPosition);
}

if (closingPanel && closingSignoffBlock) {
  resetClosingSignoff();
  closingPanel.addEventListener('scroll', scheduleClosingSignoffCheck, { passive: true });
  window.addEventListener('resize', scheduleClosingSignoffCheck, { passive: true });
}

if (openButton) {
  openButton.addEventListener('click', function(){
    if (opening) opening.classList.add('opening-leave');
    markInvitationOpen();
    window.setTimeout(function(){ if (opening) opening.classList.remove('opening-leave'); }, 1900);

    document.body.classList.remove('doves-fly');
    window.setTimeout(function(){
      document.body.classList.add('doves-fly');
    }, 1100);

    showWeddingPanel('home', true);
    if (musicButton) musicButton.classList.add('show');
    startAmbientAudio();
  });
}

/* MUSIC CONTROL */
if (musicButton) {
  musicButton.addEventListener('click', function(){
    if (!music || !music.currentSrc) return;
    if (musicPlaying && !music.paused) {
      musicUserPaused = true;
      fadeMusicTo(0, 520, function(){
        music.pause();
        musicPlaying = false;
        musicButton.innerHTML = '♪';
      });
      return;
    }
    musicUserPaused = false;
    music.volume = 0;
    music.play().then(function(){
      musicPlaying = true;
      musicButton.innerHTML = '♫';
      fadeMusicTo(targetMusicLevel(), 1200);
    }).catch(function(){
      musicPlaying = false;
      musicButton.innerHTML = '♪';
    });
  });
}

/* COUNTDOWN */
const weddingDate = new Date('2026-12-13T16:00:00+07:00');
function updateCountdown(){
  const now = new Date();
  let distance = weddingDate.getTime() - now.getTime();
  if (distance < 0) distance = 0;
  
  const d = document.getElementById('days');
  const h = document.getElementById('hours');
  const m = document.getElementById('minutes');
  const s = document.getElementById('seconds');
  
  if (d) d.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2,'0');
  if (h) h.textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2,'0');
  if (m) m.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2,'0');
  if (s) s.textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* INITIAL REVEAL FALLBACK */
const initiallyActivePanel = document.querySelector('.wedding-panel.is-active');
if (initiallyActivePanel) {
  document.body.setAttribute('data-active-panel', initiallyActivePanel.getAttribute('data-panel') || 'home');
  initiallyActivePanel.querySelectorAll('.reveal').forEach(function(element){
    element.classList.add('active');
  });
}
const initialNavButton = document.querySelector('.nav-button.is-active');
if (initialNavButton) {
  window.requestAnimationFrame(function(){ updateNavIndicator(initialNavButton); });
}
