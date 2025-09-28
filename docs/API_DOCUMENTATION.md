# API Documentation

## 🔗 Base URL
Development: `http://localhost:5000/api`

## 🔐 Authentication

All API endpoints (except login) require authentication via session cookies.

### Authentication Endpoints

#### `GET /api/login`
Redirects to Replit OAuth login page.

#### `GET /api/auth/user`
Returns the currently authenticated user.

**Response:**
```typescript
{
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  skills: string[];
  contactInfo?: {
    phone?: string;
    location?: string;
    website?: string;
  };
  subscriptionTier: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
```

## 👤 User Profile Endpoints

#### `GET /api/profile`
Get the current user's profile.

#### `PATCH /api/profile`
Update user profile information.

**Request Body:**
```typescript
{
  firstName?: string;
  lastName?: string;
  bio?: string;
  skills?: string[];
  contactInfo?: {
    phone?: string;
    location?: string;
    website?: string;
  };
}
```

#### `PUT /api/profile/image`
Update user profile image.

**Request Body:**
```typescript
{
  profileImageUrl: string;
}
```

## 📊 Dashboard Endpoints

#### `GET /api/dashboard/stats`
Get dashboard statistics.

**Response:**
```typescript
{
  totalContracts: number;
  pendingSignatures: number;
  completedThisMonth: number;
  revenueSplit: number;
}
```

## 📝 Contract Endpoints

#### `GET /api/contracts`
Get all contracts for the authenticated user.

**Response:**
```typescript
Array<{
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  createdBy: string;
  data: any;
  metadata?: any;
}>
```

#### `POST /api/contracts`
Create a new contract.

**Request Body:**
```typescript
{
  title: string;
  type: string;
  templateId?: string;
  data: any;
  metadata?: any;
}
```

#### `GET /api/contracts/:id`
Get a specific contract by ID.

#### `PUT /api/contracts/:id`
Update a specific contract.

#### `DELETE /api/contracts/:id`
Delete a specific contract.

## 🤝 Negotiation Endpoints

#### `GET /api/negotiations`
Get all negotiations for the authenticated user.

#### `POST /api/negotiations`
Create a new negotiation.

**Request Body:**
```typescript
{
  title: string;
  description?: string;
  participantEmails: string[];
  contractId?: string;
}
```

#### `GET /api/negotiations/:id`
Get a specific negotiation.

#### `POST /api/negotiations/:id/messages`
Add a message to a negotiation.

**Request Body:**
```typescript
{
  content: string;
  type?: string;
}
```

#### `POST /api/negotiations/:id/analyze`
Get AI analysis of negotiation.

## 💬 Messaging Endpoints

#### `GET /api/conversations`
Get all conversations for the authenticated user.

#### `GET /api/conversations/:userId`
Get conversation with a specific user.

#### `POST /api/conversations/:userId/messages`
Send a message to a user.

**Request Body:**
```typescript
{
  content: string;
}
```

**Rate Limited:** 50 messages per 15 minutes per user.

## 🔍 User Matching Endpoints

#### `GET /api/matches`
Get potential user matches.

**Query Parameters:**
- `skills`: Filter by skills (comma-separated)
- `limit`: Number of results (default: 20)

#### `POST /api/connections`
Send a connection request.

**Request Body:**
```typescript
{
  targetUserId: string;
  message?: string;
}
```

#### `GET /api/connections`
Get all connection requests (sent and received).

#### `PUT /api/connections/:id`
Accept or reject a connection request.

**Request Body:**
```typescript
{
  status: 'accepted' | 'rejected';
}
```

## 🔍 Search Endpoints

#### `GET /api/search/users`
Search for users.

**Query Parameters:**
- `q`: Search query
- `skills`: Filter by skills (comma-separated)
- `subscriptionTier`: Filter by subscription tier
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

## 📊 Analytics Endpoints

#### `GET /api/analytics/overview`
Get analytics overview data.

#### `GET /api/analytics/contracts`
Get contract analytics.

#### `GET /api/analytics/negotiations`
Get negotiation analytics.

#### `GET /api/analytics/activity`
Get user activity analytics.

## 📋 Template Endpoints

#### `GET /api/templates`
Get all contract templates.

#### `GET /api/templates/:id`
Get a specific template.

#### `POST /api/templates`
Create a new template (admin only).

**Request Body:**
```typescript
{
  name: string;
  type: string;
  description?: string;
  template: any;
}
```

## 💳 Billing Endpoints

#### `GET /api/billing/subscription`
Get current subscription status.

#### `POST /api/billing/create-checkout-session`
Create Stripe checkout session.

**Request Body:**
```typescript
{
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}
```

#### `POST /api/billing/cancel-subscription`
Cancel current subscription.

#### `POST /api/billing/webhooks/stripe`
Stripe webhook handler.

## 🔒 Admin Endpoints

*Requires admin role*

#### `GET /api/admin/users`
Get all users with admin details.

#### `GET /api/admin/activity`
Get system activity logs.

#### `PUT /api/admin/users/:id`
Update user (admin only).

## 📁 Object Storage Endpoints

#### `POST /api/objects/upload`
Get upload parameters for object storage.

**Response:**
```typescript
{
  uploadURL: string;
  method: "PUT";
}
```

## 📈 Activity Tracking Endpoints

#### `POST /api/activity`
Track user activity.

**Request Body:**
```typescript
{
  activityType: string;
  metadata?: any;
}
```

#### `POST /api/activity/batch`
Track multiple activities at once.

**Request Body:**
```typescript
{
  activities: Array<{
    activityType: string;
    metadata?: any;
  }>;
}
```

## ⚠️ Error Responses

All endpoints return consistent error responses:

```typescript
{
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## 🔄 Rate Limiting

- **Messages**: 50 per 15 minutes per user
- **Activity Tracking**: 100 per minute per user
- **API Requests**: 1000 per hour per user

## 📝 Request/Response Examples

### Create Contract
```bash
curl -X POST http://localhost:5000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Music Production Agreement",
    "type": "producer",
    "data": {
      "artistName": "John Doe",
      "producerName": "Jane Smith",
      "splits": {"artist": 70, "producer": 30}
    }
  }'
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/conversations/user123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hi there! Interested in collaborating?"
  }'
```

---

*API Documentation - Last Updated: December 28, 2024*