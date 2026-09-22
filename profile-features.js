/* profile-features.js — resilient profile interactions */
(() => {
  "use strict";
  const root = document.documentElement;
  const body = document.body;
  const themeKey = "spekco-profile-theme";
  const profileUrl = window.location.href;
  const toast = document.getElementById("toast");
  const themeButton = document.getElementById("theme-button");
  const copyButton = document.getElementById("copy-button");
  const shareButton = document.getElementById("share-button");

  const style = document.createElement("style");
  style.textContent = `
    body { overflow-x:hidden; }
    .profile-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .profile-action { min-width:0; min-height:44px; padding:8px 6px; border:1px solid rgba(255,255,255,.14); border-radius:14px; background:rgba(255,255,255,.07); color:var(--milk); cursor:pointer; font:500 12px var(--font-body); transition:transform .2s ease,background .2s ease,color .2s ease; }
    .profile-action:hover { transform:translateY(-2px); background:rgba(255,255,255,.14); }
    .profile-action:active { transform:scale(.96); }
    .profile-action.is-success { color:var(--mint); }
    body.light-mode { --night:#f4eafa; --milk:#29163b; --mist:#674f78; --glass:rgba(255,255,255,.64); --glass-edge:rgba(80,35,105,.16); --plum:#4b2160; --orchid:#d94b9c; }
    body.light-mode::before { opacity:.55; }
    .toast { position:fixed; left:50%; bottom:max(22px,env(safe-area-inset-bottom)); z-index:5; max-width:calc(100vw - 28px); padding:11px 16px; border:1px solid rgba(255,255,255,.18); border-radius:999px; background:rgba(34,15,55,.88); color:#fff; box-shadow:0 10px 30px rgba(0,0,0,.3); opacity:0; pointer-events:none; transform:translate(-50%,12px); transition:opacity .22s ease,transform .22s ease; font-size:13px; }
    .toast.is-visible { opacity:1; transform:translate(-50%,0); }
    .status-card p::after { content:'▌'; margin-left:2px; color:var(--orchid); animation:blink 1s steps(2,end) infinite; }
    @keyframes blink { 50% { opacity:0; } }
    .container > .card { animation:card-in .55s both; }
    .container > .card:nth-child(1) { animation-delay:.04s; } .container > .card:nth-child(2) { animation-delay:.11s; } .container > .card:nth-child(3) { animation-delay:.18s; } .container > .card:nth-child(4) { animation-delay:.25s; }
    @keyframes card-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
    @media (max-width:360px) { .profile-actions { grid-template-columns:1fr; } }
    @media (prefers-reduced-motion:reduce) { .container > .card { animation:none; } .status-card p::after { animation:none; } }
  `;
  document.head.appendChild(style);

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }
  function storageGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
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
    button.textContent = text; button.classList.add("is-success");
    window.setTimeout(() => { button.textContent = original; button.classList.remove("is-success"); }, 1400);
  }
  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    try { const area = document.createElement("textarea"); area.value = text; area.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(area); area.select(); const ok = document.execCommand("copy"); area.remove(); return ok; } catch (_) { return false; }
  }
  themeButton?.addEventListener("click", () => setTheme(body.classList.contains("light-mode") ? "dark" : "light"));
  copyButton?.addEventListener("click", async () => { const ok = await copyText(profileUrl); flash(copyButton, ok ? "✓ Đã copy" : "Không thể copy"); if (ok) notify("Đã copy link profile ✨"); });
  shareButton?.addEventListener("click", async () => { try { if (navigator.share) { await navigator.share({ title: document.title, text: "Profile của spekco", url: profileUrl }); notify("Đã mở bảng chia sẻ"); } else { const ok = await copyText(profileUrl); flash(shareButton, ok ? "✓ Đã copy" : "Không thể copy"); if (ok) notify("Đã copy link profile ✨"); } } catch (_) {} });
  setTheme(storageGet(themeKey) || "dark");

  const quote = document.getElementById("quote");
  if (quote) {
    const text = quote.dataset.quote || "gg"; let i = 0;
    const type = () => { quote.textContent = text.slice(0, i++); if (i <= text.length) window.setTimeout(type, 95); };
    window.setTimeout(type, 350);
  }
})();
