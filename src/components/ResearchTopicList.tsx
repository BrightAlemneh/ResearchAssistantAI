import { Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ResearchTopic {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

interface ResearchTopicListProps {
  topics: ResearchTopic[];
  selectedTopic: ResearchTopic | null;
  onSelectTopic: (topic: ResearchTopic) => void;
}

export default function ResearchTopicList({
  topics,
  selectedTopic,
  onSelectTopic,
}: ResearchTopicListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'searching':
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'searching':
        return 'Finding papers';
      case 'analyzing':
        return 'Analyzing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (topics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No research topics yet</p>
        <p className="text-xs mt-1">Create one to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
      {topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onSelectTopic(topic)}
          className={`w-full text-left p-3 rounded-lg border transition ${
            selectedTopic?.id === topic.id
              ? 'bg-blue-50 border-blue-300'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
              {topic.topic}
            </p>
            {getStatusIcon(topic.status)}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{getStatusText(topic.status)}</span>
            <span>{new Date(topic.created_at).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
