/* =========================
   PROFILE CONFIG
   Chỉ cần sửa object này cho các thông tin thường dùng.
========================= */
const PROFILE_CONFIG = {
  name: "spekco",
  bio: ".gg/xnhau",
  status: { text: "sleep", emoji: "💤", tone: "neutral" },
  particles: { desktop: 148, mobile: 78, mobileBreakpoint: 600 }
};

(() => {
  "use strict";
  const root = document.documentElement;
  const toast = document.getElementById("toast");
  const dust = document.getElementById("space-dust");
  const badge = document.getElementById("status-badge");
  const dot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const statusEmoji = document.getElementById("status-emoji");
  const statusEmojiText = document.getElementById("status-emoji-text");
  const name = document.getElementById("profile-name");
  const quote = document.getElementById("quote");

  function applyConfig() {
    if (name) { name.textContent = PROFILE_CONFIG.name; document.title = `${PROFILE_CONFIG.name} | Profile`; }
    if (quote) { quote.dataset.quote = PROFILE_CONFIG.bio; typeQuote(); }
    if (!badge || !statusText) return;
    const status = PROFILE_CONFIG.status;
    statusText.textContent = status.text;
    if (statusEmoji) statusEmoji.textContent = status.emoji;
    if (statusEmojiText) statusEmojiText.textContent = status.emoji;
    badge.dataset.tone = status.tone || "neutral";
    const inactive = /offline|away|sleep/i.test(status.text);
    badge.classList.toggle("offline-text", inactive);
    dot?.classList.toggle("offline", inactive);
  }

  function typeQuote() {
    if (!quote) return;
    const text = quote.dataset.quote || "";
    let index = 0;
    const type = () => { quote.textContent = text.slice(0, index++); if (index <= text.length) window.setTimeout(type, 85); };
    window.setTimeout(type, 300);
  }

  function createParticles() {
    if (!dust) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const mobile = window.matchMedia?.(`(max-width: ${PROFILE_CONFIG.particles.mobileBreakpoint}px)`).matches;
    let count = mobile ? PROFILE_CONFIG.particles.mobile : PROFILE_CONFIG.particles.desktop;
    if (lowPower) count = Math.round(count * .72);
    if (reduced) count = Math.min(count, 24);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("i");
      const depth = i % 11 === 0 ? "fore" : i % 3 === 0 ? "mid" : "back";
      const size = depth === "fore" ? 2.2 + Math.random() * 2.3 : depth === "mid" ? 1.3 + Math.random() * 1.5 : .7 + Math.random() * 1.2;
      particle.className = depth;
      particle.style.setProperty("--x", `${Math.random() * 100}%`);
      particle.style.setProperty("--y", `${Math.random() * 100}%`);
      particle.style.setProperty("--size", `${size.toFixed(2)}px`);
      particle.style.setProperty("--alpha", (depth === "fore" ? .42 : depth === "mid" ? .28 : .16 + Math.random() * .2).toFixed(2));
      particle.style.setProperty("--glow", `${(depth === "fore" ? 7 : 3 + Math.random() * 4).toFixed(1)}px`);
      particle.style.setProperty("--move-x", `${(-10 + Math.random() * 20).toFixed(1)}px`);
      particle.style.setProperty("--move-y", `${(-18 + Math.random() * 28).toFixed(1)}px`);
      particle.style.setProperty("--duration", `${(16 + Math.random() * 24).toFixed(1)}s`);
      particle.style.setProperty("--delay", `${(-Math.random() * 30).toFixed(1)}s`);
      fragment.appendChild(particle);
    }
    dust.appendChild(fragment);
  }

  window.spekcoNotify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(window.spekcoNotify.timer);
    window.spekcoNotify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  root.style.colorScheme = "dark";
  applyConfig();
  createParticles();
})();
