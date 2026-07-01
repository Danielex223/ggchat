import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Trash2 } from "lucide-react";
import { updateWatchSession, endWatchSession } from "../services/chatService";

export default function WatchParty({ chatId, currentUser, watchSession }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const ignoreRef = useRef(false);
  const [ready, setReady] = useState(false);

  const isHost = watchSession?.hostId === currentUser.uid;

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = initPlayer;
  }, []);

  const initPlayer = () => {
    if (!watchSession?.videoId) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: watchSession.videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        controls: 0,
      },
      events: {
        onReady: () => setReady(true),
        onStateChange: handleStateChange,
      },
    });
  };

  useEffect(() => {
    if (!watchSession?.videoId || !window.YT?.Player) return;

    playerRef.current?.destroy?.();
    initPlayer();
  }, [watchSession?.videoId]);

  useEffect(() => {
    if (!ready || !playerRef.current || !watchSession) return;
    if (watchSession.updatedBy === currentUser.uid) return;

    const player = playerRef.current;

    const drift = Math.abs(
      player.getCurrentTime() - watchSession.currentTime
    );

    if (drift > 1.2) {
      player.seekTo(watchSession.currentTime, true);
    }

    ignoreRef.current = true;

    watchSession.isPlaying ? player.playVideo() : player.pauseVideo();
  }, [watchSession, ready]);

  const handleStateChange = (event) => {
    if (!isHost) return;

    if (ignoreRef.current) {
      ignoreRef.current = false;
      return;
    }

    const player = playerRef.current;
    if (!player) return;

    const time = player.getCurrentTime();

    updateWatchSession(chatId, {
      videoId: watchSession.videoId,
      isPlaying: event.data === window.YT.PlayerState.PLAYING,
      currentTime: time,
      hostId: watchSession.hostId,
    }, currentUser.uid);
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;

    if (watchSession.isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  if (!watchSession?.videoId) return null;

  return (
    <div className="watch-party">
      <div className="watch-party-header">
        <span>Watch Party {isHost ? "(Host)" : ""}</span>

        <div className="watch-actions">
          <button onClick={togglePlay}>
            {watchSession.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button onClick={() => endWatchSession(chatId)}>
            <Trash2 size={18} />
          </button>

          <button onClick={() => endWatchSession(chatId)}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="watch-party-player" style={{ width: "100%", height: "400px" }} ref={containerRef} />
    </div>
  );
}