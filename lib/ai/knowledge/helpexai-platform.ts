/**
 * Canonical product knowledge for public-facing AI answers.
 * Keep this synchronized with product behavior, pricing, and public policies.
 */
export const HELPEXAI_PLATFORM_KNOWLEDGE = `
HELPEXAI PLATFORM OVERVIEW

HelpexAI is a document intelligence platform. Users upload supported documents
and ask questions in plain English. HelpexAI analyzes document text and returns
AI-generated answers with source citations or excerpts when available.

The platform is designed for document analysis. It does not replace a qualified
lawyer, accountant, financial adviser, or other professional.

PRODUCTS

1. Helpex Legal
- Intended for lawyers, legal teams, paralegals, and people reviewing legal documents.
- Common documents include contracts, NDAs, agreements, filings, and case documents.
- Helps with clause lookup, document summaries, obligations, rights, key dates,
  risk spotting, and citation-backed document questions.
- Legal AI responses are informational document analysis, not legal advice.

2. Helpex Business
- Intended for small-business owners, freelancers, startups, and operations teams.
- Common documents include vendor contracts, invoices, purchase orders, policies,
  and service agreements.
- Helps summarize business documents, review vendor terms, identify obligations,
  compare documents, and spot potential invoice or contract discrepancies.
- Business AI responses are informational and should be verified before important decisions.

CORE WORKFLOW

1. Create an account and select a Legal or Business workspace.
2. Upload PDF, DOCX, or TXT documents, up to 10MB per file.
3. Start a conversation and select the documents to use.
4. Ask questions about those documents.
5. Review AI answers and their cited document sources.

An email can have both a Legal and Business workspace. At login, users with more
than one workspace select which workspace to open. The active workspace remains
selected for the session.

CORE FEATURES

- PDF, DOCX, and TXT document uploads.
- Document viewer for uploaded files.
- Plain-English document questions and answers.
- Citation/source excerpts attached to answers when available.
- Conversations can use selected documents.
- Unlimited number of conversations on all plans.
- Conversation rename and deletion.
- Legal and Business workspaces with separate themes and document collections.
- Daily question usage and document-limit tracking.
- Stripe-powered subscription management.
- Light and dark themes.

PUBLIC FREE TOOL

- Available at /free-tool.
- No account is required to begin.
- A visitor uploads one PDF, DOCX, or TXT document up to 10MB.
- The visitor enters an email address and agrees to receive occasional product updates.
- The visitor can receive up to 5 successful AI answers during the public-tool trial.
- After the fifth answer, attempting a sixth question shows an invitation to create an account.
- A free public-tool trial is limited by email, session, IP-based controls, and rate limits.
- The raw uploaded file is not permanently stored by the public tool.
- Extracted temporary document text and public-tool messages expire after 24 hours.
- Marketing-consented email information is stored separately from temporary document text.

PLANS AND PRICING

The same plans and limits apply to Helpex Legal and Helpex Business:

- Free: $0 forever, up to 3 documents, up to 5 questions per day, and unlimited conversations.
- Pro: $29 per month, up to 30 documents, up to 30 questions per day, unlimited conversations,
  advanced citations, priority processing, and cross-document comparison.
- Premium: $49 per month, up to 100 documents, up to 100 questions per day,
  unlimited conversations, advanced citations, priority processing, and
  cross-document comparison.

Questions reset daily. Subscriptions can be managed through the Billing page.
Paid plans use Stripe. Users can cancel their paid subscription through the
billing management portal. If a paid subscription becomes inactive, the
workspace returns to the Free plan. If the workspace then contains more documents
than the Free allowance, conversations remain locked until the user chooses which
documents to keep.

PRIVACY AND DATA HANDLING

- HelpexAI processes uploaded documents and questions to provide requested AI features.
- Documents and prompts may be sent to trusted infrastructure and AI service providers
  solely to deliver the requested features.
- Users should upload only documents they have permission to process.
- Account users can request account deletion from Settings.
- An account deletion request freezes the account, with permanent cleanup scheduled later.
- HelpexAI does not store full payment-card numbers; Stripe processes payment details.
- HelpexAI does not sell personal information.
- The full public privacy policy is available at /privacy.

IMPORTANT LINKS

- Public free tool: /free-tool
- Create an account: /signup
- Sign in: /login
- Pricing: /#pricing
- Privacy policy: /privacy
- Logged-in billing and subscription management: /billing

ANSWERING RULES FOR HELPEXAI QUESTIONS

- Use only this platform knowledge for questions about HelpexAI.
- Never invent features, certifications, guarantees, discounts, annual prices, or plan limits.
- Do not claim the product is SOC 2 certified, end-to-end encrypted, or legally compliant
  unless that fact is explicitly added to this knowledge document in the future.
- Explain relevant plans clearly when users ask about limits or pricing.
- When useful, direct users to the appropriate link listed above.
- If asked about something not covered here, say that the information is not currently available.
`.trim();

export function isHelpexAIPlatformQuestion(question: string) {
  return /\b(helpex(?:ai)?|this (?:platform|app|tool|service)|your (?:platform|app|tool|service)|pricing|price|plans?|packages?|subscription|upgrade|premium|pro plan|free plan|legal workspace|business workspace|public tool|free tool|sign ?up|log ?in|billing|privacy|documents? limit|questions? limit|what (?:do|can) you do|what services?|who (?:is|are) this for)\b/i.test(question);
}
