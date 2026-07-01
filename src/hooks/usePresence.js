import { useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export const usePresence = (user) => {
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setOnline = () => {
      updateDoc(userRef, { online: true, lastSeen: serverTimestamp() });
    };

    const setOffline = () => {
      updateDoc(userRef, { online: false, lastSeen: serverTimestamp() });
    };

    setOnline();

    const heartbeat = setInterval(setOnline, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setOffline();
      } else {
        setOnline();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", setOffline);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", setOffline);
      setOffline();
    };
  }, [user]);
};