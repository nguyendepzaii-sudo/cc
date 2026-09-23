// One source of truth for the playlist. Add or remove tracks here only.
const MUSIC_LIBRARY = [
  "h3R3 - 忘不掉的你.flac",
  "水仙LONE - 我走以后 (鼓点版).m4a",
  "夏日尽头的我们 x 月光呀月光.mp3",
  "Jess Lee - 甲乙丙丁Strangers.flac",
  "Ta - 没有你我该怎么办.flac",
  "Renran - 无人之岛.m4a",
  {
    src: "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/%E9%84%92%E6%B2%9B%E6%B2%9B%20%26%20Pank%20%E6%B2%89%E6%BA%BA(%E4%BD%A0%E8%AE%A9%E6%88%91%E7%9A%84%E5%BF%83%E4%B8%8D%E5%86%8D%E7%BB%93%E5%86%B0)%20-%20Single%20(2023)%20.%20%E6%B2%89%E6%BA%BA(%E4%BD%A0%E8%AE%A9%E6%88%91%E7%9A%84%E5%BF%83%E4%B8%8D%E5%86%8D%E7%BB%93%E5%86%B0).m4a",
    // Overridden manually: filename's raw " - Single (2023)" segment doesn't split cleanly into artist/title.
    artist: "鄭沛沛 & Pank",
    title: "沉溺(你让我的心不再结冰)"
  },
  "https://pub-a6f896b739e543b7a5a3f838dd05edf9.r2.dev/%E6%88%91%E7%9A%84%E6%AD%8C%E5%A3%B0%E9%87%8C%20(DJ%E7%87%83%E6%9B%B2)%EF%BD%9C%E2%80%9C%E4%BD%A0%E5%AD%98%E5%9C%A8%E6%88%91%E6%B7%B1%E6%B7%B1%E7%9A%84%E8%84%91%E6%B5%B7%E9%87%8C%E2%80%9D.mp3"
];

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
MUSIC_LIBRARY.forEach((track, index) => {
  const normalizedTrack = typeof track === "string" ? { src: track } : track;
  const parsed = parseTrackMetadata(normalizedTrack?.src);

  if (!normalizedTrack.title) normalizedTrack.title = parsed.title;
  if (!normalizedTrack.artist) normalizedTrack.artist = parsed.artist;

  MUSIC_LIBRARY[index] = normalizedTrack;
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
    if (autoplay) playCurrent();
  }

  function skipFailedTrack() {
    const failedIndex = state.index;
    state.tried.add(failedIndex);
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

  if (MUSIC_LIBRARY.length) loadTrack(0);
  else showTrack(null);
})();
