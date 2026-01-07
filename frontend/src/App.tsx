import { useState, useEffect, useCallback, useRef } from "react";
import Scene from "./Scene";
import { embedText, Point, Anchor } from "./api";
import "./App.css";

function App() {
  const [text, setText] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [mode, setMode] = useState<"prefix" | "token">("prefix");
  const [speed, setSpeed] = useState(1.0);
  const [showParticles, setShowParticles] = useState(true);
  const [showAnchorLabels, setShowAnchorLabels] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [meta, setMeta] = useState({ n_points: 0, n_clusters: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  // Debounced embed function
  const debouncedEmbed = useCallback(
    (textToEmbed: string, modeToUse: "prefix" | "token") => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(async () => {
        if (!textToEmbed.trim()) {
          setPoints([]);
          setAnchors([]);
          setMeta({ n_points: 0, n_clusters: 0 });
          setAnimationProgress(0);
          return;
        }
        
        setIsLoading(true);
        try {
          const response = await embedText(textToEmbed, modeToUse);
          setPoints(response.points);
          setAnchors(response.anchors);
          setMeta(response.meta);
          setAnimationProgress(0); // Reset animation
        } catch (error) {
          console.error("Error embedding text:", error);
        } finally {
          setIsLoading(false);
        }
      }, 400);
    },
    []
  );
  
  // Handle text change
  useEffect(() => {
    debouncedEmbed(text, mode);
  }, [text, mode, debouncedEmbed]);
  
  // Smooth animation loop with requestAnimationFrame
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000; // seconds
      lastTime = currentTime;
      
      setAnimationProgress((prev) => {
        if (prev >= 1.0) return 1.0;
        // Smooth reveal: 10 seconds at 1x speed for butter-smooth slow animation
        const increment = (delta * speed) / 10;
        return Math.min(1.0, prev + increment);
      });
      
      rafId = requestAnimationFrame(animate);
    };
    
    rafId = requestAnimationFrame(animate);
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [speed, points.length]);
  
  // Reset animation when points change
  useEffect(() => {
    setAnimationProgress(0);
  }, [points.length]);
  
  const handleClear = () => {
    setText("");
    setPoints([]);
    setAnchors([]);
    setMeta({ n_points: 0, n_clusters: 0 });
    setAnimationProgress(0);
  };
  
  // Calculate average sentiment
  const avgSentiment =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.sentiment, 0) / points.length
      : 0;
  
  return (
    <div className="app">
      <div className="left-panel">
        <div className="controls">
          <h2>Text → 3D Trail</h2>
          
          <div className="input-group">
            <label htmlFor="text-input">Enter text:</label>
            <textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here..."
              rows={8}
            />
          </div>
          
          <div className="button-group">
            <button
              className={mode === "prefix" ? "active" : ""}
              onClick={() => setMode("prefix")}
            >
              Animate by prefixes
            </button>
            <button
              className={mode === "token" ? "active" : ""}
              onClick={() => setMode("token")}
            >
              Animate by tokens
            </button>
            <button onClick={handleClear}>Clear</button>
          </div>
          
          <div className="slider-group">
            <label htmlFor="speed-slider">
              Speed: {speed.toFixed(1)}x
            </label>
            <input
              id="speed-slider"
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
              />
              Show particles
            </label>
            <label>
              <input
                type="checkbox"
                checked={showAnchorLabels}
                onChange={(e) => setShowAnchorLabels(e.target.checked)}
              />
              Show anchor labels
            </label>
          </div>
          
          {isLoading && <div className="loading">Processing...</div>}
        </div>
      </div>
      
      <div className="right-panel">
        <div className="legend">
          <div className="legend-item">
            <span className="label">Sentiment:</span>
            <span className="value">{avgSentiment.toFixed(2)}</span>
          </div>
          <div className="legend-item">
            <span className="label">Clusters:</span>
            <span className="value">{meta.n_clusters}</span>
          </div>
          <div className="legend-item">
            <span className="label">Points:</span>
            <span className="value">{meta.n_points}</span>
          </div>
        </div>
        
        <Scene
          points={points}
          anchors={anchors}
          showParticles={showParticles}
          showAnchorLabels={showAnchorLabels}
          animationProgress={animationProgress}
          speed={speed}
        />
      </div>
    </div>
  );
}

export default App;

