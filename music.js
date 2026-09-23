(() => {
  "use strict";

  // Chỉ cần thêm đúng tên file nhạc vào đây sau khi upload vào thư mục gốc của repo.
  // Ví dụ: "Nghệ sĩ - Tên bài.mp3" hoặc "Tên bài.mp3"
  // Tên file sẽ được tự động tách thành artist/title nếu có " - ".
  const MUSIC_LIBRARY = [
    "Jess Lee - 甲乙丙丁Strangers.flac",
    "Ta - 没有你我该怎么办.flac",
    "h3R3 - 忘不掉的你.flac",
    "夏日尽头的我们 x 月光呀月光.mp3",
    "水仙LONE - 我走以后 (鼓点版).m4a"
  ];

  const config = window.SITE_CONFIG || {};
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

  if (!audio || !ui.title || !ui.progress || !ui.play) return;

  function songFromFilename(filename) {
    const src = String(filename || "").trim();
    const noExt = src.replace(/\.[^./\\?#]+(?:[?#].*)?$/, "");
    const separator = noExt.indexOf(" - ");

    if (separator >= 0) {
      return {
        artist: noExt.slice(0, separator).trim() || "Unknown artist",
        title: noExt.slice(separator + 3).trim() || noExt,
        src
      };
    }

    return {
      artist: "Unknown artist",
      title: noExt || "Untitled",
      src
    };
  }

  // Có thể dùng SITE_CONFIG.music nếu cần ghi đè danh sách mặc định.
  // Mỗi phần tử có thể là chuỗi file hoặc object cũ.
  const configuredSongs = Array.isArray(config.music)
    ? config.music
    : Array.isArray(config.music?.songs)
      ? config.music.songs
      : Array.isArray(window.MUSIC_CONFIG)
        ? window.MUSIC_CONFIG
        : null;
  const rawSongs = configuredSongs?.length ? configuredSongs : MUSIC_LIBRARY;
  const songs = rawSongs
    .map((song) => typeof song === "string" ? songFromFilename(song) : song)
    .filter((song) => song && typeof song === "object" && String(song.src || "").trim())
    .map((song) => {
      const auto = songFromFilename(song.src);
      return {
        title: String(song.title || auto.title || "Untitled"),
        artist: String(song.artist || auto.artist || "Unknown artist"),
        src: String(song.src).trim(),
        fallback: song.fallback
      };
    });

  const state = {
    index: 0,
    generation: 0,
    pendingPlay: null,
    skipGeneration: 0,
    toastTimer: 0
  };

  function setClass(name, enabled) {
    if (ui.card) ui.card.classList.toggle(name, enabled);
  }

  function notify(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 3200);
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const seconds = Math.floor(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function validDuration() {
    return Number.isFinite(audio.duration) && audio.duration > 0;
  }

  function setProgressEnabled(enabled) {
    ui.progress.disabled = !enabled;
    if (!enabled) ui.progress.value = "0";
  }

  function resolveSource(source) {
    try {
      return new URL(source, document.baseURI).href;
    } catch (error) {
      console.warn("Invalid audio source:", source, error);
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

  function logMediaError(song, source, event) {
    const error = audio.error;
    console.error("Audio error", {
      event: event.type,
      title: song?.title,
      artist: song?.artist,
      src: song?.src,
      resolvedUrl: source,
      mediaErrorCode: error?.code,
      mediaErrorMessage: error?.message || ""
    });
  }

  function errorMessage() {
    switch (audio.error?.code) {
      case MediaError.MEDIA_ERR_NETWORK: return "Network error or file not found.";
      case MediaError.MEDIA_ERR_DECODE: return "File exists, but its audio codec could not be decoded.";
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return "This browser does not support this audio format or source.";
      case MediaError.MEDIA_ERR_ABORTED: return "Audio loading was interrupted.";
      default: return "The audio source could not be loaded.";
    }
  }

  function updateButton() {
    const playing = !audio.paused && !audio.ended;
    ui.play.classList.toggle("playing", playing);
    ui.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    setClass("is-playing", playing);
  }

  function updateProgress() {
    ui.current.textContent = formatTime(audio.currentTime);
    if (validDuration()) {
      ui.duration.textContent = formatTime(audio.duration);
      ui.progress.value = String(Math.min(100, (audio.currentTime / audio.duration) * 100));
      setProgressEnabled(true);
    } else {
      ui.duration.textContent = "0:00";
      setProgressEnabled(false);
    }
  }

  function showSong(song) {
    ui.title.textContent = song?.title || "No music available";
    ui.artist.textContent = song?.artist || "";
    ui.title.title = song?.title || "";
  }

  function setMediaSession(song) {
    if (!("mediaSession" in navigator) || !song) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist });
    } catch (error) {
      console.warn("Media Session metadata unavailable", error);
    }
  }

  function playAfterLoad(generation) {
    if (generation !== state.generation) return Promise.resolve(false);
    const promise = audio.play();
    state.pendingPlay = promise;
    return promise.then(() => {
      if (generation === state.generation) updateButton();
      return true;
    }).catch((error) => {
      if (generation === state.generation) {
        updateButton();
        notify(error?.name === "NotAllowedError" ? "Tap Play to start music." : "Unable to play this track.");
      }
      return false;
    }).finally(() => {
      if (state.pendingPlay === promise) state.pendingPlay = null;
    });
  }

  function candidates(song) {
    return [song.src].concat(Array.isArray(song.fallback) ? song.fallback : song.fallback ? [song.fallback] : [])
      .filter((source, index, all) => source && all.indexOf(source) === index);
  }

  function loadSong(index, shouldPlay = false, attempted = 0) {
    if (!songs.length) {
      audio.removeAttribute("src");
      audio.load();
      showSong(null);
      setProgressEnabled(false);
      notify("No music available");
      return Promise.resolve(false);
    }

    state.index = (index + songs.length) % songs.length;
    const song = songs[state.index];
    const sources = candidates(song);
    const source = resolveSource(sources[attempted] || "");
    const generation = ++state.generation;
    state.skipGeneration = generation;
    audio.pause();
    updateButton();
    showSong(song);
    setMediaSession(song);
    setClass("is-loading", true);
    setClass("is-error", false);
    setProgressEnabled(false);
    ui.current.textContent = "0:00";
    ui.duration.textContent = "0:00";

    if (!source) {
      notify("Invalid audio source.");
      return tryNext(index, shouldPlay, generation);
    }

    const type = mediaType(sources[attempted] || "");
    if (type && audio.canPlayType(type) === "") {
      console.info("Browser may not support this audio type", { type, source });
    }
    audio.src = source;
    audio.load();

    return shouldPlay ? playAfterLoad(generation) : Promise.resolve(true);
  }

  function tryNext(fromIndex, shouldPlay, generation) {
    if (generation !== state.skipGeneration) return Promise.resolve(false);
    if (state.skipGeneration === generation && state.index === fromIndex) {
      state.skipGeneration = -1;
      return loadSong(fromIndex + 1, shouldPlay);
    }
    return Promise.resolve(false);
  }

  function handleError(event) {
    const song = songs[state.index];
    const source = audio.currentSrc || audio.src;
    if (!song) return;
    logMediaError(song, source, event);
    setClass("is-loading", false);
    setClass("is-error", true);
    setProgressEnabled(false);
    notify(errorMessage());

    const nextIndex = (state.index + 1) % songs.length;
    if (state.skipGeneration === state.generation) {
      state.skipGeneration = -1;
      if (nextIndex !== state.index) loadSong(nextIndex, !audio.paused);
      else notify("No playable music found.");
    }
  }

  function next(shouldPlay = !audio.paused) {
    if (!songs.length) return;
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
    if (state.pendingPlay) return;
    playAfterLoad(state.generation);
  }

  ui.play.addEventListener("click", togglePlay);
  ui.next?.addEventListener("click", () => next());
  ui.previous?.addEventListener("click", previous);
  ui.progress.addEventListener("input", () => {
    if (validDuration()) ui.current.textContent = formatTime((Number(ui.progress.value) / 100) * audio.duration);
  });
  ui.progress.addEventListener("change", () => {
    if (validDuration()) audio.currentTime = (Number(ui.progress.value) / 100) * audio.duration;
  });

  ["loadstart", "waiting", "stalled"].forEach((eventName) => audio.addEventListener(eventName, () => setClass("is-loading", true)));
  ["loadedmetadata", "loadeddata", "canplay", "playing", "pause", "suspend"].forEach((eventName) => audio.addEventListener(eventName, () => {
    setClass("is-loading", false);
    updateButton();
    updateProgress();
  }));
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("error", handleError);

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", () => playAfterLoad(state.generation));
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", previous);
    } catch (error) {
      console.warn("Media Session actions unavailable", error);
    }
  }

  if (songs.length) loadSong(0, false);
  else {
    showSong(null);
    notify("No music available");
  }
})();
