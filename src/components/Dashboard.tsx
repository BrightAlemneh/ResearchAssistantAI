import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Search, Loader2, Plus, FileText, BookOpen, Lightbulb, FileCheck } from 'lucide-react';
import ResearchTopicForm from './ResearchTopicForm';
import ResearchTopicList from './ResearchTopicList';
import ResearchResults from './ResearchResults';

interface ResearchTopic {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [researchTopics, setResearchTopics] = useState<ResearchTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ResearchTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);

  // Define this function BEFORE it is used in useEffect
  const fetchResearchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('research_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResearchTopics(data || []);
    } catch (error) {
      console.error('Error fetching research topics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearchTopics();
  }, []);

  const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!window.confirm('Are you sure you want to delete this research?')) return;

    try {
      const { error } = await supabase
        .from('research_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state so it disappears instantly
      setResearchTopics(prev => prev.filter(t => t.id !== id));
      if (selectedTopic?.id === id) setSelectedTopic(null);
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete research topic.');
    }
  };

  const handleTopicCreated = (newTopic: ResearchTopic) => {
    setResearchTopics([newTopic, ...researchTopics]);
    setSelectedTopic(newTopic);
    setShowNewTopicForm(false);
  };

  const handleTopicUpdated = (updatedTopic: ResearchTopic) => {
    setResearchTopics(
      researchTopics.map((topic) =>
        topic.id === updatedTopic.id ? updatedTopic : topic
      )
    );
    if (selectedTopic?.id === updatedTopic.id) {
      setSelectedTopic(updatedTopic);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Research Assistant AI</h1>
                <p className="text-sm text-gray-600">Autonomous research analysis and proposal generation</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

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
                <ResearchTopicList
                  topics={researchTopics}
                  selectedTopic={selectedTopic}
                  onSelectTopic={setSelectedTopic}
                  onDeleteTopic={handleDeleteTopic}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedTopic ? (
              <ResearchResults
                topic={selectedTopic}
                onTopicUpdated={handleTopicUpdated}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Topic Selected</h3>
                <p className="text-gray-600 mb-6">Create a new research topic or select one from the list to view results</p>
                <button
                  onClick={() => setShowNewTopicForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  Create New Research Topic
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
