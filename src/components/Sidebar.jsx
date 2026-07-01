import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { subscribeToUserChats, searchUsersByName, createOrGetChat } from "../services/chatService";
import SearchBar from "./SearchBar";
import UserCard from "./UserCard";

function ChatListItem({ chat, currentUser, selectedChatId, onSelectChat }) {
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

  return (
    <div
      className={`chat-list-item ${selectedChatId === chat.id ? "active" : ""}`}
      onClick={() => onSelectChat(chat.id)}
    >
      <div className="avatar-placeholder">
        {!chat.isGroup && otherUser?.online && <span className="online-dot" />}
      </div>
      <div className="chat-list-info">
        <p className="chat-list-name">{name}</p>
        <p className="chat-list-preview">{chat.lastMessage || "No messages yet"}</p>
      </div>
    </div>
  );
}

function ContactsTab({ user, onSelectChat }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

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

  const handleSelect = async (otherUser) => {
    const chatId = await createOrGetChat(user.uid, otherUser.uid);
    onSelectChat(chatId);
  };

  return (
    <div className="chat-list">
      <SearchBar value={term} onChange={setTerm} placeholder="Search by name..." />
      {term && results.length === 0 && (
        <p className="empty-state">No users found.</p>
      )}
      {results.map((u) => (
        <UserCard key={u.uid} user={u} onClick={() => handleSelect(u)} />
      ))}
    </div>
  );
}

export default function Sidebar({ user, activeTab, onSelectChat, selectedChatId }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserChats(user.uid, setChats);
    return () => unsubscribe();
  }, [user]);

  if (activeTab === "chats") {
    const directChats = chats.filter((c) => !c.isGroup);
    return (
      <div className="chat-list">
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
          />
        ))}
      </div>
    );
  }

  if (activeTab === "groups") {
    const groupChats = chats.filter((c) => c.isGroup);
    return (
      <div className="chat-list">
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
          />
        ))}
      </div>
    );
  }

  if (activeTab === "contacts") {
    return <ContactsTab user={user} onSelectChat={onSelectChat} />;
  }

  if (activeTab === "settings") {
    return <div className="empty-state">Settings coming next.</div>;
  }

  return null;
}