import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export const useProfiles = (uids = []) => {
  const [profiles, setProfiles] = useState({});
  const key = uids.join(",");

  useEffect(() => {
    if (!uids.length) {
      setProfiles({});
      return;
    }

    const unsubscribers = uids.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        const data = snap.data();
        if (!data) return;
        setProfiles((prev) => ({ ...prev, [uid]: data }));
      })
    );

    return () => unsubscribers.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return profiles;
};