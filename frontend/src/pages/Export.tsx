import { useState } from 'react';
import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { useStore } from '../state/store';

export default function Export() {
  const { points } = useStore();
  const [copied, setCopied] = useState(false);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trail-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecord = () => {
    // Stub for future implementation
    alert('Video recording coming soon! For now, use screenshot to capture your trail.');
  };

  return (
    <div className="min-h-screen bg-breathing">
      <TopNav />
      
      {/* Star Field */}
      <div className="star-field">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 pt-24 pb-24 px-4">
        <div className="max-w-[var(--max-content-width)] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h1 className="h1 mb-4">Export</h1>
            <p className="body text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Save and share your trails
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.1 }}
              className="glass-panel rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center mx-auto mb-4">
                <Download className="text-white" size={32} />
              </div>
              <h3 className="h2 mb-3">Screenshot</h3>
              <p className="body text-[var(--text-secondary)] mb-6">
                Capture the current state of your trail as a PNG image
              </p>
              <Button
                onClick={handleScreenshot}
                disabled={points.length === 0}
                className="btn-gradient w-full"
              >
                Download PNG
              </Button>
            </motion.div>

            {/* Record Video */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.2 }}
              className="glass-panel rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-lime)] flex items-center justify-center mx-auto mb-4">
                <Download className="text-white" size={32} />
              </div>
              <h3 className="h2 mb-3">Record</h3>
              <p className="body text-[var(--text-secondary)] mb-6">
                Record a 5-second animation of your trail (coming soon)
              </p>
              <Button
                onClick={handleRecord}
                disabled
                className="w-full opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </Button>
            </motion.div>

            {/* Share Link */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.3 }}
              className="glass-panel rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--accent-lime)] to-[var(--accent-cyan)] flex items-center justify-center mx-auto mb-4">
                {copied ? <Check className="text-white" size={32} /> : <Copy className="text-white" size={32} />}
              </div>
              <h3 className="h2 mb-3">Share Link</h3>
              <p className="body text-[var(--text-secondary)] mb-6">
                Copy a link to share your trail with others
              </p>
              <Button
                onClick={handleCopyLink}
                className="w-full"
                variant={copied ? 'default' : 'outline'}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

