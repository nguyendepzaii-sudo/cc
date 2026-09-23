(() => {
  "use strict";

  const FALLBACK_LIBRARY = [
    "Jess Lee - 甲乙丙丁Strangers.flac",
    "Ta - 没有你我该怎么办.flac",
    "h3R3 - 忘不掉的你.flac",
    "夏日尽头的我们 x 月光呀月光.mp3",
    "水仙LONE - 我走以后 (鼓点版).m4a"
  ];

  const audio = document.getElementById("audio-player");
  const $ = (id) => document.getElementById(id);
  const ui = {
    card: document.querySelector(".music-card"),
    title: $("song-name"),
    artist: $("song-artist"),
    progress: $("progress"),
    current: $("current-time"),
    duration: $("duration"),
    play: $("play-button"),
    previous: $("prev-button"),
    next: $("next-button"),
    toast: $("toast")
  };

  if (!audio || !ui.title || !ui.progress || !ui.play) {
    console.error("Music player markup is incomplete.");
    return;
  }

  const state = {
    index: 0,
    generation: 0,
    pendingPlay: null,
    toastTimer: 0,
    tried: new Set()
  };

  function songFromFilename(filename) {
    const src = String(filename || "").trim();
    const noExtension = src.replace(/\.[^./\\?#]+(?:[?#].*)?$/, "");
    const separator = noExtension.indexOf(" - ");
    return separator >= 0
      ? { artist: noExtension.slice(0, separator).trim() || "Unknown artist", title: noExtension.slice(separator + 3).trim() || noExtension, src }
      : { artist: "Unknown artist", title: noExtension || "Untitled", src };
  }

  function configuredSongs() {
    const site = window.SITE_CONFIG?.music;
    if (Array.isArray(site)) return site;
    if (Array.isArray(site?.songs)) return site.songs;
    if (Array.isArray(window.MUSIC_CONFIG)) return window.MUSIC_CONFIG;
    return FALLBACK_LIBRARY;
  }

  const songs = configuredSongs()
    .map((song) => typeof song === "string" ? songFromFilename(song) : song)
    .filter((song) => song && typeof song === "object" && String(song.src || "").trim())
    .map((song) => {
      const auto = songFromFilename(song.src);
      return {
        title: String(song.title || auto.title),
        artist: String(song.artist || auto.artist),
        src: String(song.src).trim(),
        fallback: song.fallback
      };
    });

  function setClass(name, enabled) {
    ui.card?.classList.toggle(name, enabled);
  }

  function notify(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 3200);
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const seconds = Math.floor(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function validDuration() {
    return Number.isFinite(audio.duration) && audio.duration > 0;
  }

  function updateProgress() {
    ui.current.textContent = formatTime(audio.currentTime);
    if (!validDuration()) {
      ui.duration.textContent = "0:00";
      ui.progress.disabled = true;
      return;
    }
    ui.duration.textContent = formatTime(audio.duration);
    ui.progress.disabled = false;
    ui.progress.value = String(Math.min(100, Math.max(0, audio.currentTime / audio.duration * 100)));
  }

  function updateButton() {
    const playing = !audio.paused && !audio.ended;
    ui.play.classList.toggle("playing", playing);
    ui.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    setClass("is-playing", playing);
  }

  function showSong(song) {
    ui.title.textContent = song?.title || (songs.length ? "Unable to load music" : "No music available");
    ui.artist.textContent = song?.artist || "";
    ui.title.title = song?.title || "";
  }

  function resolveSource(source) {
    try {
      // URL() encodes Unicode and spaces exactly once when given the raw path.
      return new URL(source, document.baseURI).href;
    } catch (error) {
      console.warn("Invalid audio source", { source, error });
      return "";
    }
  }

  function mediaType(source) {
    const path = source.split(/[?#]/, 1)[0].toLowerCase();
    if (path.endsWith(".mp3")) return "audio/mpeg";
    if (path.endsWith(".m4a")) return "audio/mp4";
    if (path.endsWith(".flac")) return "audio/flac";
    return "";
  }

  function candidates(song) {
    return [song.src].concat(Array.isArray(song.fallback) ? song.fallback : song.fallback ? [song.fallback] : [])
      .filter((source, index, all) => source && all.indexOf(source) === index);
  }

  function logError(song, source, event) {
    const mediaError = audio.error;
    console.error("Audio load error", {
      event: event?.type,
      title: song?.title,
      artist: song?.artist,
      originalSrc: song?.src,
      resolvedUrl: source,
      currentSrc: audio.currentSrc,
      errorCode: mediaError?.code,
      errorMessage: mediaError?.message || "",
      readyState: audio.readyState,
      networkState: audio.networkState
    });
  }

  function errorMessage() {
    switch (audio.error?.code) {
      case 1: return "Audio loading was interrupted.";
      case 2: return "Network error or file not found.";
      case 3: return "File exists, but its audio codec could not be decoded.";
      case 4: return "This browser does not support this audio format.";
      default: return "Unable to load music.";
    }
  }

  function setMetadata(song) {
    if (!("mediaSession" in navigator) || !song || typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist });
    } catch (error) {
      console.warn("Media Session metadata unavailable", error);
    }
  }

  function waitForCanPlay(generation) {
    if (generation !== state.generation) return Promise.resolve(false);
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
        resolve(result);
      };
      const onReady = () => finish(generation === state.generation);
      const onError = () => finish(false);
      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });
  }

  async function playCurrent() {
    if (!songs.length) {
      showSong(null);
      notify("No music available");
      return false;
    }
    if (state.pendingPlay) return state.pendingPlay;
    const generation = state.generation;
    state.pendingPlay = (async () => {
      const ready = await waitForCanPlay(generation);
      if (!ready || generation !== state.generation) return false;
      try {
        await audio.play();
        updateButton();
        return true;
      } catch (error) {
        updateButton();
        if (error?.name === "NotAllowedError") notify("Tap Play to start music.");
        else notify("Unable to play this track.");
        return false;
      }
    })();
    try {
      return await state.pendingPlay;
    } finally {
      state.pendingPlay = null;
    }
  }

  function loadSong(index, shouldPlay = false) {
    if (!songs.length) {
      audio.removeAttribute("src");
      audio.load();
      showSong(null);
      notify("No music available");
      return Promise.resolve(false);
    }

    state.index = (index + songs.length) % songs.length;
    const song = songs[state.index];
    const source = resolveSource(candidates(song)[0]);
    const generation = ++state.generation;
    audio.pause();
    updateButton();
    showSong(song);
    setMetadata(song);
    setClass("is-loading", true);
    setClass("is-error", false);
    ui.progress.disabled = true;
    ui.current.textContent = "0:00";
    ui.duration.textContent = "0:00";

    if (!source) {
      handleFailedTrack(song, "Invalid audio source.", null);
      return Promise.resolve(false);
    }

    const type = mediaType(song.src);
    if (type && audio.canPlayType(type) === "") {
      console.info("Browser may not support this media type", { type, source });
    }
    audio.src = source;
    audio.load();
    return shouldPlay ? playCurrent() : Promise.resolve(true);
  }

  function handleFailedTrack(song, message, event) {
    logError(song, audio.currentSrc || audio.src, event);
    setClass("is-loading", false);
    setClass("is-error", true);
    ui.progress.disabled = true;
    notify(message || errorMessage());
    state.tried.add(state.index);
    if (state.tried.size >= songs.length) {
      showSong(song);
      notify("No playable tracks");
      return;
    }
    loadSong(state.index + 1, true);
  }

  function next(shouldPlay = !audio.paused) {
    if (!songs.length) return;
    state.tried.clear();
    loadSong(state.index + 1, shouldPlay);
  }

  function previous() {
    if (!songs.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    loadSong(state.index - 1, !audio.paused);
  }

  function togglePlay() {
    if (!songs.length) {
      notify("No music available");
      return;
    }
    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }
    playCurrent();
  }

  ui.play.addEventListener("click", togglePlay);
  ui.next?.addEventListener("click", () => next());
  ui.previous?.addEventListener("click", previous);
  ui.progress.addEventListener("input", () => {
    if (validDuration()) ui.current.textContent = formatTime(Number(ui.progress.value) / 100 * audio.duration);
  });
  ui.progress.addEventListener("change", () => {
    if (validDuration()) audio.currentTime = Number(ui.progress.value) / 100 * audio.duration;
  });

  ["loadstart", "waiting", "stalled"].forEach((name) => audio.addEventListener(name, () => setClass("is-loading", true)));
  ["loadedmetadata", "loadeddata", "canplay", "playing", "pause", "suspend"].forEach((name) => audio.addEventListener(name, () => {
    setClass("is-loading", false);
    updateButton();
    updateProgress();
  }));
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("error", (event) => handleFailedTrack(songs[state.index], errorMessage(), event));

  if ("mediaSession" in navigator) {
    const actions = {
      play: () => playCurrent(),
      pause: () => audio.pause(),
      nexttrack: () => next(),
      previoustrack: previous
    };
    for (const [action, handler] of Object.entries(actions)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.info(`Media Session action unavailable: ${action}`, error);
      }
    }
  }

  if (songs.length) {
    loadSong(0, false);
  } else {
    showSong(null);
    setClass("is-error", false);
    notify("No music available");
  }
})();
