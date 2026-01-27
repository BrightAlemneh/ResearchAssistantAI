import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
// Added Trash2 to the imports
import { LogOut, Search, Loader2, Plus, FileText, BookOpen, Lightbulb, FileCheck, Trash2 } from 'lucide-react';
import ResearchTopicForm from './ResearchTopicForm';
import ResearchTopicList from './ResearchTopicList';
import ResearchResults from './ResearchResults';

// ... interface remains the same

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [researchTopics, setResearchTopics] = useState<ResearchTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ResearchTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);

  useEffect(() => {
    fetchResearchTopics();
  }, []);

  // --- NEW DELETE LOGIC ---
  const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents selecting the topic when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this research?')) return;

    try {
      const { error } = await supabase
        .from('research_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update UI state
      setResearchTopics(researchTopics.filter(t => t.id !== id));
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic');
    }
  };

  // ... fetchResearchTopics, handleTopicCreated, handleTopicUpdated remain the same

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header section remains the same */}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Research Topics</h2>
                <button
                  onClick={() => setShowNewTopicForm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>

              {showNewTopicForm && (
                <ResearchTopicForm
                  onTopicCreated={handleTopicCreated}
                  onCancel={() => setShowNewTopicForm(false)}
                />
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                   {/* Note: You will need to update ResearchTopicList.tsx 
                     to accept the onDelete prop and display a button 
                   */}
                   <ResearchTopicList
                    topics={researchTopics}
                    selectedTopic={selectedTopic}
                    onSelectTopic={setSelectedTopic}
                    onDeleteTopic={handleDeleteTopic} 
                  />
                </div>
              )}
            </div>

            {/* Features section remains the same */}
          </div>

          <div className="lg:col-span-2">
            {/* Results section remains the same */}
          </div>
        </div>
      </main>
    </div>
  );
}
