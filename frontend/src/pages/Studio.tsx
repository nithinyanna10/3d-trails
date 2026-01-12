import { useEffect, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { embedText, processAudioFile } from '../api';
import Scene from '../scene/Scene';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { Button } from '../components/ui/button';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useSoundClassification } from '../hooks/useSoundClassification';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, Type, Sparkles, Settings, Download, Play, Pause } from 'lucide-react';

export default function Studio() {
  const {
    text,
    mode,
    points,
    anchors,
    meta,
    revealIndex,
    speed,
    showParticles,
    showClusterClouds,
    showAnchorLabels,
    isLoading,
    animationProgress,
    setText,
    setMode,
    setPoints,
    setAnchors,
    setMeta,
    setRevealIndex,
    setIsLoading,
    setSpeed,
    setShowParticles,
    setShowClusterClouds,
    setShowAnchorLabels,
    setAnimationProgress,
  } = useStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('compose');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [inputMode, setInputMode] = useState<'speech' | 'sound' | 'text'>('text');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recognition hook (for human speech)
  const {
    isListening: isSpeechListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    toggleListening: toggleSpeechListening,
    clearTranscript,
  } = useVoiceRecognition({
    onResult: (newText) => {
      if (inputMode === 'speech') {
        setText(newText);
      }
    },
    continuous: true,
    interimResults: true,
    lang: 'en-US',
  });

  // Sound classification hook (for animal sounds, nature sounds, etc.)
  // Note: This converts sounds to text descriptions, which are then embedded
  const [soundDetectionMode, setSoundDetectionMode] = useState<'auto' | 'manual'>('manual');
  const [detectedSounds, setDetectedSounds] = useState<string[]>([]);
  
  const {
    isListening: isSoundListening,
    detectedSound,
    confidence,
    error: soundError,
    audioLevel,
    toggleListening: toggleSoundListening,
  } = useSoundClassification({
    onSoundDetected: (soundText, conf) => {
      if (inputMode === 'sound') {
        // Add to detected sounds list
        setDetectedSounds(prev => [...prev, soundText]);
        
        // Only auto-add to text if in auto mode
        if (soundDetectionMode === 'auto') {
          const currentText = text.trim();
          const newText = currentText 
            ? `${currentText} ${soundText}` 
            : soundText;
          setText(newText);
        }
      }
    },
    continuous: true,
    sensitivity: 0.1,
  });

  const isListening = inputMode === 'speech' ? isSpeechListening : (inputMode === 'sound' ? isSoundListening : false);
  const error = inputMode === 'speech' ? voiceError : (inputMode === 'sound' ? soundError : null);

  const toggleListening = () => {
    if (inputMode === 'speech') {
      toggleSpeechListening();
    } else if (inputMode === 'sound') {
      toggleSoundListening();
    }
  };

  // Debounced embed
  const debouncedEmbed = useCallback(
    (textToEmbed: string, modeToUse: 'prefix' | 'token') => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        if (!textToEmbed.trim()) {
          setPoints([]);
          setAnchors([]);
          setMeta({ n_points: 0, n_clusters: 0 });
          setRevealIndex(0);
          return;
        }

        setIsLoading(true);
        try {
          const response = await embedText(textToEmbed, modeToUse);
          console.log('Embedded:', response.points.length, 'points', response);
          setPoints(response.points);
          setAnchors(response.anchors);
          setMeta(response.meta);
          setAnimationProgress(0);
          const initialReveal = Math.max(2, Math.min(5, response.points.length));
          setRevealIndex(initialReveal);
        } catch (error) {
          console.error('Error embedding text:', error);
          setIsLoading(false);
        } finally {
          setIsLoading(false);
        }
      }, 400);
    },
    [setPoints, setAnchors, setMeta, setRevealIndex, setIsLoading, setAnimationProgress]
  );

  // Handle audio file upload
  const handleAudioUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsLoading(true);
    try {
      const result = await processAudioFile(file);
      if (result.success && result.text) {
        setText(result.text);
        // Auto-embed the transcribed text
        setTimeout(() => {
          debouncedEmbed(result.text, mode);
        }, 500);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio file. Please try again.');
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  }, [setText, debouncedEmbed, mode]);

  useEffect(() => {
    if (text.trim()) {
      debouncedEmbed(text, mode);
    }
  }, [text, mode, debouncedEmbed]);

  // Animation loop
  useEffect(() => {
    if (points.length === 0 || isScrubbing) return;

    let rafId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setAnimationProgress((prev) => {
        if (prev >= 1.0) return 1.0;
        const increment = (delta * speed) / 5;
        return Math.min(1.0, prev + increment);
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [speed, points.length, isScrubbing, setAnimationProgress]);

  useEffect(() => {
    if (points.length > 0) {
      setAnimationProgress(0);
      setRevealIndex(Math.max(2, Math.min(5, points.length)));
    }
  }, [points.length, setAnimationProgress, setRevealIndex]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        debouncedEmbed(text, mode);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [text, mode, debouncedEmbed]);

  const handleTimelineChange = (value: number) => {
    setIsScrubbing(true);
    const progress = value / 100;
    const index = Math.floor(progress * points.length);
    setRevealIndex(Math.max(0, Math.min(index, points.length)));
    setAnimationProgress(progress);
    setTimeout(() => setIsScrubbing(false), 100);
  };
  
  useEffect(() => {
    if (!isScrubbing && points.length > 0 && animationProgress > 0) {
      const index = Math.max(2, Math.min(Math.floor(animationProgress * points.length), points.length));
      setRevealIndex(index);
    }
  }, [animationProgress, isScrubbing, points.length, setRevealIndex]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Premium Top Nav */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="backdrop-blur-xl bg-gray-900/80 border-b border-white/10 px-8 py-4 flex items-center justify-between shadow-2xl"
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              3D Trails
            </div>
            <div className="text-xs text-gray-500">Studio</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/gallery">
            <Button variant="ghost" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Presets
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.navigator.clipboard.writeText(window.location.href)}
            className="gap-2 border-white/20 hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            Share
          </Button>
        </div>
      </motion.nav>

      {/* Main Canvas with Premium Overlay */}
      <div className="flex-1 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.1),transparent_50%)] animate-pulse" />
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm bg-black/40"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <div className="text-white text-lg font-medium">Processing your trail...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Scene
          points={points}
          anchors={anchors}
          showParticles={showParticles}
          showAnchorLabels={showAnchorLabels}
          showClusterClouds={showClusterClouds}
          animationProgress={animationProgress}
          revealIndex={revealIndex}
          speed={speed}
        />
      </div>

      {/* Premium Bottom Control Dock */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="backdrop-blur-xl bg-gray-900/90 border-t border-white/10 shadow-2xl"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent h-14 px-6">
            <TabsTrigger value="compose" className="gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400">
              <Type className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="look" className="gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400">
              <Sparkles className="w-4 h-4" />
              Look
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <div className="p-8">
            <TabsContent value="compose" className="space-y-6 mt-0">
              {/* Input Mode Selector - Premium Design */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Input Method</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isListening) toggleListening();
                    setInputMode('text');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    inputMode === 'text'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <Type className={`w-6 h-6 mx-auto mb-2 ${inputMode === 'text' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <div className={`text-sm font-medium ${inputMode === 'text' ? 'text-white' : 'text-gray-400'}`}>Type</div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isListening) toggleListening();
                    setInputMode('speech');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    inputMode === 'speech'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <Mic className={`w-6 h-6 mx-auto mb-2 ${inputMode === 'speech' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <div className={`text-sm font-medium ${inputMode === 'speech' ? 'text-white' : 'text-gray-400'}`}>Voice</div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isListening) toggleListening();
                    setInputMode('sound');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    inputMode === 'sound'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-2 ${inputMode === 'sound' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <div className={`text-sm font-medium ${inputMode === 'sound' ? 'text-white' : 'text-gray-400'}`}>Audio</div>
                </motion.button>
              </div>

              {/* Text Input Area - Premium */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Text Input</label>
                  <div className="flex items-center gap-2">
                    {inputMode === 'speech' && isVoiceSupported && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleListening}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isListening
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <Pause className="w-4 h-4 inline mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 inline mr-2" />
                            Start
                          </>
                        )}
                      </motion.button>
                    )}
                    {inputMode === 'sound' && (
                      <>
                        <input
                          type="file"
                          accept="audio/*"
                          ref={fileInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAudioUpload(file);
                          }}
                          className="hidden"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-4 h-4 inline mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Audio'}
                        </motion.button>
                        {!isUploading && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleListening}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              isListening
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                            }`}
                          >
                            {isListening ? (
                              <>
                                <Pause className="w-4 h-4 inline mr-2" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4 inline mr-2" />
                                Listen
                              </>
                            )}
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {isListening && inputMode === 'sound' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm text-blue-400 font-medium">
                          {detectedSound ? `Detected: ${detectedSound} (${Math.round(confidence * 100)}%)` : 'Listening for sounds...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Auto-add:</span>
                        <button
                          onClick={() => setSoundDetectionMode(soundDetectionMode === 'auto' ? 'manual' : 'auto')}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            soundDetectionMode === 'auto'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                          }`}
                        >
                          {soundDetectionMode === 'auto' ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                    
                    {audioLevel !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20">Audio Level:</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, audioLevel || 0)}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{Math.round(audioLevel || 0)}%</span>
                      </div>
                    )}
                    
                    {/* Detected Sounds List */}
                    {detectedSounds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
                          <span>Detected Sounds ({detectedSounds.length}):</span>
                          <button
                            onClick={() => setDetectedSounds([])}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {detectedSounds.slice(-8).map((sound, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30"
                            >
                              {sound}
                            </motion.span>
                          ))}
                        </div>
                        {soundDetectionMode === 'manual' && (
                          <button
                            onClick={() => {
                              const allSounds = detectedSounds.join(' ');
                              setText(text.trim() ? `${text} ${allSounds}` : allSounds);
                              setDetectedSounds([]);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/50 hover:bg-cyan-500/30 transition-colors"
                          >
                            Add All to Text
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-500/20">
                      💡 <strong>How it works:</strong> Sounds → Text descriptions (e.g., "bird chirping") → Embedded → Trail created.
                      The classification is basic rule-based. For better accuracy, use audio file upload or describe sounds in Speech mode.
                    </div>
                  </motion.div>
                )}

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    inputMode === 'text' 
                      ? "Type your text here... (Press Cmd+Enter to process)"
                      : inputMode === 'speech'
                      ? "Click Start and speak... Your words will appear here"
                      : "Upload an audio file or click Listen to capture sounds..."
                  }
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all backdrop-blur-sm"
                />

                {transcript && isListening && inputMode === 'speech' && (
                  <div className="text-xs text-gray-500 italic">
                    Live: {transcript}
                  </div>
                )}
              </div>

              {/* Mode & Speed Controls - Premium */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Mode</label>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === 'prefix' ? 'default' : 'outline'}
                      onClick={() => setMode('prefix')}
                      className="flex-1"
                    >
                      Prefix
                    </Button>
                    <Button
                      variant={mode === 'token' ? 'default' : 'outline'}
                      onClick={() => setMode('token')}
                      className="flex-1"
                    >
                      Token
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Speed</label>
                    <span className="text-sm text-cyan-400 font-medium">{speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speed * 10]}
                    onValueChange={(v) => setSpeed(v[0] / 10)}
                    min={2}
                    max={30}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{meta.n_points}</div>
                  <div className="text-xs text-gray-500">Points</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{meta.n_clusters}</div>
                  <div className="text-xs text-gray-500">Clusters</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{Math.round(animationProgress * 100)}%</div>
                  <div className="text-xs text-gray-500">Progress</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="look" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Visual Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300">Particles</span>
                    <button
                      onClick={() => setShowParticles(!showParticles)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        showParticles ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          showParticles ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300">Cluster Clouds</span>
                    <button
                      onClick={() => setShowClusterClouds(!showClusterClouds)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        showClusterClouds ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          showClusterClouds ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300">Anchor Labels</span>
                    <button
                      onClick={() => setShowAnchorLabels(!showAnchorLabels)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        showAnchorLabels ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          showAnchorLabels ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Export Options</h3>
                
                <Button
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const url = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = '3d-trail.png';
                      a.click();
                    }
                  }}
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Screenshot
                </Button>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-sm text-gray-400">
                    Video export and GIF recording coming soon...
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>

          {/* Timeline Scrubber - Premium */}
          {points.length > 0 && (
            <div className="px-8 pb-6 border-t border-white/10 pt-4">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 w-16">Timeline</span>
                <Slider
                  value={[Math.round((revealIndex / points.length) * 100)]}
                  onValueChange={(v) => handleTimelineChange(v[0])}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400 w-20 text-right">
                  {revealIndex} / {points.length}
                </span>
              </div>
            </div>
          )}
        </Tabs>
      </motion.div>
    </div>
  );
}
