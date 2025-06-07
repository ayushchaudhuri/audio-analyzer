import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, HTMLMotionProps } from 'framer-motion';
import { FiUpload, FiMusic, FiAlertCircle } from 'react-icons/fi';
import { WaveformVisualizer } from './WaveformVisualizer';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  isLoading?: boolean;
  currentFileName?: string;
  audioElement?: HTMLAudioElement | null;
  isPlaying?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const DropZone: React.FC<DropZoneProps> = ({ 
  onFileAccepted, 
  isLoading = false,
  currentFileName,
  audioElement,
  isPlaying = false
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 25MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload an MP3 or WAV file.');
      } else {
        setError('Invalid file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > MAX_FILE_SIZE) {
        setError('File is too large. Maximum size is 25MB.');
        return;
      }
      onFileAccepted(file);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
    },
    disabled: isLoading,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`
          waveform-border rounded-xl overflow-hidden transition-all duration-300
          dropzone-scanner dropzone-grid
          shadow-[0_0_25px_rgba(0,0,0,0.3)] backdrop-blur-lg
          ${isDragActive ? 'dropzone-active hover-accent-purple shadow-[0_0_35px_rgba(139,92,246,0.15)]' : 'glass-panel hover-accent-green'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isFocused ? 'ring-2 ring-purple-500/50' : 'ring-1 ring-white/5 hover:ring-white/10'}
          relative
        `}
        {...(getRootProps() as HTMLMotionProps<"div">)}
        role="button"
        aria-label="Drop audio file here or click to select"
        tabIndex={isLoading ? -1 : 0}
      >
        <input {...getInputProps()} aria-label="File input" />
        
        {/* Waveform Visualizer */}
        {audioElement && (
          <WaveformVisualizer
            audioElement={audioElement}
            isPlaying={isPlaying}
          />
        )}

        <motion.div
          className={`
            relative flex flex-col items-center justify-center
            px-4 sm:px-6 md:px-10
            py-6 sm:py-8 md:py-10
            min-h-[140px] sm:min-h-[160px] md:min-h-[180px]
            ${isDragActive ? 'text-purple-500' : 'text-emerald-500'}
            z-10
            touch-manipulation
          `}
        >
          <motion.div
            animate={{
              scale: isDragActive ? 1.2 : isHovered ? 1.1 : 1,
              rotate: isDragActive ? [0, -10, 10, -10, 0] : 0,
              opacity: isDragActive ? 0.9 : isHovered ? 0.8 : 0.7,
            }}
            transition={{ 
              duration: 0.4,
              rotate: { duration: 0.5, repeat: isDragActive ? Infinity : 0 }
            }}
            className="mb-2 sm:mb-3 relative z-10"
          >
            {isDragActive ? (
              <FiMusic className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" aria-hidden="true" />
            ) : (
              <FiUpload className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" aria-hidden="true" />
            )}
          </motion.div>
          
          <motion.div
            className="text-center relative z-10"
            animate={{
              scale: isDragActive ? 1.05 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            {currentFileName ? (
              <>
                <motion.p 
                  className="text-xs sm:text-sm font-light tracking-wide mb-1 sm:mb-1.5 text-purple-300/90 neon-purple-glow break-all px-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {currentFileName.toUpperCase()}
                </motion.p>
                <p className="text-[10px] sm:text-xs tracking-wide text-white/50">
                  Tap or drop to analyze another file
                </p>
              </>
            ) : (
              <>
                <motion.p 
                  className={`text-xs sm:text-sm font-light tracking-wide mb-1 sm:mb-1.5 
                    ${isDragActive ? 'text-purple-300/90 neon-purple-glow' : 'text-emerald-300/90 neon-green-glow'}`}
                  animate={{
                    y: isDragActive ? [0, -2, 2, -2, 0] : 0
                  }}
                  transition={{
                    y: { duration: 0.5, repeat: isDragActive ? Infinity : 0 }
                  }}
                >
                  {isDragActive ? 'DROP TO ANALYZE' : 'TAP OR DROP FILE HERE'}
                </motion.p>
                <p className="text-[10px] sm:text-xs tracking-wide text-white/50">
                  MP3 and WAV supported
                </p>
              </>
            )}
            <p className="text-[9px] sm:text-[10px] tracking-wide text-white/30 mt-1 sm:mt-1.5">
              Maximum file size: 25MB
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center text-red-400/90 text-xs tracking-wide"
        >
          <FiAlertCircle className="w-4 h-4 mr-2" />
          {error}
        </motion.div>
      )}
    </div>
  );
}; 