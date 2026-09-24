// ==============================
// PROFILE CONFIGURATION
// Edit profile values here. The music library lives in music.js only.
// ==============================
const PROFILE_CONFIG = {
  username: "spekco",
  status: "sap chet",
  statusIcon: "🫩",
  bio: "Making memories",
  avatar: "avatar.jpg",
  titleSuffix: "Profile",
  musicLabel: "now playing",
  timezone: "Asia/Shanghai",
  stars: { desktop: 190, mobile: 90, shootingInterval: 6500 }
};

window.PROFILE_CONFIG = PROFILE_CONFIG;

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function applyProfile() {
    const profile = PROFILE_CONFIG;
    const avatar = document.querySelector(".avatar");
    const wrapper = document.querySelector(".avatar-wrapper");

    $("profile-name")?.replaceChildren(document.createTextNode(profile.username));
    $("status-text")?.replaceChildren(document.createTextNode(profile.status));
    $("status-emoji")?.replaceChildren(document.createTextNode(profile.statusIcon));
    $("status-emoji-text")?.replaceChildren(document.createTextNode(profile.statusIcon));
    $("music-label")?.replaceChildren(document.createTextNode(profile.musicLabel));
    document.title = `${profile.username} | ${profile.titleSuffix}`;

    if (avatar) {
      avatar.src = profile.avatar;
      avatar.alt = `${profile.username}'s avatar`;
      avatar.addEventListener("error", () => wrapper?.classList.add("no-image"), { once: true });
    }
    const initial = $("avatar-initial");
    if (initial) initial.textContent = profile.username.charAt(0).toLowerCase();

    const inactive = /offline|away|sleep/i.test(profile.status);
    $("status-badge")?.classList.toggle("offline-text", inactive);
    $("status-dot")?.classList.toggle("offline", inactive);
    document.querySelector('meta[name="description"]')?.setAttribute("content", `Profile của ${profile.username} — now playing và trạng thái hiện tại.`);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${profile.username} | ${profile.titleSuffix}`);
  }

  function startTyping() {
    const quote = $("quote");
    const text = PROFILE_CONFIG.bio || "";
    if (!quote || !text || reducedMotion) {
      if (quote) quote.textContent = text;
      return;
    }
    let index = 0;
    const type = () => {
      quote.textContent = text.slice(0, index++);
      if (index <= text.length) window.setTimeout(type, 75);
    };
    window.setTimeout(type, 250);
  }

  function initClock() {
    const clock = $("clock");
    if (!clock) return;
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat("vi-VN", { timeZone: PROFILE_CONFIG.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch {
      formatter = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    }
    const update = () => { clock.textContent = formatter.format(new Date()); };
    update();
    window.setInterval(update, 1000);
  }

  function initStars() {
    const canvas = $("starfield");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context || reducedMotion) return;
    const mobile = window.matchMedia?.("(max-width: 600px)").matches;
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const count = Math.round((mobile ? PROFILE_CONFIG.stars.mobile : PROFILE_CONFIG.stars.desktop) * (lowPower ? 0.65 : 1));
    let width = 0; let height = 0; let ratio = 1; let particles = []; let shooting = null; let lastShot = 0; let running = !document.hidden; let frameId = 0;

    function resize() {
      ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * ratio; canvas.height = height * ratio;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, size: Math.random() * 1.45 + 0.25, alpha: Math.random() * 0.55 + 0.12, speed: Math.random() * 0.0008 + 0.00015, phase: Math.random() * 7, twinkle: Math.random() > 0.55 }));
    }
    function frame(time) {
      if (!running) return;
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        if (!lowPower) {
          particle.y -= particle.speed * 16;
          if (particle.y < -3) particle.y = height + 3;
        }
        const alpha = particle.twinkle ? particle.alpha * (0.65 + Math.sin(time * particle.speed + particle.phase) * 0.35) : particle.alpha;
        context.fillStyle = `rgba(220,232,255,${Math.max(0.035, alpha)})`;
        context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill();
      }
      if (!lowPower && time - lastShot > PROFILE_CONFIG.stars.shootingInterval && !shooting && Math.random() > 0.35) {
        lastShot = time; shooting = { x: Math.random() * width * 0.75, y: Math.random() * height * 0.35, progress: 0 };
      }
      if (shooting) {
        shooting.progress += 0.018;
        const x = shooting.x + shooting.progress * 380; const y = shooting.y + shooting.progress * 210;
        const gradient = context.createLinearGradient(x, y, x - 70, y - 38);
        gradient.addColorStop(0, "rgba(220,232,255,.7)"); gradient.addColorStop(1, "rgba(220,232,255,0)");
        context.strokeStyle = gradient; context.lineWidth = 1.5; context.beginPath(); context.moveTo(x, y); context.lineTo(x - 70, y - 38); context.stroke();
        if (shooting.progress > 1) shooting = null;
      }
      frameId = requestAnimationFrame(frame);
    }
    function setRunning(value) {
      running = value;
      if (running && !frameId) frameId = requestAnimationFrame(frame);
      if (!running && frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    }
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
    resize(); setRunning(true);
  }

  function init() { applyProfile(); startTyping(); initClock(); initStars(); document.documentElement.style.colorScheme = "dark"; }
  try { init(); } catch (error) { console.error("Profile initialization failed", error); }
})();
