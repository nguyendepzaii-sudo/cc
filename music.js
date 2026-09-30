// One source of truth for the playlist. Add or remove tracks here only.
const MUSIC_LIBRARY = [
  "h3R3 - 忘不掉的你.flac",
  "水仙LONE - 我走以后 (鼓点版).m4a",
  "夏日尽头的我们 x 月光呀月光.mp3",
  "Jess Lee - 甲乙丙丁Strangers.flac",
  "Ta - 没有你我该怎么办.flac",
  "Renran - 无人之岛.m4a",
  "鄒沛沛 & Pank 沉溺(你让我的心不再结冰) - Single (2023) . 沉溺(你让我的心不再结冰).m4a",
  {
    src: "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/h3R3%20-%20%E4%BA%B2%E7%88%B1%E7%9A%84.flac",
    // Overridden manually: filename's raw " - Single (2023)" segment doesn't split cleanly into artist/title.
    title: "亲爱的",
    artist: "h3R3"
  },
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/%E6%88%91%E7%9A%84%E6%AD%8C%E5%A3%B0%E9%87%8C%20(DJ%E7%87%83%E6%9B%B2)%EF%BD%9C%E2%80%9C%E4%BD%A0%E5%AD%98%E5%9C%A8%E6%88%91%E6%B7%B1%E6%B7%B1%E7%9A%84%E8%84%91%E6%B5%B7%E9%87%8C%E2%80%9D.mp3",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/LBI%20-%20%E5%8F%AF%E6%88%91%E5%8F%AA%E6%98%AF%E6%B5%B7.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/Linfeng%20Zhou%20-%20%E5%BF%98%E4%BA%86.opus",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/Chen%20Li%20-%20%E7%BB%9D%E5%AF%B9%E5%8D%A0%E6%9C%89%E7%9B%B8%E5%AF%B9%E8%87%AA%E7%94%B1.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/%E9%99%88%E6%9D%91%E9%95%BF%20-%20%E7%88%B1%E6%80%8E%E4%B9%88%E4%BA%86.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/1K%20-%20%E5%B0%B1%E5%BF%98%E4%BA%86%E5%90%A7.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/h3R3%20-%20Liar.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/%E6%AD%90%E9%99%BD%E8%80%80%E7%91%A9%20-%20%E6%88%92%E4%B8%8D%E6%8E%89%20(%E5%8E%9F%E5%A3%B0%E7%89%88).m4a",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/en%20-%20%E6%9C%80%E5%90%8E%E4%B8%80%E9%A1%B5.flac",
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/17.%20Die%20For%20You.flac"
];

// Cấu hình phần R2 (tuỳ chọn). Trình duyệt KHÔNG tự liệt kê được file trong bucket R2,
// nên muốn bài mới up lên R2 tự hiện trong playlist thì cần 1 "chỉ mục" JSON:
//   - r2IndexUrl: link tới file JSON (vd. songs.json nằm trong bucket, hoặc 1 Cloudflare Worker trả JSON).
//     JSON là mảng tên file ["a.mp3", ...] hoặc {"files": [...]}; mỗi phần tử là tên file/URL hoặc {src|url|key, title, artist}.
//   - Để trống "" = chỉ dùng danh sách MUSIC_LIBRARY ở trên (đã gồm các link R2 khai báo trong code).
const MUSIC_SETTINGS = {
  r2Base: "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/",
  r2IndexUrl: "",
  r2CacheMs: 5 * 60 * 1000,
  audioExt: /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i
};

const parseTrackMetadata = (source) => {
  if (!source || typeof source !== "string") return { title: "", artist: "" };

  let filename = source;

  // If source is a full URL (e.g. an R2/CDN link), keep only the last path
  // segment — the actual file name — and drop the domain/query entirely.
  try {
    const parsedUrl = new URL(source, document.baseURI);
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (segments.length) filename = segments[segments.length - 1];
  } catch {
    // Not a resolvable URL — treat source as a plain filename, unchanged.
  }

  // Decode URL-encoded characters (%20, %26, percent-encoded CJK bytes, etc.)
  // back into normal readable text.
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // Malformed encoding — fall back to whatever we have.
  }

  filename = filename.replace(/\.[^.]+$/, "");
  const separator = filename.indexOf(" - ");
  if (separator === -1) return { title: filename, artist: "" };
  return { artist: filename.slice(0, separator), title: filename.slice(separator + 3) };
};

// Normalize every playlist item into { src, title, artist }.
const normalizeTrack = (track) => {
  const normalizedTrack = typeof track === "string" ? { src: track } : track;
  const parsed = parseTrackMetadata(normalizedTrack?.src);

  if (!normalizedTrack.title) normalizedTrack.title = parsed.title;
  if (!normalizedTrack.artist) normalizedTrack.artist = parsed.artist;

  return normalizedTrack;
};

MUSIC_LIBRARY.forEach((track, index) => {
  MUSIC_LIBRARY[index] = normalizeTrack(track);
});

(() => {
  "use strict";

  const audio = document.getElementById("audio-player");
  const $ = (id) => document.getElementById(id);
  const ui = {
    card: document.querySelector(".music-card"), title: $("song-name"), artist: $("song-artist"), progress: $("progress"),
    current: $("current-time"), duration: $("duration"), play: $("play-button"), previous: $("prev-button"), next: $("next-button"), toast: $("toast")
  };
  if (!audio || !ui.title || !ui.artist || !ui.progress || !ui.duration || !ui.play) return;

  const state = { index: 0, playingRequested: false, tried: new Set(), toastTimer: 0, generation: 0 };
  const pl = { button: $("playlist-button"), panel: $("playlist-panel"), list: $("playlist-list"), count: $("playlist-count"), note: $("playlist-note") };
  const playlistReady = Boolean(pl.button && pl.panel && pl.list);
  const failedTracks = new Set();
  const reduceMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const seconds = Math.floor(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const hasDuration = () => Number.isFinite(audio.duration) && audio.duration > 0;
  const notify = (message) => {
    if (!ui.toast) return;
    ui.toast.textContent = message; ui.toast.classList.add("show"); clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 3200);
  };
  const setClass = (name, enabled) => ui.card?.classList.toggle(name, enabled);
  const updateState = () => {
    const playing = !audio.paused && !audio.ended;
    ui.play.classList.toggle("playing", playing); ui.play.setAttribute("aria-label", playing ? "Pause" : "Play"); setClass("is-playing", playing);
  };
  const updateProgress = () => {
    ui.current.textContent = formatTime(audio.currentTime);
    if (!hasDuration()) { ui.duration.textContent = "0:00"; ui.progress.disabled = true; return; }
    ui.duration.textContent = formatTime(audio.duration); ui.progress.disabled = false;
    ui.progress.value = String(Math.min(100, Math.max(0, audio.currentTime / audio.duration * 100)));
  };
  const showTrack = (track) => {
    ui.title.textContent = track?.title || "No music available"; ui.artist.textContent = track?.artist || ""; ui.title.title = track?.title || "";
    if (track && "mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist }); } catch {}
    }
  };
  const resolvedUrls = (source) => {
    const names = [...new Set([source, source.normalize("NFC"), source.normalize("NFD")])];
    return names.map((name) => new URL(name, document.baseURI).href);
  };
  const errorText = () => ({
    1: "Audio loading was interrupted.",
    2: "Network error or file not found.",
    3: "File exists, but this browser could not decode it.",
    4: "This browser does not support this audio format."
  }[audio.error?.code] || "Unable to load this track.");

  function playCurrent() {
    if (!MUSIC_LIBRARY.length) { showTrack(null); notify("No music available"); return; }
    state.playingRequested = true;
    Promise.resolve(audio.play()).then(updateState).catch((error) => {
      updateState();
      if (error?.name === "NotAllowedError") notify("Tap Play to start music.");
      else if (error?.name !== "AbortError") notify("Unable to play this track.");
    });
  }

  function loadTrack(index, autoplay = false) {
    state.index = (index + MUSIC_LIBRARY.length) % MUSIC_LIBRARY.length;
    state.generation += 1; state.playingRequested = autoplay;
    const track = MUSIC_LIBRARY[state.index];

    audio.pause(); showTrack(track); setClass("is-error", false); setClass("is-loading", true);
    ui.progress.disabled = true; ui.current.textContent = "0:00"; ui.duration.textContent = "0:00";

    audio.src = resolvedUrls(track.src)[0]; audio.load();
    onTrackChanged();
    if (autoplay) playCurrent();
  }

  function skipFailedTrack() {
    const failedIndex = state.index;
    state.tried.add(failedIndex);
    failedTracks.add(failedIndex); syncPlaylist();
    setClass("is-error", true);
    setClass("is-loading", false);

    console.error("Audio load error", {
      track: MUSIC_LIBRARY[failedIndex],
      url: audio.currentSrc || audio.src,
      code: audio.error?.code,
      readyState: audio.readyState,
      networkState: audio.networkState
    });

    if (state.tried.size >= MUSIC_LIBRARY.length) { notify("No playable tracks"); return; }
    notify(errorText());
    loadTrack(failedIndex + 1, state.playingRequested);
  }

  function nextTrack(autoplay = !audio.paused) {
    state.tried.clear();
    loadTrack(state.index + 1, autoplay);
  }

  function previousTrack() {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else loadTrack(state.index - 1, !audio.paused);
  }

  ui.play.addEventListener("click", () => {
    if (!MUSIC_LIBRARY.length) return notify("No music available");
    if (!audio.paused && !audio.ended) {
      state.playingRequested = false;
      audio.pause();
    } else playCurrent();
  });

  ui.next?.addEventListener("click", () => nextTrack());
  ui.previous?.addEventListener("click", previousTrack);

  ui.progress.addEventListener("input", () => {
    if (hasDuration()) ui.current.textContent = formatTime(Number(ui.progress.value) / 100 * audio.duration);
  });

  ui.progress.addEventListener("change", () => {
    if (hasDuration()) audio.currentTime = Number(ui.progress.value) / 100 * audio.duration;
  });

  ["loadstart", "waiting", "stalled"].forEach((event) => {
    audio.addEventListener(event, () => setClass("is-loading", true));
  });

  ["loadedmetadata", "loadeddata", "canplay", "playing", "pause", "suspend"].forEach((event) => {
    audio.addEventListener(event, () => {
      setClass("is-loading", false);
      updateState();
      updateProgress();
    });
  });

  ["timeupdate", "durationchange", "seeking", "seeked"].forEach((event) => {
    audio.addEventListener(event, updateProgress);
  });

  audio.addEventListener("loadedmetadata", () => { if (failedTracks.delete(state.index)) syncPlaylist(); });
  audio.addEventListener("ended", () => nextTrack(true));
  audio.addEventListener("error", skipFailedTrack);

  if ("mediaSession" in navigator) {
    for (const [action, handler] of Object.entries({
      play: playCurrent,
      pause: () => audio.pause(),
      nexttrack: () => nextTrack(),
      previoustrack: previousTrack
    })) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    }
  }


  // ---------- Playlist ----------
  const trackKey = (src) => {
    let name = String(src || "");
    try { name = new URL(name, document.baseURI).pathname.split("/").filter(Boolean).pop() || ""; } catch {}
    try { name = decodeURIComponent(name); } catch {}
    return name.normalize("NFC").toLowerCase();
  };

  function setNote(text) {
    if (!pl.note) return;
    pl.note.textContent = text || "";
    pl.note.hidden = !text;
  }

  function renderPlaylist() {
    if (!playlistReady) return;
    const fragment = document.createDocumentFragment();
    MUSIC_LIBRARY.forEach((track, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button"; button.className = "pl-item"; button.dataset.index = String(index);
      button.title = track.artist ? `${track.title} — ${track.artist}` : (track.title || "");

      const badge = document.createElement("span"); badge.className = "pl-badge"; badge.setAttribute("aria-hidden", "true");
      const number = document.createElement("span"); number.className = "pl-num"; number.textContent = String(index + 1);
      const bars = document.createElement("span"); bars.className = "pl-bars";
      bars.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
      badge.append(number, bars);

      const meta = document.createElement("span"); meta.className = "pl-meta";
      const title = document.createElement("span"); title.className = "pl-title"; title.textContent = track.title || "Không rõ tên";
      meta.append(title);
      if (track.artist) {
        const artist = document.createElement("span"); artist.className = "pl-artist"; artist.textContent = track.artist;
        meta.append(artist);
      }

      button.append(badge, meta); item.append(button); fragment.append(item);
    });
    if (!MUSIC_LIBRARY.length) {
      const empty = document.createElement("li"); empty.className = "pl-empty"; empty.textContent = "Chưa có bài nào";
      fragment.append(empty);
    }
    pl.list.replaceChildren(fragment);
    if (pl.count) pl.count.textContent = MUSIC_LIBRARY.length ? `${MUSIC_LIBRARY.length} bài` : "";
    syncPlaylist();
  }

  function syncPlaylist() {
    if (!playlistReady) return;
    for (const button of pl.list.querySelectorAll(".pl-item")) {
      const index = Number(button.dataset.index);
      const current = index === state.index;
      button.classList.toggle("is-current", current);
      button.classList.toggle("is-failed", failedTracks.has(index));
      if (current) button.setAttribute("aria-current", "true"); else button.removeAttribute("aria-current");
    }
  }

  function scrollToCurrent(smooth) {
    if (!playlistReady) return;
    const current = pl.list.querySelector(".pl-item.is-current");
    if (!current) return;
    const top = current.offsetTop - (pl.list.clientHeight - current.offsetHeight) / 2;
    pl.list.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  }

  function onTrackChanged() {
    if (!playlistReady) return;
    syncPlaylist();
    if (pl.panel.classList.contains("is-open")) scrollToCurrent(true);
  }

  function setPlaylistOpen(open) {
    if (!playlistReady) return;
    pl.panel.classList.toggle("is-open", open);
    pl.panel.setAttribute("aria-hidden", String(!open));
    pl.button.setAttribute("aria-expanded", String(open));
    pl.button.setAttribute("aria-label", open ? "Đóng danh sách nhạc" : "Mở danh sách nhạc");
    pl.button.classList.toggle("is-active", open);
    if (open) { refreshR2Index(); scrollToCurrent(false); }
    else if (pl.panel.contains(document.activeElement)) pl.button.focus();
  }

  // R2 index (tuỳ chọn, chỉ chạy khi MUSIC_SETTINGS.r2IndexUrl có giá trị)
  let r2LoadedAt = 0; let r2Busy = false;
  const buildR2Url = (key) => MUSIC_SETTINGS.r2Base + String(key).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");

  function toR2Track(entry) {
    const raw = typeof entry === "string" ? { src: entry } : entry;
    if (!raw || typeof raw !== "object") return null;
    let src = String(raw.src || raw.url || "");
    if (!src && (raw.key || raw.name)) src = buildR2Url(raw.key || raw.name);
    else if (src && !/^(https?:)?\/\//i.test(src) && !src.startsWith("/")) src = buildR2Url(src);
    if (!src || !MUSIC_SETTINGS.audioExt.test(trackKey(src))) return null;
    return normalizeTrack({ src, title: raw.title, artist: raw.artist });
  }

  async function refreshR2Index(force = false) {
    if (!MUSIC_SETTINGS.r2IndexUrl || r2Busy) return;
    if (!force && r2LoadedAt && Date.now() - r2LoadedAt < MUSIC_SETTINGS.r2CacheMs) return;
    r2Busy = true;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), 8000);
    try {
      const response = await fetch(MUSIC_SETTINGS.r2IndexUrl, { cache: "no-cache", signal: controller?.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data) ? data : (data?.files || data?.tracks || data?.objects);
      if (!Array.isArray(entries)) throw new Error("Invalid R2 index");
      const known = new Set(MUSIC_LIBRARY.map((track) => trackKey(track.src)));
      const fresh = [];
      for (const entry of entries) {
        const track = toR2Track(entry);
        if (!track) continue;
        const key = trackKey(track.src);
        if (known.has(key)) continue;
        known.add(key); fresh.push(track);
      }
      fresh.sort((a, b) => String(a.title).localeCompare(String(b.title), "vi", { numeric: true, sensitivity: "base" }));
      r2LoadedAt = Date.now(); setNote("");
      if (fresh.length) {
        MUSIC_LIBRARY.push(...fresh);
        renderPlaylist();
        if (!audio.getAttribute("src")) loadTrack(0);
      }
    } catch (error) {
      console.warn("R2 index unavailable", error);
      setNote("Không tải được danh sách từ R2, đang hiện danh sách có sẵn.");
    } finally {
      clearTimeout(timer); r2Busy = false;
    }
  }

  if (playlistReady) {
    pl.button.addEventListener("click", () => setPlaylistOpen(!pl.panel.classList.contains("is-open")));
    pl.list.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".pl-item");
      if (!button || !pl.list.contains(button)) return;
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= MUSIC_LIBRARY.length) return;
      if (index === state.index && !failedTracks.has(index)) { ui.play.click(); return; }
      state.tried.clear(); failedTracks.delete(index);
      loadTrack(index, true);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pl.panel.classList.contains("is-open")) { setPlaylistOpen(false); pl.button.focus(); }
    });
    renderPlaylist();
  }

  if (MUSIC_LIBRARY.length) loadTrack(0);
  else showTrack(null);
  refreshR2Index();
})();
