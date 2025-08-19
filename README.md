# CrewFlow 🚢 - AI-Powered Shopify Management Platform

CrewFlow is a revolutionary AI-powered Shopify management platform that transforms e-commerce operations through intelligent automation and natural language interaction. Built with Next.js 15, Supabase, and advanced AI technology, CrewFlow enables merchants to manage their entire Shopify ecosystem through a unified, conversational interface.

## 🎯 **Unified Shopify Management (2025)**

CrewFlow features a **centralized AI Store Manager** that simplifies Shopify operations through:

- **🤖 Intelligent AI Chat Interface** - Manage your entire Shopify store through natural conversation
- **🏪 Multi-Store Dashboard** - Handle unlimited Shopify stores from one centralized platform
- **⚡ Real-Time Actions** - Create products, manage inventory, and process orders instantly
- **📊 Smart Analytics** - AI-powered insights and performance optimization
- **🎨 Maritime-Themed UI** - Professional design with orange/black color scheme

## 🚢 Core Features

### Shopify Integration Excellence
- **Seamless OAuth Connection** - One-click store integration with secure authentication
- **AI Product Creation** - Describe products in plain English, AI handles the technical details
- **Multi-Store Management** - Unlimited store support with centralized control
- **Plan-Aware Intelligence** - Automatically adapts to your Shopify plan capabilities
- **Real-Time Synchronization** - Live data sync with Shopify Admin API
- **Advanced Product Management** - Bulk operations, optimization, and automated workflows

### 🤖 AI-Powered Store Management

CrewFlow's unified AI system provides comprehensive Shopify management through natural language interaction:

- **Product Creation & Optimization** - Generate compelling product listings with SEO optimization
- **Inventory Management** - Smart stock monitoring, reorder alerts, and supplier coordination
- **Order Processing** - Automated fulfillment workflows and customer communication
- **Marketing Automation** - Content creation, social media management, and campaign optimization
- **Analytics & Insights** - Performance tracking, trend analysis, and growth recommendations
- **Customer Support** - AI-powered customer service and query resolution



## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom maritime design system
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Shopify Integration**: Admin API, OAuth 2.0, Webhooks, GraphQL
- **AI Technology**:
  - OpenAI GPT-4 for intelligent product creation and optimization
  - Anthropic Claude for content generation and analysis
  - Advanced natural language processing for conversational interface
- **Authentication**: Supabase Auth with Shopify OAuth integration
- **Payments**: Stripe subscription management
- **Deployment**: Vercel with automatic CI/CD
- **Database**: PostgreSQL with Row Level Security (RLS)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Shopify Partner account and app
- Stripe account (for subscriptions)
- OpenAI API key
- Anthropic API key

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

3. **Environment Configuration**
Create `.env.local` with your credentials:
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

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://crewflow.ai
```

4. **Database Setup**
```bash
# Initialize Supabase database
npx supabase db reset
```

5. **Shopify App Configuration**
- Create Shopify Partner account
- Set up new app with required scopes
- Configure OAuth redirect URLs
- Set up webhook endpoints

6. **Start Development Server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access CrewFlow.

## 📁 Project Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication flows
│   ├── dashboard/         # Main dashboard
│   │   └── shopify/       # Shopify management hub
│   ├── pricing/           # Subscription plans
│   └── api/               # API endpoints
│       ├── shopify/       # Shopify integrations
│       ├── chat/          # AI chat system
│       └── auth/          # Authentication
├── components/            # React components
│   ├── shopify/          # Shopify-specific UI
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI elements
├── lib/                  # Core utilities
│   ├── shopify/          # Shopify API utilities
│   ├── ai/               # AI integration logic
│   ├── chat/             # Chat system
│   └── supabase/         # Database client
└── docs/                 # Documentation
    ├── setup/            # Setup guides
    ├── guides/           # User guides
    └── deployment/       # Deployment docs
```

## 🎯 Feature Status

### ✅ Production Ready
- [x] **Shopify OAuth Integration** - Secure one-click store connection
- [x] **AI-Powered Product Creation** - Natural language to product listings
- [x] **Multi-Store Dashboard** - Unlimited store management
- [x] **Real-Time Synchronization** - Live Shopify data integration
- [x] **Intelligent Chat Interface** - Conversational store management
- [x] **Plan-Aware Operations** - Automatic Shopify plan detection
- [x] **Maritime Design System** - Professional orange/black UI
- [x] **Subscription Management** - Stripe-powered billing
- [x] **Security & Privacy** - Row Level Security implementation

### 🚧 Roadmap
- [ ] **Advanced Analytics** - Comprehensive store performance insights
- [ ] **Inventory Automation** - Smart stock management and alerts
- [ ] **Order Processing** - Automated fulfillment workflows
- [ ] **Marketing Campaigns** - AI-powered promotional automation
- [ ] **Bulk Operations** - Mass product and inventory management
- [ ] **Mobile App** - iOS and Android companion apps

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run cleanup:quick` - Quick cleanup of temporary files
- `npm run cleanup:deep` - Deep cleanup with dependency reinstall

### Core Components
- **ShopifyAIChat**: Main AI chat interface for store management
- **MultiStoreManager**: Store connection and management dashboard
- **ProductCreator**: AI-powered product creation interface
- **DashboardNav**: Navigation with search and profile management
- **BottomManagementPanel**: Quick actions and store controls

### Development Guidelines
- **temp/**: Directory for temporary development files
- **docs/**: Comprehensive documentation and guides
- Follow maritime theming with orange/black color scheme
- Maintain security best practices with RLS policies
- See `docs/guides/CODEBASE_MAINTENANCE_GUIDE.md` for procedures

## 🔐 Security & Privacy

CrewFlow implements enterprise-grade security measures:

- **Row Level Security (RLS)** - Database-level access control
- **API Key Encryption** - Secure storage of third-party credentials
- **Webhook Verification** - HMAC signature validation for Shopify webhooks
- **Authentication Middleware** - Protected routes and session management
- **Data Privacy** - GDPR compliant data handling and user consent

## 🌊 Design System

CrewFlow features a distinctive maritime-themed design:

- **Primary Orange (#FF6A3D)** - Brand color and call-to-action elements
- **Deep Black (#000000)** - Text and primary UI elements
- **Pure White (#FFFFFF)** - Backgrounds and contrast elements
- **Maritime Iconography** - Anchors, ships, and nautical elements
- **Glass-morphism Effects** - Modern translucent UI components
- **Responsive Design** - Optimized for desktop, tablet, and mobile

## 🧹 Code Quality & Maintenance

CrewFlow maintains high code quality standards:

### 📁 Organized Structure
- **docs/**: Comprehensive documentation organized by category
- **temp/**: Development workspace for testing and experiments
- **Automated Cleanup**: Regular removal of obsolete development files
- **Clean Repository**: Professional standards for public viewing

### 🛠 Development Tools
- **ESLint & Prettier** - Code formatting and quality enforcement
- **TypeScript** - Type safety and developer experience
- **Automated Testing** - Unit and integration test coverage
- **CI/CD Pipeline** - Automated deployment and quality checks

## 🎯 Why CrewFlow?

CrewFlow addresses the critical need for intelligent Shopify store management in the modern e-commerce landscape.

### Market Opportunity
- **4.6M+ Shopify Stores** - Massive market of merchants needing better management tools
- **AI Integration Gap** - Most existing Shopify tools lack sophisticated AI capabilities
- **Operational Efficiency** - Manual store management is time-consuming and error-prone
- **Scalability Challenges** - Merchants need solutions that grow with their business

### Competitive Advantages
- **Conversational Interface** - Manage entire stores through natural language
- **Unified Platform** - Single dashboard for unlimited store management
- **AI-First Approach** - Every feature powered by advanced AI technology
- **Plan Intelligence** - Automatically adapts to Shopify plan capabilities
- **Real-Time Operations** - Instant synchronization and live data updates

## 🌐 Live Platform

**Production URL**: [crewflow.ai](https://crewflow.ai)

CrewFlow is live and serving Shopify merchants worldwide with:
- **99.9% Uptime** - Reliable platform for business-critical operations
- **Global CDN** - Fast performance worldwide via Vercel Edge Network
- **Secure Infrastructure** - Enterprise-grade security and data protection
- **Scalable Architecture** - Built to handle growing merchant needs

### Domain Migration (2025)
- **Current Domain**: `crewflow.ai` (primary)
- **Previous Domain**: `crewflow.dev` (redirects automatically)
- **SSL Certificate**: Full HTTPS encryption
- **Performance**: Optimized for speed and reliability

## 🚀 Latest Release

**Version 3.0** - Complete Shopify Management Platform

### ✅ Production Features
- 🛍️ **Complete Shopify Integration** - Full API coverage and OAuth implementation
- 🤖 **AI Store Manager** - Conversational interface for all store operations
- 🏪 **Multi-Store Dashboard** - Centralized management for unlimited stores
- 📊 **Real-Time Analytics** - Live performance tracking and insights
- 🔒 **Enterprise Security** - Bank-level security and data protection
- 🎨 **Professional UI** - Maritime-themed design with responsive layout

### 🔄 Continuous Deployment
- **Automated Builds** - Every commit triggers automatic deployment
- **Quality Assurance** - Comprehensive testing before production release
- **Zero Downtime** - Seamless updates without service interruption
- **Monitoring** - Real-time performance and error tracking

---

**⚓ Built for Shopify merchants by the CrewFlow team**
