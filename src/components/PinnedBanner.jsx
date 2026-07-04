import { Pin, X } from "lucide-react";
import { unpinMessage } from "../services/chatService";

export default function PinnedBanner({ chatId, pinnedMessage, onJumpTo }) {
  if (!pinnedMessage) return null;

  const handleUnpin = (e) => {
    e.stopPropagation();
    unpinMessage(chatId);
  };

  const previewText = pinnedMessage.deleted
    ? "This message was deleted"
    : pinnedMessage.text?.length > 60
    ? pinnedMessage.text.slice(0, 60) + "..."
    : pinnedMessage.text;

  return (
    <div className="pinned-banner" onClick={() => onJumpTo(pinnedMessage.id)}>
      <Pin size={16} className="pinned-icon" />
      <div className="pinned-content">
        <p className="pinned-label">Pinned Message</p>
        <p className="pinned-text">{previewText}</p>
      </div>
      <button onClick={handleUnpin} aria-label="Unpin message">
        <X size={16} />
      </button>
    </div>
  );
}