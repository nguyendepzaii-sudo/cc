/* ==========================================================
   music.js — Đồng hồ + trình phát nhạc cho trang cá nhân
   Đặt các file nhạc cùng thư mục với index.html
   ========================================================== */

/* 1) CẤU HÌNH */

// Danh sách bài hát. Tên phải khớp 100% với tên file thực tế
// (khoảng trắng, dấu tiếng Việt, ký tự $, đuôi file).
// Nên đặt tên dạng "Nghệ sĩ - Tên bài.flac" để hiện riêng tên bài và nghệ sĩ.
const songs = [
  "Tien Tien - My Everything.flac",
  "bob$ - Ít Bạn Ít Nạn.flac",
  "h3R3 - 忘不掉的你.flac",
  "nuts.flac"
];

// Múi giờ của đồng hồ. Để "" = dùng giờ trên thiết bị người xem.
// Muốn hiện giờ Việt Nam cho mọi người: "Asia/Ho_Chi_Minh"
const CLOCK_TIMEZONE = "";

/* 2) HÀM TIỆN ÍCH */

// "Nghệ sĩ - Tên bài.flac" -> { artist, title }
function parseTrack(fileName) {
  const base = fileName.replace(/\.(flac|mp3|wav|ogg|m4a|aac|opus)$/i, "").trim();
  const sep = base.indexOf(" - ");
  if (sep === -1) return { title: base, artist: "" };
  return {
    artist: base.slice(0, sep).trim(),
    title: base.slice(sep + 3).trim() || base,
  };
}

// Mã hoá đường dẫn để khoảng trắng, $, dấu tiếng Việt không gây lỗi 404
function toUrl(fileName) {
  return fileName.split("/").map(encodeURIComponent).join("/");
}

// Tiếng Việt có 2 kiểu lưu dấu (NFC/NFD). File tạo trên macOS thường là NFD,
// nên nếu kiểu đầu bị 404 thì thử tiếp kiểu còn lại.
function trackUrls(fileName) {
  const names = new Set([fileName, fileName.normalize("NFC"), fileName.normalize("NFD")]);
  return [...names].map(toUrl);
}

// Đổi giây -> m:ss (hoặc h:mm:ss)
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + s : m + ":" + s;
}

/* 3) ĐỒNG HỒ */
function initClock() {
  const el = document.getElementById("clock");
  if (!el) return;

  const options = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat(
      "en-US",
      CLOCK_TIMEZONE ? { ...options, timeZone: CLOCK_TIMEZONE } : options
    );
  } catch (err) {
    console.warn("Múi giờ không hợp lệ, dùng giờ thiết bị:", CLOCK_TIMEZONE);
    formatter = new Intl.DateTimeFormat("en-US", options);
  }

  const render = () => {
    // Một số trình duyệt chèn khoảng trắng đặc biệt trước AM/PM -> đổi về khoảng trắng thường
    el.textContent = formatter.format(new Date()).replace(/\u202f/g, " ");
  };

  // Cập nhật đúng vào đầu mỗi giây để không bị lệch
  const loop = () => {
    render();
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  };
  loop();

  // Quay lại tab thì cập nhật ngay (tab nền bị trình duyệt làm chậm timer)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });
}

/* 4) TRÌNH PHÁT NHẠC */
function initPlayer() {
  const audio      = document.getElementById("audio-player");
  const card       = document.querySelector(".music-card");
  const titleEl    = document.getElementById("song-name");
  const artistEl   = document.getElementById("song-artist");
  const playBtn    = document.getElementById("play-button");
  const prevBtn    = document.getElementById("prev-button");
  const nextBtn    = document.getElementById("next-button");
  const progress   = document.getElementById("progress");
  const currentEl  = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");

  if (!audio) return;

  if (!songs.length) {
    if (titleEl) titleEl.textContent = "No tracks yet";
    [playBtn, prevBtn, nextBtn, progress].forEach((el) => el && (el.disabled = true));
    return;
  }

  let index = 0;          // bài đang chọn
  let sources = [];       // các URL có thể thử cho bài hiện tại
  let sourceIndex = 0;    // đang thử URL thứ mấy
  let wantPlay = false;   // người dùng đang muốn phát (để phát tiếp khi thử URL khác)
  let scrubbing = false;  // đang kéo thanh tiến trình
  let pendingPercent = null;

  audio.preload = "metadata"; // không tải cả file FLAC nặng khi vừa mở trang

  const hasDuration = () => Number.isFinite(audio.duration) && audio.duration > 0;

  /* --- Giao diện --- */

  function paintProgress(percent) {
    if (progress) progress.style.setProperty("--fill", percent + "%");
  }

  function setProgress(percent) {
    if (!progress) return;
    progress.value = percent;
    paintProgress(percent);
  }

  function updatePlayState() {
    const playing = !audio.paused;
    if (playBtn) {
      playBtn.classList.toggle("playing", playing);
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
    if (card) card.classList.toggle("is-playing", playing);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }

  function renderTrack(fileName) {
    const { title, artist } = parseTrack(fileName);
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.title = title; // rê chuột/giữ để xem đủ khi tên bị cắt "..."
    }
    if (artistEl) artistEl.textContent = artist;
    if (card) card.classList.remove("has-error");

    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
    }
  }

  function showError() {
    console.error("Không tải được file nhạc:", songs[index], "— kiểm tra tên file và vị trí file.");
    if (card) card.classList.add("has-error");
    if (artistEl) artistEl.textContent = "Couldn't load this track";
    if (progress) progress.disabled = true;
    updatePlayState();
  }

  /* --- Điều khiển --- */

  function play() {
    wantPlay = true;
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch((err) => {
        // AbortError xảy ra khi bấm chuyển bài liên tục — bình thường, bỏ qua
        if (err.name !== "AbortError") console.warn("Không thể phát:", err);
      });
    }
  }

  function pause() {
    wantPlay = false;
    audio.pause();
  }

  function loadSong(i, autoPlay = false) {
    index = (i + songs.length) % songs.length;
    sources = trackUrls(songs[index]);
    sourceIndex = 0;
    wantPlay = autoPlay;
    scrubbing = false;
    pendingPercent = null;

    renderTrack(songs[index]);
    setProgress(0);
    if (currentEl) currentEl.textContent = "0:00";
    if (durationEl) durationEl.textContent = "0:00";
    if (progress) progress.disabled = true; // mở lại khi đã biết độ dài bài

    audio.src = sources[0];
    updatePlayState();
    if (autoPlay) play();
  }

  const nextTrack = () => loadSong(index + 1, true);

  // Đang nghe quá 3 giây thì "Prev" hát lại từ đầu, còn không mới lùi về bài trước
  function prevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      loadSong(index - 1, true);
    }
  }

  if (playBtn) playBtn.addEventListener("click", () => (audio.paused ? play() : pause()));
  if (prevBtn) prevBtn.addEventListener("click", prevTrack);
  if (nextBtn) nextBtn.addEventListener("click", nextTrack);

  /* --- Thanh tiến trình ---
     Khi đang kéo chỉ xem trước thời gian, thả tay ra mới tua thật.
     Nhờ vậy nút kéo không bị giật ngược về vị trí cũ trong lúc file FLAC đang tua. */
  if (progress) {
    progress.addEventListener("pointerdown", () => {
      if (!progress.disabled) scrubbing = true;
    });

    progress.addEventListener("input", () => {
      if (!hasDuration()) return;
      scrubbing = true;
      pendingPercent = Number(progress.value);
      paintProgress(pendingPercent);
      if (currentEl) currentEl.textContent = formatTime((pendingPercent / 100) * audio.duration);
    });

    progress.addEventListener("change", () => {
      if (hasDuration() && pendingPercent !== null) {
        audio.currentTime = (pendingPercent / 100) * audio.duration;
      }
      pendingPercent = null;
      scrubbing = false;
    });

    // Thả chuột/tay mà không đổi giá trị thì sự kiện "change" không chạy -> tự mở khoá
    const release = () => {
      if (pendingPercent === null) scrubbing = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  /* --- Sự kiện của audio --- */

  audio.addEventListener("play", updatePlayState);
  audio.addEventListener("pause", () => {
    wantPlay = false;
    updatePlayState();
  });
  audio.addEventListener("emptied", updatePlayState);
  audio.addEventListener("ended", nextTrack); // tự chuyển bài

  audio.addEventListener("error", () => {
    // Thử kiểu mã hoá dấu tiếng Việt khác trước khi báo lỗi
    if (sourceIndex < sources.length - 1) {
      sourceIndex += 1;
      audio.src = sources[sourceIndex];
      if (wantPlay) play();
      return;
    }
    showError();
  });

  const onDuration = () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
    if (progress) progress.disabled = !hasDuration();
  };
  audio.addEventListener("loadedmetadata", onDuration);
  audio.addEventListener("durationchange", onDuration);

  audio.addEventListener("timeupdate", () => {
    if (scrubbing) return;
    if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
    if (hasDuration()) setProgress((audio.currentTime / audio.duration) * 100);
  });

  /* --- Phím media (tai nghe, khoá màn hình, bàn phím) --- */
  if ("mediaSession" in navigator) {
    const handlers = { play, pause, previoustrack: prevTrack, nexttrack: nextTrack };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        /* trình duyệt không hỗ trợ hành động này — bỏ qua */
      }
    }
  }

  // Nạp bài đầu tiên (không tự phát vì trình duyệt chặn autoplay)
  loadSong(0);
}

/* 5) KHỞI ĐỘNG — mỗi phần chạy độc lập, một phần lỗi không làm hỏng phần khác */
function boot() {
  [initClock, initPlayer].forEach((init) => {
    try {
      init();
    } catch (err) {
      console.error("Lỗi khi khởi tạo " + init.name + ":", err);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
