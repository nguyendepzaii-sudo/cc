/* ==========================================================
   music.js — Trình phát nhạc cho trang cá nhân
   Đặt file này cùng thư mục với các file .flac
   ========================================================== */

/* 1) DANH SÁCH BÀI HÁT
   Tên phải khớp 100% với tên file thực tế trong repo
   (khoảng trắng, dấu tiếng Việt, ký tự $, đuôi .flac) */
const songs = [
  "Tien Tien - My Everything.flac",
  "bob$ - Ít Bạn Ít Nạn.flac",
];

/* 2) HÀM TIỆN ÍCH */

// Bỏ đuôi .flac (không phân biệt hoa/thường) khi hiển thị tên bài
function getDisplayName(fileName) {
  return fileName.replace(/\.flac$/i, "").trim();
}

// Mã hoá đường dẫn để khoảng trắng, $, dấu tiếng Việt không gây lỗi 404
function toUrl(fileName) {
  return fileName.split("/").map(encodeURIComponent).join("/");
}

// Đổi giây -> m:ss
function formatTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return m + ":" + s;
}

/* 3) TRÌNH PHÁT */
function initPlayer() {
  if (!songs.length) return;

  // Tìm phần tử theo nhiều ID phổ biến, lấy cái đầu tiên tìm thấy
  const pick = (...selectors) => {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  const songName   = pick("#song-name");
  const audio      = pick("audio") || new Audio();
  const playBtn    = pick("#play-btn", "#play", "#playBtn", "#play-pause");
  const prevBtn    = pick("#prev-btn", "#prev", "#prevBtn");
  const nextBtn    = pick("#next-btn", "#next", "#nextBtn");
  const progress   = pick("#progress", "#progress-bar", "#seek-bar", "#seek");
  const currentEl  = pick("#current-time", "#currentTime");
  const durationEl = pick("#duration", "#total-time");

  let index = 0;

  audio.preload = "metadata"; // không tải cả file FLAC nặng khi vừa mở trang

  function setProgress(percent) {
    if (!progress) return;
    if ("value" in progress) progress.value = percent;
    else progress.style.width = percent + "%";
  }

  function updatePlayIcon() {
    if (!playBtn) return;
    playBtn.classList.toggle("playing", !audio.paused);
    const icon = playBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-play", audio.paused);
      icon.classList.toggle("fa-pause", !audio.paused);
    } else if (!playBtn.children.length) {
      playBtn.textContent = audio.paused ? "▶" : "⏸";
    }
  }

  function loadSong(i, autoPlay = false) {
    index = (i + songs.length) % songs.length;
    const file = songs[index];

    audio.src = toUrl(file);
    if (songName) songName.textContent = getDisplayName(file); // hiện tên, đã bỏ .flac
    setProgress(0);
    if (currentEl) currentEl.textContent = "0:00";
    if (durationEl) durationEl.textContent = "0:00";

    if (autoPlay) {
      audio.play().catch((err) => console.warn("Không thể phát:", err));
    }
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch((err) => console.warn("Không thể phát:", err));
    } else {
      audio.pause();
    }
  }

  // Nút bấm
  if (playBtn) playBtn.addEventListener("click", togglePlay);
  if (prevBtn) prevBtn.addEventListener("click", () => loadSong(index - 1, true));
  if (nextBtn) nextBtn.addEventListener("click", () => loadSong(index + 1, true));

  // Thanh tiến trình
  if (progress && "value" in progress) progress.max = 100;
  if (progress && progress.type === "range") {
    progress.step = "any";
    progress.addEventListener("input", () => {
      if (audio.duration) {
        audio.currentTime = (progress.value / 100) * audio.duration;
      }
    });
  }

  // Sự kiện của audio
  audio.addEventListener("play", updatePlayIcon);
  audio.addEventListener("pause", updatePlayIcon);
  audio.addEventListener("ended", () => loadSong(index + 1, true)); // tự chuyển bài
  audio.addEventListener("error", () =>
    console.error("Không tải được file nhạc:", audio.src)
  );
  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
    if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
  });

  // Nạp bài đầu tiên (không tự phát vì trình duyệt chặn autoplay)
  loadSong(0);
  updatePlayIcon();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlayer);
} else {
  initPlayer();
}
