import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ResearchAssistantAI/',
  plugins: [react()],
  // Add this block below
  define: {
    'process.env': {} 
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
