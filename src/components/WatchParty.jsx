import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Trash2, X as CloseIcon } from "lucide-react";
import { updateWatchSession, endWatchSession } from "../services/chatService";

export default function WatchParty({ chatId, currentUser, watchSession }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playerState, setPlayerState] = useState(null);

  const isHost = watchSession?.hostId === currentUser?.uid;

  // initialize or cleanup player
  useEffect(() => {
    if (!watchSession?.videoId) return;

    let prevOnReady = window.onYouTubeIframeAPIReady;

    const handleStateChange = (event) => {
      setPlayerState(event.data);
    };

    const initPlayer = () => {
      if (!containerRef.current) return;
      if (playerRef.current) return; // already initialized
      if (!window.YT || !window.YT.Player) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: watchSession.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
        },
        events: {
          onReady: () => {
            setReady(true);
          },
          onStateChange: handleStateChange,
        },
      });
    };

    // If YT API not loaded, inject it once and set a safe handler
    if (!window.YT) {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
        if (typeof prevOnReady === "function") prevOnReady();
      };
    } else {
      initPlayer();
    }

    return () => {
      // destroy player on unmount or when video changes
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        playerRef.current = null;
      }
      // restore previous global handler
      window.onYouTubeIframeAPIReady = prevOnReady;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSession?.videoId]);

  // sync play/pause from session -> player
  useEffect(() => {
    if (!playerRef.current) return;
    if (!watchSession) return;

    try {
      if (watchSession.isPlaying) {
        if (playerRef.current.playVideo) playerRef.current.playVideo();
      } else {
        if (playerRef.current.pauseVideo) playerRef.current.pauseVideo();
      }
      if (typeof watchSession.currentTime === "number" && playerRef.current.seekTo) {
        // only seek if difference is significant
        const current = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        if (Math.abs(current - watchSession.currentTime) > 1.5) {
          playerRef.current.seekTo(watchSession.currentTime, true);
        }
      }
    } catch (e) {
      // ignore API errors
    }
  }, [watchSession]);

  const togglePlay = async () => {
    if (!playerRef.current) return;
    const isPlaying = watchSession?.isPlaying;
    // optimistic UI: update session
    await updateWatchSession(chatId, { isPlaying: !isPlaying });
    try {
      if (!isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch (e) {}
  };

  const endSession = async () => {
    await endWatchSession(chatId);
  };

  if (!watchSession?.videoId) return null;

  return (
    <div className="watch-party">
      <div className="watch-party-header">
        <span>Watch Party {isHost ? "(Host)" : ""}</span>
        <div className="watch-party-actions">
          <button onClick={togglePlay} aria-label="Toggle play">
            {watchSession?.isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {isHost && (
            <button onClick={endSession} aria-label="End session">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="watch-party-player-wrapper">
        {/* player container: YT will render iframe inside this node */}
        <div className="watch-party-player" ref={containerRef} />
      </div>
    </div>
  );
}
