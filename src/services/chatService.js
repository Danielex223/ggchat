import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  arrayUnion,
  arrayRemove,
  writeBatch,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const createOrGetChat = async (uid1, uid2) => {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participants", "array-contains", uid1));
  const snapshot = await getDocs(q);

  const existing = snapshot.docs.find((docSnap) => {
    const data = docSnap.data();
    return !data.isGroup && data.participants.includes(uid2);
  });

  if (existing) {
    await updateDoc(doc(db, "chats", existing.id), {
      [`hiddenBy.${uid1}`]: false,
    });
    return existing.id;
  }

  const newChat = await addDoc(chatsRef, {
    participants: [uid1, uid2],
    isGroup: false,
    groupName: "",
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: "",
    pinnedMessageId: "",
    pinnedBy: {},
    watchSession: null,
    watchViewers: {},
    typing: {},
    lastRead: {},
    hiddenBy: {},
    archivedBy: {},
    createdAt: serverTimestamp(),
  });

  return newChat.id;
};

export const createGroupChat = async (participantUids, groupName, creatorUid) => {
  const chatsRef = collection(db, "chats");

  const newChat = await addDoc(chatsRef, {
    participants: participantUids,
    isGroup: true,
    groupName,
    groupBio: "",
    groupPhotoURL: "",
    createdBy: creatorUid,
    adminIds: [creatorUid],
    roles: {},
    frozen: false,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: "",
    pinnedMessageId: "",
    pinnedBy: {},
    watchSession: null,
    watchViewers: {},
    typing: {},
    lastRead: {},
    hiddenBy: {},
    archivedBy: {},
    createdAt: serverTimestamp(),
  });

  return newChat.id;
};

export const updateGroupBio = async (chatId, groupBio) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { groupBio });
};

export const updateGroupPhoto = async (chatId, groupPhotoURL) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { groupPhotoURL });
};

const buildUnhidePatch = (participants = []) => {
  const patch = {};
  participants.forEach((uid) => {
    patch[`hiddenBy.${uid}`] = false;
  });
  return patch;
};

export const sendMessage = async (chatId, senderId, text, participants, type = "text", replyTo = null) => {
  const chatRef = doc(db, "chats", chatId);
  const messagesRef = collection(db, "chats", chatId, "messages");
  const newMsgRef = doc(messagesRef);

  const batch = writeBatch(db);

  batch.set(newMsgRef, {
    senderId,
    text,
    type,
    isPinned: false,
    deleted: false,
    edited: false,
    replyTo: replyTo || null,
    createdAt: serverTimestamp(),
  });

  batch.update(chatRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    ...buildUnhidePatch(participants),
  });

  await batch.commit();
};

export const sendMediaMessage = async (
  chatId,
  senderId,
  mediaUrl,
  mediaType,
  participants,
  caption = "",
  replyTo = null
) => {
  const chatRef = doc(db, "chats", chatId);
  const messagesRef = collection(db, "chats", chatId, "messages");
  const newMsgRef = doc(messagesRef);

  const previewLabel = mediaType === "image" ? "📷 Photo" : "🎬 Video";

  const batch = writeBatch(db);

  batch.set(newMsgRef, {
    senderId,
    text: caption,
    mediaUrl,
    mediaType,
    type: "media",
    isPinned: false,
    deleted: false,
    edited: false,
    replyTo: replyTo || null,
    createdAt: serverTimestamp(),
  });

  batch.update(chatRef, {
    lastMessage: caption ? `${previewLabel} · ${caption}` : previewLabel,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    ...buildUnhidePatch(participants),
  });

  await batch.commit();
};

const previewTextFor = (msgData) => {
  if (!msgData) return "";
  if (msgData.deleted) return "This message was deleted";
  if (msgData.type === "media") {
    const label = msgData.mediaType === "image" ? "📷 Photo" : "🎬 Video";
    return msgData.text ? `${label} · ${msgData.text}` : label;
  }
  return msgData.text;
};

export const deleteMessage = async (chatId, messageId) => {
  const msgRef = doc(db, "chats", chatId, "messages", messageId);

  await updateDoc(msgRef, {
    text: "",
    mediaUrl: "",
    deleted: true,
  });

  const latestQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const latestSnap = await getDocs(latestQuery);
  const latest = latestSnap.docs[0]?.data();

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: previewTextFor(latest),
    lastMessageAt: latest?.createdAt || serverTimestamp(),
    lastMessageSenderId: latest?.senderId || "",
  });
};

export const editMessage = async (chatId, messageId, newText) => {
  const msgRef = doc(db, "chats", chatId, "messages", messageId);

  await updateDoc(msgRef, {
    text: newText,
    edited: true,
  });
};

export const setTyping = async (chatId, uid, isTyping) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`typing.${uid}`]: isTyping,
  });
};

export const markChatRead = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`lastRead.${uid}`]: serverTimestamp(),
  });
};

export const togglePinChat = async (chatId, uid, currentlyPinned) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`pinnedBy.${uid}`]: !currentlyPinned,
  });
};

export const hideChatForUser = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`hiddenBy.${uid}`]: true,
  });
};

export const setChatArchived = async (chatId, uid, archived) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`archivedBy.${uid}`]: archived,
  });
};

export const addGroupMember = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayUnion(uid),
  });
};

export const removeGroupMember = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayRemove(uid),
    adminIds: arrayRemove(uid),
    [`roles.${uid}`]: "",
  });
};

export const leaveGroup = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayRemove(uid),
    adminIds: arrayRemove(uid),
    [`roles.${uid}`]: "",
  });
};

const MAX_ADMINS = 2;

export const makeGroupAdmin = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  const data = snap.data();
  const currentAdmins = data?.adminIds || [];

  if (currentAdmins.includes(uid)) return;

  if (currentAdmins.length >= MAX_ADMINS) {
    throw new Error(`This group already has the maximum of ${MAX_ADMINS} admins.`);
  }

  await updateDoc(chatRef, {
    adminIds: arrayUnion(uid),
  });
};

export const removeGroupAdmin = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    adminIds: arrayRemove(uid),
  });
};

export const setGroupFrozen = async (chatId, frozen) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { frozen });
};

export const setMemberRole = async (chatId, uid, role) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`roles.${uid}`]: role,
  });
};

export const startWatchSession = async (chatId, videoId, uid) => {
  await updateDoc(doc(db, "chats", chatId), {
    watchSession: {
      videoId,
      isPlaying: true,
      currentTime: 0,
      hostId: uid,
      updatedAt: serverTimestamp(),
    },
    watchViewers: { [uid]: true },
  });
};

export const updateWatchSession = async (chatId, updates, uid) => {
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    watchSession: {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
  });
};

export const endWatchSession = async (chatId) => {
  await updateDoc(doc(db, "chats", chatId), {
    watchSession: null,
    watchViewers: {},
  });
};

export const joinWatchParty = async (chatId, uid) => {
  await updateDoc(doc(db, "chats", chatId), {
    [`watchViewers.${uid}`]: true,
  });
};

export const leaveWatchParty = async (chatId, uid) => {
  await updateDoc(doc(db, "chats", chatId), {
    [`watchViewers.${uid}`]: false,
  });
};

export const subscribeToUserChats = (uid, callback) => {
  const chatsRef = collection(db, "chats");

  const q = query(
    chatsRef,
    where("participants", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  });
};

export const subscribeToMessages = (chatId, callback) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToChat = (chatId, callback) => {
  return onSnapshot(doc(db, "chats", chatId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

export const searchUsersByName = async (searchTerm, currentUid) => {
  if (!searchTerm.trim()) return [];

  const lowerTerm = searchTerm.trim().toLowerCase();
  const usersRef = collection(db, "users");

  const q = query(
    usersRef,
    where("displayName_lower", ">=", lowerTerm),
    where("displayName_lower", "<=", lowerTerm + "\uf8ff")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter((u) => u.uid !== currentUid);
};

export const deleteChat = async (chatId) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snapshot = await getDocs(messagesRef);

  const docs = snapshot.docs;
  const BATCH_SIZE = 450;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  await deleteDoc(doc(db, "chats", chatId));
};

// Clears messages from view for ONE user only (like "delete for me").
// We never delete the actual message docs here, so the other participant(s)
// still see everything exactly as before. We just stamp when this user
// cleared, and the UI hides anything sent before that stamp for them.
export const clearChatMessages = async (chatId, uid) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`clearedFor.${uid}`]: serverTimestamp(),
  });
};

export const clearAllChatsForUser = async (uid) => {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participants", "array-contains", uid));
  const snapshot = await getDocs(q);

  const docs = snapshot.docs;
  const BATCH_SIZE = 450;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((chatDoc) => {
      batch.update(chatDoc.ref, {
        [`clearedFor.${uid}`]: serverTimestamp(),
      });
    });
    await batch.commit();
  }
};

export const pinMessage = async (chatId, messageId) => {
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    pinnedMessageId: messageId,
  });
};

export const unpinMessage = async (chatId) => {
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    pinnedMessageId: "",
  });
};