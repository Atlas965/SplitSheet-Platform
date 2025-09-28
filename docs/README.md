# User Profile Application - Development Documentation

## 🚀 Project Overview

A comprehensive full-stack user profile application built with modern web technologies, featuring user authentication, profile management, messaging, AI-powered negotiations, analytics, and admin capabilities.

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for client-side routing
- **TanStack Query v5** for data fetching and caching
- **React Hook Form** with Zod validation
- **Tailwind CSS** with shadcn/ui components
- **Lucide React** for consistent iconography
- **Vite** for build tooling

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Drizzle ORM** with PostgreSQL
- **Replit Authentication** for user management
- **OpenAI API** for AI-powered features
- **Stripe** for payment processing
- **Object Storage** for file uploads

### Database
- **PostgreSQL** (Neon-backed)
- **Drizzle ORM** for database operations
- **Zod** for schema validation

## 🏗 Architecture

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── ...
├── server/                 # Backend Express application
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database layer
│   ├── index.ts           # Server entry point
│   └── ...
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schemas and types
└── docs/                  # Documentation (this folder)
```

## 🎯 Key Features

1. **User Authentication & Profiles** - Secure login with customizable profiles
2. **User Matching System** - AI-powered recommendations and connections
3. **Real-time Messaging** - Secure conversations with notifications
4. **AI Negotiations** - Strategic conversation analysis and recommendations
5. **Analytics Dashboard** - Real-time data visualization and insights
6. **Admin Panel** - User management with role-based access control
7. **Advanced Search** - Filtering and discovery capabilities
8. **Contract Management** - Template-based contract creation and signing
9. **Billing Integration** - Stripe-powered subscription management
10. **File Upload System** - Object storage for profile images and documents

## 🚦 Navigation Structure

The application uses a precedence-based dropdown navigation system:

### Core Functions (Highest Priority)
- **Profile** (Essential) - User profile management
- **Contracts** (High) - Contract creation and management
- **Negotiations** (High) - AI-powered negotiation tools

### Communication (Medium Priority)
- **Messages** (Medium) - Real-time messaging system
- **Connections** (Medium) - User matching and networking
- **Search** (Medium) - Advanced user discovery

### Tools & Analytics (Lower Priority)
- **Analytics** (Low) - Dashboard and insights
- **Templates** (Low) - Contract templates management
- **Billing** (Lowest) - Subscription and payment management

## 🔒 Security Features

- Server-side role-based access control (RBAC)
- Secure API endpoints with authentication middleware
- Input validation using Zod schemas
- Rate limiting for API protection
- Proper data sanitization and type safety

## 📊 Database Schema

Key entities:
- `users` - User profiles and authentication data
- `contracts` - Contract documents and metadata
- `contract_collaborators` - Contract participants
- `contract_signatures` - Digital signatures
- `user_activity` - Activity tracking and analytics
- `contract_templates` - Reusable contract templates

## 🔧 Development Setup

See `DEVELOPMENT_SETUP.md` for detailed instructions on setting up the development environment in VS Code.

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Accessible navigation with keyboard support
- Touch-friendly interface elements
- Progressive enhancement for all features

## 🧪 Testing

- Comprehensive data-testid attributes for E2E testing
- Form validation with user-friendly error messages
- Error boundaries and graceful error handling

## 🚀 Deployment

The application is designed for deployment on Replit with automatic publishing capabilities.

---

*Last Updated: December 28, 2024*