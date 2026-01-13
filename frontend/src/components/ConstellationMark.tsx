import { motion } from 'framer-motion';

export default function ConstellationMark() {
  // 6-8 dots with connecting lines
  const dots = [
    { x: 0, y: 0 },
    { x: 12, y: -8 },
    { x: 24, y: 4 },
    { x: 36, y: -4 },
    { x: 48, y: 8 },
    { x: 60, y: -2 },
    { x: 72, y: 6 },
  ];

  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
  ];

  return (
    <motion.svg
      width="80"
      height="20"
      viewBox="0 0 80 20"
      className="mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Connecting lines */}
      {connections.map(([start, end], i) => (
        <motion.line
          key={`line-${i}`}
          x1={dots[start].x}
          y1={dots[start].y + 10}
          x2={dots[end].x}
          y2={dots[end].y + 10}
          stroke="rgba(71, 215, 255, 0.2)"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
        />
      ))}
      
      {/* Dots */}
      {dots.map((dot, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y + 10}
          r="1.5"
          fill="rgba(71, 215, 255, 0.4)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: 0.4 + i * 0.05,
            type: 'spring',
            stiffness: 300,
          }}
        />
      ))}
    </motion.svg>
  );
}

