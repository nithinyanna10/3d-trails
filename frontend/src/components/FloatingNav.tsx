import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function FloatingNav() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-[var(--max-content-width)] mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Logo size={20} animated />
          <span className="font-heading text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
            Trails
          </span>
        </Link>

        {/* CTA Button */}
        <Link to="/studio">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] bg-[var(--panel-glass)] backdrop-blur-md border border-[var(--panel-border)] hover:border-[var(--accent-cyan)] hover:shadow-[0_0_20px_rgba(71,215,255,0.3)] transition-all"
          >
            Open Studio
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
}

