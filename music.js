/* ==========================================
   DANH SÁCH BÀI HÁT (SỬA DANH SÁCH NHẠC TẠI ĐÂY)
========================================== */
const songs = [
    "Tien Tien - My Everything.flac",
    "bob$ - Ít Bạn Ít Nạn.flac"
];

/* ==========================================
   TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI ONLINE / OFFLINE
========================================== */
function updateOnlineStatus() {
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    const statusBadge = document.getElementById("status-badge");

    if (navigator.onLine) {
        statusText.textContent = "online";
        statusDot.classList.remove("offline");
        statusBadge.classList.remove("offline-text");
    } else {
        statusText.textContent = "offline";
        statusDot.classList.add("offline");
        statusBadge.classList.add("offline-text");
    }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

/* ==========================================
   ĐỒNG HỒ (CLOCK)
========================================== */
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;
    hours = String(hours).padStart(2, "0");

    document.getElementById("clock").textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ==========================================
   TRÌNH PHÁT NHẠC (MUSIC PLAYER)
========================================== */
let currentSong = 0;

const audio = document.getElementById("audio-player");
const playButton = document.getElementById("play-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const songName = document.getElementById("song-name");
const progress = document.getElementById("progress");
const currentTimeText = document.getElementById("current-time");
const durationText = document.getElementById("duration");

function loadSong(index) {
    currentSong = index;
    const songFile = songs[currentSong];
    audio.src = songFile;

    // Tự động loại bỏ đường dẫn và phần mở rộng (.flac, .mp3, v.v.)
    const displayName = songFile.split('/').pop().replace(/\.[^/.]+$/, "");
    songName.textContent = displayName;

    audio.load();
    progress.value = 0;
    currentTimeText.textContent = "0:00";
    durationText.textContent = "0:00";
}

function playSong() {
    audio.play().then(() => {
        playButton.textContent = "⏸";
    }).catch(error => {
        console.log("Không thể tự động phát nhạc do chính sách trình duyệt:", error);
    });
}

function pauseSong() {
    audio.pause();
    playButton.textContent = "▶";
}

playButton.addEventListener("click", function() {
    if (audio.paused) {
        playSong();
    } else {
        pauseSong();
    }
});

nextButton.addEventListener("click", function() {
    currentSong++;
    if (currentSong >= songs.length) {
        currentSong = 0;
    }
    loadSong(currentSong);
    playSong();
});

prevButton.addEventListener("click", function() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    currentSong--;
    if (currentSong < 0) {
        currentSong = songs.length - 1;
    }
    loadSong(currentSong);
    playSong();
});

audio.addEventListener("ended", function() {
    currentSong++;
    if (currentSong >= songs.length) {
        currentSong = 0;
    }
    loadSong(currentSong);
    playSong();
});

audio.addEventListener("timeupdate", function() {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.value = percent;
    currentTimeText.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", function() {
    durationText.textContent = formatTime(audio.duration);
});

progress.addEventListener("input", function() {
    if (!audio.duration) return;
    audio.currentTime = (progress.value / 100) * audio.duration;
});

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
}

// Tải bài hát đầu tiên khi khởi chạy
loadSong(0);

