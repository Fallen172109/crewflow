# CrewFlow - AI-Powered Shopify Management Platform

CrewFlow is an AI-powered Shopify management platform that provides capabilities **beyond what Shopify offers natively**. While Shopify has added AI features (Sidekick, Magic), CrewFlow focuses on advanced capabilities that Shopify cannot provide.

## What Makes CrewFlow Different

| Feature | Shopify Native | CrewFlow |
|---------|----------------|----------|
| Multi-Store Management | Each store isolated | Unified dashboard for ALL stores |
| AI Image Generation | Edit only (background removal) | **DALL-E 3 image creation from scratch** |
| Competitive Intelligence | None | **Real-time competitor & pricing research** |
| Approval Workflows | Execute or don't | **Human-in-loop for risky actions** |
| Bulk Operations | Basic CSV import | **Smart CSV with update/upsert modes** |
| Cross-Store Analytics | Per-store only | **Aggregated insights across stores** |

## Core Features

### Multi-Store Command Center
Manage unlimited Shopify stores from a single dashboard. Switch between stores mid-conversation, run cross-store operations, and see unified analytics.

```
"Check inventory across all my stores"
"Update price on all stores"
"Which store is performing best this month?"
```

### AI Image Generation Studio (DALL-E 3)
Generate product photos, lifestyle images, and marketing assets with AI. No photographer needed.

- Multiple styles: Photorealistic, Digital Art, Watercolor, Sketch
- Aspect ratios: Square, Portrait, Landscape, Wide
- Rate-limited: 10 generations/hour per user

### Competitive Research Hub (Perplexity AI)
Real-time market intelligence that Shopify Sidekick cannot access.

- **Price Research**: "What are competitors charging for similar products?"
- **Competitor Analysis**: Detailed breakdown of competitor strengths/weaknesses
- **Market Research**: Industry trends, market size, opportunities

### Approval Workflows
Human-in-the-loop safety for risky AI actions.

- Risk scoring on AI suggestions
- Approval queue for bulk operations
- Audit trail of all AI recommendations
- Execute approved actions with one click

### Bulk CSV Import
Smart import with three modes:

- **Create**: Import new products only
- **Update**: Update existing products by SKU
- **Upsert**: Create if new, update if exists

Features SKU matching, field mapping, validation, and detailed operation summaries.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI GPT-4/DALL-E 3, Perplexity AI, Anthropic Claude
- **E-commerce**: Shopify Admin API, OAuth 2.0, Webhooks
- **Payments**: Stripe subscription management
- **Deployment**: Vercel with automatic CI/CD

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Shopify Partner account
- OpenAI API key
- Perplexity API key (for research features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/crewflow.git
cd crewflow

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Shopify
CREWFLOW_SHOPIFY_CLIENT_ID=your_client_id
CREWFLOW_SHOPIFY_CLIENT_SECRET=your_client_secret

# AI (Required)
OPENAI_API_KEY=your_openai_key

# AI (Optional - for research features)
PERPLEXITY_API_KEY=your_perplexity_key
ANTHROPIC_API_KEY=your_anthropic_key

# Payments (Optional)
STRIPE_SECRET_KEY=your_stripe_key
```

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── image-generator/    # DALL-E 3 image generation
│   │   ├── research/           # Competitive intelligence
│   │   ├── approvals/          # Approval workflow queue
│   │   ├── bulk-import/        # CSV import wizard
│   │   ├── analytics/
│   │   │   └── multi-store/    # Cross-store analytics
│   │   └── shopify/            # Store management
│   └── api/
│       ├── images/generate/    # Image generation API
│       ├── research/           # Research API
│       ├── approvals/          # Approvals API
│       └── bulk-import/        # Bulk import API
├── components/
│   ├── shopify/                # Shopify UI components
│   └── ui/                     # Reusable components
└── lib/
    ├── ai/                     # AI integrations
    │   ├── image-generation.ts # DALL-E 3 service
    │   ├── web-price-research.ts
    │   └── perplexity.ts
    └── agents/
        └── approval-workflow.ts
```

## Security

- **Row Level Security (RLS)**: Database-level access control
- **Rate Limiting**: AI endpoints protected against abuse
- **Input Validation**: XSS protection, length limits
- **Token Encryption**: Secure storage of API credentials
- **Webhook Verification**: HMAC signature validation

## API Rate Limits

| Endpoint | Limit |
|----------|-------|
| Image Generation | 10/hour per user |
| Competitive Research | 20/hour per user |
| Bulk Import | 1000 products/batch |

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Target Users

- **Agencies**: Manage multiple client stores from one dashboard
- **Multi-brand retailers**: Unified view across all stores
- **Dropshippers**: AI image generation without product photography
- **Competitive markets**: Real-time pricing intelligence

## Live Platform

**Production**: [crewflow.ai](https://crewflow.ai)

## License

MIT License - see LICENSE file for details.

---

**Built for merchants who need more than Shopify's native AI.**
