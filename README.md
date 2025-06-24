# CrewFlow 🚢 - Maritime AI Automation Platform

CrewFlow is a cutting-edge maritime-themed multi-agent AI automation platform that brings together 10 specialized AI agents to automate various business operations. Built with Next.js 15, Supabase, and modern AI frameworks including LangChain, AutoGen, and Perplexity AI.

## 🚢 Features

### Core Platform
- **Maritime-themed UI** with orange/black futuristic design
- **10 Specialized AI Agents** for different business functions
- **Dual Interaction Methods** - Chat interface + Preset actions
- **Subscription-based Model** with 3 tiers (Starter, Professional, Enterprise)
- **Real-time Usage Tracking** and billing
- **Secure Authentication** with Supabase Auth

### AI Agents
1. **Coral** - Customer Support (LangChain)
2. **Mariner** - Marketing Automation (Hybrid)
3. **Pearl** - Content & SEO (Perplexity AI)
4. **Morgan** - E-commerce Management (LangChain)
5. **Tide** - Data Analysis (AutoGen)
6. **Compass** - Social Media (Hybrid)
7. **Flint** - Workflow Automation (AutoGen)
8. **Drake** - Business Development (AutoGen + Perplexity)
9. **Sage** - Knowledge Management (LangChain)
10. **Anchor** - Supply Chain/Inventory (LangChain + Perplexity)

### Subscription Tiers
- **Starter ($29/month)**: 3 agents, 500 requests each
- **Professional ($59/month)**: 6 agents, 750 requests each
- **Enterprise ($89/month)**: 10 agents, 1,000 requests each

## 🛠 Tech Stack

- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom maritime theme
- **Backend**: Supabase (Database, Auth, Real-time)
- **Payments**: Stripe (Subscriptions, Webhooks)
- **AI Frameworks**: LangChain, AutoGen, Perplexity AI
- **Deployment**: Vercel-ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- OpenAI API key
- Perplexity API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crewflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Copy `.env.local` and fill in your credentials:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

4. **Set up Supabase Database**
- Create a new Supabase project
- Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
- Enable Row Level Security (RLS) policies

5. **Configure Stripe**
- Create products for each subscription tier
- Set up webhook endpoints
- Add price IDs to environment variables

6. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected dashboard
│   ├── pricing/           # Subscription plans
│   └── api/               # API routes
├── components/            # Reusable components
│   ├── agents/           # Agent-specific components
│   └── dashboard/        # Dashboard components
├── lib/                  # Utility libraries
│   ├── agents.ts         # Agent configurations
│   ├── auth.ts           # Authentication helpers
│   ├── stripe.ts         # Stripe integration
│   └── supabase.ts       # Database client
└── database/             # Database schema
```

## 🎯 Current Implementation Status

### ✅ Completed (Phase 1)
- [x] Project setup with Next.js 15 and Tailwind CSS
- [x] Maritime-themed UI design system
- [x] Supabase database schema and authentication
- [x] Stripe subscription integration
- [x] Landing page with agent showcase
- [x] Pricing page with 3 subscription tiers
- [x] Dashboard layout with navigation
- [x] Agent interface with chat and preset actions
- [x] Basic API routes for chat and webhooks
- [x] User authentication flow
- [x] Usage tracking system

### 🚧 Next Steps (Phase 2)
- [ ] Real AI agent implementations
- [ ] API integrations (Shopify, CRM, etc.)
- [ ] Advanced analytics dashboard
- [ ] Settings and billing management
- [ ] Email notifications

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Components
- **AgentInterface**: Main agent interaction component
- **ChatInterface**: Real-time chat with AI agents
- **PresetActions**: One-click automation buttons
- **DashboardNav**: Navigation with search and profile
- **DashboardSidebar**: Agent navigation and usage stats

## 🔐 Security

- Row Level Security (RLS) enabled on all database tables
- API key encryption for third-party integrations
- Secure webhook handling with signature verification
- Protected routes with authentication middleware

## 🌊 Maritime Theme

The platform uses a sophisticated maritime theme with:
- **Orange (#f97316)** - Primary brand color
- **Navy/Black (#0f172a)** - Background and text
- **Ocean Blue (#0ea5e9)** - Accent colors
- **Teal (#14b8a6)** - Secondary accents
- Custom animations and maritime-inspired iconography

## 🚀 Deployment Status

**Latest Update**: December 24, 2025 - Complete AI agent suite, admin system, OAuth integrations, and analytics deployed!

- ✅ All 14 AI agents implemented
- ✅ Admin system with user management
- ✅ OAuth integration hub (14+ services)
- ✅ Advanced analytics and monitoring
- ✅ Production-ready build system

---

**Built with ⚓ by the CrewFlow team**
