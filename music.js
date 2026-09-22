/* music.js — local, resilient audio player */
(() => {
  "use strict";
  const songs = [
    "h3R3 - 忘不掉的你.flac",
    "nuts.flac",
    "Anh Chưa Thương Em Đến Vậy Đâu.opus",
    "水仙LONE - 我走以后 (鼓点版).m4a",
    "夏日尽头的我们 x 月光呀月光.mp3",
    "Jess Lee - 甲乙丙丁Strangers.flac"
  ];
  const CLOCK_TIMEZONE = "Asia/Shanghai";
  const $ = (id) => document.getElementById(id);
  const formatTime = (sec) => { if (!Number.isFinite(sec) || sec < 0) return "0:00"; const n = Math.floor(sec), h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = String(n % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`; };
  const parseTrack = (name) => { const base = name.replace(/\.(flac|mp3|wav|ogg|m4a|aac|opus)$/i, "").trim(), at = base.indexOf(" - "); return at < 0 ? { title: base, artist: "" } : { artist: base.slice(0, at).trim(), title: base.slice(at + 3).trim() || base }; };
  const urls = (name) => [...new Set([name, name.normalize("NFC"), name.normalize("NFD")])].map((x) => x.split("/").map(encodeURIComponent).join("/"));

  function initClock() {
    const el = $("clock"); if (!el) return;
    let formatter;
    try { formatter = new Intl.DateTimeFormat("en-GB", { timeZone: CLOCK_TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, hourCycle: "h23" }); } catch (_) { formatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
    const render = () => { try { el.textContent = formatter.format(new Date()); } catch (_) { el.textContent = "--:--:--"; } };
    const loop = () => { render(); window.setTimeout(loop, 1000 - (Date.now() % 1000) + 5); }; loop();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  }

  function initPlayer() {
    const audio = $("audio-player"), card = document.querySelector(".music-card"), title = $("song-name"), artist = $("song-artist"), playBtn = $("play-button"), prev = $("prev-button"), next = $("next-button"), progress = $("progress"), current = $("current-time"), duration = $("duration");
    if (!audio) return;
    let index = 0, sourceList = [], sourceIndex = 0, scrubbing = false, pending = null, wantPlay = false;
    const hasDuration = () => Number.isFinite(audio.duration) && audio.duration > 0;
    const paint = (value) => { if (progress) progress.style.setProperty("--fill", `${Math.max(0, Math.min(100, value))}%`); };
    const state = () => { const playing = !audio.paused; playBtn?.classList.toggle("playing", playing); playBtn?.setAttribute("aria-label", playing ? "Pause" : "Play"); card?.classList.toggle("is-playing", playing); };
    const unavailable = () => { card?.classList.add("has-error"); if (title) title.textContent = "Hiện không có bài nào đang phát"; if (artist) artist.textContent = "Bạn có thể thử lại sau"; if (progress) progress.disabled = true; if (duration) duration.textContent = "0:00"; if (current) current.textContent = "0:00"; state(); };
    const render = (name) => { const t = parseTrack(name); if (title) { title.textContent = t.title; title.title = t.title; } if (artist) artist.textContent = t.artist; card?.classList.remove("has-error"); try { if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist }); } catch (_) {} };
    const play = () => { wantPlay = true; try { const p = audio.play(); p?.catch((e) => { if (e?.name !== "AbortError") state(); }); } catch (_) { state(); } };
    const load = (i, auto = false) => { if (!songs.length) return unavailable(); index = (i + songs.length) % songs.length; sourceList = urls(songs[index]); sourceIndex = 0; wantPlay = auto; scrubbing = false; pending = null; render(songs[index]); if (progress) progress.disabled = true; paint(0); if (current) current.textContent = "0:00"; if (duration) duration.textContent = "0:00"; audio.src = sourceList[0]; audio.load(); if (auto) play(); };
    const nextTrack = () => load(index + 1, true); const prevTrack = () => audio.currentTime > 3 ? (audio.currentTime = 0) : load(index - 1, true);
    playBtn?.addEventListener("click", () => audio.paused ? play() : (wantPlay = false, audio.pause())); prev?.addEventListener("click", prevTrack); next?.addEventListener("click", nextTrack);
    progress?.addEventListener("pointerdown", () => { if (!progress.disabled) scrubbing = true; }); progress?.addEventListener("input", () => { if (!hasDuration()) return; pending = Number(progress.value); paint(pending); if (current) current.textContent = formatTime(pending / 100 * audio.duration); }); progress?.addEventListener("change", () => { if (hasDuration() && pending !== null) audio.currentTime = pending / 100 * audio.duration; pending = null; scrubbing = false; });
    audio.addEventListener("play", state); audio.addEventListener("pause", state); audio.addEventListener("ended", nextTrack); audio.addEventListener("error", () => { if (sourceIndex < sourceList.length - 1) { sourceIndex++; audio.src = sourceList[sourceIndex]; audio.load(); if (wantPlay) play(); } else unavailable(); });
    const metadata = () => { if (duration) duration.textContent = formatTime(audio.duration); if (progress) progress.disabled = !hasDuration(); }; audio.addEventListener("loadedmetadata", metadata); audio.addEventListener("durationchange", metadata); audio.addEventListener("timeupdate", () => { if (scrubbing) return; if (current) current.textContent = formatTime(audio.currentTime); if (hasDuration()) { const p = audio.currentTime / audio.duration * 100; if (progress) progress.value = p; paint(p); } });
    if ("mediaSession" in navigator) { for (const [action, handler] of Object.entries({ play, pause: () => { wantPlay = false; audio.pause(); }, previoustrack: prevTrack, nexttrack: nextTrack })) { try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {} } }
    load(0);
  }
  function boot() { try { initClock(); } catch (_) {} try { initPlayer(); } catch (_) { const title = $("song-name"); if (title) title.textContent = "Hiện không có bài nào đang phát"; } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
