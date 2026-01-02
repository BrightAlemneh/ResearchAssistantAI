/*
  # Research Assistant AI Schema

  ## Overview
  Complete database schema for the Autonomous Research Assistant AI Agent that enables users to:
  - Submit research topics
  - Store and track found academic papers
  - Save AI-generated summaries
  - Identify research gaps
  - Generate proposal outlines

  ## New Tables

  ### `research_topics`
  Main table for research queries submitted by users
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `topic` (text) - The research topic/query
  - `status` (text) - Current status: pending, searching, analyzing, completed, failed
  - `created_at` (timestamptz) - When topic was submitted
  - `updated_at` (timestamptz) - Last update timestamp

  ### `papers`
  Stores academic papers found for each research topic
  - `id` (uuid, primary key) - Unique identifier
  - `research_topic_id` (uuid, foreign key) - Links to research_topics
  - `title` (text) - Paper title
  - `authors` (text[]) - Array of author names
  - `abstract` (text) - Paper abstract
  - `url` (text) - Link to the paper
  - `published_date` (text) - Publication date
  - `source` (text) - Source (arXiv, PubMed, etc.)
  - `created_at` (timestamptz) - When paper was added

  ### `summaries`
  AI-generated summaries for each research topic
  - `id` (uuid, primary key) - Unique identifier
  - `research_topic_id` (uuid, foreign key) - Links to research_topics
  - `content` (text) - The summary content
  - `created_at` (timestamptz) - When summary was generated

  ### `research_gaps`
  Identified gaps in current research
  - `id` (uuid, primary key) - Unique identifier
  - `research_topic_id` (uuid, foreign key) - Links to research_topics
  - `gap_description` (text) - Description of the research gap
  - `priority` (text) - Priority level: high, medium, low
  - `created_at` (timestamptz) - When gap was identified

  ### `proposals`
  Generated research proposal outlines
  - `id` (uuid, primary key) - Unique identifier
  - `research_topic_id` (uuid, foreign key) - Links to research_topics
  - `title` (text) - Proposal title
  - `content` (text) - Full proposal outline content
  - `created_at` (timestamptz) - When proposal was generated

  ## Security
  - Enable RLS on all tables
  - Users can only access their own research topics and related data
  - Authenticated users can create new research topics
  - Users can read, update, and delete only their own data
*/

-- Create research_topics table
CREATE TABLE IF NOT EXISTS research_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id uuid REFERENCES research_topics(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  authors text[] DEFAULT '{}' NOT NULL,
  abstract text DEFAULT '' NOT NULL,
  url text DEFAULT '' NOT NULL,
  published_date text DEFAULT '' NOT NULL,
  source text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id uuid REFERENCES research_topics(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create research_gaps table
CREATE TABLE IF NOT EXISTS research_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id uuid REFERENCES research_topics(id) ON DELETE CASCADE NOT NULL,
  gap_description text NOT NULL,
  priority text DEFAULT 'medium' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id uuid REFERENCES research_topics(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_papers_research_topic_id ON papers(research_topic_id);
CREATE INDEX IF NOT EXISTS idx_summaries_research_topic_id ON summaries(research_topic_id);
CREATE INDEX IF NOT EXISTS idx_research_gaps_research_topic_id ON research_gaps(research_topic_id);
CREATE INDEX IF NOT EXISTS idx_proposals_research_topic_id ON proposals(research_topic_id);
CREATE INDEX IF NOT EXISTS idx_research_topics_user_id ON research_topics(user_id);

-- Enable Row Level Security
ALTER TABLE research_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_topics
CREATE POLICY "Users can view own research topics"
  ON research_topics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research topics"
  ON research_topics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research topics"
  ON research_topics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own research topics"
  ON research_topics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for papers
CREATE POLICY "Users can view papers for own research topics"
  ON papers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = papers.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert papers for own research topics"
  ON papers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = papers.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete papers for own research topics"
  ON papers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = papers.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

-- RLS Policies for summaries
CREATE POLICY "Users can view summaries for own research topics"
  ON summaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = summaries.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert summaries for own research topics"
  ON summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = summaries.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

-- RLS Policies for research_gaps
CREATE POLICY "Users can view gaps for own research topics"
  ON research_gaps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = research_gaps.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gaps for own research topics"
  ON research_gaps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = research_gaps.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

-- RLS Policies for proposals
CREATE POLICY "Users can view proposals for own research topics"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = proposals.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert proposals for own research topics"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_topics
      WHERE research_topics.id = proposals.research_topic_id
      AND research_topics.user_id = auth.uid()
    )
  );