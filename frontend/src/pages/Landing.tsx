import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import MiniDemo from '../components/MiniDemo';

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background gradient with noise */}
      <div className="fixed inset-0 bg-black noise" />
      
      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
            3D Trails
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 mb-8">
            Type anything → watch meaning form into a living universe
          </p>
          <Link to="/studio">
            <Button size="lg" className="text-lg px-8 py-6">
              Open Studio
            </Button>
          </Link>
        </motion.div>
        
        {/* Live Mini Demo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-16 w-full max-w-6xl h-[600px] md:h-[700px]"
        >
          <MiniDemo />
        </motion.div>
      </section>
      
      {/* Scroll Storytelling Sections */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto space-y-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Meaning becomes motion</h2>
            <p className="text-xl text-gray-400">Watch your words flow through semantic space as a beautiful, animated trail</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Emotion becomes color</h2>
            <p className="text-xl text-gray-400">Sentiment analysis paints your trail with colors that reflect the emotional journey</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Topics become constellations</h2>
            <p className="text-xl text-gray-400">Clusters of related concepts form glowing clouds in 3D space</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Meaning has gravity</h2>
            <p className="text-xl text-gray-400">Particles swirl and are pulled toward semantic anchors, creating a living field</p>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 text-center text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link to="/studio" className="hover:text-white transition-colors">Studio</Link>
          <Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link>
        </div>
        <p>© 2024 3D Trails</p>
      </footer>
    </div>
  );
}

