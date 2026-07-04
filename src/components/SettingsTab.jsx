import { useState, useRef } from "react";
import { LogOut, Edit2, Check, X, Camera, Eraser } from "lucide-react";
import { logoutUser, updateDisplayName, updateProfilePicture, updatePrivacy, updateBio } from "../services/authService";
import { clearAllChatsForUser } from "../services/chatService";
import { useUserProfile } from "../hooks/useUserProfile";
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

export default function SettingsTab({ user }) {
  const profile = useUserProfile(user?.uid);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    setDraft(profile?.displayName || "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === profile?.displayName) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    await updateDisplayName(trimmed);
    setSaving(false);
    setIsEditing(false);
  };

  const startEditBio = () => {
    setBioDraft(profile?.bio || "");
    setIsEditingBio(true);
  };

  const cancelEditBio = () => {
    setIsEditingBio(false);
  };

  const saveBio = async () => {
    setSavingBio(true);
    await updateBio(user.uid, bioDraft.trim());
    setSavingBio(false);
    setIsEditingBio(false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await updateProfilePicture(user.uid, url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo. Try a different image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleToggleHideEmail = async (e) => {
    await updatePrivacy(user.uid, e.target.checked);
  };

  const handleClearAllMessages = async () => {
    const confirmed = window.confirm(
      "Clear all messages in every chat and group for you? Other people in those chats will still see them."
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      await clearAllChatsForUser(user.uid);
    } catch (err) {
      console.error("Failed to clear all messages:", err);
      alert("Something went wrong clearing your messages. Try again.");
    } finally {
      setClearingAll(false);
    }
  };

  if (!profile) {
    return <div className="empty-state">Loading...</div>;
  }

  return (
    <div className="settings-tab">
      <div className="settings-profile">
        <div className="settings-avatar-wrap" onClick={handlePhotoClick}>
          <Avatar user={profile} size="large" />
          <div className="avatar-overlay">
            <Camera size={18} />
          </div>
          {uploading && <div className="avatar-uploading">Uploading...</div>}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />

        {isEditing ? (
          <div className="settings-name-edit">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button onClick={saveEdit} disabled={saving} aria-label="Save">
              <Check size={18} />
            </button>
            <button onClick={cancelEdit} aria-label="Cancel">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="settings-name-row">
            <p className="settings-name">{profile.displayName}</p>
            <button onClick={startEdit} aria-label="Edit name">
              <Edit2 size={16} />
            </button>
          </div>
        )}

        <p className="settings-email">{profile.email}</p>
      </div>

      <div className="settings-section">
        <div className="info-section-header">
          <p className="settings-section-title">Bio</p>
          {!isEditingBio && (
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
              placeholder="Tell people about yourself..."
              maxLength={150}
              autoFocus
            />
            <div className="settings-name-edit">
              <button onClick={saveBio} disabled={savingBio} className="modal-primary-btn">
                <Check size={16} /> Save
              </button>
              <button onClick={cancelEditBio} aria-label="Cancel">
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <p className="info-bio-text">{profile.bio || "No bio yet."}</p>
        )}
      </div>

      <div className="settings-section">
        <p className="settings-section-title">Privacy</p>
        <label className="settings-toggle-row">
          <span>Hide my email from other users</span>
          <input
            type="checkbox"
            checked={profile.hideEmail || false}
            onChange={handleToggleHideEmail}
          />
        </label>
      </div>

      <div className="settings-section">
        <p className="settings-section-title">Data</p>
        <button
          className="info-admin-action-btn danger"
          onClick={handleClearAllMessages}
          disabled={clearingAll}
        >
          <Eraser size={16} />
          {clearingAll ? "Clearing..." : "Clear all messages for me"}
        </button>
      </div>

      <button className="settings-logout" onClick={logoutUser}>
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  );
}