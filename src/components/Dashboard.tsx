import { useState, useEffect, useCallback } from 'react';
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

  // 1. USE A TRADITIONAL FUNCTION DECLARATION (This fixes the "not defined" error)
  async function fetchResearchTopics() {
    try {
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
  }

  // 2. TRIGGER FETCH ON MOUNT
  useEffect(() => {
    fetchResearchTopics();
  }, []);

  // 3. DELETE LOGIC
  const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this research topic and all associated data?')) return;

    try {
      const { error } = await supabase
        .from('research_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clean up UI
      setResearchTopics(prev => prev.filter(t => t.id !== id));
      if (selectedTopic?.id === id) setSelectedTopic(null);
    } catch (error: any) {
      alert('Delete failed: ' + error.message);
    }
  };

  const handleTopicCreated = (newTopic: ResearchTopic) => {
    setResearchTopics(prev => [newTopic, ...prev]);
    setSelectedTopic(newTopic);
    setShowNewTopicForm(false);
  };

  const handleTopicUpdated = (updatedTopic: ResearchTopic) => {
    setResearchTopics(prev => 
      prev.map(t => t.id === updatedTopic.id ? updatedTopic : t)
    );
    if (selectedTopic?.id === updatedTopic.id) {
      setSelectedTopic(updatedTopic);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold">Research Assistant AI</h1>
          </div>
          <button onClick={() => signOut()} className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">Your Research</h2>
              <button 
                onClick={() => setShowNewTopicForm(true)}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {showNewTopicForm && (
              <ResearchTopicForm 
                onTopicCreated={handleTopicCreated} 
                onCancel={() => setShowNewTopicForm(false)} 
              />
            )}

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : (
              <ResearchTopicList
                topics={researchTopics}
                selectedTopic={selectedTopic}
                onSelectTopic={setSelectedTopic}
                onDeleteTopic={handleDeleteTopic}
              />
            )}
          </div>
        </aside>

        <section className="lg:col-span-2">
          {selectedTopic ? (
            <ResearchResults topic={selectedTopic} onTopicUpdated={handleTopicUpdated} />
          ) : (
            <div className="h-96 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400">
              Select a topic to view analysis
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
