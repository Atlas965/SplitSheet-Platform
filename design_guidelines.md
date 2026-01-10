# SplitSheet Design Guidelines

## Design Approach
**Selected System**: Combination of Stripe's trust-building patterns + Linear's typography clarity + Notion's content organization

**Rationale**: Legal tech demands maximum credibility. Stripe excels at conveying security/trust, Linear provides exceptional clarity, and Notion offers clean information hierarchy for complex documents.

## Typography System

**Font Families** (Google Fonts):
- Primary: Inter (UI, headings, body)
- Monospace: JetBrains Mono (contract text, signatures, legal identifiers)

**Hierarchy**:
- Hero/H1: 48px/56px, font-semibold
- H2: 36px/44px, font-semibold
- H3: 24px/32px, font-medium
- Body: 16px/28px, font-normal (increased line-height for legal readability)
- Legal text: 15px/26px, font-normal
- Small/Meta: 14px/20px, font-normal
- Signature fields: 18px/24px, JetBrains Mono

## Spacing System
**Tailwind Units**: Use 4, 6, 8, 12, 16, 24 as core spacing values
- Section padding: py-24 (desktop), py-16 (mobile)
- Component spacing: gap-8 between major elements
- Form fields: mb-6 between inputs
- Card padding: p-8
- Button spacing: px-6 py-3

## Layout Structure

**Hero Section** (100vh):
- Large hero image: Professional musician/artist in studio setting (authentic, diverse representation)
- Centered content overlay with blurred-background button
- H1: "Protect Your Music Rights"
- Subheading + Primary CTA
- Trust indicators below fold: "Used by 10,000+ artists • 50,000+ contracts signed"

**Feature Sections** (Multi-column):
- 3-column feature grid showcasing: Smart Contracts, E-Signatures, Rights Management
- Each card: Icon (top-left), title, description, "Learn more" link
- 2-column split sections alternating image/content for detailed features

**E-Signature Demo Section**:
- Full-width with max-w-5xl container
- Side-by-side preview: Contract document (left) + Signature panel (right)
- Show realistic contract preview with signature fields highlighted
- Clear step indicators for signing flow

**Social Proof**:
- Logo grid: Music labels/publishers (grayscale, 6 columns desktop, 3 mobile)
- Testimonial cards: 2-column with artist photos, quotes, role/affiliation

**Footer**:
- Multi-column: Product links, Resources, Legal, Contact
- Newsletter signup: "Get contract management tips"
- Security badges and compliance certifications

## Component Library

**Navigation**:
- Fixed header with backdrop-blur
- Logo left, nav center, "Sign In" + "Get Started" (primary) right
- Hamburger menu mobile

**Buttons**:
- Primary: Solid, rounded-lg, shadow-sm
- Secondary: Border, transparent background
- Text: No background, underline on hover
- Hero overlay buttons: backdrop-blur-md bg-white/90

**Form Components**:
- Generous input padding (px-4 py-3)
- Clear labels above inputs (mb-2)
- Signature pad: Large canvas area (min-h-48) with border-dashed when empty
- Date picker with calendar icon
- Checkbox agreements with linked legal terms

**Document Viewer**:
- Clean white background with subtle border
- Page navigation sidebar
- Signature field indicators (border-2 border-dashed with pulse animation)
- Progress bar showing completion percentage

**Contract Cards**:
- Hover lift effect (shadow transition)
- Status badges (Draft, Pending, Signed, Expired)
- Metadata: Date, parties, contract type
- Quick actions dropdown

**Trust Elements**:
- Security badges: SSL, SOC 2, GDPR compliance
- Encryption indicators on sensitive sections
- "Legally binding" messaging with legal references

## Images Section

**Hero Image**: High-quality photo of diverse musicians collaborating in professional studio. Natural lighting, authentic moment. Dimensions: 1920x1080, optimized for web.

**Feature Images**: 
- Contract preview mockups (realistic document layouts)
- E-signature demonstration (show actual signature being created)
- Dashboard screenshots (authentic platform interface)

**Team/Trust**: Professional headshots for testimonials, authentic music industry professionals

**Icons**: Heroicons (outline style for consistency)

## Accessibility
- All form inputs: Proper labels, ARIA attributes, focus states with clear ring
- High contrast ratios for legal text
- Keyboard navigation for entire signature flow
- Screen reader announcements for signature completion