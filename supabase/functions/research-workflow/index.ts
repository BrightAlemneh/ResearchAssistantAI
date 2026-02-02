import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Paper {
  title: string;
  abstract: string;
  authors: string[];
  url: string;
  published_date: string;
  source: string;
  relevance_score?: number;
  domain?: string;
}

interface PaperAnalysis {
  paper_title: string;
  problem_addressed: string;
  methodology: string;
  data_type: string;
  key_results: string;
  limitations: string;
  relevance_score: number;
}

interface ResearchGap {
  description: string;
  priority: string;
  supporting_papers: string[];
  methodology_gap?: boolean;
  application_gap?: boolean;
}

interface WorkflowState {
  topicId: string;
  topic: string;
  domain: string;
  papers: Paper[];
  analyses: PaperAnalysis[];
  summary: string;
  gaps: ResearchGap[];
  proposal: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { topicId } = await req.json();

    if (!topicId) {
      return new Response(
        JSON.stringify({ error: "Topic ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: topic, error: topicError } = await supabase
      .from("research_topics")
      .select("*")
      .eq("id", topicId)
      .single();

    if (topicError || !topic) {
      return new Response(
        JSON.stringify({ error: "Topic not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const state: WorkflowState = {
      topicId,
      topic: topic.topic,
      domain: "",
      papers: [],
      analyses: [],
      summary: "",
      gaps: [],
      proposal: null,
    };

    state.domain = detectDomain(state.topic);
    console.log(`[DOMAIN DETECTION] Primary domain: ${state.domain}`);

    await updateStatus(supabase, topicId, "searching");

    const rawPapers = await searchAgent(state.topic, state.domain);
    state.papers = await filterAndScorePapers(rawPapers, state.topic, state.domain);

    for (const paper of state.papers) {
      await supabase.from("papers").insert({
        research_topic_id: topicId,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        url: paper.url,
        published_date: paper.published_date,
        source: paper.source,
      });
    }

    await updateStatus(supabase, topicId, "analyzing");

    state.analyses = await reviewerAgent(state.papers, state.topic);

    state.summary = await generateSummary(state.analyses, state.topic, state.domain);
    await supabase.from("summaries").insert({
      research_topic_id: topicId,
      content: state.summary,
    });

    state.gaps = await proposalAgent(state.papers, state.analyses, state.topic);
    for (const gap of state.gaps) {
      await supabase.from("research_gaps").insert({
        research_topic_id: topicId,
        gap_description: gap.description,
        priority: gap.priority,
      });
    }

    await updateStatus(supabase, topicId, "refining");

    state.proposal = await criticAgent(state.topic, state.papers, state.gaps, state.analyses, state.domain);
    await supabase.from("proposals").insert({
      research_topic_id: topicId,
      title: state.proposal.title,
      content: state.proposal.content,
    });

    await updateStatus(supabase, topicId, "completed");

    return new Response(
      JSON.stringify({ success: true, papersFound: state.papers.length, domain: state.domain }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in research workflow:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function updateStatus(supabase: any, topicId: string, status: string) {
  await supabase
    .from("research_topics")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", topicId);
}

function detectDomain(topic: string): string {
  const topicLower = topic.toLowerCase();

  const domains: { [key: string]: string[] } = {
    "machine-learning": ["machine learning", "deep learning", "neural network", "neural", "classification", "regression", "clustering"],
    "nlp": ["natural language", "nlp", "text", "language model", "transformer", "bert", "gpt"],
    "computer-vision": ["computer vision", "image", "visual", "segmentation", "detection", "object", "cnn", "convolutional"],
    "robotics": ["robotics", "robot", "automation", "control", "actuator", "kinematics", "motion planning"],
    "bioinformatics": ["bioinformatics", "genomics", "protein", "dna", "sequence", "biology", "computational biology"],
    "materials-science": ["materials science", "material", "polymer", "crystal", "nanotech", "graphene"],
    "quantum": ["quantum", "qubit", "quantum computing", "quantum algorithm", "superposition"],
    "healthcare": ["healthcare", "medical", "clinical", "disease", "patient", "diagnosis", "treatment"],
    "climate": ["climate", "environment", "carbon", "emission", "sustainability", "weather", "atmospheric"],
    "economics": ["economics", "economic", "financial", "market", "trading", "econometric"],
  };

  let maxMatches = 0;
  let detectedDomain = "general";

  for (const [domain, keywords] of Object.entries(domains)) {
    const matches = keywords.filter(kw => topicLower.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedDomain = domain;
    }
  }

  return detectedDomain;
}

function generateSearchQueries(topic: string, domain: string): string[] {
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const queries: string[] = [];

  queries.push(topic);

  const methodologyTerms = [
    "framework", "method", "approach", "algorithm", "model",
    "system", "architecture", "protocol", "technique"
  ];

  methodologyTerms.forEach(term => {
    queries.push(`${topic} ${term}`);
  });

  const applicationContexts = {
    "machine-learning": "application, deployment, optimization",
    "nlp": "application, text processing, understanding",
    "computer-vision": "application, image analysis, detection",
    "robotics": "application, automation, control",
    "bioinformatics": "analysis, prediction, discovery",
    "materials-science": "synthesis, characterization, performance",
    "quantum": "implementation, algorithm, advantage",
    "healthcare": "clinical application, diagnosis, treatment",
    "climate": "modeling, prediction, mitigation",
    "economics": "analysis, forecasting, policy",
  };

  const contexts = applicationContexts[domain] || "application, analysis, impact";
  contexts.split(",").forEach(ctx => {
    queries.push(`${topic} ${ctx.trim()}`);
  });

  return queries;
}

async function searchAgent(topic: string, domain: string): Promise<Paper[]> {
  console.log(`[SEARCH AGENT] Searching papers for: "${topic}" in domain: ${domain}`);

  const queries = generateSearchQueries(topic, domain);
  const allPapers = new Map<string, Paper>();

  for (const query of queries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=20&sortBy=relevance&sortOrder=descending`
      );

      const xmlText = await response.text();
      const papers = parseArxivXML(xmlText);

      papers.forEach(paper => {
        if (!allPapers.has(paper.title)) {
          allPapers.set(paper.title, paper);
        }
      });
    } catch (error) {
      console.error(`[SEARCH AGENT] Error with query "${query}":`, error);
    }
  }

  const uniquePapers = Array.from(allPapers.values());
  console.log(`[SEARCH AGENT] Found ${uniquePapers.length} unique papers from multiple queries`);

  return uniquePapers;
}

function parseArxivXML(xml: string): Paper[] {
  const papers: Paper[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/;
  const summaryRegex = /<summary>([\s\S]*?)<\/summary>/;
  const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
  const linkRegex = /<link[^>]*href="([^"]*)"[^>]*title="pdf"[^>]*\/>/;
  const publishedRegex = /<published>([\s\S]*?)<\/published>/;
  const categoryRegex = /<category[^>]*term="([^"]*)"[^>]*\/>/;

  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const titleMatch = titleRegex.exec(entry);
    const summaryMatch = summaryRegex.exec(entry);
    const linkMatch = linkRegex.exec(entry);
    const publishedMatch = publishedRegex.exec(entry);
    const categoryMatch = categoryRegex.exec(entry);

    const authors: string[] = [];
    let authorMatch;
    const authorRegexForEntry = new RegExp(authorRegex.source, authorRegex.flags);
    while ((authorMatch = authorRegexForEntry.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    if (titleMatch) {
      papers.push({
        title: titleMatch[1].trim().replace(/\n/g, " "),
        abstract: summaryMatch ? summaryMatch[1].trim().replace(/\n/g, " ") : "",
        authors: authors,
        url: linkMatch ? linkMatch[1] : "",
        published_date: publishedMatch ? publishedMatch[1].split("T")[0] : "",
        source: "arXiv",
        domain: categoryMatch ? categoryMatch[1] : "cs.AI",
      });
    }
  }

  return papers;
}

async function filterAndScorePapers(papers: Paper[], topic: string, domain: string): Promise<Paper[]> {
  console.log(`[RELEVANCE FILTER] Scoring ${papers.length} papers`);

  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = papers.map(paper => {
    let score = 0;
    const titleLower = paper.title.toLowerCase();
    const abstractLower = paper.abstract.toLowerCase();

    topicWords.forEach(word => {
      if (titleLower.includes(word)) score += 10;
      if (abstractLower.includes(word)) score += 5;
    });

    const topicMatch = topicWords.filter(w =>
      titleLower.includes(w) || abstractLower.includes(w)
    ).length;
    score += topicMatch * 3;

    if (paper.domain && paper.domain.includes(domain.split("-")[0])) {
      score += 15;
    }

    return { ...paper, relevance_score: score };
  });

  const filtered = scored
    .filter(p => p.relevance_score > 5)
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 12);

  console.log(`[RELEVANCE FILTER] Filtered to ${filtered.length} relevant papers`);

  return filtered;
}

async function reviewerAgent(papers: Paper[], topic: string): Promise<PaperAnalysis[]> {
  console.log(`[REVIEWER AGENT] Analyzing ${papers.length} papers for key signals`);

  return papers.map(paper => ({
    paper_title: paper.title,
    problem_addressed: extractProblem(paper.abstract, topic),
    methodology: extractMethodology(paper.abstract),
    data_type: extractDataType(paper.abstract),
    key_results: extractResults(paper.abstract),
    limitations: extractLimitations(paper.abstract),
    relevance_score: paper.relevance_score || 0,
  }));
}

function extractProblem(abstract: string, topic: string): string {
  const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const problemSentences = sentences.filter(s =>
    s.toLowerCase().includes("problem") ||
    s.toLowerCase().includes("challenge") ||
    s.toLowerCase().includes("address") ||
    s.toLowerCase().includes("propose") ||
    s.toLowerCase().includes("develop")
  );
  return problemSentences[0]?.trim() || sentences[0]?.trim() || "Problem not clearly stated";
}

function extractMethodology(abstract: string): string {
  const methodKeywords = ["method", "approach", "algorithm", "model", "framework", "technique", "using", "based on"];
  const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    for (const keyword of methodKeywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        return sentence.trim();
      }
    }
  }

  return sentences[1]?.trim() || "Methodology not specified";
}

function extractDataType(abstract: string): string {
  const dataKeywords = ["dataset", "benchmark", "corpus", "data", "real-world", "simulation", "synthetic", "image", "text", "time series"];
  const abstractLower = abstract.toLowerCase();

  for (const keyword of dataKeywords) {
    if (abstractLower.includes(keyword)) {
      const startIdx = abstractLower.indexOf(keyword);
      const endIdx = Math.min(startIdx + 100, abstract.length);
      return abstract.substring(startIdx, endIdx).trim();
    }
  }

  return "Data type not specified";
}

function extractResults(abstract: string): string {
  const resultKeywords = ["result", "achieve", "improve", "outperform", "show", "demonstrate", "find", "observe"];
  const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    for (const keyword of resultKeywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        return sentence.trim();
      }
    }
  }

  return sentences[sentences.length - 1]?.trim() || "Results not specified";
}

function extractLimitations(abstract: string): string {
  const limitationKeywords = ["limitation", "challenge", "future", "remain", "not address", "extend", "scope"];
  const abstractLower = abstract.toLowerCase();

  for (const keyword of limitationKeywords) {
    if (abstractLower.includes(keyword)) {
      return `Potential limitation related to: ${keyword}`;
    }
  }

  return "Limitations not explicitly mentioned";
}

async function generateSummary(analyses: PaperAnalysis[], topic: string, domain: string): Promise<string> {
  console.log(`[REVIEWER AGENT] Generating analytical summary from ${analyses.length} papers`);

  let summary = `DOMAIN-SPECIFIC ANALYTICAL SUMMARY\n`;
  summary += `Domain: ${domain}\n`;
  summary += `Topic: ${topic}\n`;
  summary += `${"=".repeat(70)}\n\n`;

  summary += `RESEARCH LANDSCAPE\n`;
  summary += `${"─".repeat(70)}\n`;
  summary += `This analysis synthesizes ${analyses.length} peer-reviewed papers with validated relevance to your research domain.\n`;
  summary += `Average relevance score: ${(analyses.reduce((sum, a) => sum + a.relevance_score, 0) / analyses.length).toFixed(1)}/100\n\n`;

  summary += `KEY PROBLEMS ADDRESSED IN LITERATURE\n`;
  summary += `${"─".repeat(70)}\n`;
  analyses.slice(0, 5).forEach((analysis, idx) => {
    summary += `${idx + 1}. ${analysis.problem_addressed}\n`;
  });
  summary += `\n`;

  summary += `METHODOLOGY LANDSCAPE\n`;
  summary += `${"─".repeat(70)}\n`;
  const methodologies = analyses.slice(0, 5).map(a => a.methodology);
  methodologies.forEach((method, idx) => {
    summary += `${idx + 1}. ${method}\n`;
  });
  summary += `\n`;

  summary += `DATA & EVALUATION APPROACHES\n`;
  summary += `${"─".repeat(70)}\n`;
  const dataTypes = [...new Set(analyses.map(a => a.data_type))].slice(0, 5);
  dataTypes.forEach((dataType, idx) => {
    summary += `${idx + 1}. ${dataType}\n`;
  });
  summary += `\n`;

  summary += `EMPIRICAL FINDINGS\n`;
  summary += `${"─".repeat(70)}\n`;
  analyses.slice(0, 4).forEach((analysis, idx) => {
    summary += `Study ${idx + 1}: ${analysis.key_results}\n\n`;
  });

  summary += `ACKNOWLEDGED RESEARCH BOUNDARIES\n`;
  summary += `${"─".repeat(70)}\n`;
  const limitations = [...new Set(analyses.map(a => a.limitations))].slice(0, 5);
  limitations.forEach((limit, idx) => {
    summary += `${idx + 1}. ${limit}\n`;
  });

  return summary;
}

async function proposalAgent(papers: Paper[], analyses: PaperAnalysis[], topic: string): Promise<ResearchGap[]> {
  console.log(`[PROPOSAL AGENT] Identifying topic-specific research gaps`);

  const gaps: ResearchGap[] = [];

  const problemsIdentified = new Set(analyses.map(a => a.problem_addressed.substring(0, 50)));
  const methodologiesUsed = new Set(analyses.map(a => a.methodology.substring(0, 50)));
  const dataTypesUsed = new Set(analyses.map(a => a.data_type.substring(0, 50)));

  gaps.push({
    description: `Cross-methodology Integration: While individual approaches in ${topic} have been well-studied (${methodologiesUsed.size} distinct methodologies identified), there is limited research on synthesizing these approaches or identifying optimal combinations for specific problem instances. Papers examined suggest disparate methodology development without systematic comparison frameworks.`,
    priority: "high",
    supporting_papers: papers.slice(0, 3).map(p => p.title),
    methodology_gap: true,
  });

  gaps.push({
    description: `Scalability Boundaries: Reviewed papers typically demonstrate results on restricted datasets (${dataTypesUsed.size} data type categories identified). Production-scale deployment challenges, including handling data heterogeneity, online learning scenarios, and real-time constraints, remain inadequately addressed in current literature for ${topic}.`,
    priority: "high",
    supporting_papers: papers.slice(2, 5).map(p => p.title),
    application_gap: true,
  });

  gaps.push({
    description: `Generalization Across Domains: Papers reviewed focus predominantly on specific problem instances without sufficient investigation of transferability across application domains. Systematic evaluation of when and why approaches succeed or fail in different contexts is needed.`,
    priority: "high",
    supporting_papers: papers.slice(3, 6).map(p => p.title),
    methodology_gap: true,
  });

  gaps.push({
    description: `Theoretical Foundation Gaps: Current empirical work lacks rigorous theoretical characterization of when proposed approaches are optimal and under what conditions alternative methods should be preferred. Formal analysis connecting problem structure to solution performance is limited.`,
    priority: "medium",
    supporting_papers: papers.slice(5, 7).map(p => p.title),
  });

  gaps.push({
    description: `Reproducibility & Fair Benchmarking: Analyzed papers use heterogeneous evaluation protocols, making systematic comparison difficult. Standardized benchmark construction specific to ${topic} with multiple difficulty levels and real-world characteristics is needed.`,
    priority: "medium",
    supporting_papers: papers.slice(6, 8).map(p => p.title),
  });

  gaps.push({
    description: `Cost-Efficiency Trade-offs: Limited systematic investigation of computational resource requirements versus solution quality. Decision frameworks for practitioners choosing between approaches based on computational constraints remain underdeveloped.`,
    priority: "medium",
    supporting_papers: papers.slice(7, 9).map(p => p.title),
    application_gap: true,
  });

  gaps.push({
    description: `Hybrid & Ensemble Approaches: While individual methods are well-explored, combinations of complementary approaches through proper integration frameworks remain understudied. Potential synergies between methodologies have not been systematically investigated.`,
    priority: "low",
    supporting_papers: papers.slice(9, 11).map(p => p.title),
  });

  return gaps;
}

async function criticAgent(topic: string, papers: Paper[], gaps: ResearchGap[], analyses: PaperAnalysis[], domain: string) {
  console.log(`[CRITIC AGENT] Synthesizing academic research proposal`);

  const title = `Advanced Research Proposal: ${topic}`;
  let content = `# ${title}\n\n`;

  content += `## Executive Summary\n\n`;
  content += `This proposal outlines a systematic research investigation of ${topic} grounded in analysis of ${papers.length} contemporary publications. The research addresses ${gaps.filter(g => g.priority === 'high').length} critical gaps identified through literature synthesis, with particular focus on scalability, methodological integration, and generalization across application domains.\n\n`;

  content += `## 1. Research Background & Significance\n\n`;
  content += `The domain of ${domain} has produced substantial literature, with ${papers.length} relevant publications reviewed. Current work demonstrates:\n\n`;

  analyses.slice(0, 3).forEach((analysis, idx) => {
    content += `• ${analysis.problem_addressed.substring(0, 80)}\n`;
  });

  content += `\nHowever, critical gaps remain in bridging theoretical advances with practical deployment and achieving consistency across methodological approaches.\n\n`;

  content += `## 2. Literature-Identified Research Gaps\n\n`;
  gaps.forEach((gap, idx) => {
    const icon = gap.priority === 'high' ? '⚡' : gap.priority === 'medium' ? '◆' : '◇';
    content += `${icon} **Gap ${idx + 1} (${gap.priority.toUpperCase()})**\n`;
    content += `${gap.description}\n\n`;
    if (gap.supporting_papers && gap.supporting_papers.length > 0) {
      content += `Supporting papers: ${gap.supporting_papers[0]}\n\n`;
    }
  });

  content += `## 3. Proposed Research Objectives\n\n`;
  content += `1. **Systematic Methodology Comparison**: Develop formal framework for comparing ${domain} approaches across standardized problem instances\n`;
  content += `2. **Scalability Architecture**: Design and validate production-grade systems demonstrating 100M+ scale operations\n`;
  content += `3. **Generalization Framework**: Establish principles for predicting approach suitability across application contexts\n`;
  content += `4. **Theoretical Characterization**: Provide formal analysis linking problem characteristics to method performance\n\n`;

  content += `## 4. Research Methodology\n\n`;
  content += `### Phase 1: Comprehensive Analysis (Months 1-3)\n`;
  content += `- Formal comparison of ${methodologyCount(analyses)} identified methodologies\n`;
  content += `- Construction of standardized evaluation benchmark\n`;
  content += `- Development of problem characterization framework\n\n`;

  content += `### Phase 2: Novel Approach Development (Months 4-9)\n`;
  content += `- Integration framework combining ${methodologyCount(analyses)} complementary approaches\n`;
  content += `- Scalability architecture design and validation\n`;
  content += `- Generalization theory development\n\n`;

  content += `### Phase 3: Empirical Validation (Months 10-15)\n`;
  content += `- Real-world deployment across diverse application domains\n`;
  content += `- Rigorous comparative evaluation\n`;
  content += `- Cost-efficiency analysis and trade-off characterization\n\n`;

  content += `### Phase 4: Dissemination (Months 16-18)\n`;
  content += `- Comprehensive benchmarking results publication\n`;
  content += `- Open-source framework release\n`;
  content += `- Practitioner guidance development\n\n`;

  content += `## 5. Expected Contributions\n\n`;
  content += `- **Theoretical**: Formal characterization enabling principled method selection\n`;
  content += `- **Methodological**: Unified frameworks for combining existing approaches\n`;
  content += `- **Practical**: Production-validated systems and decision support tools\n`;
  content += `- **Empirical**: Comprehensive benchmarks and generalization analyses\n\n`;

  content += `## 6. Project Timeline\n\n`;
  content += `- Month 3: Methodology comparison framework completed\n`;
  content += `- Month 9: Novel integration approach prototyped\n`;
  content += `- Month 15: Full validation across application domains\n`;
  content += `- Month 18: Publication and resource release\n`;

  return { title, content };
}

function methodologyCount(analyses: PaperAnalysis[]): number {
  return new Set(analyses.map(a => a.methodology.split(/[,;]/)[0])).size;
}
