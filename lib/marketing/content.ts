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
    slug: "how-to-review-a-contract-with-ai",
    title: "How to Review a Contract with AI: A Practical, Citation-First Workflow",
    description:
      "Learn how to use AI to review contracts efficiently while verifying clauses, risks, obligations, and answers against the original document.",
    category: "legal",
    publishedAt: "2026-06-09",
    readTime: "8 min read",
    intro:
      "AI can reduce the time spent locating and summarizing contract terms, but a reliable review still requires clear questions, source citations, and professional judgment. This workflow keeps the document, not the model, at the center of the review.",
    sections: [
      {
        heading: "What AI contract review should do",
        paragraphs: [
          "A useful contract review tool helps you navigate the agreement. It should locate clauses, explain defined terms, summarize obligations, compare related provisions, and point you back to the relevant source.",
          "It should not silently replace legal judgment. Important conclusions should remain traceable to the signed agreement and be reviewed in the context of the transaction.",
        ],
        bullets: ["Find key clauses quickly", "Summarize obligations by party", "Identify dates and notice periods", "Provide citations for verification"],
      },
      {
        heading: "Start with a focused review checklist",
        paragraphs: [
          "Before asking questions, identify the commercial and legal issues that matter for the agreement. A focused checklist produces better results than asking for a generic summary alone.",
        ],
        bullets: ["Term, renewal, and termination", "Payment and pricing changes", "Liability, indemnity, and insurance", "Confidentiality and data handling", "Governing law and dispute resolution"],
      },
      {
        heading: "Ask precise, verifiable questions",
        paragraphs: [
          "Phrase questions so the answer can be checked against the contract. Ask which party has an obligation, when it applies, and where the supporting language appears.",
          "For example: What notice is required for termination for convenience? Which section supports the answer? Are there exceptions elsewhere in the agreement?",
        ],
      },
      {
        heading: "Verify citations and compare connected clauses",
        paragraphs: [
          "Open every important citation and read the surrounding paragraph. Contract provisions often depend on definitions, exhibits, exceptions, or precedence clauses elsewhere in the document.",
          "For high-impact issues, ask follow-up questions that compare connected provisions instead of relying on a single extracted sentence.",
        ],
      },
      {
        heading: "Use AI as the first review layer",
        paragraphs: [
          "The strongest workflow uses AI for discovery and organization, followed by human verification and legal analysis. This saves time without weakening accountability.",
        ],
      },
    ],
    relatedUseCase: "/legal/contract-analysis",
  },
  {
    slug: "ai-document-analysis-for-lawyers",
    title: "AI Document Analysis for Lawyers: Where It Helps and Where It Does Not",
    description:
      "A practical guide to using AI document analysis for legal research, contract review, matter preparation, and cited document Q&A.",
    category: "legal",
    publishedAt: "2026-06-09",
    readTime: "7 min read",
    intro:
      "Legal teams can use document AI to reduce repetitive reading and make large files easier to navigate. The value comes from faster access to evidence, not from treating generated text as legal advice.",
    sections: [
      {
        heading: "High-value legal document workflows",
        paragraphs: ["Document AI is most effective when the task is grounded in a defined set of files and the answer can be verified."],
        bullets: ["Contract clause lookup", "Chronology and matter summaries", "Obligation and deadline extraction", "Cross-document comparison", "Preparation of review questions"],
      },
      {
        heading: "Why citations matter",
        paragraphs: [
          "A legal answer without a source is difficult to trust and costly to verify. Citation-backed answers let reviewers inspect the exact document and surrounding context before relying on a conclusion.",
        ],
      },
      {
        heading: "Protecting professional judgment",
        paragraphs: [
          "AI may miss nuance, misunderstand a defined term, or overstate what a clause means. Lawyers should confirm material answers, assess applicable law, and consider facts that are not present in the uploaded documents.",
        ],
      },
      {
        heading: "Building a repeatable team process",
        paragraphs: [
          "Create standard question sets for recurring agreement types, require citation review for material findings, and document the final human conclusion separately from the AI response.",
        ],
      },
    ],
    relatedUseCase: "/legal/nda-review",
  },
  {
    slug: "how-to-compare-invoices-with-contracts",
    title: "How to Compare Invoices with Contracts and Catch Billing Differences",
    description:
      "Learn a repeatable process for comparing invoices against contracted rates, payment terms, quantities, and approved fees.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "7 min read",
    intro:
      "Invoice review becomes difficult when pricing rules, approved fees, and payment terms are spread across contracts, schedules, and amendments. A structured comparison helps businesses catch differences before payment.",
    sections: [
      {
        heading: "Collect the complete agreement set",
        paragraphs: [
          "Start with the invoice, signed agreement, pricing schedule, and any amendments. Comparing against an outdated rate card can create false discrepancies.",
        ],
      },
      {
        heading: "Identify the comparison fields",
        paragraphs: ["Define the information that should match before reviewing individual charges."],
        bullets: ["Unit price or hourly rate", "Quantity and service period", "Discounts and credits", "Taxes and permitted fees", "Payment due date and currency"],
      },
      {
        heading: "Ask cross-document questions",
        paragraphs: [
          "Ask the system to identify the contracted rate, the invoiced rate, and the difference. Require it to cite both documents so the result can be checked quickly.",
        ],
      },
      {
        heading: "Investigate exceptions before disputing",
        paragraphs: [
          "A difference may be explained by an amendment, usage tier, approved expense, or tax rule. Review the cited clauses and supporting records before contacting the vendor.",
        ],
      },
      {
        heading: "Keep an audit trail",
        paragraphs: [
          "Record the documents reviewed, the discrepancy, the supporting clauses, and the final resolution. This makes future invoice reviews faster and more consistent.",
        ],
      },
    ],
    relatedUseCase: "/business/invoice-analysis",
  },
  {
    slug: "best-ai-workflows-for-small-business-documents",
    title: "The Best AI Workflows for Small Business Documents",
    description:
      "Discover practical AI workflows for reviewing contracts, invoices, policies, reports, and vendor documents in a small business.",
    category: "business",
    publishedAt: "2026-06-09",
    readTime: "8 min read",
    intro:
      "Small businesses handle important documents without always having dedicated legal, finance, or operations teams. Document AI can make that information easier to access when it is used with clear processes and source verification.",
    sections: [
      {
        heading: "Vendor and customer agreement review",
        paragraphs: [
          "Use document Q&A to find renewal dates, cancellation terms, payment obligations, and service commitments before signing or renewing an agreement.",
        ],
      },
      {
        heading: "Invoice and pricing checks",
        paragraphs: [
          "Compare invoices with pricing schedules and contracts to identify differences in rates, quantities, fees, or payment terms.",
        ],
      },
      {
        heading: "Policy and procedure Q&A",
        paragraphs: [
          "Make internal policies easier to navigate by allowing teams to ask questions and verify answers against the original policy text.",
        ],
      },
      {
        heading: "Report and proposal summaries",
        paragraphs: [
          "Extract decisions, assumptions, deadlines, and follow-up items from long reports or proposals while retaining links to the source material.",
        ],
      },
      {
        heading: "A safe operating model",
        paragraphs: [
          "Use role-based access, verify important answers, avoid uploading files you are not authorized to process, and consult qualified professionals for legal or financial decisions.",
        ],
      },
    ],
    relatedUseCase: "/business/vendor-contract-review",
  },
];

export const useCases: UseCasePage[] = [
  {
    slug: "contract-analysis",
    category: "legal",
    eyebrow: "AI contract analysis",
    title: "Analyze contracts faster without losing the source",
    description:
      "Find clauses, summarize obligations, compare terms, and verify answers against cited contract language with Helpex Legal.",
    problem:
      "Important terms are often spread across definitions, clauses, schedules, and amendments. Manual review is necessary, but finding every relevant provision consumes valuable time.",
    outcomes: ["Locate key clauses and dates", "Summarize obligations by party", "Compare connected provisions", "Verify findings with citations"],
    workflow: [
      { title: "Upload the agreement set", description: "Add the contract and relevant schedules or amendments." },
      { title: "Ask focused review questions", description: "Review termination, liability, payment, renewal, and other material terms." },
      { title: "Inspect cited sources", description: "Open the supporting page and review the surrounding contract language." },
    ],
    questions: ["What are each party's termination rights?", "Which obligations survive termination?", "What are the liability limits and exceptions?", "When does the agreement renew?"],
    faq: [
      { question: "Can HelpexAI review more than one contract?", answer: "Yes. You can attach multiple ready documents to a conversation and ask comparison questions." },
      { question: "Does contract analysis replace legal review?", answer: "No. It accelerates document navigation and first-pass analysis, while final legal conclusions require qualified review." },
    ],
  },
  {
    slug: "nda-review",
    category: "legal",
    eyebrow: "AI NDA review",
    title: "Review NDAs with a clear, repeatable checklist",
    description:
      "Identify confidentiality scope, exclusions, permitted disclosures, term, remedies, and other NDA provisions with cited AI answers.",
    problem:
      "NDAs are often treated as routine, but broad definitions, long survival periods, and restrictive use provisions can create meaningful obligations.",
    outcomes: ["Understand confidentiality scope", "Find exclusions and permitted disclosures", "Review term and survival periods", "Flag provisions for closer legal review"],
    workflow: [
      { title: "Upload the NDA", description: "Add a readable PDF, DOCX, or TXT version of the agreement." },
      { title: "Run your NDA checklist", description: "Ask consistent questions about scope, use, disclosure, term, and remedies." },
      { title: "Verify and decide", description: "Review the cited language and apply your organization's legal standards." },
    ],
    questions: ["What information is excluded from confidentiality?", "How long do obligations survive?", "Are disclosures to advisers permitted?", "Does the NDA contain residuals language?"],
    faq: [
      { question: "Can I use HelpexAI for mutual and one-way NDAs?", answer: "Yes. Ask the AI to identify the parties' respective obligations and whether duties apply mutually." },
      { question: "Will HelpexAI tell me whether to sign?", answer: "It can explain and organize the terms, but signing decisions should be made with appropriate legal judgment." },
    ],
  },
  {
    slug: "invoice-analysis",
    category: "business",
    eyebrow: "AI invoice analysis",
    title: "Compare invoices with agreements before you pay",
    description:
      "Use Helpex Business to compare invoice charges, rates, fees, and payment terms against your contracts and pricing schedules.",
    problem:
      "Billing differences can hide in line items, rate changes, service periods, and contract schedules. Manual comparisons become harder as vendor volume grows.",
    outcomes: ["Compare contracted and invoiced rates", "Spot unexplained fees or differences", "Verify payment terms", "Create a review trail with cited sources"],
    workflow: [
      { title: "Upload the invoice and agreement", description: "Attach the invoice, contract, pricing schedule, and relevant amendments." },
      { title: "Ask for a structured comparison", description: "Compare rates, quantities, fees, taxes, and payment terms." },
      { title: "Confirm each difference", description: "Review cited source text before approving or disputing the invoice." },
    ],
    questions: ["Does every invoice rate match the contract?", "Are these additional fees permitted?", "What is the payment due date?", "Which line items need review?"],
    faq: [
      { question: "Can HelpexAI identify invoice overcharges?", answer: "It can highlight differences between uploaded invoice and contract information for your team to verify." },
      { question: "Can it process scanned invoices?", answer: "Uploaded PDFs need readable text. OCR-process image-only scans before uploading." },
    ],
  },
  {
    slug: "vendor-contract-review",
    category: "business",
    eyebrow: "Vendor contract review",
    title: "Understand vendor contracts before they become surprises",
    description:
      "Find pricing, renewals, service commitments, cancellation terms, and business obligations in vendor agreements with source-backed answers.",
    problem:
      "Vendor agreements affect budgets, operations, data, and customer commitments. Important commercial terms can be difficult to find once the agreement is signed.",
    outcomes: ["Find renewal and cancellation deadlines", "Understand pricing changes", "Review service and support commitments", "Summarize operational obligations"],
    workflow: [
      { title: "Upload vendor documents", description: "Add the main agreement, order form, service levels, and amendments." },
      { title: "Review commercial terms", description: "Ask about pricing, renewals, commitments, data, support, and termination." },
      { title: "Share verified findings", description: "Use cited answers to inform the relevant business owner or adviser." },
    ],
    questions: ["When and how can we cancel?", "Can the vendor increase prices?", "What service levels are promised?", "What happens to our data at termination?"],
    faq: [
      { question: "Can I compare competing vendor agreements?", answer: "Yes. Attach multiple vendor documents and ask HelpexAI to compare specific terms." },
      { question: "Is this legal advice?", answer: "No. HelpexAI helps organize and explain documents; consult qualified counsel for legal decisions." },
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getUseCase(category: MarketingCategory, slug: string) {
  return useCases.find((useCase) => useCase.category === category && useCase.slug === slug);
}

