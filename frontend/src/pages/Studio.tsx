import { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore, calculateProgress, calculateAverageSentiment } from '../state/store';
import { embedText, processAudioFile, processImageFile } from '../api';
import Scene from '../scene/Scene';
import TopNav from '../components/TopNav';
import ControlDock from '../components/ControlDock';
import { Slider } from '../components/ui/slider';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useSoundClassification } from '../hooks/useSoundClassification';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, Type, Play, Pause, Image as ImageIcon } from 'lucide-react';

export default function Studio() {
  const [searchParams] = useSearchParams();
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
    cameraMode,
    isLoading,
    animationProgress,
    latency,
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
    setCameraMode,
    setAnimationProgress,
    setLatency,
    setPreset,
  } = useStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('compose');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'speech' | 'sound' | 'image'>('text');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [detectedSounds, setDetectedSounds] = useState<string[]>([]);
  const [soundDetectionMode, setSoundDetectionMode] = useState<'auto' | 'manual'>('manual');

  // Handle preset from URL
  useEffect(() => {
    const presetId = searchParams.get('preset');
    if (presetId) {
      setPreset(presetId);
      // Apply preset settings here if needed
    }
  }, [searchParams, setPreset]);

  // Voice recognition
  const {
    isListening: isSpeechListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    toggleListening: toggleSpeechListening,
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

  // Sound classification
  const {
    isListening: isSoundListening,
    detectedSound,
    confidence,
    error: soundError,
    audioLevel,
    toggleListening: toggleSoundListening,
  } = useSoundClassification({
    onSoundDetected: (soundText) => {
      if (inputMode === 'sound') {
        setDetectedSounds(prev => [...prev, soundText]);
        if (soundDetectionMode === 'auto') {
          setText(text.trim() ? `${text} ${soundText}` : soundText);
        }
      }
    },
    continuous: true,
    sensitivity: 0.1,
  });

  const isListening = inputMode === 'speech' ? isSpeechListening : (inputMode === 'sound' ? isSoundListening : false);
  const error = inputMode === 'speech' ? voiceError : (inputMode === 'sound' ? soundError : null);

  // Debounced embed with latency tracking
  const debouncedEmbed = useCallback(
    async (textToEmbed: string, modeToUse: 'prefix' | 'token') => {
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
        const startTime = performance.now();
        try {
          const response = await embedText(textToEmbed, modeToUse);
          const endTime = performance.now();
          setLatency(Math.round(endTime - startTime));
          
          setPoints(response.points);
          setAnchors(response.anchors);
          setMeta(response.meta);
          setAnimationProgress(0);
          const initialReveal = Math.max(2, Math.min(5, response.points.length));
          setRevealIndex(initialReveal);
        } catch (error) {
          console.error('Error embedding text:', error);
        } finally {
          setIsLoading(false);
        }
      }, 400);
    },
    [setPoints, setAnchors, setMeta, setRevealIndex, setIsLoading, setAnimationProgress, setLatency]
  );

  // Handle audio upload
  const handleAudioUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsLoading(true);
    try {
      const result = await processAudioFile(file);
      if (result.success && result.text) {
        setText(result.text);
        setTimeout(() => debouncedEmbed(result.text, mode), 500);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  }, [setText, debouncedEmbed, mode]);

  // Handle image upload - directly creates embeddings and points
  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsLoading(true);
    try {
      console.log('Processing image:', file.name);
      // Process image directly to get embeddings (like voice/speech)
      const result = await processImageFile(file);
      console.log('Image processed, got points:', result.points.length);
      // result is already an EmbedResponse with points and anchors
      setPoints(result.points);
      setAnchors(result.anchors);
      setMeta(result.meta);
      setAnimationProgress(0);
      const initialReveal = Math.max(2, Math.min(5, result.points.length));
      setRevealIndex(initialReveal);
      // Clear text to prevent text embedding from triggering
      setText('');
    } catch (error) {
      console.error('Error processing image:', error);
      alert(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  }, [setPoints, setAnchors, setMeta, setAnimationProgress, setRevealIndex, setText]);

  useEffect(() => {
    // Only embed text if we're not uploading an image
    if (text.trim() && !isUploading && inputMode !== 'image') {
      debouncedEmbed(text, mode);
    }
  }, [text, mode, debouncedEmbed, isUploading, inputMode]);

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

  // Keyboard shortcut
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
    const index = Math.max(0, Math.min(value, points.length));
    setRevealIndex(index);
    const progress = points.length > 1 ? index / (points.length - 1) : 0;
    setAnimationProgress(progress);
    setTimeout(() => setIsScrubbing(false), 100);
  };

  useEffect(() => {
    if (!isScrubbing && points.length > 0 && animationProgress > 0) {
      const index = Math.max(2, Math.min(Math.floor(animationProgress * points.length), points.length));
      setRevealIndex(index);
    }
  }, [animationProgress, isScrubbing, points.length, setRevealIndex]);

  const progress = calculateProgress(revealIndex, meta.n_points);
  const avgSentiment = calculateAverageSentiment(points);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    // Could show a toast here
  };

  const handleExport = () => {
    // Screenshot functionality
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'trail-screenshot.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] overflow-hidden">
      <TopNav onShare={handleShare} onExport={handleExport} />

      {/* Canvas Area */}
      <div className="flex-1 relative" style={{ marginTop: '56px' }}>
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-[var(--accent-cyan)]/30 border-t-[var(--accent-cyan)] rounded-full animate-spin" />
                <div className="body text-[var(--text-primary)]">Processing...</div>
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
          cameraMode={cameraMode}
        />
      </div>

      {/* Control Dock */}
      <ControlDock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        status={{
          points: meta.n_points,
          clusters: meta.n_clusters,
          sentiment: avgSentiment,
          progress,
          latency,
        }}
      >
        <div className="space-y-6">
          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <>
              {/* Input Mode */}
              <div className="space-y-3">
                <Label className="label">Input Mode</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['text', 'speech', 'sound', 'image'] as const).map((mode) => (
                    <motion.button
                      key={mode}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (isListening) {
                          if (inputMode === 'speech') toggleSpeechListening();
                          if (inputMode === 'sound') toggleSoundListening();
                        }
                        setInputMode(mode);
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        inputMode === mode
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                          : 'border-[var(--panel-border)] bg-[var(--panel-glass)] hover:border-[var(--accent-cyan)]/50'
                      }`}
                    >
                      {mode === 'text' && <Type className="w-5 h-5 mx-auto mb-2" />}
                      {mode === 'speech' && <Mic className="w-5 h-5 mx-auto mb-2" />}
                      {mode === 'sound' && <Upload className="w-5 h-5 mx-auto mb-2" />}
                      {mode === 'image' && <ImageIcon className="w-5 h-5 mx-auto mb-2" />}
                      <div className="text-xs font-medium capitalize">{mode}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="label">Text Input</Label>
                  <div className="flex items-center gap-2">
                    {inputMode === 'speech' && isVoiceSupported && (
                      <Button
                        size="sm"
                        onClick={toggleSpeechListening}
                        className={isListening ? 'bg-[var(--danger)]/20 text-[var(--danger)]' : ''}
                      >
                        {isListening ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isListening ? 'Stop' : 'Start'}
                      </Button>
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
                        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          size="sm"
                          onClick={toggleSoundListening}
                          className={isListening ? 'bg-[var(--danger)]/20 text-[var(--danger)]' : ''}
                        >
                          {isListening ? <Pause className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                          {isListening ? 'Stop' : 'Listen'}
                        </Button>
                      </>
                    )}
                    {inputMode === 'image' && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          ref={imageInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                        />
                        <Button size="sm" onClick={() => imageInputRef.current?.click()} disabled={isUploading}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          {isUploading ? 'Processing...' : 'Upload Image'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
                    {error}
                  </div>
                )}

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    inputMode === 'image'
                      ? 'Upload an image to create embeddings directly (like voice/speech)...'
                      : 'Type your text here... (Cmd+Enter to process)'
                  }
                  className="w-full h-32 bg-[var(--panel-glass)] border border-[var(--panel-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all"
                />
              </div>

              {/* Mode Selector */}
              <div className="space-y-3">
                <Label className="label">Mode</Label>
                <div className="flex gap-2">
                  {(['prefix', 'token'] as const).map((m) => (
                    <Button
                      key={m}
                      variant={mode === m ? 'default' : 'outline'}
                      onClick={() => setMode(m)}
                      className="flex-1 capitalize"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Look Tab */}
          {activeTab === 'look' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-particles" className="body">Show Particles</Label>
                <Switch
                  id="show-particles"
                  checked={showParticles}
                  onCheckedChange={setShowParticles}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-cluster-clouds" className="body">Show Cluster Clouds</Label>
                <Switch
                  id="show-cluster-clouds"
                  checked={showClusterClouds}
                  onCheckedChange={setShowClusterClouds}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-anchor-labels" className="body">Show Latest Label</Label>
                <Switch
                  id="show-anchor-labels"
                  checked={showAnchorLabels}
                  onCheckedChange={setShowAnchorLabels}
                />
              </div>
            </div>
          )}

          {/* Motion Tab */}
          {activeTab === 'motion' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="label">Speed: {speed.toFixed(1)}x</Label>
                <Slider
                  value={[speed * 10]}
                  onValueChange={(v) => setSpeed(v[0] / 10)}
                  min={2}
                  max={30}
                  step={1}
                />
              </div>

              {points.length > 0 && (
                <div className="space-y-3">
                  <Label className="label">Timeline: {revealIndex} / {points.length}</Label>
                  <Slider
                    value={[revealIndex]}
                    onValueChange={(v) => handleTimelineChange(v[0])}
                    min={0}
                    max={points.length}
                    step={1}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label className="label">Camera Mode</Label>
                <div className="flex gap-2">
                  {(['drift', 'orbit', 'static'] as const).map((m) => (
                    <Button
                      key={m}
                      variant={cameraMode === m ? 'default' : 'outline'}
                      onClick={() => setCameraMode(m)}
                      className="flex-1 capitalize"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ControlDock>
    </div>
  );
}
