import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiVolume2, FiVolumeX } from 'react-icons/fi';

interface AudioPlayerProps {
  audioFile: File | null;
  onAudioElementReady?: (element: HTMLAudioElement) => void;
  onPlayingStateChange?: (playing: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioFile,
  onAudioElementReady,
  onPlayingStateChange
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  useEffect(() => {
    if (audioRef.current && onAudioElementReady) {
      onAudioElementReady(audioRef.current);
    }
  }, [onAudioElementReady]);

  useEffect(() => {
    if (onPlayingStateChange) {
      onPlayingStateChange(isPlaying);
    }
  }, [isPlaying, onPlayingStateChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const width = bounds.width;
      const percentage = x / width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioFile || !audioUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto glass-panel rounded-lg p-3 sm:p-4 accent-border-purple mb-2 sm:mb-3 md:mb-4"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center text-purple-400 transition-colors touch-manipulation"
        >
          {isPlaying ? 
            <FiPause size={16} className="sm:w-5 sm:h-5" /> : 
            <FiPlay size={16} className="sm:w-5 sm:h-5" />
          }
        </motion.button>

        {/* Time Display */}
        <div className="text-[10px] sm:text-xs text-white/50 font-mono w-12 sm:w-16">
          {formatTime(currentTime)}
        </div>

        {/* Progress Bar */}
        <div 
          className="flex-1 h-1.5 sm:h-2 bg-purple-500/10 rounded-full cursor-pointer relative overflow-hidden touch-manipulation"
          onClick={handleProgressClick}
        >
          <motion.div
            className="absolute left-0 top-0 bottom-0 bg-purple-500/30 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
            layoutId="progress"
          />
        </div>

        {/* Duration */}
        <div className="text-[10px] sm:text-xs text-white/50 font-mono w-12 sm:w-16 text-right">
          {formatTime(duration)}
        </div>

        {/* Volume Control */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMute}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center text-purple-400 transition-colors touch-manipulation"
        >
          {isMuted ? 
            <FiVolumeX size={16} className="sm:w-5 sm:h-5" /> : 
            <FiVolume2 size={16} className="sm:w-5 sm:h-5" />
          }
        </motion.button>
      </div>
    </motion.div>
  );
}; 