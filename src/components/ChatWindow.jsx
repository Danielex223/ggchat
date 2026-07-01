import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Tv } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

import {
  subscribeToMessages,
  sendMessage,
  subscribeToChat,
  startWatchSession,
} from "../services/chatService";

import { extractYouTubeId, isYouTubeUrl } from "../services/youtubeService";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import WatchParty from "./WatchParty";

export default function ChatWindow({ chatId, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [chatData, setChatData] = useState(null);

  const bottomRef = useRef(null);

  // messages
  useEffect(() => {
    if (!chatId) return;
    return subscribeToMessages(chatId, setMessages);
  }, [chatId]);

  // chat doc (includes watch session)
  useEffect(() => {
    if (!chatId) return;
    return subscribeToChat(chatId, setChatData);
  }, [chatId]);

  // other user
  useEffect(() => {
    if (!chatData || chatData.isGroup) return;

    const otherUid = chatData.participants.find(
      (uid) => uid !== currentUser.uid
    );

    if (!otherUid) return;

    return onSnapshot(doc(db, "users", otherUid), (snap) => {
      setOtherUser(snap.data());
    });
  }, [chatData, currentUser]);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // send message + auto start watch
  const handleSend = (text) => {
    sendMessage(chatId, currentUser.uid, text);

    if (!chatData?.watchSession && isYouTubeUrl(text)) {
      const videoId = extractYouTubeId(text);

      if (videoId) {
        startWatchSession(chatId, videoId, currentUser.uid);
      }
    }
  };

  if (!chatId) {
    return (
      <div className="empty-state chat-placeholder">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>

        <div className="avatar-placeholder small">
          {otherUser?.online && <span className="online-dot" />}
        </div>

        <div>
          <p className="chat-header-name">
            {otherUser?.displayName || "Chat"}
          </p>
          <p className="chat-header-status">
            {otherUser?.online ? "Online" : "Offline"}
          </p>
        </div>

        <Tv size={20} className="watch-icon" />
      </div>

      <div className="messages-scroll">
        {/* WATCH PARTY */}
        {chatData?.watchSession?.videoId && (
          <WatchParty
            chatId={chatId}
            currentUser={currentUser}
            watchSession={chatData.watchSession}
          />
        )}

        {/* MESSAGES */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUser.uid}
            activeWatchVideoId={chatData?.watchSession?.videoId}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  );
}