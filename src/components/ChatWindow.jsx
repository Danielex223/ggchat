import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  subscribeToMessages,
  sendMessage,
  subscribeToChat,
  markChatRead,
} from "../services/chatService";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import WatchParty from "./WatchParty";
import Avatar from "./Avatar";
import PinnedBanner from "./PinnedBanner";
import InfoPanel from "./InfoPanel";

export default function ChatWindow({ chatId, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const bottomRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    if (!chatId) return;
    return subscribeToMessages(chatId, setMessages);
  }, [chatId]);

  useEffect(() => {
    setReplyingTo(null);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    return subscribeToChat(chatId, setChatData);
  }, [chatId]);

  // Mark this chat as read whenever it's open and new messages come in
  useEffect(() => {
    if (!chatId || !currentUser || messages.length === 0) return;
    markChatRead(chatId, currentUser.uid);
  }, [chatId, currentUser, messages]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text, replyTo) => {
    sendMessage(chatId, currentUser.uid, text, chatData?.participants || [], "text", replyTo || null);
    setReplyingTo(null);
  };

  const handleJumpToMessage = (messageId) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("message-highlight");
      setTimeout(() => el.classList.remove("message-highlight"), 1500);
    }
  };

  const handleGroupDeleted = () => {
    setShowInfo(false);
    onBack();
  };

  if (!chatId) {
    return (
      <div className="empty-state chat-placeholder">
        Select a chat to start messaging
      </div>
    );
  }

  // Hide messages sent before this user's own "clear" point. The message
  // docs themselves are untouched, so other participants still see them.
  const clearedAt = chatData?.clearedFor?.[currentUser.uid];
  const visibleMessages = clearedAt
    ? messages.filter((m) => !m.createdAt || m.createdAt.toMillis() > clearedAt.toMillis())
    : messages;

  const pinnedMessage = chatData?.pinnedMessageId
    ? visibleMessages.find((m) => m.id === chatData.pinnedMessageId)
    : null;

  const isGroup = !!chatData?.isGroup;
  const roles = chatData?.roles || {};
  const stillMember = chatData?.participants?.includes(currentUser.uid);
  const isAdmin = isGroup && stillMember && (chatData?.adminIds || []).includes(currentUser.uid);
  const isFrozenForMe = isGroup && chatData?.frozen && !isAdmin;
  const noLongerInGroup = isGroup && chatData && !stillMember;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>

        <div className="chat-header-clickable" onClick={() => setShowInfo(true)}>
          {isGroup ? (
            chatData.groupPhotoURL ? (
              <img src={chatData.groupPhotoURL} alt="" className="avatar-img-header" />
            ) : (
              <div className="avatar-placeholder" />
            )
          ) : (
            <Avatar user={otherUser} size="small" showOnlineDot />
          )}

          <div>
            <p className="chat-header-name">
              {isGroup ? chatData.groupName : otherUser?.displayName || "Chat"}
            </p>
            <p className="chat-header-status">
              {isGroup
                ? `${chatData.participants.length} members`
                : otherUser?.online
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
      </div>

      <PinnedBanner
        chatId={chatId}
        pinnedMessage={pinnedMessage}
        onJumpTo={handleJumpToMessage}
      />

      {chatData?.watchSession?.videoId && (
        <WatchParty
          chatId={chatId}
          currentUser={currentUser}
          watchSession={chatData.watchSession}
          viewers={chatData.watchViewers}
        />
      )}

      <div className="messages-scroll">
        {visibleMessages.map((msg) => (
          <div key={msg.id} ref={(el) => (messageRefs.current[msg.id] = el)}>
            <MessageBubble
              message={msg}
              isOwn={msg.senderId === currentUser.uid}
              activeWatchVideoId={chatData?.watchSession?.videoId}
              chatId={chatId}
              currentUser={currentUser}
              isGroup={isGroup}
              senderRole={roles[msg.senderId]}
              otherUserName={otherUser?.displayName}
              onReply={setReplyingTo}
              onJumpToMessage={handleJumpToMessage}
            />
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {noLongerInGroup ? (
        <div className="you-left-bar">
          <span>You're no longer a member of this group.</span>
          <button onClick={onBack}>Back to chats</button>
        </div>
      ) : (
        <MessageInput
          onSend={handleSend}
          chatId={chatId}
          currentUser={currentUser}
          frozen={isFrozenForMe}
          participants={chatData?.participants || []}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      )}

      {showInfo && chatData && stillMember && (
        <InfoPanel
          chat={chatData}
          currentUser={currentUser}
          messages={visibleMessages}
          onClose={() => setShowInfo(false)}
          onGroupDeleted={handleGroupDeleted}
          onGroupLeft={handleGroupDeleted}
        />
      )}
    </div>
  );
}