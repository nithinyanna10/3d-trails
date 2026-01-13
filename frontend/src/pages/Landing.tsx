import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import MiniCanvasPreview from '../components/MiniCanvasPreview';
import { Sparkles, Palette, Layers } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-breathing">
      <TopNav />
      
      {/* Star Field Background */}
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

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="text-center max-w-[var(--max-content-width)] mx-auto"
        >
          <h1 className="h1 mb-6 text-[var(--text-primary)]">
            Meaning, rendered.
          </h1>
          <p className="body text-lg mb-12 text-[var(--text-secondary)] max-w-2xl mx-auto">
            Turn text into a living 3D trail—emotion as color, topics as constellations.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link to="/studio">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gradient px-8 py-3 rounded-lg text-sm font-medium text-white relative"
              >
                Open Studio
              </motion.button>
            </Link>
            <Link to="/presets">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-lg text-sm font-medium text-[var(--text-primary)] border border-[var(--panel-border)] hover:border-[var(--accent-cyan)] transition-colors"
              >
                Explore Presets
              </motion.button>
            </Link>
          </div>
        </motion.div>
        
        {/* Live Mini Demo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-4xl h-[400px] mx-auto"
        >
          <MiniCanvasPreview />
        </motion.div>
      </section>
      
      {/* Feature Cards */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-[var(--max-content-width)] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="glass-panel rounded-2xl p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center mb-4">
                <Sparkles className="text-white" size={24} />
              </div>
              <h3 className="h2 mb-3">Motion</h3>
              <p className="body text-[var(--text-secondary)]">
                Watch your words flow through semantic space as a beautiful, animated trail.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.1 }}
              className="glass-panel rounded-2xl p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-lime)] flex items-center justify-center mb-4">
                <Palette className="text-white" size={24} />
              </div>
              <h3 className="h2 mb-3">Emotion</h3>
              <p className="body text-[var(--text-secondary)]">
                Sentiment analysis paints your trail with colors that reflect the emotional journey.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.2 }}
              className="glass-panel rounded-2xl p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-lime)] to-[var(--accent-cyan)] flex items-center justify-center mb-4">
                <Layers className="text-white" size={24} />
              </div>
              <h3 className="h2 mb-3">Constellations</h3>
              <p className="body text-[var(--text-secondary)]">
                Clusters of related concepts form glowing clouds in 3D space.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 text-center">
        <div className="max-w-[var(--max-content-width)] mx-auto">
          <div className="flex justify-center gap-6 mb-4">
            <Link to="/studio" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Studio</Link>
            <Link to="/presets" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Presets</Link>
            <Link to="/export" className="label text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Export</Link>
          </div>
          <p className="body text-[var(--text-muted)]">© 2024 Trails</p>
        </div>
      </footer>
    </div>
  );
}
