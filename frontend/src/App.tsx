import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import Gallery from './pages/Gallery';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
