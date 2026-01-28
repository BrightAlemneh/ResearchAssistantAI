import React, { useState } from 'react'; // Added useState for bypass
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Loader2, Bug } from 'lucide-react';
// This must be added to your frontend project
import 'katex/dist/katex.min.css';
function App() {
  const { user, loading } = useAuth();
  const [bypassUser, setBypassUser] = useState<any>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // If we clicked the bypass button OR we are actually logged in, show Dashboard
  if (user || bypassUser) {
    return <Dashboard />;
  }

  return (
    <div className="relative">
      {/* The Actual Auth Screen */}
      <Auth />

      {/* Temporary Debug Button at the bottom right */}
      <button 
        onClick={() => setBypassUser({ email: 'test@example.com' })}
        className="fixed bottom-4 right-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50 transition-all"
      >
        <Bug size={18} />
        Debug: Enter Dashboard
      </button>
    </div>
  );
}

export default App;
