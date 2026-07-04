import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Reply } from "lucide-react";
import { setTyping, sendMediaMessage } from "../services/chatService";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return { url: data.secure_url, mediaType: resourceType };
}

export default function MessageInput({ onSend, chatId, currentUser, frozen, participants, replyingTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null); // { file, url, mediaType }
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef(null);

  const stopTyping = () => {
    if (isTypingRef.current && chatId && currentUser) {
      isTypingRef.current = false;
      setTyping(chatId, currentUser.uid, false);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);

    if (!chatId || !currentUser) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(chatId, currentUser.uid, true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;

    setPreview({
      file,
      url: URL.createObjectURL(file),
      mediaType: isVideo ? "video" : "image",
    });
    e.target.value = "";
  };

  const cancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (frozen) return;

    if (preview) {
      setUploading(true);
      try {
        const { url, mediaType } = await uploadToCloudinary(preview.file);
        // caption (whatever is in the text box) travels with the media
        // as one single message — not a separate bubble
        await sendMediaMessage(chatId, currentUser.uid, url, mediaType, participants, text.trim(), replyingTo || null);
      } catch (err) {
        console.error("Media upload failed:", err);
      }
      setUploading(false);
      cancelPreview();
      setText("");
      clearTimeout(typingTimeoutRef.current);
      stopTyping();
      onCancelReply?.();
      return;
    }

    if (!text.trim()) return;
    onSend(text.trim(), replyingTo || null);
    setText("");
    clearTimeout(typingTimeoutRef.current);
    stopTyping();
    onCancelReply?.();
  };

  // clear typing state when leaving the chat or unmounting
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  if (frozen) {
    return (
      <div className="message-input-bar frozen">
        <p className="frozen-notice">This group has been frozen by an admin.</p>
      </div>
    );
  }

  return (
    <form className="message-input-bar" onSubmit={handleSubmit}>
      {replyingTo && (
        <div className="reply-preview-bar">
          <Reply size={16} className="reply-preview-icon" />
          <div className="reply-preview-content">
            <p className="reply-preview-sender">{replyingTo.senderName}</p>
            <p className="reply-preview-text">{replyingTo.preview}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply">
            <X size={16} />
          </button>
        </div>
      )}

      {preview && (
        <div className="media-preview-bar">
          {preview.mediaType === "video" ? (
            <video src={preview.url} className="media-preview-thumb" />
          ) : (
            <img src={preview.url} className="media-preview-thumb" alt="Preview" />
          )}
          <button type="button" onClick={cancelPreview} aria-label="Remove attachment">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="message-input-controls">
        <input
          type="file"
          accept="image/*,video/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="attach-button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image or video"
        >
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          placeholder={preview ? "Add a caption..." : "Type a message..."}
          value={text}
          onChange={handleChange}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading}>
          <Send size={20} />
        </button>
      </div>
    </form>
  );
}