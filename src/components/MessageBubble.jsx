import { useState, useEffect, useRef } from "react";
import { Trash2, Pin, Edit, Check, CheckCheck, X, Play, Tag, Reply } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { extractYouTubeId, isYouTubeUrl } from "../services/youtubeService";
import {
  pinMessage,
  deleteMessage,
  editMessage,
  startWatchSession,
} from "../services/chatService";
import { formatTime } from "../lib/helpers";
import Avatar from "./Avatar";

export default function MessageBubble({
  message,
  isOwn,
  activeWatchVideoId,
  chatId,
  currentUser,
  showTicks,
  seen,
  isGroup,
  senderRole,
  otherUserName,
  onReply,
  onJumpToMessage,
}) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [senderProfile, setSenderProfile] = useState(null);
  const wasDeleted = useRef(message.deleted);

  useEffect(() => {
    if (message.deleted && !wasDeleted.current) {
      setIsDisintegrating(true);
      const timeout = setTimeout(() => setIsDisintegrating(false), 600);
      wasDeleted.current = true;
      return () => clearTimeout(timeout);
    }
    wasDeleted.current = message.deleted;
  }, [message.deleted]);

  // In group chats, load the sender's profile for name/avatar display
  useEffect(() => {
    if (!isGroup || isOwn) return;
    const unsubscribe = onSnapshot(doc(db, "users", message.senderId), (snap) => {
      setSenderProfile(snap.data());
    });
    return () => unsubscribe();
  }, [isGroup, isOwn, message.senderId]);

  const youtubeId =
    message.type !== "media" && isYouTubeUrl(message.text || "")
      ? extractYouTubeId(message.text)
      : null;

  const isActiveWatchParty = youtubeId && youtubeId === activeWatchVideoId;

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteMessage(chatId, message.id);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    pinMessage(chatId, message.id);
  };

  const handleReply = (e) => {
    e.stopPropagation();
    const preview = message.type === "media"
      ? message.mediaType === "image" ? "📷 Photo" : "🎬 Video"
      : message.text?.length > 80
      ? message.text.slice(0, 80) + "..."
      : message.text;

    onReply?.({
      id: message.id,
      senderId: message.senderId,
      senderName: isOwn ? "You" : isGroup ? senderProfile?.displayName || "..." : otherUserName || "...",
      preview,
    });
  };

  const handleJumpToReplied = (e) => {
    e.stopPropagation();
    if (message.replyTo?.id) onJumpToMessage?.(message.replyTo.id);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(message.text);
    setIsEditing(true);
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.text) {
      editMessage(chatId, message.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleHost = (e) => {
    e.stopPropagation();
    startWatchSession(chatId, youtubeId, currentUser.uid);
  };

  const openLightbox = (e) => {
    e.stopPropagation();
    setLightboxOpen(true);
  };

  const closeLightbox = (e) => {
    e.stopPropagation();
    setLightboxOpen(false);
  };

  return (
    <div
      className={`message-row ${isOwn ? "own" : ""}`}
      onClick={() => !isEditing && setShowActions((p) => !p)}
    >
      {showActions && !isEditing && !message.deleted && (
        <div className="message-actions">
          {isOwn && !youtubeId && message.type !== "media" && (
            <button onClick={startEdit} aria-label="Edit message">
              <Edit size={16} />
            </button>
          )}

          <button onClick={handleReply} aria-label="Reply to message">
            <Reply size={16} />
          </button>

          <button onClick={handlePin} aria-label="Pin message">
            <Pin size={16} />
          </button>

          {isOwn && (
            <button onClick={handleDelete} aria-label="Delete message">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      <div className="message-bubble-wrap">
        {isGroup && !isOwn && (
          <div className="message-sender-row">
            <Avatar user={senderProfile} size="tiny" />
            <span className="message-sender-name">
              {senderProfile?.displayName || "..."}
            </span>
            {senderRole && (
              <span className="message-sender-role">
                <Tag size={9} /> {senderRole}
              </span>
            )}
          </div>
        )}

        <div
          className={`message-bubble ${isOwn ? "sent" : "received"} ${
            isDisintegrating ? "disintegrating" : ""
          }`}
        >
          {!message.deleted && message.replyTo && (
            <div className="reply-quote" onClick={handleJumpToReplied}>
              <p className="reply-quote-sender">{message.replyTo.senderName}</p>
              <p className="reply-quote-text">{message.replyTo.preview}</p>
            </div>
          )}

          {message.deleted ? (
            !isDisintegrating && <p className="deleted-text">This message was deleted</p>
          ) : isEditing ? (
            <div className="message-edit" onClick={(e) => e.stopPropagation()}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className="message-edit-actions">
                <button onClick={saveEdit} aria-label="Save edit">
                  <Check size={16} />
                </button>
                <button onClick={cancelEdit} aria-label="Cancel edit">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : message.type === "media" ? (
            <>
              {message.mediaType === "video" ? (
                <video
                  src={message.mediaUrl}
                  controls
                  className="message-media"
                  preload="metadata"
                />
              ) : (
                <img
                  src={message.mediaUrl}
                  alt="Shared image"
                  className="message-media"
                  onClick={openLightbox}
                />
              )}
              {message.text && <p className="media-caption">{message.text}</p>}
            </>
          ) : youtubeId ? (
            isActiveWatchParty ? (
              <div className="watch-party-chip">▶ Playing in Watch Together</div>
            ) : (
              <div className="youtube-preview">
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                  alt="YouTube video thumbnail"
                />
                <button className="host-video-btn" onClick={handleHost}>
                  <Play size={14} />
                  Host video
                </button>
              </div>
            )
          ) : (
            <>
              <p>{message.text}</p>
              {message.edited && <span className="edited-tag">edited</span>}
            </>
          )}

          {!message.deleted && !isEditing && (
            <div className="message-meta">
              <span className="message-time">{formatTime(message.createdAt)}</span>
              {isOwn &&
                showTicks &&
                (seen ? (
                  <CheckCheck size={14} className="tick seen" />
                ) : (
                  <Check size={14} className="tick" />
                ))}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && message.type === "media" && message.mediaType === "image" && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label="Close">
            <X size={22} />
          </button>
          <img
            src={message.mediaUrl}
            alt="Shared image"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}