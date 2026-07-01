import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePresence } from "../hooks/usePresence";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedChatId, setSelectedChatId] = useState(null);

  usePresence(user);

  const isChatOpen = !!selectedChatId;

  return (
    <div className={`app-layout ${isChatOpen ? "chat-open" : ""}`}>
      <div className="sidebar-panel">
        <div className="sidebar-header">
          <p>GGCHAT</p>
        </div>
        <Sidebar
          user={user}
          activeTab={activeTab}
          onSelectChat={setSelectedChatId}
          selectedChatId={selectedChatId}
        />
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <div className="chat-panel">
        <ChatWindow
          chatId={selectedChatId}
          currentUser={user}
          onBack={() => setSelectedChatId(null)}
        />
      </div>
    </div>
  );
}