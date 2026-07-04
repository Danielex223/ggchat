import { useState, useEffect, useRef } from "react";
import { X, Edit2, Check, UserPlus, UserMinus, Shield, ShieldOff, Snowflake, Camera, Tag, Trash2, LogOut, Eraser } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { extractYouTubeId, isYouTubeUrl } from "../services/youtubeService";
import { updateBio } from "../services/authService";
import {
  updateGroupBio,
  updateGroupPhoto,
  addGroupMember,
  removeGroupMember,
  makeGroupAdmin,
  removeGroupAdmin,
  setGroupFrozen,
  setMemberRole,
  searchUsersByName,
  deleteChat,
  leaveGroup,
  clearChatMessages,
} from "../services/chatService";
import Avatar from "./Avatar";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}

function LinkPreviewRow({ message }) {
  const videoId = extractYouTubeId(message.text);
  return (
    <a
      href={message.text}
      target="_blank"
      rel="noopener noreferrer"
      className="info-link-row"
    >
      {videoId && (
        <img
          src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
          alt=""
          className="info-link-thumb"
        />
      )}
      <span className="info-link-text">{message.text}</span>
    </a>
  );
}

function AddMemberRow({ chat, currentUser }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      const found = await searchUsersByName(term.trim(), currentUser.uid);
      setResults(found.filter((u) => !chat.participants.includes(u.uid)));
    }, 300);
    return () => clearTimeout(delay);
  }, [term, currentUser, chat.participants]);

  const handleAdd = async (uid) => {
    setAdding(uid);
    await addGroupMember(chat.id, uid);
    setAdding(null);
    setTerm("");
    setResults([]);
  };

  return (
    <div className="info-add-member">
      <input
        type="text"
        placeholder="Search by name to add..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {results.length > 0 && (
        <div className="modal-list">
          {results.map((u) => (
            <div key={u.uid} className="modal-list-item" onClick={() => handleAdd(u.uid)}>
              <Avatar user={u} />
              <p>{u.displayName}</p>
              {adding === u.uid ? <span className="info-mini-status">Adding...</span> : <UserPlus size={16} />}
            </div>
          ))}
        </div>
      )}
      {term && results.length === 0 && <p className="empty-state">No users found.</p>}
    </div>
  );
}

function RoleEditor({ chatId, memberUid, currentRole, onDone }) {
  const [role, setRole] = useState(currentRole || "");

  const save = async () => {
    await setMemberRole(chatId, memberUid, role.trim());
    onDone();
  };

  return (
    <div className="role-edit-row" onClick={(e) => e.stopPropagation()}>
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="e.g. Meme Lord"
        maxLength={24}
        autoFocus
      />
      <button onClick={save} aria-label="Save role">
        <Check size={14} />
      </button>
      <button onClick={onDone} aria-label="Cancel">
        <X size={14} />
      </button>
    </div>
  );
}

export default function InfoPanel({ chat, currentUser, messages, onClose, onGroupDeleted, onGroupLeft }) {
  const [otherUser, setOtherUser] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [togglingFreeze, setTogglingFreeze] = useState(false);
  const [editingRoleFor, setEditingRoleFor] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const photoInputRef = useRef(null);

  const isGroup = chat?.isGroup;
  const adminIds = chat?.adminIds || [];
  const roles = chat?.roles || {};
  const isAdmin = isGroup && adminIds.includes(currentUser.uid);
  const adminSlotsFull = adminIds.length >= 2;

  useEffect(() => {
    if (isGroup) return;
    const otherUid = chat.participants.find((uid) => uid !== currentUser.uid);
    if (!otherUid) return;
    const unsubscribe = onSnapshot(doc(db, "users", otherUid), (snap) => {
      setOtherUser(snap.data());
    });
    return () => unsubscribe();
  }, [chat, currentUser, isGroup]);

  useEffect(() => {
    if (!isGroup) return;
    const unsubscribers = chat.participants.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        const data = snap.data();
        if (!data) return;
        setMemberProfiles((prev) => {
          const others = prev.filter((p) => p.uid !== data.uid);
          return [...others, data];
        });
      })
    );
    return () => unsubscribers.forEach((u) => u());
  }, [chat, isGroup]);

  const startEditBio = () => {
    setBioDraft(isGroup ? chat.groupBio || "" : otherUser?.bio || "");
    setIsEditingBio(true);
  };

  const saveBio = async () => {
    setSaving(true);
    if (isGroup) {
      await updateGroupBio(chat.id, bioDraft.trim());
    } else {
      await updateBio(currentUser.uid, bioDraft.trim());
    }
    setSaving(false);
    setIsEditingBio(false);
  };

  const isOwnProfile = !isGroup && otherUser?.uid === currentUser.uid;
  const canEditBio = isGroup || isOwnProfile;

  const linkMessages = messages.filter(
    (m) => !m.deleted && isYouTubeUrl(m.text || "")
  );

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await updateGroupPhoto(chat.id, url);
    } catch (err) {
      console.error("Group photo upload failed:", err);
    }
    setUploadingPhoto(false);
  };

  const handleToggleFreeze = async () => {
    setTogglingFreeze(true);
    await setGroupFrozen(chat.id, !chat.frozen);
    setTogglingFreeze(false);
  };

  const handleRemoveMember = async (uid) => {
    await removeGroupMember(chat.id, uid);
  };

  const handleToggleAdmin = async (uid, currentlyAdmin) => {
    try {
      if (currentlyAdmin) {
        await removeGroupAdmin(chat.id, uid);
      } else {
        await makeGroupAdmin(chat.id, uid);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = window.confirm(
      `Delete "${chat.groupName}" for everyone? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    await deleteChat(chat.id);
    setDeleting(false);
    onGroupDeleted?.();
  };

  const handleClearMessages = async () => {
    const label = isGroup ? `"${chat.groupName}"` : `your chat with ${otherUser?.displayName || "this user"}`;
    const confirmed = window.confirm(
      `Clear all messages in ${label} for you? Other ${isGroup ? "members" : "person"} will still see them.`
    );
    if (!confirmed) return;

    setClearing(true);
    await clearChatMessages(chat.id, currentUser.uid);
    setClearing(false);
  };

  const handleLeaveGroup = async () => {
    const confirmed = window.confirm(`Leave "${chat.groupName}"?`);
    if (!confirmed) return;

    setLeaving(true);
    await leaveGroup(chat.id, currentUser.uid);
    setLeaving(false);
    onGroupLeft?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal info-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p>{isGroup ? "Group Info" : "Contact Info"}</p>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="info-scroll">
          <div className="info-profile">
            {isGroup ? (
              <div className="info-group-avatar-wrap">
                {chat.groupPhotoURL ? (
                  <img src={chat.groupPhotoURL} alt="" className="info-group-avatar" />
                ) : (
                  <div className="avatar-placeholder large" />
                )}
                {isAdmin && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      ref={photoInputRef}
                      onChange={handlePhotoSelect}
                      style={{ display: "none" }}
                    />
                    <button
                      className="info-group-photo-btn"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      aria-label="Change group photo"
                    >
                      <Camera size={14} />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <Avatar user={otherUser} size="large" showOnlineDot />
            )}
            <p className="info-name">
              {isGroup ? chat.groupName : otherUser?.displayName || "..."}
            </p>
            {!isGroup && otherUser && (
              <p className="info-status">
                {otherUser.online ? "Online" : "Offline"}
              </p>
            )}
            {isGroup && chat.frozen && (
              <p className="info-status frozen-status">
                <Snowflake size={12} /> Frozen — only admins can message
              </p>
            )}
          </div>

          <div className="info-section">
            <div className="info-section-header">
              <p className="settings-section-title">
                {isGroup ? "Group Bio" : "Bio"}
              </p>
              {canEditBio && !isEditingBio && (
                <button onClick={startEditBio} aria-label="Edit bio">
                  <Edit2 size={14} />
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="info-bio-edit">
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  placeholder={isGroup ? "What's this group about?" : "Tell people about yourself..."}
                  maxLength={150}
                  autoFocus
                />
                <button onClick={saveBio} disabled={saving} className="modal-primary-btn">
                  <Check size={16} /> Save
                </button>
              </div>
            ) : (
              <p className="info-bio-text">
                {(isGroup ? chat.groupBio : otherUser?.bio) || "No bio yet."}
              </p>
            )}
          </div>

          <div className="info-section">
            <button
              className="info-admin-action-btn danger"
              onClick={handleClearMessages}
              disabled={clearing}
            >
              <Eraser size={16} />
              {clearing ? "Clearing..." : "Clear messages for me"}
            </button>
          </div>

          {!isGroup && !otherUser?.hideEmail && (
            <div className="info-section">
              <p className="settings-section-title">Email</p>
              <p className="info-bio-text">{otherUser?.email}</p>
            </div>
          )}

          {isGroup && isAdmin && (
            <div className="info-section">
              <p className="settings-section-title">Admin Controls</p>
              <p className="info-admin-note">
                {adminIds.length}/2 admin slots used
              </p>

              <button className="info-admin-action-btn" onClick={handleToggleFreeze} disabled={togglingFreeze}>
                <Snowflake size={16} />
                {chat.frozen ? "Unfreeze group" : "Freeze group (only admins can message)"}
              </button>

              {!showAddMember ? (
                <button className="info-admin-action-btn" onClick={() => setShowAddMember(true)}>
                  <UserPlus size={16} /> Add member
                </button>
              ) : (
                <AddMemberRow chat={chat} currentUser={currentUser} />
              )}

              <button
                className="info-admin-action-btn danger"
                onClick={handleDeleteGroup}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete group for everyone"}
              </button>
            </div>
          )}

          {isGroup && (
            <div className="info-section">
              <p className="settings-section-title">
                Members ({memberProfiles.length})
              </p>
              {memberProfiles.map((m) => {
                const memberIsAdmin = adminIds.includes(m.uid);
                const memberRole = roles[m.uid];
                const disableMakeAdmin = !memberIsAdmin && adminSlotsFull;

                return (
                  <div key={m.uid} className="info-member-row">
                    <Avatar user={m} showOnlineDot />
                    <div className="info-member-details">
                      <p className="info-member-name">
                        {m.displayName}
                        {memberIsAdmin && <span className="info-admin-badge">Admin</span>}
                      </p>

                      {editingRoleFor === m.uid ? (
                        <RoleEditor
                          chatId={chat.id}
                          memberUid={m.uid}
                          currentRole={memberRole}
                          onDone={() => setEditingRoleFor(null)}
                        />
                      ) : memberRole ? (
                        <span
                          className="info-role-tag"
                          onClick={() => isAdmin && setEditingRoleFor(m.uid)}
                        >
                          <Tag size={11} /> {memberRole}
                        </span>
                      ) : (
                        isAdmin && (
                          <button
                            className="info-set-role-btn"
                            onClick={() => setEditingRoleFor(m.uid)}
                          >
                            + Add role tag
                          </button>
                        )
                      )}
                    </div>

                    {isAdmin && m.uid !== currentUser.uid && (
                      <div className="info-member-actions">
                        <button
                          onClick={() => handleToggleAdmin(m.uid, memberIsAdmin)}
                          disabled={disableMakeAdmin}
                          aria-label={memberIsAdmin ? "Remove admin" : "Make admin"}
                          title={
                            disableMakeAdmin
                              ? "Max 2 admins reached"
                              : memberIsAdmin
                              ? "Remove admin"
                              : "Make admin"
                          }
                        >
                          {memberIsAdmin ? <ShieldOff size={15} /> : <Shield size={15} />}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m.uid)}
                          aria-label="Remove member"
                          title="Remove member"
                        >
                          <UserMinus size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="info-section">
            <p className="settings-section-title">
              Shared Links ({linkMessages.length})
            </p>
            {linkMessages.length === 0 ? (
              <p className="info-bio-text">No links shared yet.</p>
            ) : (
              linkMessages.map((m) => <LinkPreviewRow key={m.id} message={m} />)
            )}
          </div>

          {isGroup && (
            <div className="info-section">
              <button
                className="info-admin-action-btn danger"
                onClick={handleLeaveGroup}
                disabled={leaving}
              >
                <LogOut size={16} />
                {leaving ? "Leaving..." : "Exit group"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}