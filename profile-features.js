const SITE_CONFIG = {
  profile: {
    name: "spekco",
    avatar: "avatar.jpg",
    bio: ".gg/xnhau",
    titleSuffix: "Profile"
  },
  status: { text: "sleep", icon: "💤", tone: "neutral" },
  music: {
    label: "now playing",
    timezone: "Asia/Shanghai",
    songs: [
      "h3R3 - 忘不掉的你.flac",
      "水仙LONE - 我走以后 (鼓点版).m4a",
      "夏日尽头的我们 x 月光呀月光.mp3",
      "Jess Lee - 甲乙丙丁Strangers.flac",
      "Ta - 没有你我该怎么办.flac"
    ]
  },
  stars: { desktop: 130, mobile: 58, shootingInterval: 5200 }
};

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function applyProfile() {
    const { profile, status, music } = SITE_CONFIG;
    const name = $("profile-name");
    const quote = $("quote");
    const badge = $("status-badge");
    const dot = $("status-dot");
    if (name) name.textContent = profile.name;
    document.title = `${profile.name} | ${profile.titleSuffix}`;
    const avatar = document.querySelector(".avatar");
    if (avatar) { avatar.src = profile.avatar; avatar.alt = `${profile.name}'s avatar`; }
    if (badge) badge.dataset.tone = status.tone || "neutral";
    if ($("status-text")) $("status-text").textContent = status.text;
    if ($("status-emoji")) $("status-emoji").textContent = status.icon;
    if ($("status-emoji-text")) $("status-emoji-text").textContent = status.icon;
    const inactive = /offline|away|sleep/i.test(status.text);
    badge?.classList.toggle("offline-text", inactive);
    dot?.classList.toggle("offline", inactive);
    if ($("music-label")) $("music-label").textContent = music.label;
    if (quote) {
      let index = 0;
      const type = () => { quote.textContent = profile.bio.slice(0, index++); if (index <= profile.bio.length) window.setTimeout(type, 75); };
      window.setTimeout(type, 250);
    }
  }

  function initStars() {
    const canvas = $("starfield");
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const mobile = window.matchMedia?.("(max-width: 600px)").matches;
    const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const count = reducedMotion ? 24 : Math.round((mobile ? SITE_CONFIG.stars.mobile : SITE_CONFIG.stars.desktop) * (lowPower ? .7 : 1));
    let width = 0; let height = 0; let stars = []; let shooting = null; let lastShot = 0;
    const resize = () => { const ratio = Math.min(window.devicePixelRatio || 1, 2); width = window.innerWidth; height = window.innerHeight; canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; context.setTransform(ratio, 0, 0, ratio, 0, 0); stars = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, radius: .35 + Math.random() * 1.35, alpha: .18 + Math.random() * .65, phase: Math.random() * Math.PI * 2, speed: .0007 + Math.random() * .0015 })); };
    const frame = (time) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) { const alpha = star.alpha * (.62 + Math.sin(time * star.speed + star.phase) * .38); context.fillStyle = `rgba(225,235,255,${Math.max(.04, alpha)})`; context.beginPath(); context.arc(star.x, star.y, star.radius, 0, Math.PI * 2); context.fill(); }
      if (!reducedMotion && time - lastShot > SITE_CONFIG.stars.shootingInterval && !shooting && Math.random() > .35) { lastShot = time; shooting = { x: Math.random() * width * .8, y: Math.random() * height * .35, progress: 0, length: 75 + Math.random() * 75 }; }
      if (shooting) { shooting.progress += .018; const x = shooting.x + shooting.progress * 430; const y = shooting.y + shooting.progress * 240; const gradient = context.createLinearGradient(x, y, x - shooting.length, y - shooting.length * .56); gradient.addColorStop(0, "rgba(255,255,255,.8)"); gradient.addColorStop(1, "rgba(216,182,255,0)"); context.strokeStyle = gradient; context.lineWidth = 1.4; context.beginPath(); context.moveTo(x, y); context.lineTo(x - shooting.length, y - shooting.length * .56); context.stroke(); if (shooting.progress > 1) shooting = null; }
      window.requestAnimationFrame(frame);
    };
    resize(); window.addEventListener("resize", resize, { passive: true }); window.requestAnimationFrame(frame);
  }

  window.spekcoNotify = (message) => { const toast = $("toast"); if (!toast) return; toast.textContent = message; toast.classList.add("is-visible"); window.clearTimeout(window.spekcoNotify.timer); window.spekcoNotify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200); };
  document.documentElement.style.colorScheme = "dark";
  applyProfile();
  initStars();
})();
