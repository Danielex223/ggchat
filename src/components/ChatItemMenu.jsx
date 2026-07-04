import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2, Archive, ArchiveRestore, MessageCircleQuestion, UserX } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  hideChatForUser,
  setChatArchived,
  createOrGetChat,
} from "../services/chatService";
import { removeFriend } from "../services/friendsService";

export default function ChatItemMenu({ chat, currentUser, setActiveTab, onSelectChat }) {
  const [open, setOpen] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const menuRef = useRef(null);

  const isArchived = !!chat.archivedBy?.[currentUser.uid];
  const otherUid = !chat.isGroup
    ? chat.participants.find((uid) => uid !== currentUser.uid)
    : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowAdmins(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showAdmins) return;
    const adminIds = chat.adminIds || [];
    const unsubscribers = adminIds.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        const data = snap.data();
        if (!data) return;
        setAdminProfiles((prev) => {
          const others = prev.filter((p) => p.uid !== data.uid);
          return [...others, data];
        });
      })
    );
    return () => unsubscribers.forEach((u) => u());
  }, [showAdmins, chat.adminIds]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      chat.isGroup
        ? "Delete this group from your list? You'll stay a member — it'll come back if anyone sends a new message."
        : "Delete this chat from your list? It'll come back if they message you again."
    );
    if (!confirmed) return;
    await hideChatForUser(chat.id, currentUser.uid);
    setOpen(false);
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    await setChatArchived(chat.id, currentUser.uid, !isArchived);
    setOpen(false);
  };

  const handleContactAdmin = (e) => {
    e.stopPropagation();
    setShowAdmins(true);
  };

  const handlePickAdmin = async (e, adminUid) => {
    e.stopPropagation();
    const dmChatId = await createOrGetChat(currentUser.uid, adminUid);
    setOpen(false);
    setShowAdmins(false);
    setActiveTab("chats");
    onSelectChat(dmChatId);
  };

  const handleUnfriend = async (e) => {
    e.stopPropagation();
    if (!otherUid) return;
    const confirmed = window.confirm(
      "Remove this friend? The chat will disappear from both your lists — message history stays intact if you ever add each other back."
    );
    if (!confirmed) return;

    await removeFriend(currentUser.uid, otherUid);
    // hide the chat on both sides — unfriending should remove it from view, not just the relationship
    await Promise.all([
      hideChatForUser(chat.id, currentUser.uid),
      hideChatForUser(chat.id, otherUid),
    ]);

    setOpen(false);
  };

  return (
    <div className="chat-item-menu" ref={menuRef}>
      <button
        className="chat-item-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        aria-label="Chat options"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="chat-item-dropdown" onClick={(e) => e.stopPropagation()}>
          {!showAdmins ? (
            <>
              <button onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={handleArchive}>
                {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {isArchived ? "Unarchive" : "Archive"}
              </button>
              {!chat.isGroup && (
                <button onClick={handleUnfriend}>
                  <UserX size={14} /> Unadd friend
                </button>
              )}
              {chat.isGroup && (
                <button onClick={handleContactAdmin}>
                  <MessageCircleQuestion size={14} /> Contact admin
                </button>
              )}
            </>
          ) : (
            <div className="chat-item-admin-list">
              {adminProfiles.length === 0 && (
                <p className="info-mini-status">Loading admins...</p>
              )}
              {adminProfiles.map((a) => (
                <button key={a.uid} onClick={(e) => handlePickAdmin(e, a.uid)}>
                  Message {a.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}