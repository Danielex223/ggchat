import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { searchUsersByName, createGroupChat } from "../services/chatService";
import Avatar from "./Avatar";

export default function NewGroupModal({ user, onClose, onCreated }) {
  const [step, setStep] = useState("members"); // "members" | "name"
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const toggleSelect = (contact) => {
    setSelected((prev) =>
      prev.some((u) => u.uid === contact.uid)
        ? prev.filter((u) => u.uid !== contact.uid)
        : [...prev, contact]
    );
  };

  const goToNameStep = () => {
    if (selected.length === 0) return;
    setStep("name");
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) return;

    setCreating(true);
    const participantUids = [user.uid, ...selected.map((u) => u.uid)];
    const chatId = await createGroupChat(participantUids, trimmed, user.uid);
    setCreating(false);
    onCreated(chatId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p>{step === "members" ? "Add Members" : "Name Your Group"}</p>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === "members" ? (
          <>
            <div className="modal-search">
              <input
                type="text"
                placeholder="Search by name..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                autoFocus
              />
            </div>

            {selected.length > 0 && (
              <div className="selected-chips">
                {selected.map((u) => (
                  <span key={u.uid} className="chip" onClick={() => toggleSelect(u)}>
                    {u.displayName} <X size={12} />
                  </span>
                ))}
              </div>
            )}

            <div className="modal-list">
              {results.map((u) => {
                const isSelected = selected.some((s) => s.uid === u.uid);
                return (
                  <div
                    key={u.uid}
                    className={`modal-list-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleSelect(u)}
                  >
                    <Avatar user={u} />
                    <p>{u.displayName}</p>
                    {isSelected && <Check size={18} className="check-icon" />}
                  </div>
                );
              })}
              {term && results.length === 0 && (
                <p className="empty-state">No users found.</p>
              )}
            </div>

            <button
              className="modal-primary-btn"
              disabled={selected.length === 0}
              onClick={goToNameStep}
            >
              Next ({selected.length} selected)
            </button>
          </>
        ) : (
          <>
            <div className="modal-search">
              <input
                type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <button
              className="modal-primary-btn"
              disabled={!groupName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? "Creating..." : "Create Group"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}