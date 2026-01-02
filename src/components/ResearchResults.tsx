import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, FileText, Lightbulb, FileCheck, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface ResearchTopic {
  id: string;
  topic: string;
  status: string;
  updated_at: string;
}

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  published_date: string;
  source: string;
}

interface Summary {
  id: string;
  content: string;
  created_at: string;
}

interface ResearchGap {
  id: string;
  gap_description: string;
  priority: string;
  created_at: string;
}

interface Proposal {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ResearchResultsProps {
  topic: ResearchTopic;
  onTopicUpdated: (topic: ResearchTopic) => void;
}

export default function ResearchResults({ topic, onTopicUpdated }: ResearchResultsProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'papers' | 'summary' | 'gaps' | 'proposal'>('papers');

  useEffect(() => {
    fetchAllData();
    const subscription = supabase
      .channel(`research_${topic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_topics',
          filter: `id=eq.${topic.id}`,
        },
        (payload) => {
          onTopicUpdated(payload.new as ResearchTopic);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [topic.id]);

  const fetchAllData = async () => {
    try {
      const [papersResult, summaryResult, gapsResult, proposalResult] = await Promise.all([
        supabase.from('papers').select('*').eq('research_topic_id', topic.id),
        supabase.from('summaries').select('*').eq('research_topic_id', topic.id).maybeSingle(),
        supabase.from('research_gaps').select('*').eq('research_topic_id', topic.id),
        supabase.from('proposals').select('*').eq('research_topic_id', topic.id).maybeSingle(),
      ]);

      setPapers(papersResult.data || []);
      setSummary(summaryResult.data);
      setGaps(gapsResult.data || []);
      setProposal(proposalResult.data);
    } catch (error) {
      console.error('Error fetching research data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tabs = [
    { id: 'papers' as const, label: 'Papers', icon: BookOpen, count: papers.length },
    { id: 'summary' as const, label: 'Summary', icon: FileText, count: summary ? 1 : 0 },
    { id: 'gaps' as const, label: 'Research Gaps', icon: Lightbulb, count: gaps.length },
    { id: 'proposal' as const, label: 'Proposal', icon: FileCheck, count: proposal ? 1 : 0 },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading research data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{topic.topic}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                topic.status === 'completed' ? 'bg-green-100 text-green-800' :
                topic.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {topic.status}
              </span>
              {topic.status !== 'completed' && topic.status !== 'failed' && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>
          </div>
          <button
            onClick={fetchAllData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-200' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'papers' && (
          <div className="space-y-4">
            {papers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No papers found yet</p>
                {topic.status !== 'completed' && topic.status !== 'failed' && (
                  <p className="text-sm mt-1">Search in progress...</p>
                )}
              </div>
            ) : (
              papers.map((paper) => (
                <div key={paper.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">{paper.title}</h3>
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {paper.authors.length > 0 && (
                      <p className="mb-1">
                        <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
                      </p>
                    )}
                    {paper.published_date && (
                      <p className="mb-1">
                        <span className="font-medium">Published:</span> {paper.published_date}
                      </p>
                    )}
                    {paper.source && (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {paper.source}
                      </span>
                    )}
                  </div>
                  {paper.abstract && (
                    <p className="text-sm text-gray-700 mt-2">{paper.abstract}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div>
            {!summary ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No summary available yet</p>
                {topic.status !== 'completed' && topic.status !== 'failed' && (
                  <p className="text-sm mt-1">Analysis in progress...</p>
                )}
              </div>
            ) : (
              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-800">{summary.content}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-3">
            {gaps.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No research gaps identified yet</p>
                {topic.status !== 'completed' && topic.status !== 'failed' && (
                  <p className="text-sm mt-1">Analysis in progress...</p>
                )}
              </div>
            ) : (
              gaps.map((gap) => (
                <div key={gap.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(gap.priority)}`}>
                          {gap.priority} priority
                        </span>
                      </div>
                      <p className="text-gray-800">{gap.gap_description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'proposal' && (
          <div>
            {!proposal ? (
              <div className="text-center py-12 text-gray-500">
                <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No proposal available yet</p>
                {topic.status !== 'completed' && topic.status !== 'failed' && (
                  <p className="text-sm mt-1">Generation in progress...</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{proposal.title}</h3>
                </div>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="whitespace-pre-wrap text-gray-800">{proposal.content}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
