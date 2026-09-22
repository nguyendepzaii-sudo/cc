/* profile-features.js — profile-only UI enhancements */
(() => {
  "use strict";

  // Chỉ cần sửa object này để đổi trạng thái hiển thị trên profile.
  const PROFILE_STATUS = {
    text: "sleep",
    emoji: "💤💤",
    tone: "neutral"
  };

  const root = document.documentElement;
  const toast = document.getElementById("toast");
  const badge = document.getElementById("status-badge");
  const dot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const statusEmoji = document.getElementById("status-emoji");
  const statusEmojiText = document.getElementById("status-emoji-text");
  const quote = document.getElementById("quote");

  function applyStatus(status) {
    if (!statusText || !badge) return;
    statusText.textContent = status.text || "online";
    if (statusEmoji) statusEmoji.textContent = status.emoji || "";
    if (statusEmojiText) statusEmojiText.textContent = status.emoji || "";
    badge.dataset.tone = status.tone || "neutral";
    const offline = /offline|away|sleep/i.test(status.text || "");
    badge.classList.toggle("offline-text", offline);
    dot?.classList.toggle("offline", offline);
  }

  function typeQuote() {
    if (!quote) return;
    const text = quote.dataset.quote || "gg";
    let index = 0;
    const type = () => {
      quote.textContent = text.slice(0, index++);
      if (index <= text.length) window.setTimeout(type, 95);
    };
    window.setTimeout(type, 350);
  }

  // Giữ toast sẵn sàng cho các tính năng khác, nhưng không tạo thêm nút UI.
  window.spekcoNotify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(window.spekcoNotify.timer);
    window.spekcoNotify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  root.style.colorScheme = "dark";
  applyStatus(PROFILE_STATUS);
  typeQuote();
})();
