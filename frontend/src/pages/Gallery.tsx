import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const PRESETS = [
  { id: 'anxiety-spiral', name: 'Anxiety Spiral', description: 'Watch worry unfold in dark, swirling patterns' },
  { id: 'calm-nebula', name: 'Calm Nebula', description: 'Gentle, flowing thoughts in soft blues' },
  { id: 'chaos-control', name: 'Chaos → Control', description: 'From scattered to focused meaning' },
  { id: 'techno-ribbon', name: 'Techno Ribbon', description: 'Sharp, electric semantic paths' },
  { id: 'poetic-flow', name: 'Poetic Flow', description: 'Elegant, meandering language trails' },
  { id: 'data-stream', name: 'Data Stream', description: 'Precise, structured information flow' },
  { id: 'emotional-journey', name: 'Emotional Journey', description: 'Sentiment shifts through color' },
  { id: 'concept-cluster', name: 'Concept Cluster', description: 'Topics form glowing constellations' },
];

export default function Gallery() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black noise" />
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4">Preset Gallery</h1>
          <p className="text-xl text-gray-400">Choose a style and start creating</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRESETS.map((preset, idx) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="glass hover:border-gray-700 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{preset.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">{preset.description}</p>
                  <Link to={`/studio?preset=${preset.id}`}>
                    <Button className="w-full">Use Preset</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to="/studio">
            <Button variant="outline" size="lg">Or Start from Scratch</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

