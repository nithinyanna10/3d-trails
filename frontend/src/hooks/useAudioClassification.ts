import { useState, useRef, useCallback } from 'react';

/**
 * Better approach: Use audio file upload or cloud-based classification
 * This is a placeholder for integrating with proper audio classification services
 */

interface UseAudioClassificationOptions {
  onSoundDetected?: (soundText: string, confidence: number) => void;
  useCloudService?: boolean; // Use cloud service instead of local analysis
}

export function useAudioClassification(options: UseAudioClassificationOptions = {}) {
  const { onSoundDetected, useCloudService = false } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Method 1: Upload audio file and classify
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Option A: Send to backend for classification
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/classify-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const result = await response.json();
      
      if (onSoundDetected && result.sound) {
        onSoundDetected(result.sound, result.confidence || 0.8);
      }
    } catch (err) {
      console.error('Error classifying audio:', err);
      setError('Failed to classify audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onSoundDetected]);

  // Method 2: Record audio and classify
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleFileUpload(audioBlob as any);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      
      // Stop after 3 seconds
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);

      return () => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err) {
      setError('Failed to access microphone');
      return null;
    }
  }, [handleFileUpload]);

  return {
    isProcessing,
    error,
    handleFileUpload,
    startRecording,
    fileInputRef,
  };
}

