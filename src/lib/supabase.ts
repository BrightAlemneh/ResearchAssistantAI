import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Add this at the very top of supabase.ts
if (typeof process === 'undefined') {
  window.process = { env: {} } as any;
}
export type Database = {
  public: {
    Tables: {
      research_topics: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      papers: {
        Row: {
          id: string;
          research_topic_id: string;
          title: string;
          authors: string[];
          abstract: string;
          url: string;
          published_date: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_topic_id: string;
          title: string;
          authors?: string[];
          abstract?: string;
          url?: string;
          published_date?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          research_topic_id?: string;
          title?: string;
          authors?: string[];
          abstract?: string;
          url?: string;
          published_date?: string;
          source?: string;
          created_at?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          research_topic_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_topic_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          research_topic_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      research_gaps: {
        Row: {
          id: string;
          research_topic_id: string;
          gap_description: string;
          priority: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_topic_id: string;
          gap_description: string;
          priority?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          research_topic_id?: string;
          gap_description?: string;
          priority?: string;
          created_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          research_topic_id: string;
          title: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_topic_id: string;
          title: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          research_topic_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
  };
};
