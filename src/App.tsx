function App() {
  const { user, loading } = useAuth();
  
  // ADD THIS LOG
  console.log("Current Auth State:", { user, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}
