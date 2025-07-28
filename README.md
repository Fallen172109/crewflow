# CrewFlow 🚢 - AI-Powered Shopify Store Manager

CrewFlow is a streamlined AI-powered Shopify management platform that revolutionizes e-commerce operations through a unified conversational interface. Built with Next.js 15, Supabase, and specialized AI agents, CrewFlow enables merchants to manage their entire Shopify ecosystem through a single, intelligent Store Manager dashboard.

## 🎯 **New Simplified Architecture (2025)**

CrewFlow has been redesigned with a **unified Store Manager interface** that replaces complex multi-tab navigation with a single, AI-centric dashboard featuring:

- **🎨 Central AI Chat Interface** - All Shopify operations flow through one intelligent conversation
- **✨ Enhanced Bottom Management Panel** - Quick actions and live product preview
- **🚢 4 Specialized AI Agents** - Focused on core Shopify management tasks
- **📱 Responsive Glass-morphism Design** - Modern UI with maritime theming
- **⚡ Streamlined User Experience** - No complex navigation, just intelligent assistance

## 🚢 Features

### Core Shopify Integration
- **Multi-Store Management** - Manage unlimited Shopify stores from one dashboard
- **AI-Powered Product Creation** - Create products through natural language conversations
- **Intelligent Automation** - Automate inventory, orders, and marketing tasks
- **Plan-Aware Features** - Automatically adapts to your Shopify plan capabilities
- **Real-time Sync** - Live synchronization with Shopify Admin API
- **Maritime-themed UI** with professional orange/black design

### 🤖 Specialized AI Agents (Simplified System)

#### **🛍️ Morgan - E-commerce Captain**
- **Primary Shopify Management** - Product listings, inventory, orders, store optimization
- **Natural Language Product Creation** - Describe products in plain English, AI handles the rest
- **Smart Store Operations** - Automated order processing and fulfillment
- **Performance Analytics** - Store insights and optimization recommendations

#### **⚓ Anchor - Supply Chain Admiral**
- **Inventory Management** - Stock level monitoring and reorder alerts
- **Supplier Relations** - Vendor performance analysis and cost optimization
- **Logistics Coordination** - Shipping and fulfillment optimization

#### **🌊 Splash - Marketing Mate**
- **Social Media Management** - Automated content creation and campaign management
- **Brand Promotion** - Engaging posts and marketing materials
- **Trend Analysis** - Social media insights and optimization

#### **💎 Pearl - Content Curator**
- **SEO Optimization** - Product descriptions and search engine optimization
- **Content Creation** - Compelling copy and marketing materials
- **Competitor Research** - Market analysis and content strategy

#### **AI Agent Specialists**
- **Splash** - Creative content and product description specialist
- **Anchor** - Supply chain and inventory management expert
- **Ledger** - Financial analytics and reporting specialist
- **Pearl** - Market research and competitive analysis expert

### 💰 Subscription Tiers
- **Starter ($29/month)**: Single store, basic AI features, 500 AI operations
- **Professional ($59/month)**: Up to 5 stores, advanced automation, 1,500 AI operations
- **Enterprise ($89/month)**: Unlimited stores, full AI suite, 5,000 AI operations

## 🛠 Tech Stack

- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom maritime theme
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Shopify Integration**: Shopify Admin API, OAuth 2.0, Webhooks
- **AI Frameworks**:
  - OpenAI GPT-4 for intelligent product creation
  - Anthropic Claude for content optimization
  - Perplexity AI for market research
  - Custom AI agents for specialized tasks
- **Authentication**: Supabase Auth + Shopify OAuth
- **Payments**: Stripe integration with subscription management
- **Deployment**: Vercel with automatic deployments
- **Database**: PostgreSQL with Row Level Security (RLS)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Shopify Partner account and app
- Stripe account (for subscriptions)
- OpenAI API key
- Anthropic API key
- Perplexity API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Fallen172109/crewflow.git
cd crewflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Shopify Configuration
CREWFLOW_SHOPIFY_CLIENT_ID=your_shopify_app_client_id
CREWFLOW_SHOPIFY_CLIENT_SECRET=your_shopify_app_client_secret

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://crewflow.ai
```

4. **Set up the database**
```bash
# Run Supabase migrations
npx supabase db reset
```

5. **Configure Shopify App**
- Create a Shopify Partner account
- Create a new app with proper scopes
- Set up OAuth redirect URLs
- Configure webhook endpoints

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
│   │   └── shopify/       # Shopify management interface
│   ├── pricing/           # Subscription plans
│   └── api/               # API routes
│       ├── shopify/       # Shopify API integrations
│       └── agents/        # AI agent endpoints
├── components/            # Reusable components
│   ├── shopify/          # Shopify-specific components
│   ├── agents/           # AI agent components
│   └── dashboard/        # Dashboard components
├── lib/                  # Utility libraries
│   ├── integrations/     # Third-party integrations
│   ├── agents/           # AI agent configurations
│   ├── shopify/          # Shopify utilities
│   └── supabase/         # Database client
└── database/             # Database schema and migrations
```

## 🎯 Implementation Status

### ✅ Completed Features
- [x] **Shopify OAuth Integration** - Seamless store connection
- [x] **Multi-Store Management** - Manage unlimited Shopify stores
- [x] **AI Product Creation** - Natural language product creation
- [x] **Product Management** - Advanced product editing and optimization
- [x] **Plan-Aware Features** - Automatic Shopify plan detection
- [x] **Real-time Sync** - Live data synchronization with Shopify
- [x] **Maritime UI** - Professional orange/black design system
- [x] **Subscription System** - Stripe-powered billing
- [x] **Usage Tracking** - AI operation monitoring and limits
- [x] **Security** - Row Level Security and data protection

### 🚧 Upcoming Features
- [ ] **Inventory Automation** - Smart stock management and alerts
- [ ] **Order Processing** - Automated fulfillment workflows
- [ ] **Marketing Automation** - AI-powered campaigns
- [ ] **Analytics Dashboard** - Advanced store performance insights
- [ ] **Bulk Operations** - Mass product and order management

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:unit` - Run unit tests
- `npm run test:shopify` - Run Shopify integration tests
- `npm run cleanup:quick` - Quick cleanup of temporary files
- `npm run cleanup:deep` - Deep cleanup with dependency reinstall

### Key Components
- **AgentInterface**: Main agent interaction component
- **ChatInterface**: Real-time chat with AI agents
- **PresetActions**: One-click automation buttons
- **DashboardNav**: Navigation with search and profile
- **DashboardSidebar**: Agent navigation and usage stats

### Development & Testing
- **temp/**: Directory for temporary test files and experiments
- **temp/examples/**: Templates for common testing scenarios
- Use `temp/examples/test-agent-template.js` for agent testing
- Use `temp/examples/debug-api-template.js` for API debugging
- See `CODEBASE_MAINTENANCE_GUIDE.md` for cleanup procedures

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

## 🧹 Maintenance & Code Quality

CrewFlow implements systematic maintenance procedures to ensure codebase quality:

### 🔧 Maintenance System
- **Maintenance Page**: Maritime-themed maintenance interface with typewriter effects
- **Automated Cleanup Scripts**: Quick and deep cleanup utilities
- **Comprehensive Guide**: Detailed maintenance procedures in `CODEBASE_MAINTENANCE_GUIDE.md`
- **Regular Reviews**: Monthly and quarterly maintenance schedules

### 🛠 Cleanup Tools
- `npm run cleanup:quick` - Quick cleanup of temporary files
- `npm run cleanup:deep` - Deep cleanup with dependency reinstall
- `scripts/quick-cleanup.sh` - Shell script for rapid cleanup
- `scripts/deep-cleanup.sh` - Comprehensive cleanup automation

### 📁 File Organization
- **temp/**: Directory for temporary test files and experiments
- **temp/examples/**: Templates for common testing scenarios
- **.gitignore**: Comprehensive exclusions for clean repository
- **Automated Cleanup**: Regular removal of obsolete test files

## 🎯 Business Focus

CrewFlow has evolved from a general multi-agent AI platform to a **specialized Shopify management solution**. Our platform now focuses exclusively on helping e-commerce merchants manage their Shopify stores through intelligent AI automation.

### Why Shopify?
- **Market Opportunity**: 4.6M+ Shopify stores worldwide need better management tools
- **AI Integration Gap**: Most Shopify tools lack sophisticated AI capabilities
- **Scalability**: Merchants need solutions that grow with their business
- **Efficiency**: Manual store management is time-consuming and error-prone

### Our Competitive Advantage
- **Natural Language Interface**: Manage your entire store through conversation
- **Multi-Store Support**: Handle unlimited stores from one dashboard
- **AI-Powered Automation**: Intelligent product creation, inventory management, and marketing
- **Plan-Aware Features**: Automatically adapts to your Shopify plan capabilities

## 🌐 Domain Information

**Primary Domain**: [crewflow.ai](https://crewflow.ai) - The official CrewFlow Shopify management platform

### Domain Migration (January 2025)
CrewFlow has migrated from `crewflow.dev` to `crewflow.ai` as our primary domain. All traffic from the old domain is automatically redirected to ensure seamless access.

- **New Primary Domain**: `crewflow.ai`
- **Previous Domain**: `crewflow.dev` (automatically redirects)
- **Redirect Configuration**: Implemented via Next.js redirects in `next.config.ts`
- **Migration Date**: January 2025

## 🚀 Deployment Status

**Latest Update**: January 26, 2025 - Major Shopify integration deployment!

### ✅ Recent Improvements (v3.0.0)
- 🛍️ **Shopify Integration**: Complete AI-powered Shopify management system
- 🤖 **AI Product Creation**: Natural language product creation and editing
- 🏪 **Multi-Store Management**: Unlimited store support with centralized dashboard
- 🔒 **Security Audit**: Comprehensive pre-deployment security review completed
- 📚 **Documentation Updates**: Updated to reflect Shopify focus and capabilities
- 🛠 **Production Ready**: Repository optimized for public viewing and professional review

### ✅ Core Shopify Features
- ✅ Shopify OAuth integration with seamless store connection
- ✅ AI-powered product creation through natural language
- ✅ Multi-store management with unlimited store support
- ✅ Plan-aware features that adapt to Shopify plan capabilities
- ✅ Real-time synchronization with Shopify Admin API
- ✅ Advanced product editing and optimization tools

---

**Built with ⚓ by the CrewFlow team**
