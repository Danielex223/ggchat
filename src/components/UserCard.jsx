import { UserPlus, UserCheck, Clock, MessageCircle } from "lucide-react";
import Avatar from "./Avatar";

export default function UserCard({ user, status, onAction }) {
  const renderAction = () => {
    if (status === "friend") {
      return (
        <>
          <MessageCircle size={14} /> Message
        </>
      );
    }
    if (status === "pending-out") {
      return (
        <>
          <Clock size={14} /> Requested
        </>
      );
    }
    if (status === "pending-in") {
      return (
        <>
          <UserCheck size={14} /> Accept
        </>
      );
    }
    return (
      <>
        <UserPlus size={14} /> Add
      </>
    );
  };

  return (
    <div className="chat-list-item user-card">
      <Avatar user={user} showOnlineDot />
      <div className="chat-list-info">
        <p className="chat-list-name">{user.displayName}</p>
        {!user.hideEmail && <p className="chat-list-preview">{user.email}</p>}
      </div>
      <button
        className={`friend-action-btn ${status}`}
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
      >
        {renderAction()}
      </button>
    </div>
  );
}