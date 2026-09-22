/* profile-features.js — resilient profile interactions */
(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const themeKey = "spekco-profile-theme";
  const viewsKey = "spekco-profile-views";
  const viewsVisitorKey = "spekco-profile-last-view";
  const likesKey = "spekco-profile-likes";
  const likedKey = "spekco-profile-liked";
  const viewCooldown = 30 * 60 * 1000;
  const profileUrl = window.location.href;
  const toast = document.getElementById("toast");
  const themeButton = document.getElementById("theme-button");
  const copyButton = document.getElementById("copy-button");
  const shareButton = document.getElementById("share-button");

  const style = document.createElement("style");
  style.textContent = `
    body { overflow-x: hidden; }
    .profile-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .profile-action { min-width: 0; min-height: 44px; padding: 8px 6px; border: 1px solid rgba(255,255,255,.14); border-radius: 14px; background: rgba(255,255,255,.07); color: var(--milk); cursor: pointer; transition: transform .2s ease, background .2s ease, color .2s ease; }
    .profile-action:hover { transform: translateY(-2px); background: rgba(255,255,255,.14); }
    .profile-action:active { transform: scale(.96); }
    .profile-action.is-success { color: var(--mint); }
    .profile-engagement { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; margin-top: 16px; }
    .profile-stat, .profile-like { min-height: 32px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(190, 132, 255, .28); border-radius: 999px; background: rgba(43, 13, 69, .34); color: #eadcf6; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 5px 18px rgba(90, 32, 150, .12); font-size: 11px; line-height: 1; white-space: nowrap; }
    .profile-stat { padding: 7px 11px; }
    .profile-stat .stat-value, .profile-like .like-count { font-variant-numeric: tabular-nums; }
    .profile-like { padding: 4px 9px 4px 7px; color: #f8eafa; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: transform .2s ease, border-color .2s ease, background .2s ease, box-shadow .2s ease; }
    .profile-like:hover { border-color: rgba(255, 143, 210, .62); background: rgba(255, 143, 210, .12); }
    .profile-like:active { transform: scale(.94); }
    .profile-like .heart-icon { display: inline-block; min-width: 17px; color: var(--orchid); font-size: 17px; line-height: 1; }
    .profile-like.is-liked { border-color: rgba(255, 143, 210, .62); background: rgba(255, 143, 210, .14); box-shadow: 0 0 18px rgba(255, 100, 200, .22), inset 0 1px 0 rgba(255,255,255,.12); }
    .profile-like.is-popping .heart-icon { animation: heart-pop .45s cubic-bezier(.2,.8,.3,1.3); }
    .profile-stat.is-changing .stat-value { animation: counter-change .45s ease-out; }
    @keyframes heart-pop { 0% { transform: scale(1); } 45% { transform: scale(1.42); } 100% { transform: scale(1); } }
    @keyframes counter-change { 0% { opacity: .35; transform: translateY(4px) scale(.88); } 100% { opacity: 1; transform: none; } }
    body.light-mode { --night:#f4eafa; --milk:#29163b; --mist:#674f78; --glass:rgba(255,255,255,.64); --glass-edge:rgba(80,35,105,.16); --plum:#4b2160; --orchid:#d94b9c; }
    body.light-mode::before { opacity: .55; }
    body.light-mode .profile-stat, body.light-mode .profile-like { background: rgba(255,255,255,.42); color: var(--plum); }
    .toast { position: fixed; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); z-index: 5; max-width: calc(100vw - 28px); padding: 11px 16px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(28,14,50,.86); color: var(--milk); box-shadow: 0 10px 30px rgba(5,0,18,.35); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); opacity: 0; pointer-events: none; transform: translate(-50%, 10px); transition: opacity .25s ease, transform .25s ease; }
    .toast.is-visible { opacity: 1; transform: translate(-50%, 0); }
    .status-card p::after { content: '▌'; margin-left: 2px; color: var(--orchid); animation: blink 1s steps(2,end) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .container > .card { animation: card-in .55s both; }
    .container > .card:nth-child(1) { animation-delay: .04s; } .container > .card:nth-child(2) { animation-delay: .11s; } .container > .card:nth-child(3) { animation-delay: .18s; } .container > .card:nth-child(4) { animation-delay: .25s; }
    @keyframes card-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @media (max-width: 360px) { .profile-actions { grid-template-columns: 1fr; } .profile-engagement { margin-top: 14px; } }
    @media (prefers-reduced-motion: reduce) { .container > .card, .profile-like.is-popping .heart-icon, .profile-stat.is-changing .stat-value { animation: none; } .status-card p::after { animation: none; } }
  `;
  document.head.appendChild(style);

  function storageGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function readNumber(key) { const value = Number.parseInt(storageGet(key) || "0", 10); return Number.isFinite(value) && value >= 0 ? value : 0; }
  function formatNumber(value) { return new Intl.NumberFormat("en-US").format(value); }

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function setTheme(theme) {
    const light = theme === "light";
    body.classList.toggle("light-mode", light);
    root.style.colorScheme = light ? "light" : "dark";
    if (themeButton) themeButton.textContent = light ? "🌙 Tối" : "☀️ Sáng";
    storageSet(themeKey, light ? "light" : "dark");
  }

  function flash(button, text) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = text;
    button.classList.add("is-success");
    window.setTimeout(() => { button.textContent = original; button.classList.remove("is-success"); }, 1400);
  }

  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    try {
      const area = document.createElement("textarea");
      area.value = text; area.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy"); area.remove(); return ok;
    } catch (_) { return false; }
  }

  function initEngagement() {
    const profile = document.querySelector(".profile-card");
    const status = document.getElementById("status-badge");
    if (!profile || !status) return;

    const engagement = document.createElement("div");
    engagement.className = "profile-engagement";
    engagement.innerHTML = `
      <div class="profile-stat" id="views-stat" aria-label="Profile views"><span aria-hidden="true">👁️</span><span class="stat-value" id="views-count">0</span><span>views</span></div>
      <button class="profile-like" id="like-button" type="button" aria-pressed="false" aria-label="Like profile"><span class="heart-icon" aria-hidden="true">♡</span><span class="like-count" id="likes-count">0</span></button>
    `;
    status.insertAdjacentElement("afterend", engagement);

    const views = document.getElementById("views-count");
    const viewsStat = document.getElementById("views-stat");
    const likeButton = document.getElementById("like-button");
    const heart = likeButton?.querySelector(".heart-icon");
    const likes = document.getElementById("likes-count");

    let totalViews = readNumber(viewsKey);
    const lastView = Number(storageGet(viewsVisitorKey) || 0);
    if (!Number.isFinite(lastView) || Date.now() - lastView >= viewCooldown) {
      totalViews += 1;
      storageSet(viewsKey, String(totalViews));
      storageSet(viewsVisitorKey, String(Date.now()));
      viewsStat?.classList.add("is-changing");
    }
    if (views) views.textContent = formatNumber(totalViews);

    let totalLikes = readNumber(likesKey);
    let isLiked = storageGet(likedKey) === "true";
    const renderLike = () => {
      if (likes) likes.textContent = formatNumber(totalLikes);
      if (heart) heart.textContent = isLiked ? "♥" : "♡";
      likeButton?.classList.toggle("is-liked", isLiked);
      likeButton?.setAttribute("aria-pressed", String(isLiked));
      likeButton?.setAttribute("aria-label", isLiked ? "Unlike profile" : "Like profile");
    };
    renderLike();

    likeButton?.addEventListener("click", () => {
      isLiked = !isLiked;
      totalLikes = Math.max(0, totalLikes + (isLiked ? 1 : -1));
      storageSet(likesKey, String(totalLikes));
      storageSet(likedKey, String(isLiked));
      renderLike();
      likeButton.classList.remove("is-popping");
      void likeButton.offsetWidth;
      likeButton.classList.add("is-popping");
      if (isLiked) notify("Đã thả tim profile 💜");
    });
  }

  themeButton?.addEventListener("click", () => setTheme(body.classList.contains("light-mode") ? "dark" : "light"));
  copyButton?.addEventListener("click", async () => { const ok = await copyText(profileUrl); flash(copyButton, ok ? "✓ Đã copy" : "Không thể copy"); if (ok) notify("Đã copy link profile"); });
  shareButton?.addEventListener("click", async () => { try { if (navigator.share) { await navigator.share({ title: document.title, text: "Profile của spekco", url: profileUrl }); notify("Đã mở bảng chia sẻ"); } else { const ok = await copyText(profileUrl); notify(ok ? "Đã copy link profile" : "Trình duyệt không hỗ trợ chia sẻ"); } } catch (_) {} });
  setTheme(storageGet(themeKey) || "dark");
  initEngagement();

  const quote = document.getElementById("quote");
  if (quote) {
    const text = quote.dataset.quote || "gg"; let i = 0;
    const type = () => { quote.textContent = text.slice(0, i++); if (i <= text.length) window.setTimeout(type, 95); };
    window.setTimeout(type, 350);
  }
})();
