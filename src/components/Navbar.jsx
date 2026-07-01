import { Users, MessageCircle, Settings, UserSquare2 } from "lucide-react";

export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "contacts", label: "Contacts", icon: UserSquare2 },
    { id: "groups", label: "Groups", icon: Users },
    { id: "chats", label: "Chats", icon: MessageCircle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="navbar">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`navbar-tab ${activeTab === id ? "active" : ""}`}
          onClick={() => setActiveTab(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}