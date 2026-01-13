import { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore, calculateProgress, calculateAverageSentiment } from '../state/store';
import { embedText, processAudioFile, processImageFile } from '../api';
import { getPresetConfig } from '../utils/presets';
import Scene from '../scene/Scene';
import StudioTopBar from '../components/StudioTopBar';
import CommandDock from '../components/CommandDock';
import InspectorPanel from '../components/InspectorPanel';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useSoundClassification } from '../hooks/useSoundClassification';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, Type, Play, Pause, Image as ImageIcon } from 'lucide-react';

export default function Studio() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
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

  // Handle preset from URL and apply settings
  useEffect(() => {
    const presetId = searchParams.get('preset');
    if (presetId) {
      setPreset(presetId);
      const presetConfig = getPresetConfig(presetId);
      
      if (presetConfig) {
        // Apply preset settings
        const { settings } = presetConfig;
        
        if (settings.speed !== undefined) setSpeed(settings.speed);
        if (settings.showParticles !== undefined) setShowParticles(settings.showParticles);
        if (settings.showClusterClouds !== undefined) setShowClusterClouds(settings.showClusterClouds);
        if (settings.showAnchorLabels !== undefined) setShowAnchorLabels(settings.showAnchorLabels);
        if (settings.cameraMode) setCameraMode(settings.cameraMode);
        if (settings.mode) setMode(settings.mode);
        
        // Load sample text if provided and no text exists
        if (settings.sampleText && !text.trim()) {
          setText(settings.sampleText);
        }
      }
    }
  }, [searchParams, setPreset, setSpeed, setShowParticles, setShowClusterClouds, setShowAnchorLabels, setCameraMode, setMode, setText, text]);

  // Handle initial text from landing page
  useEffect(() => {
    if (location.state?.initialText) {
      setText(location.state.initialText);
    }
  }, [location.state, setText]);

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

  // Handle Process action
  const handleProcess = useCallback(() => {
    if (text.trim() && !isUploading && inputMode !== 'image') {
      debouncedEmbed(text, mode);
    }
  }, [text, mode, debouncedEmbed, isUploading, inputMode]);

  // Keyboard shortcut (Cmd+Enter)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleProcess();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleProcess]);

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
      <StudioTopBar onShare={handleShare} onExport={handleExport} />

      {/* Canvas Area - Full Screen */}
      <div className="flex-1 relative" style={{ marginTop: '56px' }}>
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

      {/* Inspector Panel - Right Side */}
      <InspectorPanel
        stats={{
          points: meta.n_points,
          clusters: meta.n_clusters,
          sentiment: avgSentiment,
          progress,
          latency,
        }}
      />

      {/* Command Dock - Bottom */}
      <CommandDock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onProcess={handleProcess}
        isLoading={isLoading}
      >
        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            {/* Input Mode - Segmented Control */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
              {(['text', 'speech', 'sound', 'image'] as const).map((modeOption) => (
                <motion.button
                  key={modeOption}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  onClick={() => {
                    if (isListening) {
                      if (inputMode === 'speech') toggleSpeechListening();
                      if (inputMode === 'sound') toggleSoundListening();
                    }
                    setInputMode(modeOption);
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    inputMode === modeOption
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  style={{
                    background: inputMode === modeOption ? 'rgba(71, 215, 255, 0.12)' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {modeOption === 'text' && <Type size={14} />}
                    {modeOption === 'speech' && <Mic size={14} />}
                    {modeOption === 'sound' && <Upload size={14} />}
                    {modeOption === 'image' && <ImageIcon size={14} />}
                    <span className="capitalize">{modeOption}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="label text-xs">Input</Label>
                <div className="flex items-center gap-1.5">
                  {inputMode === 'speech' && isVoiceSupported && (
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      onClick={toggleSpeechListening}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        isListening
                          ? 'text-[var(--danger)] bg-[var(--danger)]/10'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isListening ? <Pause size={12} /> : <Play size={12} />}
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
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Upload size={12} />
                      </motion.button>
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                        onClick={toggleSoundListening}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          isListening
                            ? 'text-[var(--danger)] bg-[var(--danger)]/10'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isListening ? <Pause size={12} /> : <Mic size={12} />}
                      </motion.button>
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
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <ImageIcon size={12} />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs">
                  {error}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  inputMode === 'image'
                    ? 'Upload an image to create embeddings...'
                    : 'Type your text here...'
                }
                className="w-full h-24 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all resize-none"
              />
            </div>

            {/* Mode Toggle - Inline */}
            <div className="flex items-center gap-2">
              <Label className="label text-xs">Mode:</Label>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                {(['prefix', 'token'] as const).map((m) => (
                  <motion.button
                    key={m}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      mode === m
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={{
                      background: mode === m ? 'rgba(71, 215, 255, 0.12)' : 'transparent',
                    }}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Look Tab */}
        {activeTab === 'look' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-particles" className="body text-sm">Particles</Label>
              <Switch
                id="show-particles"
                checked={showParticles}
                onCheckedChange={setShowParticles}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-cluster-clouds" className="body text-sm">Cluster Clouds</Label>
              <Switch
                id="show-cluster-clouds"
                checked={showClusterClouds}
                onCheckedChange={setShowClusterClouds}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-anchor-labels" className="body text-sm">Latest Label</Label>
              <Switch
                id="show-anchor-labels"
                checked={showAnchorLabels}
                onCheckedChange={setShowAnchorLabels}
              />
            </div>
            {/* Style sliders (stub for future) */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
              <div className="space-y-2">
                <Label className="label text-xs">Trail Thickness</Label>
                <Slider
                  value={[50]}
                  disabled
                  className="opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Motion Tab */}
        {activeTab === 'motion' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="label text-xs">Speed</Label>
                <span className="text-xs text-[var(--text-muted)]">{speed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[speed * 10]}
                onValueChange={(v) => setSpeed(v[0] / 10)}
                min={2}
                max={30}
                step={1}
              />
            </div>

            {points.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="label text-xs">Timeline</Label>
                  <span className="text-xs text-[var(--text-muted)]">{revealIndex} / {points.length}</span>
                </div>
                <Slider
                  value={[revealIndex]}
                  onValueChange={(v) => handleTimelineChange(v[0])}
                  min={0}
                  max={points.length}
                  step={1}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="label text-xs">Camera</Label>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                {(['drift', 'orbit', 'static'] as const).map((m) => (
                  <motion.button
                    key={m}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    onClick={() => setCameraMode(m)}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all capitalize ${
                      cameraMode === m
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={{
                      background: cameraMode === m ? 'rgba(71, 215, 255, 0.12)' : 'transparent',
                    }}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CommandDock>
    </div>
  );
}
