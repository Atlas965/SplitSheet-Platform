# Project File Structure

## 📁 Complete Directory Structure

```
project-root/
├── 📁 client/                          # Frontend React Application
│   ├── 📁 public/                      # Static assets
│   ├── 📁 src/                         # Source code
│   │   ├── 📁 components/              # Reusable UI components
│   │   │   ├── 📁 ui/                  # shadcn/ui components
│   │   │   │   ├── button.tsx          # Button component
│   │   │   │   ├── card.tsx            # Card component
│   │   │   │   ├── dropdown-menu.tsx   # Dropdown menu
│   │   │   │   ├── form.tsx            # Form components
│   │   │   │   ├── input.tsx           # Input component
│   │   │   │   ├── sidebar.tsx         # Sidebar component
│   │   │   │   ├── toast.tsx           # Toast notifications
│   │   │   │   └── ...                 # Other UI components
│   │   │   ├── Logo.tsx                # Application logo
│   │   │   ├── StatCard.tsx            # Statistics display card
│   │   │   └── ObjectUploader.tsx      # File upload component
│   │   ├── 📁 hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts              # Authentication hook
│   │   │   └── use-toast.ts            # Toast notification hook
│   │   ├── 📁 lib/                     # Utility libraries
│   │   │   ├── queryClient.ts          # TanStack Query configuration
│   │   │   ├── authUtils.ts            # Authentication utilities
│   │   │   ├── activityTracker.ts      # User activity tracking
│   │   │   └── utils.ts                # General utilities
│   │   ├── 📁 pages/                   # Route components (main app pages)
│   │   │   ├── dashboard.tsx           # Main dashboard with dropdown nav
│   │   │   ├── profile.tsx             # User profile management
│   │   │   ├── contracts.tsx           # Contract listing
│   │   │   ├── contract-details.tsx    # Individual contract view
│   │   │   ├── contract-edit.tsx       # Contract editing
│   │   │   ├── contract-form.tsx       # New contract creation
│   │   │   ├── negotiations.tsx        # Negotiation listing
│   │   │   ├── negotiation-detail.tsx  # Individual negotiation
│   │   │   ├── messages.tsx            # Messaging interface
│   │   │   ├── matches.tsx             # User matching/connections
│   │   │   ├── search.tsx              # User search functionality
│   │   │   ├── analytics.tsx           # Analytics dashboard
│   │   │   ├── templates.tsx           # Contract templates
│   │   │   ├── billing.tsx             # Billing/subscription
│   │   │   ├── admin.tsx               # Admin panel
│   │   │   ├── landing.tsx             # Landing page
│   │   │   └── not-found.tsx           # 404 page
│   │   ├── App.tsx                     # Main app component with routing
│   │   ├── index.css                   # Global styles with Tailwind
│   │   └── main.tsx                    # App entry point
│   └── index.html                      # HTML template
├── 📁 server/                          # Backend Express Application
│   ├── index.ts                        # Server entry point
│   ├── routes.ts                       # API routes definition
│   ├── storage.ts                      # Database abstraction layer
│   ├── replitAuth.ts                   # Replit authentication setup
│   ├── vite.ts                         # Vite integration
│   └── objectStorage.ts                # Object storage service
├── 📁 shared/                          # Shared code between client/server
│   └── schema.ts                       # Database schemas and Zod validation
├── 📁 docs/                            # Documentation (this folder)
│   ├── README.md                       # Project overview
│   ├── DEVELOPMENT_SETUP.md            # VS Code setup guide
│   ├── API_DOCUMENTATION.md            # API endpoints reference
│   ├── FILE_STRUCTURE.md               # This file
│   └── COMPONENT_GUIDE.md              # Component usage guide
├── 📁 attached_assets/                 # User-uploaded static assets
│   └── stock_images/                   # Stock images directory
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── tsconfig.server.json                # Server TypeScript config
├── tailwind.config.ts                  # Tailwind CSS configuration
├── vite.config.ts                      # Vite build configuration
├── drizzle.config.ts                   # Database configuration
├── postcss.config.js                   # PostCSS configuration
└── .gitignore                          # Git ignore rules
```

## 🎯 Key Files Explained

### Frontend Core Files

#### `client/src/App.tsx`
Main application component handling:
- Route definitions using wouter
- Authentication state management
- Layout structure
- Error boundaries

#### `client/src/pages/dashboard.tsx`
Primary dashboard with:
- **Dropdown navigation menu organized by precedence**
- Statistics overview cards
- Recent activity feed
- Quick action buttons
- Responsive layout

#### `client/src/pages/profile.tsx`
User profile management:
- Form-based profile editing
- File upload for profile images
- Skills management
- Contact information
- Form validation with Zod

### Backend Core Files

#### `server/index.ts`
Express server setup:
- Middleware configuration
- Session management
- Static file serving
- Database initialization
- Route mounting

#### `server/routes.ts`
API endpoint definitions:
- Authentication routes
- CRUD operations for all entities
- Input validation with Zod
- Rate limiting
- Admin-only routes

#### `server/storage.ts`
Database abstraction layer:
- Interface definitions for all entities
- Database operations using Drizzle ORM
- Type-safe database queries
- Connection management

### Shared Code

#### `shared/schema.ts`
Centralized schema definitions:
- Database table schemas using Drizzle
- Zod validation schemas
- TypeScript type definitions
- Insert/update schemas

## 🧩 Component Architecture

### UI Component Hierarchy

```
App
├── Router (wouter)
│   ├── Landing (public)
│   └── Authenticated Routes
│       ├── Dashboard
│       │   ├── Navigation Dropdown
│       │   ├── StatCard (×4)
│       │   └── QuickActions
│       ├── Profile
│       │   ├── ObjectUploader
│       │   └── ProfileForm
│       ├── Contracts
│       │   └── ContractList
│       ├── Messages
│       │   └── ConversationView
│       └── ... other pages
└── Global Components
    ├── Toaster
    ├── QueryClientProvider
    └── TooltipProvider
```

### State Management

- **TanStack Query** for server state
- **React Hook Form** for form state
- **Context API** for authentication state
- **Local state** with useState/useReducer

## 🔄 Data Flow

```
User Interaction
    ↓
Component Event Handler
    ↓
TanStack Query Mutation
    ↓
API Request (via queryClient)
    ↓
Express Route Handler
    ↓
Input Validation (Zod)
    ↓
Storage Layer (Drizzle ORM)
    ↓
PostgreSQL Database
    ↓
Response + Cache Invalidation
    ↓
UI Update
```

## 🛡 Security Architecture

### Authentication Flow
```
User Login → Replit OAuth → Session Creation → Cookie Storage → Route Protection
```

### API Security Layers
1. **Authentication Middleware** - Validates session
2. **Authorization Middleware** - Checks user roles
3. **Input Validation** - Zod schema validation
4. **Rate Limiting** - Per-user API limits
5. **CSRF Protection** - Session-based protection

## 📱 Responsive Design Structure

### Breakpoints (Tailwind CSS)
- `sm`: 640px and up
- `md`: 768px and up  
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

### Layout Patterns
- **Mobile-first** approach
- **Flexbox and Grid** for layouts
- **Collapsible navigation** on mobile
- **Responsive typography** scaling
- **Touch-friendly** interactive elements

## 🎨 Styling Architecture

### Tailwind CSS Organization
```
index.css
├── @tailwind base
├── @tailwind components
├── @tailwind utilities
├── CSS Custom Properties (colors)
├── Component Classes (.nav-item, .dropdown-item, etc.)
└── Responsive Utilities
```

### Color System
- **Light/Dark mode** support
- **Semantic color tokens** (primary, secondary, muted, etc.)
- **Consistent color palette** across all components

## 🗄 Database Architecture

### Table Relationships
```
users (1) ←→ (∞) contracts
users (1) ←→ (∞) contract_collaborators  
users (1) ←→ (∞) user_activity
contracts (1) ←→ (∞) contract_collaborators
contracts (1) ←→ (∞) contract_signatures
contract_templates (1) ←→ (∞) contracts
```

### Schema Organization
- **Core entities**: users, contracts, templates
- **Relationship tables**: collaborators, signatures
- **Activity tracking**: user_activity table
- **Session management**: sessions table

## 🚀 Build and Deployment

### Development Build
```bash
npm run dev
# Runs both client and server in development mode
# Hot reloading enabled
# Source maps included
```

### Production Build
```bash
npm run build
# Builds client with Vite
# Compiles TypeScript server code
# Optimizes and minifies assets
```

### File Output Structure
```
dist/
├── client/          # Built frontend assets
│   ├── index.html
│   ├── assets/      # JS, CSS, images
│   └── ...
└── server/          # Compiled server code
    ├── index.js
    ├── routes.js
    └── ...
```

---

*File Structure Documentation - Last Updated: December 28, 2024*