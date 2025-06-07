import React from 'react';
import { motion } from 'framer-motion';
import { FiMusic, FiClock, FiVolume2, FiUser, FiDisc } from 'react-icons/fi';

interface AnalysisData {
  bpm: number;
  key: string;
  keyConfidence: number;
  duration: number;
  duration_formatted: string;
  loudness: number;
  title?: string;
  artist?: string;
}

interface AnalysisResultsProps {
  data: AnalysisData;
}

interface DataItemProps {
  icon: React.ReactNode;
  value: string | number;
  label: string | React.ReactNode;
  delay?: number;
  variant?: 'purple' | 'green';
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'text-emerald-400/90';
  if (confidence >= 50) return 'text-yellow-400/90';
  return 'text-red-400/90';
};

const getConfidenceGlow = (confidence: number): string => {
  if (confidence >= 80) return 'neon-green-glow';
  if (confidence >= 50) return 'neon-yellow-glow';
  return 'neon-red-glow';
};

const formatConfidence = (confidence: number): React.ReactNode => {
  const color = getConfidenceColor(confidence);
  const glow = getConfidenceGlow(confidence);
  return (
    <span>
      Key (
      <span className={`${color} ${glow}`}>
        {confidence.toFixed()}%
      </span>
      {' '}confidence)
    </span>
  );
};

const formatDuration = (duration: number): string => {
  console.log('Formatting duration:', duration); // Debug log
  
  if (!duration || isNaN(duration)) {
    console.log('Invalid duration value'); // Debug log
    return '0:00';
  }

  // Convert to seconds if in milliseconds
  const durationInSeconds = duration > 1000 ? duration / 1000 : duration;
  console.log('Duration in seconds:', durationInSeconds); // Debug log

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  console.log('Formatted time:', formattedTime); // Debug log
  return formattedTime;
};

const DataItem: React.FC<DataItemProps> = ({ icon, value, label, delay = 0, variant = 'purple' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`
      glass-panel rounded-lg p-2.5 sm:p-3 md:p-4 transition-colors duration-300
      ${variant === 'purple' ? 'hover-accent-purple accent-border-purple' : 'hover-accent-green accent-border-green'}
    `}
  >
    <div className="flex items-start space-x-2 sm:space-x-3">
      <div className={`mt-0.5 sm:mt-1 ${variant === 'purple' ? 'text-purple-500' : 'text-emerald-500'}`}>
        {icon}
      </div>
      <div>
        <div className={`font-mono text-base sm:text-lg md:text-xl mb-0.5 sm:mb-1 ${variant === 'purple' ? 'text-purple-300/90 neon-purple-glow' : 'text-emerald-300/90 neon-green-glow'}`}>
          {value}
        </div>
        <div className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider text-white/40">{label}</div>
      </div>
    </div>
  </motion.div>
);

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title and artist */}
      {(data.title || data.artist) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3 sm:mb-4 md:mb-6 text-center"
        >
          {data.title && (
            <h2 className="text-lg sm:text-xl md:text-2xl font-light text-white/90 neon-purple-glow mb-1.5 sm:mb-2 px-2 break-words">
              {data.title}
            </h2>
          )}
          {data.artist && (
            <p className="text-[10px] sm:text-xs md:text-sm text-emerald-400/80 tracking-wider neon-green-glow px-2 break-words">
              {data.artist}
            </p>
          )}
        </motion.div>
      )}

      {/* Analysis results */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        <DataItem
          icon={<FiDisc className="w-4 h-4 sm:w-5 sm:h-5" />}
          value={`${Number(data.bpm).toFixed(1)}`}
          label="BPM"
          delay={0.1}
          variant="purple"
        />
        <DataItem
          icon={<FiMusic className="w-4 h-4 sm:w-5 sm:h-5" />}
          value={data.key}
          label={formatConfidence(Number(data.keyConfidence))}
          delay={0.2}
          variant="green"
        />
        <DataItem
          icon={<FiClock className="w-4 h-4 sm:w-5 sm:h-5" />}
          value={data.duration_formatted}
          label="Duration"
          delay={0.3}
          variant="purple"
        />
        <DataItem
          icon={<FiVolume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          value={`${Number(data.loudness).toFixed(1)} LUFS`}
          label="Integrated Loudness"
          delay={0.4}
          variant="green"
        />
      </div>
    </div>
  );
}; 