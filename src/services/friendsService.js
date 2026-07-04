import { doc, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../lib/firebase";

export const sendFriendRequest = async (fromUid, toUid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", fromUid), {
    outgoingRequests: arrayUnion(toUid),
  });
  batch.update(doc(db, "users", toUid), {
    incomingRequests: arrayUnion(fromUid),
  });
  await batch.commit();
};

export const cancelFriendRequest = async (fromUid, toUid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", fromUid), {
    outgoingRequests: arrayRemove(toUid),
  });
  batch.update(doc(db, "users", toUid), {
    incomingRequests: arrayRemove(fromUid),
  });
  await batch.commit();
};

export const acceptFriendRequest = async (uid, requesterUid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), {
    incomingRequests: arrayRemove(requesterUid),
    friends: arrayUnion(requesterUid),
  });
  batch.update(doc(db, "users", requesterUid), {
    outgoingRequests: arrayRemove(uid),
    friends: arrayUnion(uid),
  });
  await batch.commit();
};

export const declineFriendRequest = async (uid, requesterUid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), {
    incomingRequests: arrayRemove(requesterUid),
  });
  batch.update(doc(db, "users", requesterUid), {
    outgoingRequests: arrayRemove(uid),
  });
  await batch.commit();
};

export const removeFriend = async (uid, otherUid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), {
    friends: arrayRemove(otherUid),
  });
  batch.update(doc(db, "users", otherUid), {
    friends: arrayRemove(uid),
  });
  await batch.commit();
};