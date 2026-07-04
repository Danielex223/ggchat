import { useEffect, useRef, useState } from "react";
import { Play, Pause, Trash2, Lock, Volume2, VolumeX, Eye, LogOut } from "lucide-react";
import {
  updateWatchSession,
  endWatchSession,
  joinWatchParty,
  leaveWatchParty,
} from "../services/chatService";
import { formatDuration } from "../lib/helpers";

let ytApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  });

  return ytApiPromise;
}

export default function WatchParty({ chatId, currentUser, watchSession, viewers }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const ignoreRef = useRef(false);
  const watchSessionRef = useRef(watchSession);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [seekTime, setSeekTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  const isHost = watchSession?.hostId === currentUser.uid;
  const viewerCount = Object.values(viewers || {}).filter(Boolean).length;

  useEffect(() => {
    watchSessionRef.current = watchSession;
  }, [watchSession]);

  // a fresh watch session (new videoId) means we're back in, regardless of prior leave
  useEffect(() => {
    setHasLeft(false);
  }, [watchSession?.videoId]);

  // join as a viewer whenever we're actually watching, leave when we stop
  useEffect(() => {
    if (!watchSession?.videoId || hasLeft) return;

    joinWatchParty(chatId, currentUser.uid);

    return () => {
      leaveWatchParty(chatId, currentUser.uid);
    };
  }, [chatId, currentUser.uid, watchSession?.videoId, hasLeft]);

  // create / recreate the player whenever the video changes (and we haven't left)
  useEffect(() => {
    if (!watchSession?.videoId || hasLeft) return;

    let cancelled = false;
    setReady(false);

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      playerRef.current?.destroy?.();

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: watchSession.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: handleStateChange,
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSession?.videoId, hasLeft]);

  // destroy player on unmount or when leaving
  useEffect(() => {
    if (!hasLeft) return;
    playerRef.current?.destroy?.();
    playerRef.current = null;
    setReady(false);
  }, [hasLeft]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  // grab duration + current mute state once the player is ready
  useEffect(() => {
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;
    setDuration(player.getDuration());
    setIsMuted(player.isMuted());
  }, [ready]);

  // sync remote play / pause / seek — only act when something is actually out of sync
  useEffect(() => {
    if (!ready || !playerRef.current || !watchSession) return;
    if (watchSession.updatedBy === currentUser.uid) return;

    const player = playerRef.current;

    const drift = Math.abs(player.getCurrentTime() - watchSession.currentTime);

    if (drift > 1) {
      ignoreRef.current = true;
      player.seekTo(watchSession.currentTime, true);
    }

    const isCurrentlyPlaying =
      player.getPlayerState() === window.YT.PlayerState.PLAYING;

    if (watchSession.isPlaying && !isCurrentlyPlaying) {
      ignoreRef.current = true;
      player.playVideo();
    } else if (!watchSession.isPlaying && isCurrentlyPlaying) {
      ignoreRef.current = true;
      player.pauseVideo();
    }
  }, [watchSession, ready]);

  // if a non-host somehow still nudges playback, snap it back to the host's state
  useEffect(() => {
    if (isHost || !ready || !playerRef.current || !watchSession) return;

    const player = playerRef.current;
    const isCurrentlyPlaying =
      player.getPlayerState() === window.YT.PlayerState.PLAYING;

    if (watchSession.isPlaying !== isCurrentlyPlaying) {
      ignoreRef.current = true;
      watchSession.isPlaying ? player.playVideo() : player.pauseVideo();
    }
  });

  // host heartbeat — keeps followers corrected, and drives the host's own scrub bar
  useEffect(() => {
    if (!ready) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      const current = watchSessionRef.current;
      if (!player) return;

      if (isHost) {
        if (!isScrubbing) {
          setSeekTime(player.getCurrentTime());
        }
        setDuration(player.getDuration());

        if (player.getPlayerState() === window.YT.PlayerState.PLAYING && current) {
          updateWatchSession(
            chatId,
            {
              videoId: current.videoId,
              isPlaying: true,
              currentTime: player.getCurrentTime(),
              hostId: current.hostId,
            },
            currentUser.uid
          );
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isHost, ready, isScrubbing, chatId, currentUser.uid]);

  // lightweight local tick for the host's scrub bar between heartbeats
  useEffect(() => {
    if (!isHost || !ready) return;

    const tick = setInterval(() => {
      const player = playerRef.current;
      if (!player || isScrubbing) return;
      setSeekTime(player.getCurrentTime());
    }, 500);

    return () => clearInterval(tick);
  }, [isHost, ready, isScrubbing]);

  const handleStateChange = (event) => {
    if (!isHost) return;

    if (ignoreRef.current) {
      ignoreRef.current = false;
      return;
    }

    const player = playerRef.current;
    const current = watchSessionRef.current;
    if (!player || !current) return;

    updateWatchSession(
      chatId,
      {
        videoId: current.videoId,
        isPlaying: event.data === window.YT.PlayerState.PLAYING,
        currentTime: player.getCurrentTime(),
        hostId: current.hostId,
      },
      currentUser.uid
    );
  };

  const togglePlay = () => {
    if (!isHost) return;

    const player = playerRef.current;
    if (!player) return;

    if (watchSession.isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleTakeOver = () => {
    const current = watchSessionRef.current;
    if (!current) return;

    const player = playerRef.current;

    updateWatchSession(
      chatId,
      {
        videoId: current.videoId,
        isPlaying: current.isPlaying,
        currentTime: player?.getCurrentTime?.() ?? current.currentTime,
        hostId: currentUser.uid,
      },
      currentUser.uid
    );
  };

  const handleScrubChange = (e) => {
    setSeekTime(Number(e.target.value));
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
  };

  const handleScrubCommit = (e) => {
    const value = Number(e.target.value);
    const player = playerRef.current;
    const current = watchSessionRef.current;
    if (!player || !current) return;

    ignoreRef.current = true;
    player.seekTo(value, true);
    setIsScrubbing(false);

    updateWatchSession(
      chatId,
      {
        videoId: current.videoId,
        isPlaying: current.isPlaying,
        currentTime: value,
        hostId: current.hostId,
      },
      currentUser.uid
    );
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleLeave = () => {
    leaveWatchParty(chatId, currentUser.uid);
    setHasLeft(true);
  };

  const handleRejoin = () => {
    setHasLeft(false);
  };

  if (!watchSession?.videoId) return null;

  if (hasLeft) {
    return (
      <div className="watch-party watch-party-collapsed">
        <span>You left the watch party</span>
        <button className="watch-rejoin-btn" onClick={handleRejoin}>
          Rejoin
        </button>
      </div>
    );
  }

  return (
    <div className="watch-party">
      <div className="watch-party-header">
        <span>Watch party {isHost ? "(host)" : ""}</span>

        <div className="watch-actions">
          <span className="watch-viewer-count" title="Currently watching">
            <Eye size={14} /> {viewerCount}
          </span>

          {isHost ? (
            <>
              <button onClick={togglePlay} aria-label={watchSession.isPlaying ? "Pause" : "Play"}>
                {watchSession.isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button onClick={() => endWatchSession(chatId)} aria-label="End watch party">
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <>
              <span className="watch-locked" title="Only the host controls playback">
                <Lock size={14} />
              </span>
              <button className="take-over-btn" onClick={handleTakeOver}>
                Take over
              </button>
            </>
          )}

          <button
            className="watch-leave-btn"
            onClick={handleLeave}
            aria-label="Leave watch party"
            title="Leave watch party"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="watch-party-player-wrap">
        <div className="watch-party-player" ref={containerRef} />
        {!isHost && <div className="watch-party-block-overlay" />}
      </div>

      {isHost && (
        <div className="watch-scrub-bar">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(seekTime, duration || 0)}
            onChange={handleScrubChange}
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onMouseUp={handleScrubCommit}
            onTouchEnd={handleScrubCommit}
            className="watch-scrub-range"
            aria-label="Seek"
          />
          <div className="watch-scrub-meta">
            <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span className="watch-scrub-time">
              {formatDuration(seekTime)} / {formatDuration(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}