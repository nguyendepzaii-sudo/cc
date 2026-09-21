/* profile-features.js — tiện ích nhỏ cho profile */
(() => {
  const root = document.documentElement;
  const profileUrl = window.location.href;
  const themeKey = "spekco-profile-theme";

  const style = document.createElement("style");
  style.textContent = `
    .profile-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .profile-action { min-width:0; min-height:42px; border:1px solid rgba(255,255,255,.14); border-radius:14px; background:rgba(255,255,255,.07); color:var(--milk); cursor:pointer; font:500 12px var(--font-body); transition:transform .18s ease, background .18s ease; }
    .profile-action:hover { transform:translateY(-2px); background:rgba(255,255,255,.14); }
    .profile-action:active { transform:scale(.96); }
    .profile-action.is-success { color:var(--mint); }
    body.light-mode { --night:#f4eafa; --milk:#29163b; --mist:#674f78; --glass:rgba(255,255,255,.58); --glass-edge:rgba(80,35,105,.16); --plum:#4b2160; }
    body.light-mode::before { opacity:.55; }
    @media (max-width:360px) { .profile-actions { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);

  const themeButton = document.getElementById("theme-button");
  const copyButton = document.getElementById("copy-button");
  const shareButton = document.getElementById("share-button");

  function setTheme(theme) {
    document.body.classList.toggle("light-mode", theme === "light");
    if (themeButton) themeButton.textContent = theme === "light" ? "🌙 Tối" : "☀️ Sáng";
    localStorage.setItem(themeKey, theme);
  }

  function flash(button, text) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = text;
    button.classList.add("is-success");
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-success");
    }, 1400);
  }

  themeButton?.addEventListener("click", () => {
    setTheme(document.body.classList.contains("light-mode") ? "dark" : "light");
  });

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      flash(copyButton, "✓ Đã copy");
    } catch {
      flash(copyButton, "Hãy copy URL");
    }
  });

  shareButton?.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: document.title, text: "Profile của spekco", url: profileUrl }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        flash(shareButton, "✓ Đã copy");
      } catch {
        flash(shareButton, "Hãy copy URL");
      }
    }
  });

  setTheme(localStorage.getItem(themeKey) || "dark");
})();
