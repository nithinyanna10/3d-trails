import { useState, useEffect, useRef, useCallback } from 'react';

// Sound categories and their text representations
const SOUND_MAPPINGS: Record<string, string> = {
  // Bird sounds
  'bird_chirping': 'bird chirping',
  'bird_singing': 'bird singing',
  'bird_calling': 'bird calling',
  'crow_cawing': 'crow cawing',
  'owl_hooting': 'owl hooting',
  'seagull_calling': 'seagull calling',
  
  // Animal sounds
  'dog_barking': 'dog barking',
  'cat_meowing': 'cat meowing',
  'cow_mooing': 'cow mooing',
  'horse_neighing': 'horse neighing',
  'pig_oinking': 'pig oinking',
  'sheep_bleating': 'sheep bleating',
  'rooster_crowing': 'rooster crowing',
  'wolf_howling': 'wolf howling',
  'lion_roaring': 'lion roaring',
  'elephant_trumpeting': 'elephant trumpeting',
  
  // Nature sounds
  'wind_blowing': 'wind blowing',
  'rain_falling': 'rain falling',
  'thunder': 'thunder rumbling',
  'water_flowing': 'water flowing',
  'ocean_waves': 'ocean waves',
  'fire_crackling': 'fire crackling',
  'leaves_rustling': 'leaves rustling',
  
  // Random sounds
  'bell_ringing': 'bell ringing',
  'door_knocking': 'door knocking',
  'footsteps': 'footsteps walking',
  'glass_breaking': 'glass breaking',
  'engine_running': 'engine running',
  'music_playing': 'music playing',
  'applause': 'applause clapping',
};

interface UseSoundClassificationOptions {
  onSoundDetected?: (soundText: string, confidence: number) => void;
  sensitivity?: number; // 0-1, how sensitive to detect sounds
  continuous?: boolean;
}

export function useSoundClassification(options: UseSoundClassificationOptions = {}) {
  const {
    onSoundDetected,
    sensitivity = 0.3,
    continuous = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [detectedSound, setDetectedSound] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // For visual feedback
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const soundBufferRef = useRef<Float32Array[]>([]);
  const lastSoundTimeRef = useRef<number>(0);

  // Improved sound classification with better external sound detection
  const classifySound = useCallback((audioData: Float32Array, frequencyData: Uint8Array): { sound: string; confidence: number } => {
    // Calculate audio features
    const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
    const maxAmplitude = Math.max(...Array.from(audioData.map(Math.abs)));
    const zeroCrossings = audioData.slice(1).reduce((count, val, i) => {
      return count + (Math.sign(val) !== Math.sign(audioData[i]) ? 1 : 0);
    }, 0) / audioData.length;
    
    // Frequency analysis
    const frequencyBins = frequencyData.length;
    const lowFreq = frequencyData.slice(0, Math.floor(frequencyBins * 0.1)).reduce((a, b) => a + b, 0) / Math.floor(frequencyBins * 0.1);
    const midFreq = frequencyData.slice(Math.floor(frequencyBins * 0.1), Math.floor(frequencyBins * 0.5)).reduce((a, b) => a + b, 0) / (Math.floor(frequencyBins * 0.5) - Math.floor(frequencyBins * 0.1));
    const highFreq = frequencyData.slice(Math.floor(frequencyBins * 0.5)).reduce((a, b) => a + b, 0) / (frequencyBins - Math.floor(frequencyBins * 0.5));
    
    // Classify based on features - more sensitive to external sounds
    let detectedSound = 'unknown_sound';
    let confidence = Math.min(0.9, rms * 20); // Higher confidence for louder sounds
    
    // Very high frequency, any amplitude = bird sounds
    if (highFreq > 100 && rms > 0.01) {
      if (zeroCrossings > 0.2) {
        detectedSound = 'bird_chirping';
        confidence = Math.min(0.9, (highFreq / 255) * 0.8 + rms * 10);
      } else {
        detectedSound = 'bird_singing';
        confidence = Math.min(0.85, (highFreq / 255) * 0.7 + rms * 8);
      }
    }
    // Medium-high frequency = animal sounds
    else if (midFreq > 50 && rms > 0.02) {
      if (zeroCrossings < 0.05 && rms > 0.1) {
        detectedSound = 'dog_barking';
        confidence = Math.min(0.9, rms * 8);
      } else if (zeroCrossings > 0.1 && zeroCrossings < 0.3) {
        detectedSound = 'cat_meowing';
        confidence = Math.min(0.85, rms * 7);
      } else {
        detectedSound = 'animal_sound';
        confidence = Math.min(0.8, rms * 6);
      }
    }
    // Low frequency, high amplitude = nature/environmental sounds
    else if (lowFreq > 30 && rms > 0.05) {
      if (rms > 0.3 && zeroCrossings < 0.02) {
        detectedSound = 'thunder';
        confidence = Math.min(0.95, rms * 3);
      } else if (zeroCrossings > 0.1 && zeroCrossings < 0.3) {
        detectedSound = 'wind_blowing';
        confidence = Math.min(0.85, rms * 5);
      } else if (midFreq > 40) {
        detectedSound = 'rain_falling';
        confidence = Math.min(0.8, rms * 6);
      } else {
        detectedSound = 'nature_sound';
        confidence = Math.min(0.75, rms * 5);
      }
    }
    // Any significant sound that doesn't match above = generic sound
    else if (rms > 0.01) {
      detectedSound = 'sound_detected';
      confidence = Math.min(0.7, rms * 15);
    }
    
    return { sound: detectedSound, confidence };
  }, []);

  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);
    
    analyserRef.current.getFloatTimeDomainData(timeData);
    analyserRef.current.getByteFrequencyData(frequencyData);

    // Calculate audio level for visual feedback
    const rms = Math.sqrt(
      timeData.reduce((sum, val) => sum + val * val, 0) / bufferLength
    );
    const audioLevelPercent = Math.min(100, rms * 1000); // Convert to percentage
    setAudioLevel(audioLevelPercent);

    // Lower threshold to detect quieter external sounds
    const adjustedSensitivity = sensitivity * 0.5; // Make it more sensitive
    
    if (rms > adjustedSensitivity) {
      const now = Date.now();
      // Throttle detections to avoid spam (max once per 500ms)
      if (now - lastSoundTimeRef.current > 500) {
        const classification = classifySound(timeData, frequencyData);
        const soundText = SOUND_MAPPINGS[classification.sound] || classification.sound || 'sound detected';
        
        setDetectedSound(soundText);
        setConfidence(classification.confidence);

        if (onSoundDetected && classification.confidence > 0.3) {
          onSoundDetected(soundText, classification.confidence);
        }
        
        lastSoundTimeRef.current = now;
      }
    } else {
      // Clear detection if sound stops
      if (detectedSound && rms < adjustedSensitivity * 0.3) {
        setDetectedSound(null);
        setConfidence(0);
      }
    }

    if (continuous && isListening) {
      animationFrameRef.current = requestAnimationFrame(processAudio);
    }
  }, [sensitivity, classifySound, onSoundDetected, continuous, isListening, detectedSound]);

  const startListening = useCallback(async () => {
    try {
      // Request microphone access with better audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // Disable echo cancellation to better capture external sounds
          noiseSuppression: false, // Disable noise suppression
          autoGainControl: false, // Disable auto gain control
          sampleRate: 44100, // Higher sample rate for better quality
        } 
      });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node with better settings for external sound detection
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // Higher resolution for better frequency analysis
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive detection
      analyser.minDecibels = -90; // Lower threshold to capture quieter sounds
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);

      setIsListening(true);
      setError(null);
      
      // Start processing
      processAudio();
    } catch (err) {
      console.error('Error starting sound classification:', err);
      setError('Failed to access microphone. Please allow microphone permissions.');
      setIsListening(false);
    }
  }, [processAudio]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setDetectedSound(null);
    setConfidence(0);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    detectedSound,
    confidence,
    error,
    audioLevel, // Add audio level for visual feedback
    startListening,
    stopListening,
    toggleListening,
  };
}

