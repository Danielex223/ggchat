import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/* ---------------- CHAT CORE ---------------- */

export const createOrGetChat = async (uid1, uid2) => {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participants", "array-contains", uid1));
  const snapshot = await getDocs(q);

  const existing = snapshot.docs.find((docSnap) => {
    const data = docSnap.data();
    return !data.isGroup && data.participants.includes(uid2);
  });

  if (existing) return existing.id;

  const newChat = await addDoc(chatsRef, {
    participants: [uid1, uid2],
    isGroup: false,
    groupName: "",
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    pinnedMessageId: "",
    watchSession: null,
    createdAt: serverTimestamp(),
  });

  return newChat.id;
};

export const createGroupChat = async (participantUids, groupName) => {
  const chatsRef = collection(db, "chats");

  const newChat = await addDoc(chatsRef, {
    participants: participantUids,
    isGroup: true,
    groupName,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    pinnedMessageId: "",
    watchSession: null,
    createdAt: serverTimestamp(),
  });

  return newChat.id;
};

export const sendMessage = async (chatId, senderId, text, type = "text") => {
  const messagesRef = collection(db, "chats", chatId, "messages");

  await addDoc(messagesRef, {
    senderId,
    text,
    type,
    isPinned: false,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
};

/* ---------------- WATCH PARTY (NEW MODEL) ---------------- */

// Only host should control state
export const startWatchSession = async (chatId, videoId, uid) => {
  await updateDoc(doc(db, "chats", chatId), {
    watchSession: {
      videoId,
      isPlaying: true,
      currentTime: 0,
      hostId: uid,
      updatedAt: serverTimestamp(),
    },
  });
};

// PATCH updates (no overwrite issues)
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
  });
};

/* ---------------- LISTENERS ---------------- */

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

import { deleteDoc } from "firebase/firestore";

export const deleteChat = async (chatId) => {
  await deleteDoc(doc(db, "chats", chatId));
};

export const pinMessage = async (chatId, messageId) => {
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    pinnedMessageId: messageId,
  });
};