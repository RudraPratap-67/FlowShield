/**
 * FlowShield - usePlayback Hook
 * Drives smooth local client-side animation and time scrubbing across simulation frames.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export function usePlayback(frames = [], defaultFps = 4) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 1x, 2x, 4x

  const totalFrames = frames ? frames.length : 0;
  const timerRef = useRef(null);

  // Reset to 0 whenever a new simulation result arrives
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [frames]);

  // Animation frame loop
  useEffect(() => {
    if (isPlaying && totalFrames > 1) {
      const intervalMs = Math.max(50, 1000 / (defaultFps * playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, totalFrames, playbackSpeed, defaultFps]);

  const play = useCallback(() => {
    if (totalFrames <= 0) return;
    if (currentFrameIndex >= totalFrames - 1) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(true);
  }, [currentFrameIndex, totalFrames]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  }, []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
  }, [totalFrames]);

  const stepBackward = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const seekToFrame = useCallback(
    (index) => {
      setIsPlaying(false);
      const target = Math.max(0, Math.min(totalFrames - 1, index));
      setCurrentFrameIndex(target);
    },
    [totalFrames]
  );

  const currentFrame = frames && frames[currentFrameIndex] ? frames[currentFrameIndex] : null;
  const currentMinutes = currentFrame ? Math.round(currentFrame.t_seconds / 60) : 0;

  return {
    currentFrameIndex,
    currentFrame,
    currentMinutes,
    totalFrames,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    play,
    pause,
    restart,
    stepForward,
    stepBackward,
    seekToFrame,
  };
}
