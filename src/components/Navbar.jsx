import { useState, useEffect } from "react";
import { Users, MessageCircle, Settings, UserSquare2 } from "lucide-react";
import { subscribeToUserChats } from "../services/chatService";
import { isChatUnread } from "../lib/helpers";

export default function Navbar({ activeTab, setActiveTab, user }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserChats(user.uid, setChats);
    return () => unsubscribe();
  }, [user]);

  const visibleChats = chats.filter(
    (c) => !c.hiddenBy?.[user?.uid] && !c.archivedBy?.[user?.uid]
  );

  const chatsUnread = visibleChats.filter(
    (c) => !c.isGroup && isChatUnread(c, user?.uid)
  ).length;

  const groupsUnread = visibleChats.filter(
    (c) => c.isGroup && isChatUnread(c, user?.uid)
  ).length;

  const tabs = [
    { id: "contacts", label: "Contacts", icon: UserSquare2, badge: 0 },
    { id: "groups", label: "Groups", icon: Users, badge: groupsUnread },
    { id: "chats", label: "Chats", icon: MessageCircle, badge: chatsUnread },
    { id: "settings", label: "Settings", icon: Settings, badge: 0 },
  ];

  return (
    <div className="navbar">
      {tabs.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          className={`navbar-tab ${activeTab === id ? "active" : ""}`}
          onClick={() => setActiveTab(id)}
        >
          <div className="navbar-icon-wrap">
            <Icon size={22} />
            {badge > 0 && (
              <span className="navbar-count-badge">{badge > 9 ? "9+" : badge}</span>
            )}
          </div>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}