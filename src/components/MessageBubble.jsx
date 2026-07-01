import { useState } from "react";
import { Trash2, Pin, Edit } from "lucide-react";
import { extractYouTubeId, isYouTubeUrl } from "../services/youtubeService";
import { pinMessage } from "../services/chatService";

export default function MessageBubble({
  message,
  isOwn,
  activeWatchVideoId,
  onDelete,
  onEdit,
  chatId,
}) {
  const [showActions, setShowActions] = useState(false);

  const youtubeId = isYouTubeUrl(message.text)
    ? extractYouTubeId(message.text)
    : null;

  const isActiveWatchParty = youtubeId && youtubeId === activeWatchVideoId;

  const handleDelete = () => {
    onDelete?.(message.id);
  };

  const handlePin = () => {
    pinMessage(chatId, message.id);
  };

  const handleEdit = () => {
    onEdit?.(message);
  };

  return (
    <div
      className={`message-row ${isOwn ? "own" : ""}`}
      onClick={() => setShowActions((p) => !p)}
    >
      <div className="message-wrapper">
        {/* ACTIONS */}
        {showActions && isOwn && (
          <div className="message-actions">
            <button onClick={handleEdit}>
              <Edit size={16} />
            </button>

            <button onClick={handlePin}>
              <Pin size={16} />
            </button>

            <button onClick={handleDelete}>
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* MESSAGE */}
        <div className={`message-bubble ${isOwn ? "sent" : "received"}`}>
          {message.deleted ? (
            <p className="deleted-text">This message was deleted</p>
          ) : youtubeId ? (
            isActiveWatchParty ? (
              <div className="watch-party-chip">▶ Playing in Watch Together</div>
            ) : (
              <div className="youtube-embed">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="YouTube video"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            )
          ) : (
            <p>{message.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
