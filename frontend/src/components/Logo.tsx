import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  animated?: boolean;
}

export default function Logo({ size = 24, animated = false }: LogoProps) {
  const SparkleIcon = () => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="2" fill="var(--accent-cyan)" />
      <circle cx="6" cy="6" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
      <circle cx="18" cy="6" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
      <circle cx="6" cy="18" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
      <circle cx="18" cy="18" r="1.5" fill="var(--accent-violet)" opacity="0.8" />
    </svg>
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ rotate: 90, scale: 1.1 }}
        transition={{ duration: 0.3 }}
      >
        <SparkleIcon />
      </motion.div>
    );
  }

  return <SparkleIcon />;
}

