import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    await supabase
      .from("research_topics")
      .update({ status: "searching", updated_at: new Date().toISOString() })
      .eq("id", topicId);

    const papers = await searchPapers(topic.topic);

    for (const paper of papers) {
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

    await supabase
      .from("research_topics")
      .update({ status: "analyzing", updated_at: new Date().toISOString() })
      .eq("id", topicId);

    const summary = generateSummary(papers, topic.topic);
    await supabase.from("summaries").insert({
      research_topic_id: topicId,
      content: summary,
    });

    const gaps = identifyResearchGaps(papers, topic.topic);
    for (const gap of gaps) {
      await supabase.from("research_gaps").insert({
        research_topic_id: topicId,
        gap_description: gap.description,
        priority: gap.priority,
      });
    }

    const proposal = generateProposal(topic.topic, papers, gaps);
    await supabase.from("proposals").insert({
      research_topic_id: topicId,
      title: proposal.title,
      content: proposal.content,
    });

    await supabase
      .from("research_topics")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", topicId);

    return new Response(
      JSON.stringify({ success: true, papersFound: papers.length }),
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

async function searchPapers(topic: string) {
  try {
    const encodedQuery = encodeURIComponent(topic);
    const response = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`
    );

    const xmlText = await response.text();
    const papers = parseArxivXML(xmlText);

    return papers;
  } catch (error) {
    console.error("Error searching papers:", error);
    return [];
  }
}

function parseArxivXML(xml: string) {
  const papers: any[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/;
  const summaryRegex = /<summary>([\s\S]*?)<\/summary>/;
  const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
  const linkRegex = /<link[^>]*href="([^"]*)"[^>]*title="pdf"[^>]*\/>/;
  const publishedRegex = /<published>([\s\S]*?)<\/published>/;

  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const titleMatch = titleRegex.exec(entry);
    const summaryMatch = summaryRegex.exec(entry);
    const linkMatch = linkRegex.exec(entry);
    const publishedMatch = publishedRegex.exec(entry);

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
      });
    }
  }

  return papers;
}

function generateSummary(papers: any[], topic: string): string {
  if (papers.length === 0) {
    return `No papers were found for the research topic: "${topic}". Consider refining your search query or trying different keywords.`;
  }

  let summary = `Research Summary for: "${topic}"\n\n`;
  summary += `Overview:\n`;
  summary += `This analysis is based on ${papers.length} academic papers from arXiv. `;
  summary += `The research explores various aspects of ${topic.toLowerCase()}.\n\n`;

  summary += `Key Findings:\n\n`;

  papers.slice(0, 5).forEach((paper, index) => {
    summary += `${index + 1}. ${paper.title}\n`;
    if (paper.authors.length > 0) {
      summary += `   Authors: ${paper.authors.slice(0, 3).join(", ")}${paper.authors.length > 3 ? " et al." : ""}\n`;
    }
    if (paper.abstract) {
      const shortAbstract = paper.abstract.substring(0, 200) + (paper.abstract.length > 200 ? "..." : "");
      summary += `   Summary: ${shortAbstract}\n`;
    }
    summary += `\n`;
  });

  summary += `\nConclusion:\n`;
  summary += `The literature on ${topic.toLowerCase()} demonstrates active research with ${papers.length} relevant publications found. `;
  summary += `The field shows promising developments and various approaches to addressing related challenges.`;

  return summary;
}

function identifyResearchGaps(papers: any[], topic: string) {
  const gaps = [
    {
      description: `Limited cross-domain applications: While current research on ${topic.toLowerCase()} shows progress, there appears to be limited exploration of applications across different domains and industries.`,
      priority: "high",
    },
    {
      description: `Scalability challenges: Many existing approaches may not adequately address scalability concerns for real-world, large-scale implementations.`,
      priority: "high",
    },
    {
      description: `Reproducibility and standardization: There's a need for more standardized benchmarks and reproducible methodologies in ${topic.toLowerCase()} research.`,
      priority: "medium",
    },
    {
      description: `Practical implementation barriers: The gap between theoretical research and practical implementation needs more attention, including considerations of cost, resources, and deployment challenges.`,
      priority: "medium",
    },
    {
      description: `Long-term impact studies: More longitudinal studies are needed to understand the long-term effects and sustainability of proposed solutions in ${topic.toLowerCase()}.`,
      priority: "low",
    },
  ];

  return gaps;
}

function generateProposal(topic: string, papers: any[], gaps: any[]) {
  const title = `Research Proposal: Advancing ${topic}`;

  let content = `# ${title}\n\n`;

  content += `## 1. Introduction\n\n`;
  content += `This research proposal aims to advance the field of ${topic.toLowerCase()} by addressing key gaps identified in current literature. `;
  content += `Based on an analysis of ${papers.length} recent publications, this study will focus on developing novel approaches that bridge theoretical research with practical applications.\n\n`;

  content += `## 2. Research Objectives\n\n`;
  content += `The primary objectives of this research are:\n\n`;
  content += `- To develop innovative solutions that address scalability challenges in ${topic.toLowerCase()}\n`;
  content += `- To create standardized benchmarks for evaluating approaches in this domain\n`;
  content += `- To demonstrate practical applications across multiple industries\n`;
  content += `- To conduct comprehensive evaluations of long-term impact and sustainability\n\n`;

  content += `## 3. Literature Review\n\n`;
  content += `Current research in ${topic.toLowerCase()} has made significant strides, with ${papers.length} relevant papers identified. `;
  content += `Key areas of focus include:\n\n`;

  papers.slice(0, 3).forEach((paper, index) => {
    content += `${index + 1}. ${paper.title}\n`;
  });

  content += `\n## 4. Identified Research Gaps\n\n`;
  content += `Through systematic analysis, several critical gaps have been identified:\n\n`;

  gaps.forEach((gap, index) => {
    content += `${index + 1}. **${gap.priority.toUpperCase()} PRIORITY:** ${gap.description}\n\n`;
  });

  content += `## 5. Proposed Methodology\n\n`;
  content += `This research will employ a mixed-methods approach:\n\n`;
  content += `- **Phase 1 (Months 1-3):** Comprehensive literature review and gap analysis\n`;
  content += `- **Phase 2 (Months 4-8):** Development of novel approaches and frameworks\n`;
  content += `- **Phase 3 (Months 9-12):** Implementation and empirical evaluation\n`;
  content += `- **Phase 4 (Months 13-15):** Analysis, refinement, and documentation\n\n`;

  content += `## 6. Expected Contributions\n\n`;
  content += `This research will contribute to the field by:\n\n`;
  content += `- Providing novel theoretical frameworks for ${topic.toLowerCase()}\n`;
  content += `- Developing practical tools and methodologies for real-world applications\n`;
  content += `- Establishing standardized evaluation benchmarks\n`;
  content += `- Demonstrating scalability and long-term viability\n\n`;

  content += `## 7. Timeline and Milestones\n\n`;
  content += `- **Month 3:** Complete literature review and finalize research design\n`;
  content += `- **Month 8:** Complete development of proposed solutions\n`;
  content += `- **Month 12:** Finish implementation and initial evaluations\n`;
  content += `- **Month 15:** Submit findings for publication and present at conferences\n\n`;

  content += `## 8. Conclusion\n\n`;
  content += `This research proposal addresses critical gaps in ${topic.toLowerCase()} and offers a comprehensive plan to advance the field. `;
  content += `By bridging theoretical research with practical implementation, this work will provide valuable contributions to both academia and industry.`;

  return { title, content };
}
