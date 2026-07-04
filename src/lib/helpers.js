export const resizeImageToBase64 = (file, maxSize = 200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const formatTime = (timestamp) => {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDuration = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const isChatUnread = (chat, uid) => {
  const myLastReadMillis = chat.lastRead?.[uid]?.toMillis
    ? chat.lastRead[uid].toMillis()
    : null;
  const lastMessageMillis = chat.lastMessageAt?.toMillis
    ? chat.lastMessageAt.toMillis()
    : null;
  return (
    !!chat.lastMessageSenderId &&
    chat.lastMessageSenderId !== uid &&
    lastMessageMillis != null &&
    (myLastReadMillis == null || lastMessageMillis > myLastReadMillis)
  );
};