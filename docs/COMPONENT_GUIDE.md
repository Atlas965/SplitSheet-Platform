# Component Usage Guide

## 🧩 UI Components Reference

### Navigation Components

#### Dropdown Navigation Menu
Located in: `client/src/pages/dashboard.tsx`

**Features:**
- Precedence-based organization (Core → Communication → Tools)
- Accessible keyboard navigation
- Mobile-friendly touch interaction
- ARIA compliance
- Lucide React icons

**Usage:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="nav-item">
      <Menu className="mr-1 h-4 w-4" />
      Navigation
      <ChevronDown className="ml-1 h-3 w-3" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-64" align="start">
    <DropdownMenuLabel>Core Functions</DropdownMenuLabel>
    <DropdownMenuItem asChild>
      <Link href="/profile">
        <User className="mr-3 h-4 w-4" />
        Profile
      </Link>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Form Components

#### Profile Form
Located in: `client/src/pages/profile.tsx`

**Features:**
- React Hook Form integration
- Zod validation
- File upload support
- Dynamic skills management
- Nested object handling (contactInfo)

**Key Implementation:**
```tsx
const form = useForm<ProfileFormData>({
  resolver: zodResolver(profileSchema),
  defaultValues: {
    firstName: "",
    lastName: "",
    // ... other fields
  },
});

// Reset form when user data loads
React.useEffect(() => {
  if (user) {
    form.reset({
      firstName: user.firstName || "",
      // ... map user data
    });
  }
}, [user, form]);
```

#### Form Field Pattern
```tsx
<FormField
  control={form.control}
  name="firstName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>First Name</FormLabel>
      <FormControl>
        <Input {...field} value={field.value || ""} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Data Display Components

#### StatCard
Located in: `client/src/components/StatCard.tsx`

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  "data-testid"?: string;
}
```

**Usage:**
```tsx
<StatCard
  title="Total Contracts"
  value="12"
  icon="fas fa-file-contract"
  iconBg="bg-blue-100"
  iconColor="text-blue-600"
  data-testid="stat-total-contracts"
/>
```

### Upload Components

#### ObjectUploader
Located in: `client/src/components/ObjectUploader.tsx`

**Features:**
- Drag & drop interface
- File type validation
- Size limits
- Upload progress
- Object storage integration

**Usage:**
```tsx
<ObjectUploader
  maxNumberOfFiles={1}
  maxFileSize={5242880} // 5MB
  onGetUploadParameters={handleGetUploadParameters}
  onComplete={handleUploadComplete}
  buttonClassName="w-fit"
>
  <div className="flex items-center gap-2">
    <Camera className="h-4 w-4" />
    Upload Photo
  </div>
</ObjectUploader>
```

## 🎨 Styling Patterns

### Button Variants
```tsx
// Primary action
<Button className="btn-primary btn-sm">
  <Plus className="mr-1 h-3 w-3" />
  New Contract
</Button>

// Secondary action  
<Button variant="ghost" size="sm">
  <Mail className="h-4 w-4" />
</Button>

// Using asChild pattern with Link
<Button asChild className="btn-primary">
  <Link href="/create">Create</Link>
</Button>
```

### Navigation Styling
```css
/* Navigation item base style */
.nav-item {
  @apply text-muted-foreground hover:text-foreground 
         transition-colors cursor-pointer pb-4;
}

/* Active navigation state */
.nav-active {
  @apply text-primary border-b-2 border-primary;
}

/* Dropdown items */
.dropdown-item {
  @apply flex items-center space-x-3 px-3 py-2.5 text-sm 
         text-foreground hover:bg-accent hover:text-accent-foreground 
         transition-colors cursor-pointer;
}
```

### Layout Patterns

#### Grid Layout
```tsx
{/* Responsive grid for cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>
```

#### Flex Layout
```tsx
{/* Navigation with space-between */}
<div className="flex items-center justify-between">
  <div className="flex items-center space-x-4">
    {/* Left content */}
  </div>
  <div className="flex items-center space-x-3">
    {/* Right content */}
  </div>
</div>
```

## 🔄 Data Fetching Patterns

### Query Pattern
```tsx
const { data: user, isLoading, error } = useQuery<User>({
  queryKey: ["/api/auth/user"],
  // queryFn is handled automatically by queryClient
});

// Loading state
if (isLoading) {
  return <Skeleton className="h-8 w-full" />;
}

// Error state  
if (error) {
  return <div>Error loading data</div>;
}
```

### Mutation Pattern
```tsx
const updateProfileMutation = useMutation({
  mutationFn: async (data: ProfileFormData) => {
    return apiRequest("/api/profile", "PATCH", data);
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Profile updated successfully.",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: "Failed to update profile.",
      variant: "destructive",
    });
  },
});

// In form submit
const onSubmit = (data: ProfileFormData) => {
  updateProfileMutation.mutate(data);
};
```

### Optimistic Updates
```tsx
const likeMutation = useMutation({
  mutationFn: (id: string) => apiRequest(`/api/posts/${id}/like`, "POST"),
  onMutate: async (id) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    
    // Snapshot previous value
    const previousPosts = queryClient.getQueryData(['posts']);
    
    // Optimistically update
    queryClient.setQueryData(['posts'], (old: Post[]) =>
      old?.map(post => 
        post.id === id 
          ? { ...post, liked: true, likeCount: post.likeCount + 1 }
          : post
      )
    );
    
    return { previousPosts };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousPosts) {
      queryClient.setQueryData(['posts'], context.previousPosts);
    }
  },
});
```

## 🎯 Event Handling Patterns

### Form Event Handling
```tsx
// Form submission
const onSubmit = (data: FormData) => {
  mutation.mutate(data);
};

// Dynamic form updates
const addSkill = () => {
  if (newSkill.trim()) {
    const currentSkills = form.getValues("skills") || [];
    form.setValue("skills", [...currentSkills, newSkill.trim()]);
    setNewSkill("");
  }
};

const removeSkill = (skillToRemove: string) => {
  const currentSkills = form.getValues("skills") || [];
  form.setValue("skills", 
    currentSkills.filter(skill => skill !== skillToRemove)
  );
};
```

### Click Event Handling
```tsx
// Button click with loading state
<Button 
  onClick={() => handleAction()} 
  disabled={mutation.isPending}
>
  {mutation.isPending ? "Processing..." : "Submit"}
</Button>

// Conditional click handlers
<Button
  onClick={item.status === 'draft' ? handleEdit : handleView}
>
  {item.status === 'draft' ? 'Edit' : 'View'}
</Button>
```

## 🧪 Testing Patterns

### Test ID Convention
```tsx
// Interactive elements
<Button data-testid="button-submit">Submit</Button>
<Input data-testid="input-email" />
<Link data-testid="link-profile">Profile</Link>

// Display elements
<div data-testid="text-username">{user.name}</div>
<img data-testid="img-avatar" src={user.avatar} />
<span data-testid="status-payment">{payment.status}</span>

// Dynamic elements
{users.map((user, index) => (
  <Card key={user.id} data-testid={`card-user-${user.id}`}>
    <Button data-testid={`button-edit-user-${user.id}`}>
      Edit
    </Button>
  </Card>
))}
```

## 🔐 Security Patterns

### Input Validation
```tsx
// Client-side validation with Zod
const schema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

### Protected Routes
```tsx
function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <PageContent />;
}
```

### Admin-only Components
```tsx
function AdminSection({ user }: { user: User }) {
  if (user.role !== 'admin') {
    return null; // or redirect
  }
  
  return (
    <AdminPanel>
      {/* Admin content */}
    </AdminPanel>
  );
}
```

## 📱 Responsive Design Patterns

### Mobile-first Approach
```tsx
{/* Mobile-first responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>

{/* Mobile-friendly navigation */}
<nav className="hidden md:flex items-center space-x-8">
  {/* Desktop nav */}
</nav>
<button className="md:hidden" onClick={toggleMobileMenu}>
  <Menu className="h-6 w-6" />
</button>
```

### Touch-friendly Elements
```tsx
{/* Minimum touch target size (44px) */}
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="h-4 w-4" />
</button>

{/* Touch-friendly spacing */}
<div className="space-y-3 md:space-y-2">
  {/* More space on mobile */}
</div>
```

## 🔄 State Management Patterns

### Local State
```tsx
// Simple state
const [isOpen, setIsOpen] = useState(false);

// Object state with updater function
const [formData, setFormData] = useState<FormData>({});
const updateField = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### Effect Patterns
```tsx
// Data fetching effect
useEffect(() => {
  if (user?.id) {
    // Fetch user-specific data
  }
}, [user?.id]);

// Cleanup effect
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

---

*Component Guide - Last Updated: December 28, 2024*