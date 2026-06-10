export type MarketingCategory = "legal" | "business";

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoArticle = {
  slug: string;
  title: string;
  description: string;
  category: MarketingCategory;
  publishedAt: string;
  readTime: string;
  intro: string;
  sections: ContentSection[];
  relatedUseCase: string;
};

export type UseCasePage = {
  slug: string;
  category: MarketingCategory;
  eyebrow: string;
  title: string;
  description: string;
  problem: string;
  outcomes: string[];
  workflow: { title: string; description: string }[];
  questions: string[];
  faq: { question: string; answer: string }[];
};

export const articles: SeoArticle[] = [
  {
    slug: "what-is-a-business-knowledge-workspace",
    title: "What Is a Business Knowledge Workspace and Why Companies Need One",
    description:
      "Learn how businesses can turn contracts, policies, reports, SOPs, invoices, and internal documents into a searchable AI-powered knowledge workspace.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "8 min read",
    intro:
      "Most businesses store knowledge across contracts, policies, reports, SOPs, invoices, and shared drives. A business knowledge workspace brings that information together and makes it accessible through AI-powered search, conversations, and reports.",
    sections: [
      {
        heading: "The problem with scattered business knowledge",
        paragraphs: [
          "Important business information often lives in disconnected documents and folders. Teams waste time searching for answers or relying on institutional knowledge.",
          "As organizations grow, finding the right information becomes increasingly difficult.",
        ],
      },
      {
        heading: "What a business knowledge workspace does",
        paragraphs: [
          "A business knowledge workspace organizes company documents into one searchable system where AI can answer questions, generate reports, and help teams make decisions.",
        ],
        bullets: [
          "Centralized document knowledge",
          "Source-backed AI answers",
          "Document categories and tags",
          "Cross-document understanding",
          "Report generation",
        ],
      },
      {
        heading: "Beyond document storage",
        paragraphs: [
          "Modern businesses need more than file storage. They need systems that transform documents into usable knowledge and actionable insights.",
        ],
      },
    ],
    relatedUseCase: "/business/business-knowledge-workspace",
  },

  {
    slug: "how-to-build-an-ai-business-knowledge-base",
    title: "How to Build an AI-Powered Business Knowledge Base",
    description:
      "A practical guide to organizing contracts, policies, SOPs, reports, invoices, and internal documents into an AI-powered knowledge system.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "7 min read",
    intro:
      "An AI knowledge base starts with structured information. Categories, tags, and document organization help AI understand business context and deliver more accurate answers.",
    sections: [
      {
        heading: "Organize documents into categories",
        paragraphs: [
          "Start by grouping documents into logical business categories.",
        ],
        bullets: [
          "Legal & Contracts",
          "Finance",
          "HR",
          "Operations",
          "Compliance",
          "General",
        ],
      },
      {
        heading: "Add tags for context",
        paragraphs: [
          "Tags provide additional business meaning and improve retrieval quality.",
        ],
        bullets: [
          "vendor",
          "invoice",
          "renewal",
          "employment",
          "payment",
          "supplier",
        ],
      },
      {
        heading: "Use conversations and reports",
        paragraphs: [
          "Once knowledge is organized, teams can ask questions, generate summaries, create reports, and make better decisions using company information.",
        ],
      },
    ],
    relatedUseCase: "/business/business-knowledge-workspace",
  },

  {
    slug: "how-to-generate-business-reports-with-ai",
    title: "How to Generate Business Reports from Documents Using AI",
    description:
      "Learn how AI can transform business documents into summaries, risk reports, action plans, decision briefs, and other structured outputs.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "8 min read",
    intro:
      "Reading documents is only the first step. Business teams often need summaries, recommendations, risks, action items, and decisions that can be shared and reused.",
    sections: [
      {
        heading: "Why reports matter",
        paragraphs: [
          "Most users do not want raw document analysis. They want outcomes that help them understand information and take action.",
        ],
      },
      {
        heading: "Common report types",
        paragraphs: [
          "AI can generate multiple report formats depending on business needs.",
        ],
        bullets: [
          "Business Summary Report",
          "Contract Risk Report",
          "Decision Brief",
          "Action Items Report",
          "Compliance Review",
        ],
      },
      {
        heading: "Review before finalizing",
        paragraphs: [
          "Reports should be reviewed, improved, and finalized before being saved or shared with others.",
        ],
      },
      {
        heading: "Turn reports into ongoing knowledge",
        paragraphs: [
          "Saved reports become reusable business assets that can be attached to future conversations and decisions.",
        ],
      },
    ],
    relatedUseCase: "/business/ai-document-reports",
  },

  {
    slug: "using-ai-for-business-decisions",
    title: "Using AI to Support Better Business Decisions",
    description:
      "Discover how AI-powered knowledge workspaces help teams make better decisions using contracts, policies, reports, SOPs, and business documents.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "9 min read",
    intro:
      "Business decisions require context. The challenge is not having information, but finding the right information at the right time. AI can help by turning documents into searchable knowledge.",
    sections: [
      {
        heading: "The challenge of fragmented information",
        paragraphs: [
          "Important decisions often depend on information spread across multiple documents, departments, and systems.",
        ],
      },
      {
        heading: "Ask questions across business knowledge",
        paragraphs: [
          "Modern AI systems can answer questions using information from contracts, policies, reports, SOPs, and operational documents.",
        ],
      },
      {
        heading: "Use reports to support decisions",
        paragraphs: [
          "Decision briefs, risk reports, and business summaries help management evaluate information more quickly.",
        ],
      },
      {
        heading: "Always verify important conclusions",
        paragraphs: [
          "AI should support business decisions, not replace human judgment. Important conclusions should always be reviewed against the source material.",
        ],
      },
    ],
    relatedUseCase: "/business/business-decision-support",
  },
];

export const useCases: UseCasePage[] = [
  {
    slug: "business-knowledge-workspace",
    category: "business",
    eyebrow: "AI business knowledge workspace",
    title: "Turn company documents into searchable business knowledge",
    description:
      "Upload contracts, policies, SOPs, invoices, reports, and internal documents into one AI workspace where your team can ask questions and generate source-backed answers.",
    problem:
      "Business knowledge is often scattered across PDFs, contracts, policies, reports, spreadsheets, and internal files. Teams waste time searching manually, asking others for context, or making decisions without reviewing all relevant information.",
    outcomes: [
      "Create one workspace for company documents",
      "Organize files with categories and tags",
      "Ask questions across selected documents or the full knowledge base",
      "Get answers grounded in cited source content",
    ],
    workflow: [
      {
        title: "Upload business documents",
        description:
          "Add contracts, policies, SOPs, invoices, reports, agreements, and other company files.",
      },
      {
        title: "Organize knowledge",
        description:
          "Assign categories and tags so HelpexAI understands what type of document it is and where it belongs.",
      },
      {
        title: "Ask or generate",
        description:
          "Ask questions, generate reports, and use your documents as a reusable business knowledge base.",
      },
    ],
    questions: [
      "What do our documents say about vendor payment terms?",
      "Which policies mention refund or cancellation rules?",
      "Summarize the key obligations across these documents.",
      "What important risks or action items should we review?",
    ],
    faq: [
      {
        question: "Is HelpexAI only for legal documents?",
        answer:
          "No. HelpexAI is designed as a business knowledge workspace. You can upload contracts, policies, SOPs, invoices, reports, agreements, and other company documents.",
      },
      {
        question: "Can I organize documents by category?",
        answer:
          "Yes. Documents can be categorized and tagged so the AI has better context when answering questions or generating reports.",
      },
    ],
  },
  {
    slug: "ai-document-reports",
    category: "business",
    eyebrow: "AI document reports",
    title: "Generate professional reports from your business documents",
    description:
      "Create business summaries, risk reports, decision briefs, action item reports, and custom reports from one or more uploaded documents.",
    problem:
      "Reading business documents is only the first step. Teams often need structured outputs like summaries, risks, decisions, recommendations, and action items that can be saved, shared, exported, and reused later.",
    outcomes: [
      "Generate structured reports from selected documents",
      "Create summaries, risks, recommendations, and action items",
      "Review and refine reports before saving",
      "Export finalized reports as PDF",
    ],
    workflow: [
      {
        title: "Select documents",
        description:
          "Choose one document, multiple documents, or a document category as the source for the report.",
      },
      {
        title: "Choose report type",
        description:
          "Generate a business summary, contract risk report, decision brief, action items report, or custom report.",
      },
      {
        title: "Review and finalize",
        description:
          "Review the draft, ask AI to improve it, save the final version, and export it as PDF.",
      },
    ],
    questions: [
      "Generate a business summary from these documents.",
      "Create a risk report for this vendor agreement.",
      "Extract action items from these policies and reports.",
      "Create a decision brief for management review.",
    ],
    faq: [
      {
        question: "Can reports use more than one document?",
        answer:
          "Yes. Reports can be generated from one or more selected documents, allowing HelpexAI to combine information into one structured output.",
      },
      {
        question: "Can I edit or improve a report before saving?",
        answer:
          "Yes. Generated reports should be reviewed as drafts first. You can ask AI to improve sections, then finalize and save the report for later use.",
      },
    ],
  },
  {
    slug: "contract-risk-reports",
    category: "business",
    eyebrow: "AI contract risk reports",
    title: "Understand contract risks before they become business problems",
    description:
      "Upload vendor agreements, NDAs, service contracts, and business agreements to generate risk reports with key terms, missing clauses, recommendations, and cited sources.",
    problem:
      "Contracts affect pricing, renewals, obligations, data, liability, and operations. Important terms are often spread across clauses, schedules, and amendments, making it hard for business teams to understand risk before signing or renewing.",
    outcomes: [
      "Find key contract terms and deadlines",
      "Identify risks and missing clauses",
      "Generate recommendations and questions to ask",
      "Verify findings with source citations",
    ],
    workflow: [
      {
        title: "Upload contract documents",
        description:
          "Add the agreement, order form, schedule, amendment, NDA, or supporting contract documents.",
      },
      {
        title: "Generate a risk report",
        description:
          "Create a structured report covering key terms, risks, missing clauses, recommendations, and questions to ask.",
      },
      {
        title: "Continue in chat",
        description:
          "Open the report in conversation to ask follow-up questions, clarify risks, or compare terms with other documents.",
      },
    ],
    questions: [
      "What are the highest risks in this agreement?",
      "Which obligations survive termination?",
      "Are renewal or cancellation terms risky?",
      "What questions should we ask before signing?",
    ],
    faq: [
      {
        question: "Does this replace legal review?",
        answer:
          "No. HelpexAI helps organize, summarize, and highlight document risks. Final legal decisions should be made with qualified professional advice.",
      },
      {
        question: "Can contract reports be used inside conversations?",
        answer:
          "Yes. Saved reports can be attached to conversations so you can ask follow-up questions using both the report and the original source documents.",
      },
    ],
  },
  {
    slug: "business-decision-support",
    category: "business",
    eyebrow: "AI business decision support",
    title: "Make better business decisions with source-backed AI context",
    description:
      "Ask questions across your business documents, compare information, generate decision briefs, and get answers based on your company knowledge instead of generic AI responses.",
    problem:
      "Business decisions often require context from contracts, policies, reports, invoices, SOPs, and previous documents. Generic AI tools do not automatically understand your company knowledge or where important information is stored.",
    outcomes: [
      "Ask questions across the full business knowledge base",
      "Compare information from different document categories",
      "Generate decision briefs for management review",
      "Use citations to verify important claims",
    ],
    workflow: [
      {
        title: "Build your knowledge base",
        description:
          "Upload and organize the documents your business relies on for decisions.",
      },
      {
        title: "Ask cross-document questions",
        description:
          "Ask from selected documents or the whole workspace knowledge base.",
      },
      {
        title: "Turn answers into outputs",
        description:
          "Generate reports, summaries, recommendations, and decision briefs from the AI response.",
      },
    ],
    questions: [
      "Does this vendor agreement conflict with our payment policy?",
      "Which documents mention cancellation or refund obligations?",
      "Create a decision brief from these files.",
      "What risks and action items should management review?",
    ],
    faq: [
      {
        question: "How is this different from ChatGPT or Claude?",
        answer:
          "HelpexAI is built around a dedicated business workspace where documents, categories, tags, conversations, and reports stay organized together. The goal is not generic chat, but reusable business knowledge.",
      },
      {
        question: "Can I ask questions from the whole workspace?",
        answer:
          "Yes. You can ask from selected documents or from the broader business knowledge base, depending on the workflow.",
      },
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getUseCase(category: MarketingCategory, slug: string) {
  return useCases.find(
    (useCase) => useCase.category === category && useCase.slug === slug,
  );
}
