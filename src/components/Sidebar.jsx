import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { subscribeToUserChats, searchUsersByName, createOrGetChat } from "../services/chatService";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "../services/friendsService";
import { useUserProfile } from "../hooks/useUserProfile";
import { useProfiles } from "../hooks/useProfiles";
import { Plus, Archive, ArrowLeft, UserPlus, Check, X } from "lucide-react";
import SearchBar from "./SearchBar";
import SettingsTab from "./SettingsTab";
import Avatar from "./Avatar";
import NewGroupModal from "./NewGroupModal";
import ChatItemMenu from "./ChatItemMenu";

function ChatListItem({ chat, currentUser, selectedChatId, onSelectChat, setActiveTab }) {
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    if (chat.isGroup) return;
    const otherUid = chat.participants.find((uid) => uid !== currentUser.uid);
    if (!otherUid) return;
    const unsubscribe = onSnapshot(doc(db, "users", otherUid), (snap) => {
      setOtherUser(snap.data());
    });
    return () => unsubscribe();
  }, [chat, currentUser]);

  const name = chat.isGroup ? chat.groupName : otherUser?.displayName || "...";

  const isTyping = Object.entries(chat.typing || {}).some(
    ([uid, typing]) => typing && uid !== currentUser.uid
  );

  const myLastReadMillis = chat.lastRead?.[currentUser.uid]?.toMillis
    ? chat.lastRead[currentUser.uid].toMillis()
    : null;
  const lastMessageMillis = chat.lastMessageAt?.toMillis
    ? chat.lastMessageAt.toMillis()
    : null;
  const isUnread =
    !!chat.lastMessageSenderId &&
    chat.lastMessageSenderId !== currentUser.uid &&
    lastMessageMillis != null &&
    (myLastReadMillis == null || lastMessageMillis > myLastReadMillis);

  return (
    <div
      className={`chat-list-item ${selectedChatId === chat.id ? "active" : ""}`}
      onClick={() => onSelectChat(chat.id)}
    >
      {chat.isGroup ? (
        <div className="avatar-placeholder">
          {chat.groupPhotoURL && (
            <img src={chat.groupPhotoURL} alt="" className="avatar-img" />
          )}
        </div>
      ) : (
        <Avatar user={otherUser} showOnlineDot />
      )}
      <div className="chat-list-info">
        <p className="chat-list-name">{name}</p>
        {isTyping ? (
          <p className="chat-list-preview typing-text">typing...</p>
        ) : (
          <p className="chat-list-preview">{chat.lastMessage || "No messages yet"}</p>
        )}
      </div>
      {isUnread && <span className="unread-badge" aria-label="Unread messages" />}
      <ChatItemMenu
        chat={chat}
        currentUser={currentUser}
        setActiveTab={setActiveTab}
        onSelectChat={onSelectChat}
      />
    </div>
  );
}

function ArchivedRow({ count, onClick }) {
  if (count === 0) return null;
  return (
    <div className="archived-row" onClick={onClick}>
      <div className="archived-icon">
        <Archive size={18} />
      </div>
      <div className="chat-list-info">
        <p className="chat-list-name">Archived</p>
      </div>
      <span className="archived-count">{count}</span>
    </div>
  );
}

function ArchivedView({ chats, user, selectedChatId, onSelectChat, setActiveTab, onBack, isGroupView }) {
  const archivedChats = chats.filter(
    (c) =>
      !!c.isGroup === isGroupView &&
      c.archivedBy?.[user.uid] &&
      !c.hiddenBy?.[user.uid]
  );

  return (
    <div className="chat-list">
      <div className="archived-header">
        <button onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <p>Archived {isGroupView ? "Groups" : "Chats"}</p>
      </div>

      {archivedChats.length === 0 && (
        <p className="empty-state">No archived {isGroupView ? "groups" : "chats"}.</p>
      )}
      {archivedChats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          currentUser={user}
          selectedChatId={selectedChatId}
          onSelectChat={onSelectChat}
          setActiveTab={setActiveTab}
        />
      ))}
    </div>
  );
}

function ContactsTab({ user, onSelectChat }) {
  const myProfile = useUserProfile(user.uid);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  const friends = myProfile?.friends || [];
  const incoming = myProfile?.incomingRequests || [];
  const outgoing = myProfile?.outgoingRequests || [];

  const friendProfiles = useProfiles(friends);
  const incomingProfiles = useProfiles(incoming);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      const found = await searchUsersByName(term.trim(), user.uid);
      setResults(found);
    }, 300);

    return () => clearTimeout(delay);
  }, [term, user]);

  const handleOpenChat = async (otherUid) => {
    const chatId = await createOrGetChat(user.uid, otherUid);
    onSelectChat(chatId);
  };

  const handleAccept = (e, requesterUid) => {
    e.stopPropagation();
    acceptFriendRequest(user.uid, requesterUid);
  };

  const handleDecline = (e, requesterUid) => {
    e.stopPropagation();
    declineFriendRequest(user.uid, requesterUid);
  };

  const handleSendRequest = (e, targetUid) => {
    e.stopPropagation();
    sendFriendRequest(user.uid, targetUid);
  };

  const handleCancelRequest = (e, targetUid) => {
    e.stopPropagation();
    cancelFriendRequest(user.uid, targetUid);
  };

  return (
    <div className="chat-list">
      <SearchBar value={term} onChange={setTerm} placeholder="Search by name..." />

      {term ? (
        <>
          {results.length === 0 && <p className="empty-state">No users found.</p>}
          {results.map((u) => {
            const isFriend = friends.includes(u.uid);
            const requestSent = outgoing.includes(u.uid);
            const requestReceived = incoming.includes(u.uid);

            return (
              <div
                key={u.uid}
                className="chat-list-item"
                onClick={() => isFriend && handleOpenChat(u.uid)}
              >
                <Avatar user={u} />
                <div className="chat-list-info">
                  <p className="chat-list-name">{u.displayName}</p>
                  {!u.hideEmail && <p className="chat-list-preview">{u.email}</p>}
                </div>

                {isFriend ? (
                  <span className="friend-badge">Friends</span>
                ) : requestReceived ? (
                  <div className="friend-request-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => handleAccept(e, u.uid)} aria-label="Accept">
                      <Check size={14} />
                    </button>
                    <button onClick={(e) => handleDecline(e, u.uid)} aria-label="Decline">
                      <X size={14} />
                    </button>
                  </div>
                ) : requestSent ? (
                  <button
                    className="friend-pending-btn"
                    onClick={(e) => handleCancelRequest(e, u.uid)}
                  >
                    Pending
                  </button>
                ) : (
                  <button
                    className="friend-add-btn"
                    onClick={(e) => handleSendRequest(e, u.uid)}
                    aria-label="Add friend"
                  >
                    <UserPlus size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <>
          {incoming.length > 0 && (
            <div className="contacts-section">
              <p className="settings-section-title">Friend Requests ({incoming.length})</p>
              {incoming.map((uid) => {
                const p = incomingProfiles[uid];
                if (!p) return null;
                return (
                  <div key={uid} className="chat-list-item">
                    <Avatar user={p} />
                    <div className="chat-list-info">
                      <p className="chat-list-name">{p.displayName}</p>
                    </div>
                    <div className="friend-request-actions">
                      <button onClick={(e) => handleAccept(e, uid)} aria-label="Accept">
                        <Check size={14} />
                      </button>
                      <button onClick={(e) => handleDecline(e, uid)} aria-label="Decline">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="contacts-section">
            <p className="settings-section-title">Friends ({friends.length})</p>
            {friends.length === 0 && (
              <p className="empty-state">No friends yet. Search a name to add one.</p>
            )}
            {friends.map((uid) => {
              const p = friendProfiles[uid];
              if (!p) return null;
              return (
                <div key={uid} className="chat-list-item" onClick={() => handleOpenChat(uid)}>
                  <Avatar user={p} showOnlineDot />
                  <div className="chat-list-info">
                    <p className="chat-list-name">{p.displayName}</p>
                    {!p.hideEmail && <p className="chat-list-preview">{p.email}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function GroupsTab({ user, chats, selectedChatId, onSelectChat, setActiveTab }) {
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const groupChats = chats.filter(
    (c) => c.isGroup && !c.hiddenBy?.[user.uid] && !c.archivedBy?.[user.uid]
  );

  const archivedGroupCount = chats.filter(
    (c) => c.isGroup && c.archivedBy?.[user.uid] && !c.hiddenBy?.[user.uid]
  ).length;

  const handleCreated = (chatId) => {
    setShowModal(false);
    onSelectChat(chatId);
  };

  if (showArchived) {
    return (
      <ArchivedView
        chats={chats}
        user={user}
        selectedChatId={selectedChatId}
        onSelectChat={onSelectChat}
        setActiveTab={setActiveTab}
        onBack={() => setShowArchived(false)}
        isGroupView
      />
    );
  }

  return (
    <div className="chat-list">
      <button className="new-group-btn" onClick={() => setShowModal(true)}>
        <Plus size={18} />
        New Group
      </button>

      <ArchivedRow count={archivedGroupCount} onClick={() => setShowArchived(true)} />

      {groupChats.length === 0 && (
        <p className="empty-state">No groups yet.</p>
      )}
      {groupChats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          currentUser={user}
          selectedChatId={selectedChatId}
          onSelectChat={onSelectChat}
          setActiveTab={setActiveTab}
        />
      ))}

      {showModal && (
        <NewGroupModal
          user={user}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

export default function Sidebar({ user, activeTab, setActiveTab, onSelectChat, selectedChatId }) {
  const [chats, setChats] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserChats(user.uid, setChats);
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setShowArchived(false);
  }, [activeTab]);

  const archivedChatCount = chats.filter(
    (c) => !c.isGroup && c.archivedBy?.[user.uid] && !c.hiddenBy?.[user.uid]
  ).length;

  if (activeTab === "chats") {
    if (showArchived) {
      return (
        <ArchivedView
          chats={chats}
          user={user}
          selectedChatId={selectedChatId}
          onSelectChat={onSelectChat}
          setActiveTab={setActiveTab}
          onBack={() => setShowArchived(false)}
          isGroupView={false}
        />
      );
    }

    const directChats = chats.filter(
      (c) => !c.isGroup && !c.hiddenBy?.[user.uid] && !c.archivedBy?.[user.uid]
    );
    return (
      <div className="chat-list">
        <ArchivedRow count={archivedChatCount} onClick={() => setShowArchived(true)} />

        {directChats.length === 0 && (
          <p className="empty-state">No chats yet. Search a contact to start.</p>
        )}
        {directChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            currentUser={user}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            setActiveTab={setActiveTab}
          />
        ))}
      </div>
    );
  }

  if (activeTab === "groups") {
    return (
      <GroupsTab
        user={user}
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={onSelectChat}
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === "contacts") {
    return <ContactsTab user={user} onSelectChat={onSelectChat} />;
  }

  if (activeTab === "settings") {
    return <SettingsTab user={user} />;
  }

  return null;
}