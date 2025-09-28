# Development Setup Guide

## 🛠 Setting up VS Code Development Environment

### Prerequisites

1. **Node.js 20+** - Download from [nodejs.org](https://nodejs.org)
2. **PostgreSQL** - Local installation or use cloud service
3. **Git** - For version control
4. **VS Code** - With recommended extensions

### Required VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-typescript.typescript",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### Environment Variables

Create `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
PGUSER="your_username"
PGPASSWORD="your_password"
PGDATABASE="your_database"
PGHOST="localhost"
PGPORT="5432"

# Authentication
SESSION_SECRET="your-super-secret-session-key-here"

# OpenAI (for AI features)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Stripe (for billing)
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
VITE_STRIPE_PUBLIC_KEY="pk_test_your-stripe-public-key"

# Object Storage (if using external storage)
DEFAULT_OBJECT_STORAGE_BUCKET_ID="your-bucket-id"
PUBLIC_OBJECT_SEARCH_PATHS="/public"
PRIVATE_OBJECT_DIR="/private"

# Development
NODE_ENV="development"
```

### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   cd your-project-directory
   npm install
   ```

2. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:push
   
   # Generate database types
   npm run db:generate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Scripts

```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build client",
  "build:server": "tsc --project tsconfig.server.json",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "type-check": "tsc --noEmit"
}
```

### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^'\"`]*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "runtimeArgs": ["-r", "tsx/cjs"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Client",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:client"]
    }
  ]
}
```

### File Structure for Development

```
project-root/
├── .env                    # Environment variables (create this)
├── .vscode/               # VS Code configuration
│   ├── settings.json      # Editor settings
│   ├── launch.json        # Debug configuration
│   └── extensions.json    # Recommended extensions
├── client/                # Frontend application
├── server/                # Backend application
├── shared/                # Shared code and types
├── docs/                  # This documentation
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── vite.config.ts         # Vite build configuration
└── drizzle.config.ts      # Database configuration
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Runs both frontend and backend
   - Hot reloading enabled
   - Available at `http://localhost:5000`

2. **Database Development**
   ```bash
   # View database in GUI
   npm run db:studio
   
   # Update database schema
   npm run db:push
   ```

3. **Type Checking**
   ```bash
   npm run type-check
   ```

4. **Code Formatting**
   - Automatic on save (configured in VS Code settings)
   - Manual: `npx prettier --write .`

### Common Development Tasks

#### Adding New Pages
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Update navigation in `client/src/pages/dashboard.tsx`

#### Adding New API Endpoints
1. Define route in `server/routes.ts`
2. Add validation schema in `shared/schema.ts`
3. Update storage interface in `server/storage.ts`

#### Database Schema Changes
1. Modify schema in `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Update TypeScript types with `npm run db:generate`

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Database Connection Issues**
   - Verify DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Check firewall settings

3. **TypeScript Errors**
   ```bash
   npm run type-check
   ```

4. **Build Issues**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Performance Optimization

- Use React.memo for expensive components
- Implement proper loading states
- Use TanStack Query for efficient data fetching
- Optimize bundle size with code splitting
- Use proper TypeScript strict mode

---

*Ready to start developing! 🚀*