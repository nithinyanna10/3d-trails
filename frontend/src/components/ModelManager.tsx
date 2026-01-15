import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, X, Check, Loader2 } from 'lucide-react';
import { listModels, addModel, removeModel, setActiveModel, getActiveModel, ModelInfo } from '../api';
import { useStore } from '../state/store';
import { Label } from './ui/label';

export default function ModelManager() {
  const { activeModel, availableModels, setActiveModel: setActiveModelState, setAvailableModels } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load models on mount
  useEffect(() => {
    loadModels();
    loadActiveModel();
  }, []);

  const loadModels = async () => {
    try {
      const models = await listModels();
      setAvailableModels(models);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    }
  };

  const loadActiveModel = async () => {
    try {
      const active = await getActiveModel();
      setActiveModelState(active.name);
    } catch (err) {
      console.error('Error loading active model:', err);
    }
  };

  const handleAddModel = async () => {
    if (!newModelName.trim()) {
      setError('Model name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await addModel(newModelName.trim(), newModelDescription.trim() || undefined);
      setSuccess(`Model '${newModelName}' added successfully!`);
      setNewModelName('');
      setNewModelDescription('');
      setShowAddForm(false);
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add model');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveModel = async (modelName: string) => {
    if (!confirm(`Remove model '${modelName}'?`)) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await removeModel(modelName);
      setSuccess(`Model '${modelName}' removed successfully!`);
      await loadModels();
      if (activeModel === modelName) {
        // Switch to default if removed model was active
        await handleSetActive('all-MiniLM-L6-v2');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove model');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (modelName: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await setActiveModel(modelName);
      setActiveModelState(modelName);
      setSuccess(`Active model set to '${modelName}'`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active model');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <Settings size={16} />
        <span>Models</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl"
              style={{
                background: 'rgba(7, 10, 18, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.08)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Model Manager</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                {/* Messages */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm"
                  >
                    {success}
                  </motion.div>
                )}

                {/* Add Model Form */}
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 rounded-lg border border-[rgba(255,255,255,0.12)]"
                  >
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Add Custom Model</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1">Model Name (HuggingFace ID)</Label>
                        <input
                          type="text"
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="e.g., sentence-transformers/all-MiniLM-L6-v2"
                          className="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1">Description (optional)</Label>
                        <input
                          type="text"
                          value={newModelDescription}
                          onChange={(e) => setNewModelDescription(e.target.value)}
                          placeholder="Brief description of this model"
                          className="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddModel}
                          disabled={isLoading || !newModelName.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                          style={{
                            background: 'linear-gradient(135deg, #47D7FF 0%, #8B5CFF 100%)',
                            boxShadow: '0 0 20px rgba(71, 215, 255, 0.3)',
                          }}
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          <span>Add Model</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowAddForm(false);
                            setNewModelName('');
                            setNewModelDescription('');
                            setError(null);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[rgba(255,255,255,0.12)]"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Models List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">Available Models</h3>
                    {!showAddForm && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[rgba(255,255,255,0.12)]"
                      >
                        <Plus size={14} />
                        <span>Add Model</span>
                      </motion.button>
                    )}
                  </div>

                  {availableModels.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                      No models available. Add a model to get started.
                    </div>
                  ) : (
                    availableModels.map((model) => (
                      <motion.div
                        key={model.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-colors"
                        style={{
                          background: activeModel === model.name ? 'rgba(71, 215, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-[var(--text-primary)]">{model.name}</h4>
                              {activeModel === model.name && (
                                <Check size={14} className="text-[var(--accent-cyan)]" />
                              )}
                              {model.is_default && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-[rgba(71,215,255,0.15)] text-[var(--accent-cyan)]">
                                  Default
                                </span>
                              )}
                              {model.is_custom && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-[rgba(139,92,255,0.15)] text-[var(--accent-violet)]">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-2">{model.description}</p>
                            <div className="flex gap-2">
                              {activeModel !== model.name && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleSetActive(model.name)}
                                  disabled={isLoading}
                                  className="px-3 py-1 rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[rgba(255,255,255,0.12)] disabled:opacity-50"
                                >
                                  Set Active
                                </motion.button>
                              )}
                              {model.is_custom && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRemoveModel(model.name)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium text-[var(--danger)] hover:text-[var(--danger)] transition-colors border border-[rgba(255,255,255,0.12)] disabled:opacity-50"
                                >
                                  <X size={12} />
                                  <span>Remove</span>
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
