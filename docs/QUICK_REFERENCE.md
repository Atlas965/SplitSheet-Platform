# Quick Reference Guide

## 🚀 Get Started Immediately

### Development URL
Your app is running at: **Check Preview tool or Console tool in Replit for your `.replit.dev` URL**
- Server runs on port 5000
- Application is currently live and accessible

### Essential Commands
```bash
npm run dev              # Start development server
npm run db:push          # Sync database schema  
npm run db:studio        # Open database GUI
npm run type-check       # Check TypeScript errors
```

### Key Directories
```
client/src/pages/        # All main pages/routes
client/src/components/   # Reusable UI components
server/routes.ts         # All API endpoints
shared/schema.ts         # Database schemas & validation
docs/                    # This documentation folder
```

## 🔑 Most Important Files

### Navigation (Just Updated!)
- `client/src/pages/dashboard.tsx` - **Dropdown navigation with precedence ordering**
- Features: Accessible, keyboard navigation, mobile-friendly
- Order: Core Functions → Communication → Tools & Analytics

### User Profile System
- `client/src/pages/profile.tsx` - Profile management with file uploads
- `server/routes.ts` - Profile API endpoints (PATCH /api/profile)
- Secure form validation and data protection

### API Endpoints (Base: `/api`)
```
GET  /api/auth/user           # Current user
PATCH /api/profile            # Update profile
GET  /api/dashboard/stats     # Dashboard data
GET  /api/contracts           # User contracts
GET  /api/negotiations        # Negotiations
GET  /api/messages            # Messages  
GET  /api/matches             # User matching
GET  /api/search/users        # User search
GET  /api/admin/users         # Admin panel
```

## 🛠 VS Code Setup Checklist

### 1. Environment Variables (.env file)
```bash
DATABASE_URL="your-postgres-url"
OPENAI_API_KEY="sk-your-openai-key" 
STRIPE_SECRET_KEY="sk_test_your-stripe-key"
SESSION_SECRET="your-session-secret"
```

### 2. Required Extensions
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Prettier Code Formatter
- Auto Rename Tag

### 3. Start Development
```bash
npm install                  # Install dependencies
npm run db:push             # Setup database
npm run dev                 # Start development server
```

## 🧩 Component Patterns

### Forms with Validation
```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ }
});

// Reset when data loads
useEffect(() => {
  if (data) form.reset(data);
}, [data, form]);
```

### Data Fetching
```tsx
const { data, isLoading } = useQuery<Type>({
  queryKey: ["/api/endpoint"]
});

const mutation = useMutation({
  mutationFn: (data) => apiRequest("/api/endpoint", "POST", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] });
  }
});
```

### Navigation Links
```tsx
// Dropdown menu item
<DropdownMenuItem asChild>
  <Link href="/page">
    <Icon className="mr-3 h-4 w-4" />
    Page Name
    <span className="ml-auto text-xs">Priority</span>
  </Link>
</DropdownMenuItem>
```

## 🎯 Feature Priorities (Current Navigation Order)

### Core Functions (Essential/High)
1. **Profile** - User profile management
2. **Contracts** - Contract creation/management  
3. **Negotiations** - AI-powered negotiation tools

### Communication (Medium)
4. **Messages** - Real-time messaging
5. **Connections** - User matching/networking
6. **Search** - User discovery

### Tools & Analytics (Low/Lowest)
7. **Analytics** - Dashboard insights
8. **Templates** - Contract templates
9. **Billing** - Subscription management

## 🔒 Security Features

- **RBAC** - Role-based access control with database verification
- **Input Validation** - Zod schemas on all endpoints
- **Rate Limiting** - API protection (50 messages/15min)
- **Session Management** - Secure cookie-based authentication
- **Protected Routes** - Server-side authorization

## 🗄 Database Tables

```sql
users                    # User profiles & auth
contracts               # Contract documents
contract_collaborators  # Contract participants  
contract_signatures     # Digital signatures
user_activity          # Activity tracking
contract_templates      # Reusable templates
sessions               # User sessions
```

## 🧪 Testing

All interactive elements have `data-testid` attributes:
- `button-{action}` - Buttons
- `input-{field}` - Input fields
- `dropdown-{item}` - Dropdown items
- `card-{type}-{id}` - Dynamic elements

## 📱 Responsive Design

- **Mobile-first** Tailwind CSS approach
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px)
- **Touch-friendly** minimum 44px touch targets
- **Accessible** keyboard navigation throughout

## ⚡ Performance

- **TanStack Query** for efficient data fetching/caching
- **Code splitting** with dynamic imports
- **Lazy loading** for large components
- **Optimistic updates** for better UX

## 🎨 Design System

- **shadcn/ui** component library
- **Lucide React** icons (consistent throughout)
- **Tailwind CSS** utility-first styling
- **CSS Custom Properties** for theming
- **Light/Dark mode** support

---

**Need Help?** Check the detailed documentation files in this folder:
- `README.md` - Project overview
- `DEVELOPMENT_SETUP.md` - VS Code setup
- `API_DOCUMENTATION.md` - API reference
- `FILE_STRUCTURE.md` - Complete file organization
- `COMPONENT_GUIDE.md` - Component usage patterns

*Updated: December 28, 2024*