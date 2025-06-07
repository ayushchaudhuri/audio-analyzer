import React, { useState, useRef, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiHelpCircle, FiInfo } from 'react-icons/fi';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { LoadingOverlay } from './components/LoadingSpinner';
import { AnalysisResults } from './components/AnalysisResults';
import { AudioPlayer } from './components/AudioPlayer';
import { History } from './components/History';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

interface ErrorResponse {
  message: string;
}

function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'results'>('welcome');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function for ongoing requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsAnalyzing(true);
    setCurrentFile(file);
    setAnalysisData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      abortControllerRef.current = new AbortController();
      const response = await axios.post<AnalysisData>(`${API_URL}/analyze`, formData, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;
      setAnalysisData(result);
      setCurrentView('results');

      // Save to history
      const historyEntry = {
        timestamp: Date.now(),
        filename: file.name,
        bpm: result.bpm,
        key: result.key,
        loudness: result.loudness,
        duration_formatted: result.duration_formatted
      };

      const storedHistory = localStorage.getItem('audioAnalysisHistory');
      const history = storedHistory ? JSON.parse(storedHistory) : [];
      history.unshift(historyEntry);
      
      // Keep only the last 50 entries
      if (history.length > 50) {
        history.pop();
      }
      
      localStorage.setItem('audioAnalysisHistory', JSON.stringify(history));

    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.code === 'ERR_NETWORK') {
          setError('Cannot connect to the server. Please make sure the backend is running.');
        } else if (err.response?.status === 413) {
          setError('File size is too large. Please try a smaller file.');
        } else if (err.response?.status === 415) {
          setError('Invalid file type. Please upload an MP3 or WAV file.');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Failed to analyze audio file. Please try again.');
        }
        console.error('Analysis error:', err.response?.data || err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
        console.error('Unexpected error:', err);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('audioAnalysisHistory');
    setIsHistoryOpen(false);
  };

  const handleAudioElementReady = (element: HTMLAudioElement) => {
    setAudioElement(element);
  };

  const handlePlayingStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // Determine current view state
  const currentViewState = isAnalyzing 
    ? 'loading'
    : analysisData 
    ? 'results' 
    : 'welcome';

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-transparent text-white">
      <Header 
        onHistoryClick={() => setIsHistoryOpen(true)}
        onAboutClick={() => setIsAboutOpen(true)}
        onFaqClick={() => setIsFaqOpen(true)}
        isAnalyzing={isAnalyzing}
      />
      
      <main className="flex-1 pt-16 sm:pt-20 md:pt-24">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
          {/* Main content area */}
          <AnimatePresence mode="sync">
            {currentViewState === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-6 sm:mb-8 md:mb-12"
              >
                <motion.h1 
                  className="text-lg sm:text-xl md:text-2xl font-extralight mb-3 sm:mb-4 tracking-[0.2em]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300/70 to-purple-500/70 neon-purple-glow">
                    AUDIO ANALYSIS
                  </span>
                </motion.h1>
                <motion.div 
                  className="flex flex-col items-center space-y-1 sm:space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-[10px] sm:text-[11px] md:text-[13px] font-extralight tracking-[0.1em] text-emerald-400/60 neon-green-glow">
                    ANALYZE BPM, KEY, AND MORE
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload zone - always visible unless analyzing */}
          <AnimatePresence mode="sync">
            {!isAnalyzing && (
              <motion.div
                key="upload"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <DropZone
                  onFileAccepted={handleFileUpload}
                  isLoading={isAnalyzing}
                  currentFileName={currentFile?.name}
                  audioElement={audioElement}
                  isPlaying={isPlaying}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading overlay */}
          <LoadingOverlay 
            isVisible={isAnalyzing}
            onExitComplete={() => {
              // Any cleanup or state updates after animation completes
            }}
          />

          {/* Audio Player */}
          <AnimatePresence mode="sync">
            {currentFile && !isAnalyzing && (
              <AudioPlayer 
                audioFile={currentFile}
                onAudioElementReady={handleAudioElementReady}
                onPlayingStateChange={handlePlayingStateChange}
              />
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence mode="sync">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 sm:mt-8 text-center text-red-400/90 text-xs sm:text-sm tracking-wide"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis results */}
          <AnimatePresence mode="sync">
            {analysisData && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8 sm:mt-12"
              >
                <AnalysisResults data={analysisData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <History
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onClearHistory={handleClearHistory}
          />
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <Modal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
            title="About"
            icon={<FiInfo className="w-5 h-5" />}
          >
            <div className="text-center py-12">
              <p className="text-white/70 text-lg font-light tracking-wider">
                𝒞𝑜𝓂𝒾𝓃𝑔 𝓈𝑜𝑜𝓃™
              </p>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* FAQ Modal */}
      <AnimatePresence>
        {isFaqOpen && (
          <Modal
            isOpen={isFaqOpen}
            onClose={() => setIsFaqOpen(false)}
            title="FAQ"
            icon={<FiHelpCircle className="w-5 h-5" />}
          >
            <div className="text-center py-12">
              <p className="text-white/70 text-lg font-light tracking-wider">
                𝒞𝑜𝓂𝒾𝓃𝑔 𝓈𝑜𝑜𝓃™
              </p>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default App; 