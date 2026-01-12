import { useEffect, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { embedText } from '../api';
import Scene from '../scene/Scene';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { Button } from '../components/ui/button';

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
          setAnimationProgress(0); // Reset animation
          // Start with 2-5 points visible so trail can render
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
    [setPoints, setAnchors, setMeta, setRevealIndex, setIsLoading]
  );

  useEffect(() => {
    debouncedEmbed(text, mode);
  }, [text, mode, debouncedEmbed]);

  // Animation loop - only run when we have points and not scrubbing
  useEffect(() => {
    if (points.length === 0 || isScrubbing) return;
    
    let rafId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setAnimationProgress((prev) => {
        if (prev >= 1.0) return 1.0;
        // Faster animation - reveal trail more quickly
        const increment = (delta * speed) / 5; // Changed from /10 to /5 for faster animation
        return Math.min(1.0, prev + increment);
      });

      rafId = requestAnimationFrame(animate);
    };

    // Start animation immediately
    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [speed, points.length, isScrubbing, setAnimationProgress]);

  // Reset animation when new points arrive
  useEffect(() => {
    if (points.length > 0) {
      setAnimationProgress(0);
      setRevealIndex(Math.max(2, Math.min(5, points.length))); // Start with 2-5 points visible for trail
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
    const progress = value / 100;
    const index = Math.floor(progress * points.length);
    setRevealIndex(Math.max(0, Math.min(index, points.length)));
    setAnimationProgress(progress);
    setTimeout(() => setIsScrubbing(false), 100);
  };
  
  // Auto-update revealIndex from animationProgress when not scrubbing
  useEffect(() => {
    if (!isScrubbing && points.length > 0 && animationProgress > 0) {
      const index = Math.max(2, Math.min(Math.floor(animationProgress * points.length), points.length));
      setRevealIndex(index);
    }
  }, [animationProgress, isScrubbing, points.length, setRevealIndex]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Top Nav */}
      <nav className="glass border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          3D Trails
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/gallery">
            <Button variant="ghost">Presets</Button>
          </Link>
          <Button variant="outline" onClick={() => window.navigator.clipboard.writeText(window.location.href)}>
            Share
          </Button>
        </div>
      </nav>

      {/* Main Canvas */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-lg">Processing...</div>
          </div>
        )}
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

      {/* Bottom Control Dock */}
      <div className="glass border-t border-gray-800">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-gray-800 bg-transparent">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="look">Look</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="compose" className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Text Input</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your text here..."
                  className="w-full h-32 bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <div className="flex gap-4">
                <Button
                  variant={mode === 'prefix' ? 'default' : 'outline'}
                  onClick={() => setMode('prefix')}
                >
                  Prefix Mode
                </Button>
                <Button
                  variant={mode === 'token' ? 'default' : 'outline'}
                  onClick={() => setMode('token')}
                >
                  Token Mode
                </Button>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Speed: {speed.toFixed(1)}x
                </label>
                <Slider
                  value={speed * 10}
                  onValueChange={(v) => setSpeed(v / 10)}
                  min={2}
                  max={30}
                />
              </div>
              <div className="text-sm text-gray-400">
                Points: {meta.n_points} | Clusters: {meta.n_clusters}
              </div>
            </TabsContent>

            <TabsContent value="look" className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showParticles}
                    onChange={(e) => setShowParticles(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Particles</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showClusterClouds}
                    onChange={(e) => setShowClusterClouds(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Cluster Clouds</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showAnchorLabels}
                    onChange={(e) => setShowAnchorLabels(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Latest Point Label</span>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <Button onClick={() => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const url = canvas.toDataURL();
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = '3d-trail.png';
                  a.click();
                }
              }}>
                Screenshot
              </Button>
              <p className="text-sm text-gray-400">Record GIF/MP4 (coming soon)</p>
            </TabsContent>
          </div>
        </Tabs>

        {/* Timeline Scrubber */}
        {points.length > 0 && (
          <div className="px-6 pb-4 border-t border-gray-800 pt-4">
            <label className="text-sm text-gray-400 mb-2 block">
              Timeline: {Math.min(revealIndex, points.length)} / {points.length}
            </label>
            <Slider
              value={points.length > 0 ? (Math.min(revealIndex, points.length) / points.length) * 100 : 0}
              onValueChange={handleTimelineChange}
              min={0}
              max={100}
            />
          </div>
        )}
      </div>
    </div>
  );
}

