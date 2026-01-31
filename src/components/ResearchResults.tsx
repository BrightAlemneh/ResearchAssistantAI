import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, FileText, Lightbulb, FileCheck, ExternalLink, Loader2, RefreshCw, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

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

// Map technical statuses to user-friendly display text
const statusMap: Record<string, string> = {
  'SEARCHING': 'Finding Latest Papers...',
  'REVIEWING': 'Reading Full PDF Manuscripts...',
  'REVIEWING_FULL_TEXT': 'Analyzing Methodologies...',
  'ANALYZING_GAPS': 'Spotting Technical Gaps...',
  'WRITING_PROPOSAL': 'Drafting Formal Proposal...',
  'CRITIC_REVIEW': 'Academic Peer Review in Progress...',
  'completed': 'Research Completed',
  'failed': 'Process Interrupted'
};

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
        { event: '*', schema: 'public', table: 'research_topics', filter: `id=eq.${topic.id}` },
        (payload) => { onTopicUpdated(payload.new as ResearchTopic); }
      )
      .subscribe();

    const interval = setInterval(() => { fetchAllData(); }, 5000);
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

  const handleDownloadPDF = () => {
    const element = document.getElementById('academic-proposal-document');
    if (!element) return;

    const opt = {
      margin: [0.75, 0.75, 0.75, 0.75],
      filename: `${topic.topic.replace(/\s+/g, '_')}_Proposal.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading research data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <style>{`
        .prose h1 { font-size: 2rem; font-weight: 800; color: #1e3a8a; margin-top: 1.5rem; margin-bottom: 1rem; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
        .prose h2 { font-size: 1.5rem; font-weight: 700; color: #1e40af; margin-top: 2rem; margin-bottom: 0.75rem; border-left: 4px solid #1e40af; padding-left: 10px; }
        .prose h3 { font-size: 1.25rem; font-weight: 600; color: #1e3a8a; margin-top: 1.5rem; }
        .prose p { margin-bottom: 1.25rem; line-height: 1.8; color: #1f2937; text-align: justify; }
        .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; }
        .prose li { margin-bottom: 0.5rem; }
        .academic-paper { font-family: 'Times New Roman', Times, serif; background-color: white; }
      `}</style>

      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{topic.topic}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-2 ${
                topic.status === 'completed' ? 'bg-green-100 text-green-800' :
                topic.status === 'failed' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800 animate-pulse'
              }`}>
                {topic.status !== 'completed' && topic.status !== 'failed' && (
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                )}
                {statusMap[topic.status] || topic.status}
              </span>
            </div>
          </div>
          <button onClick={fetchAllData} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-200' : 'bg-gray-200'}`}>
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
            {papers.map((paper) => (
              <div key={paper.id} className="border border-gray-200 rounded-lg p-4 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">{paper.title}</h3>
                  {paper.url && <a href={paper.url} target="_blank" rel="noopener" className="text-blue-600"><ExternalLink className="w-5 h-5" /></a>}
                </div>
                <p className="text-sm text-gray-600 mt-1 italic">{paper.authors.join(', ')} • {paper.published_date}</p>
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">{paper.abstract}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-gray-50 rounded-lg p-8 border prose max-w-none">
            {summary ? <ReactMarkdown>{summary.content}</ReactMarkdown> : <p>Analyzing literature...</p>}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-4">
            {gaps.map((gap) => (
              <div key={gap.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm border-l-4 border-l-blue-600">
                <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(gap.priority)} mb-3 inline-block font-bold`}>
                  {gap.priority.toUpperCase()} PRIORITY
                </span>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{gap.gap_description}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'proposal' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 transition shadow-md font-semibold"
              >
                <Download className="w-4 h-4" />
                Download Formal Proposal (.PDF)
              </button>
            </div>

            <div id="academic-proposal-document" className="bg-white border p-12 md:p-20 shadow-lg academic-paper prose max-w-none">
              {proposal ? (
                <ReactMarkdown>{proposal.content}</ReactMarkdown>
              ) : (
                <div className="text-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-500">{statusMap[topic.status] || 'Drafting formal research proposal...'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
