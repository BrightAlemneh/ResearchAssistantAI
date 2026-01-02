import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Send, X } from 'lucide-react';

interface ResearchTopicFormProps {
  onTopicCreated: (topic: any) => void;
  onCancel: () => void;
}

export default function ResearchTopicForm({ onTopicCreated, onCancel }: ResearchTopicFormProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topic.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('research_topics')
        .insert([
          {
            user_id: user.id,
            topic: topic.trim(),
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      onTopicCreated(data);
      setTopic('');
      startResearchWorkflow(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create research topic');
    } finally {
      setLoading(false);
    }
  };

  const startResearchWorkflow = async (topicId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-workflow`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topicId }),
        }
      );

      if (!response.ok) {
        console.error('Failed to start research workflow');
      }
    } catch (err) {
      console.error('Error starting research workflow:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3">
      <div>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your research topic (e.g., 'Machine learning applications in healthcare')"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          rows={3}
          required
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Start Research
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
