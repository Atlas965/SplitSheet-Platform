/**
 * Entertainment Agreement Template Catalog — shared taxonomies, sections, and
 * the initial 56-template library. Templates are workflow/documentation
 * definitions, NOT counsel-approved legal instruments.
 */

// ── Lifecycle & review ───────────────────────────────────────────────────────

export const TEMPLATE_STATUSES = [
  "draft",
  "internal_review",
  "legal_review",
  "approved",
  "active",
  "deprecated",
  "archived",
] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const LEGAL_REVIEW_STATUSES = [
  "NOT_REVIEWED",
  "INTERNAL_REVIEW",
  "COUNSEL_REVIEW",
  "COUNSEL_APPROVED",
  "REQUIRES_UPDATE",
  "DEPRECATED",
] as const;
export type LegalReviewStatus = (typeof LEGAL_REVIEW_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// ── Categories (extensible for future verticals) ─────────────────────────────

export const TEMPLATE_CATEGORIES = [
  { id: "song-creation", label: "Song Creation", industry: "music" },
  { id: "master-rights", label: "Master Rights", industry: "music" },
  { id: "publishing", label: "Publishing", industry: "music" },
  { id: "artist-label", label: "Artist & Label", industry: "music" },
  { id: "licensing", label: "Licensing", industry: "music" },
  { id: "live-touring", label: "Live & Touring", industry: "music" },
  // Reserved future categories (architecture only — no templates yet)
  { id: "film", label: "Film", industry: "film", reserved: true },
  { id: "television", label: "Television", industry: "television", reserved: true },
  { id: "gaming", label: "Gaming", industry: "gaming", reserved: true },
  { id: "podcast", label: "Podcast", industry: "podcast", reserved: true },
  { id: "creator-economy", label: "Creator Economy", industry: "creator", reserved: true },
  { id: "advertising", label: "Advertising", industry: "advertising", reserved: true },
  { id: "sports-live", label: "Sports & Live Entertainment", industry: "sports", reserved: true },
  { id: "financing", label: "Financing", industry: "finance", reserved: true },
  { id: "catalog-acquisition", label: "Catalog Acquisition", industry: "catalog", reserved: true },
] as const;

export type TemplateCategoryId = (typeof TEMPLATE_CATEGORIES)[number]["id"];

// ── Rights taxonomy ──────────────────────────────────────────────────────────

export const RIGHTS_TAXONOMY = [
  "COMPOSITION",
  "MASTER",
  "PUBLISHING",
  "MECHANICAL",
  "PERFORMANCE",
  "SYNCHRONIZATION",
  "NEIGHBORING_RIGHTS",
  "NAME_IMAGE_LIKENESS",
  "MERCHANDISING",
  "DISTRIBUTION",
  "LICENSE",
  "OWNERSHIP",
  "ROYALTY",
  "REVENUE_SHARE",
  "SERVICES",
] as const;
export type RightsCategory = (typeof RIGHTS_TAXONOMY)[number];

// ── Party taxonomy ───────────────────────────────────────────────────────────

export const PARTY_TYPES = [
  "Artist",
  "Producer",
  "Songwriter",
  "Co-Writer",
  "Publisher",
  "Label",
  "Distributor",
  "Manager",
  "Booking Agent",
  "Venue",
  "Promoter",
  "Studio",
  "Session Musician",
  "Remixer",
  "Brand",
  "Advertiser",
  "Licensee",
  "Licensor",
  "Content Creator",
  "Film Producer",
  "Television Producer",
  "Investor",
  "Rights Holder",
  "Vocalist",
  "Featured Artist",
] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

// ── Field engine types ───────────────────────────────────────────────────────

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "date",
  "datetime",
  "currency",
  "percentage",
  "number",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "address",
  "party",
  "rights_selection",
  "territory",
  "term",
  "royalty",
  "ownership_split",
  "file_upload",
  "signature",
  "initials",
  "array",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type TemplateFieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  section?: string;
  options?: string[];
  placeholder?: string;
  helpText?: string;
};

export type TemplateSectionDef = {
  id: string;
  title: string;
  description?: string;
};

export const CORE_SECTIONS: TemplateSectionDef[] = [
  { id: "parties", title: "Parties" },
  { id: "transaction", title: "Transaction Details" },
  { id: "services", title: "Services & Deliverables" },
  { id: "compensation", title: "Compensation" },
  { id: "rights", title: "Rights" },
  { id: "ownership", title: "Ownership" },
  { id: "royalties", title: "Royalties" },
  { id: "territory_term", title: "Territory & Term" },
  { id: "exclusivity", title: "Exclusivity" },
  { id: "credit", title: "Credit" },
  { id: "representations", title: "Representations" },
  { id: "confidentiality", title: "Confidentiality" },
  { id: "termination", title: "Termination" },
  { id: "signatures", title: "Signatures" },
  { id: "additional", title: "Additional Terms" },
];

/** Shared field kits composed into templates */
const F = {
  title: (label = "Agreement Title"): TemplateFieldDef => ({
    name: "title",
    label,
    type: "text",
    required: true,
    section: "transaction",
  }),
  songTitle: (): TemplateFieldDef => ({
    name: "songTitle",
    label: "Song / Composition Title",
    type: "text",
    required: true,
    section: "transaction",
  }),
  recordingTitle: (): TemplateFieldDef => ({
    name: "recordingTitle",
    label: "Recording / Master Title",
    type: "text",
    required: true,
    section: "transaction",
  }),
  effectiveDate: (): TemplateFieldDef => ({
    name: "effectiveDate",
    label: "Effective Date",
    type: "date",
    required: true,
    section: "transaction",
  }),
  territory: (): TemplateFieldDef => ({
    name: "territory",
    label: "Territory",
    type: "territory",
    required: true,
    section: "territory_term",
    options: ["Worldwide", "CA", "US", "UK", "EU", "AU", "Other"],
  }),
  term: (): TemplateFieldDef => ({
    name: "term",
    label: "Term",
    type: "term",
    required: true,
    section: "territory_term",
    placeholder: "e.g. 2 years / perpetual / life of copyright",
  }),
  exclusivity: (): TemplateFieldDef => ({
    name: "exclusivity",
    label: "Exclusivity",
    type: "select",
    required: true,
    section: "exclusivity",
    options: ["Exclusive", "Non-Exclusive", "Semi-Exclusive"],
  }),
  ownershipSplit: (): TemplateFieldDef => ({
    name: "ownershipSplit",
    label: "Ownership Split",
    type: "ownership_split",
    required: true,
    section: "ownership",
    helpText: "Ownership percentages must total 100%.",
  }),
  royaltyPct: (name = "royaltyPercentage", label = "Royalty %"): TemplateFieldDef => ({
    name,
    label,
    type: "royalty",
    required: true,
    section: "royalties",
  }),
  fee: (name = "fee", label = "Fee"): TemplateFieldDef => ({
    name,
    label,
    type: "currency",
    required: true,
    section: "compensation",
  }),
  credit: (): TemplateFieldDef => ({
    name: "credit",
    label: "Credit Requirement",
    type: "text",
    required: false,
    section: "credit",
  }),
  additionalTerms: (): TemplateFieldDef => ({
    name: "additionalTerms",
    label: "Additional Terms",
    type: "textarea",
    required: false,
    section: "additional",
  }),
  party: (name: string, label: string, required = true): TemplateFieldDef => ({
    name,
    label,
    type: "party",
    required,
    section: "parties",
  }),
  rightsSelection: (): TemplateFieldDef => ({
    name: "rightsGranted",
    label: "Rights Granted",
    type: "rights_selection",
    required: true,
    section: "rights",
  }),
  deliverables: (): TemplateFieldDef => ({
    name: "deliverables",
    label: "Deliverables",
    type: "textarea",
    required: true,
    section: "services",
  }),
  signature: (): TemplateFieldDef => ({
    name: "signatureAck",
    label: "Signature Acknowledgement",
    type: "checkbox",
    required: true,
    section: "signatures",
    helpText: "Parties will execute via SplitSheet confirmation / e-signature workflow.",
  }),
};

export const LEGAL_DISCLAIMER =
  "Template provided for workflow and documentation purposes. Legal suitability depends on jurisdiction and transaction. Consult qualified counsel where appropriate. SplitSheet is not a law firm and does not provide legal advice.";

export const PLACEHOLDER_CLAUSES = [
  "[WORKFLOW PLACEHOLDER] Parties and roles as identified in this agreement.",
  "[WORKFLOW PLACEHOLDER] Rights, ownership, and compensation as configured in the transaction fields.",
  "[WORKFLOW PLACEHOLDER] Territory, term, and exclusivity as specified herein.",
  LEGAL_DISCLAIMER,
];

export type CatalogTemplateSeed = {
  name: string;
  /** Stable slug used as contracts.type and template lookup key */
  type: string;
  slug: string;
  category: TemplateCategoryId;
  subcategory?: string;
  description: string;
  industry: string;
  agreementType: string;
  version: string;
  status: TemplateStatus;
  jurisdiction: string;
  legalReviewStatus: LegalReviewStatus;
  rightsCategories: RightsCategory[];
  requiredParties: PartyType[];
  optionalParties: PartyType[];
  riskLevel: RiskLevel;
  workflowType: string;
  supportedTransactions: string[];
  sections: string[];
  fields: TemplateFieldDef[];
  /** When true, preserve richer legacy field JSON if already seeded */
  legacy?: boolean;
};

function base(partial: Omit<CatalogTemplateSeed, "version" | "jurisdiction" | "industry" | "legalReviewStatus" | "sections"> & Partial<CatalogTemplateSeed>): CatalogTemplateSeed {
  const fields = partial.fields ?? [];
  const sections = Array.from(
    new Set(fields.map((f) => f.section).filter(Boolean) as string[]),
  );
  return {
    version: "1.0",
    industry: "music",
    jurisdiction: "CA",
    legalReviewStatus: "NOT_REVIEWED",
    sections,
    optionalParties: [],
    supportedTransactions: [],
    workflowType: "standard-agreement",
    ...partial,
    fields,
  };
}

function withCommon(fields: TemplateFieldDef[]): TemplateFieldDef[] {
  return [
    ...fields,
    F.territory(),
    F.term(),
    F.exclusivity(),
    F.additionalTerms(),
    F.signature(),
  ];
}

/** Initial Entertainment Agreement Template Library (56) */
export const CATALOG_TEMPLATES: CatalogTemplateSeed[] = [
  // ── A. Song Creation & Ownership ─────────────────────────────────────────
  base({
    name: "Split Sheet",
    type: "split-sheet",
    slug: "split-sheet",
    category: "song-creation",
    subcategory: "ownership",
    description: "Document composition ownership percentages and collaborator roles for a song.",
    agreementType: "ownership_split",
    status: "active",
    legacy: true,
    rightsCategories: ["COMPOSITION", "OWNERSHIP", "PUBLISHING", "ROYALTY"],
    requiredParties: ["Songwriter"],
    optionalParties: ["Producer", "Co-Writer", "Publisher"],
    riskLevel: "medium",
    workflowType: "split-confirmation",
    supportedTransactions: ["song_creation", "composition_ownership"],
    fields: [
      F.title("Song Title"),
      { name: "releaseDate", label: "Release Date", type: "date", required: false, section: "transaction" },
      { name: "collaborators", label: "Collaborators", type: "array", required: true, section: "ownership" },
      { name: "performanceRoyalties", label: "Performance Royalties", type: "select", required: true, section: "royalties", options: ["PRO default", "Custom"] },
      { name: "mechanicalRoyalties", label: "Mechanical Royalties", type: "select", required: true, section: "royalties", options: ["Standard", "Custom"] },
      F.additionalTerms(),
    ],
  }),
  base({
    name: "Co-Writing Agreement",
    type: "co-writing",
    slug: "co-writing",
    category: "song-creation",
    description: "Define co-writing roles, ownership, and credit between songwriters.",
    agreementType: "collaboration",
    status: "internal_review",
    rightsCategories: ["COMPOSITION", "OWNERSHIP", "PUBLISHING"],
    requiredParties: ["Songwriter", "Co-Writer"],
    riskLevel: "medium",
    supportedTransactions: ["co_write"],
    fields: withCommon([
      F.title(),
      F.songTitle(),
      F.party("songwriter", "Songwriter"),
      F.party("coWriter", "Co-Writer"),
      F.ownershipSplit(),
      F.credit(),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Songwriter Collaboration Agreement",
    type: "songwriter-collaboration",
    slug: "songwriter-collaboration",
    category: "song-creation",
    description: "Multi-party songwriter collaboration covering splits, credit, and administration.",
    agreementType: "collaboration",
    status: "internal_review",
    rightsCategories: ["COMPOSITION", "OWNERSHIP", "PUBLISHING", "MECHANICAL"],
    requiredParties: ["Songwriter"],
    optionalParties: ["Publisher"],
    riskLevel: "medium",
    fields: withCommon([
      F.title(),
      F.songTitle(),
      F.ownershipSplit(),
      F.party("administrator", "Publishing Administrator", false),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Producer Agreement",
    type: "producer",
    slug: "producer",
    category: "song-creation",
    description: "Establish production services, fees, credits, and royalty participation.",
    agreementType: "services_royalty",
    status: "active",
    legacy: true,
    rightsCategories: ["MASTER", "ROYALTY", "SERVICES"],
    requiredParties: ["Artist", "Producer"],
    riskLevel: "medium",
    fields: [
      F.title("Track Title"),
      { name: "producerName", label: "Producer Name", type: "text", required: true, section: "parties" },
      { name: "beatPrice", label: "Beat / Production Fee", type: "number", required: true, section: "compensation" },
      { name: "royaltyPercentage", label: "Royalty Percentage", type: "number", required: true, section: "royalties" },
      { name: "creditRequirement", label: "Credit Requirement", type: "text", required: true, section: "credit" },
      F.additionalTerms(),
    ],
  }),
  base({
    name: "Producer Royalty Participation Agreement",
    type: "producer-royalty",
    slug: "producer-royalty",
    category: "song-creation",
    description: "Document producer backend royalty points without full production services terms.",
    agreementType: "royalty",
    status: "internal_review",
    rightsCategories: ["MASTER", "ROYALTY", "REVENUE_SHARE"],
    requiredParties: ["Artist", "Producer"],
    riskLevel: "high",
    fields: withCommon([
      F.title(),
      F.recordingTitle(),
      F.party("artist", "Artist"),
      F.party("producer", "Producer"),
      F.royaltyPct("producerRoyalty", "Producer Royalty %"),
      F.fee("advance", "Advance (if any)"),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Session Musician Agreement",
    type: "session-musician",
    slug: "session-musician",
    category: "song-creation",
    description: "Session performance services, fees, and neighboring rights acknowledgements.",
    agreementType: "services",
    status: "internal_review",
    rightsCategories: ["SERVICES", "NEIGHBORING_RIGHTS", "MASTER"],
    requiredParties: ["Artist", "Session Musician"],
    riskLevel: "low",
    fields: withCommon([
      F.title(),
      F.recordingTitle(),
      F.party("sessionMusician", "Session Musician"),
      F.fee("sessionFee", "Session Fee"),
      F.deliverables(),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Featured Artist Agreement",
    type: "featured-artist",
    slug: "featured-artist",
    category: "song-creation",
    description: "Feature appearance, fee/royalty, credit, and master participation terms.",
    agreementType: "feature",
    status: "internal_review",
    rightsCategories: ["MASTER", "ROYALTY", "NAME_IMAGE_LIKENESS"],
    requiredParties: ["Artist", "Featured Artist"],
    riskLevel: "medium",
    fields: withCommon([
      F.title(),
      F.recordingTitle(),
      F.party("primaryArtist", "Primary Artist"),
      F.party("featuredArtist", "Featured Artist"),
      F.fee("featureFee", "Feature Fee"),
      F.royaltyPct(),
      F.credit(),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Vocalist Agreement",
    type: "vocalist",
    slug: "vocalist",
    category: "song-creation",
    description: "Vocal performance services, delivery, credit, and optional royalty participation.",
    agreementType: "services",
    status: "internal_review",
    rightsCategories: ["SERVICES", "MASTER", "ROYALTY"],
    requiredParties: ["Artist", "Vocalist"],
    riskLevel: "low",
    fields: withCommon([
      F.title(),
      F.recordingTitle(),
      F.party("vocalist", "Vocalist"),
      F.fee("vocalFee", "Vocal Fee"),
      F.royaltyPct("vocalRoyalty", "Royalty % (optional)"),
      F.deliverables(),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Work-for-Hire Music Agreement",
    type: "work-for-hire-music",
    slug: "work-for-hire-music",
    category: "song-creation",
    description: "Commissioned music services with work-for-hire / assignment workflow fields.",
    agreementType: "work_for_hire",
    status: "internal_review",
    rightsCategories: ["COMPOSITION", "MASTER", "OWNERSHIP", "SERVICES"],
    requiredParties: ["Rights Holder", "Songwriter"],
    riskLevel: "high",
    fields: withCommon([
      F.title(),
      F.party("commissioningParty", "Commissioning Party"),
      F.party("creator", "Creator"),
      F.fee("commissionFee", "Commission Fee"),
      F.rightsSelection(),
      F.deliverables(),
      F.effectiveDate(),
    ]),
  }),
  base({
    name: "Remixer Agreement",
    type: "remixer",
    slug: "remixer",
    category: "song-creation",
    description: "Remix services, stem delivery, credit, and remix master rights.",
    agreementType: "remix",
    status: "internal_review",
    rightsCategories: ["MASTER", "LICENSE", "ROYALTY", "SERVICES"],
    requiredParties: ["Artist", "Remixer"],
    riskLevel: "medium",
    fields: withCommon([
      F.title(),
      F.recordingTitle(),
      F.party("remixer", "Remixer"),
      F.fee("remixFee", "Remix Fee"),
      F.royaltyPct("remixRoyalty", "Remix Royalty %"),
      F.deliverables(),
      F.effectiveDate(),
    ]),
  }),

  // ── B. Master Recordings ─────────────────────────────────────────────────
  ...([
    ["Master Recording Ownership Agreement", "master-ownership", "Document ownership of a sound recording master.", ["MASTER", "OWNERSHIP"], ["Artist", "Label"], "high"],
    ["Master Rights Assignment", "master-assignment", "Assign master rights from assignor to assignee with consideration fields.", ["MASTER", "OWNERSHIP"], ["Rights Holder", "Label"], "critical"],
    ["Master License Agreement", "master-license", "License a master for specified uses, term, and territory.", ["MASTER", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Exclusive Master License", "exclusive-master-license", "Exclusive master license with territory, term, and royalty terms.", ["MASTER", "LICENSE", "ROYALTY"], ["Licensor", "Licensee"], "high"],
    ["Non-Exclusive Master License", "non-exclusive-master-license", "Non-exclusive master license for defined uses.", ["MASTER", "LICENSE"], ["Licensor", "Licensee"], "medium"],
    ["Master Use / Recording License", "master-use-license", "Master use license for third-party exploitation of a recording.", ["MASTER", "LICENSE", "SYNCHRONIZATION"], ["Licensor", "Licensee"], "high"],
    ["Recording Studio Agreement", "recording-studio", "Studio booking, rates, and session deliverables.", ["SERVICES", "MASTER"], ["Studio", "Artist"], "low"],
    ["Recording Services Agreement", "recording-services", "Recording engineering / production services and delivery.", ["SERVICES", "MASTER"], ["Studio", "Artist"], "low"],
  ] as const).map(([name, slug, description, rights, parties, risk]) =>
    base({
      name,
      type: slug,
      slug,
      category: "master-rights",
      description,
      agreementType: "master",
      status: "internal_review",
      rightsCategories: rights as unknown as RightsCategory[],
      requiredParties: parties as unknown as PartyType[],
      riskLevel: risk as RiskLevel,
      fields: withCommon([
        F.title(),
        F.recordingTitle(),
        F.party("partyA", parties[0]),
        F.party("partyB", parties[1]),
        F.fee(),
        F.rightsSelection(),
        ...(slug.includes("ownership") || slug.includes("assignment") ? [F.ownershipSplit()] : [F.royaltyPct()]),
        F.effectiveDate(),
      ]),
    }),
  ),

  // ── C. Publishing ────────────────────────────────────────────────────────
  ...([
    ["Music Publishing Agreement", "music-publishing", "Publisher / writer publishing terms and administration.", ["PUBLISHING", "COMPOSITION", "ROYALTY"], ["Songwriter", "Publisher"], "critical"],
    ["Co-Publishing Agreement", "co-publishing", "Shared publishing ownership between writer and publisher.", ["PUBLISHING", "OWNERSHIP", "ROYALTY"], ["Songwriter", "Publisher"], "high"],
    ["Publishing Administration Agreement", "publishing-admin", "Administration of publishing without full ownership transfer.", ["PUBLISHING", "PERFORMANCE", "MECHANICAL", "ROYALTY"], ["Songwriter", "Publisher"], "high"],
    ["Sub-Publishing Agreement", "sub-publishing", "Territory sub-publishing appointment.", ["PUBLISHING", "LICENSE"], ["Publisher", "Publisher"], "high"],
    ["Publishing Assignment", "publishing-assignment", "Assignment of publishing interest workflow fields.", ["PUBLISHING", "OWNERSHIP"], ["Songwriter", "Publisher"], "critical"],
    ["Copyright Assignment", "copyright-assignment", "Assignment of copyright interest workflow fields.", ["COMPOSITION", "OWNERSHIP"], ["Songwriter", "Rights Holder"], "critical"],
    ["Mechanical License", "mechanical-license", "Mechanical reproduction license for compositions.", ["MECHANICAL", "COMPOSITION", "LICENSE"], ["Licensor", "Licensee"], "medium"],
    ["Synchronization License", "synchronization-license", "Composition sync license for audiovisual use.", ["SYNCHRONIZATION", "COMPOSITION", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Performance Rights License", "performance-rights-license", "Public performance license documentation fields.", ["PERFORMANCE", "COMPOSITION", "LICENSE"], ["Licensor", "Licensee"], "medium"],
    ["Catalogue Administration Agreement", "catalogue-admin", "Administration of an existing publishing catalogue.", ["PUBLISHING", "PERFORMANCE", "MECHANICAL", "ROYALTY"], ["Rights Holder", "Publisher"], "high"],
  ] as const).map(([name, slug, description, rights, parties, risk]) =>
    base({
      name,
      type: slug,
      slug,
      category: "publishing",
      description,
      agreementType: "publishing",
      status: "internal_review",
      rightsCategories: rights as unknown as RightsCategory[],
      requiredParties: parties as unknown as PartyType[],
      riskLevel: risk as RiskLevel,
      fields: withCommon([
        F.title(),
        F.songTitle(),
        F.party("partyA", parties[0]),
        F.party("partyB", parties[1]),
        F.rightsSelection(),
        F.royaltyPct("adminShare", "Admin / Royalty Share %"),
        F.fee("consideration", "Consideration"),
        F.effectiveDate(),
      ]),
    }),
  ),

  // ── D. Artist / Label ────────────────────────────────────────────────────
  base({
    name: "Artist Management Agreement",
    type: "management",
    slug: "management",
    category: "artist-label",
    description: "Define management representation, commission, and responsibilities.",
    agreementType: "management",
    status: "active",
    legacy: true,
    rightsCategories: ["SERVICES", "REVENUE_SHARE"],
    requiredParties: ["Artist", "Manager"],
    riskLevel: "high",
    fields: [
      F.title(),
      { name: "managerName", label: "Manager Name", type: "text", required: true, section: "parties" },
      { name: "commissionRate", label: "Commission Rate", type: "number", required: true, section: "compensation" },
      { name: "contractDuration", label: "Contract Duration", type: "text", required: true, section: "territory_term" },
      { name: "responsibilities", label: "Manager Responsibilities", type: "textarea", required: true, section: "services" },
      F.additionalTerms(),
    ],
  }),
  ...([
    ["Recording Artist Agreement", "recording-artist", "Artist recording commitment and label services outline.", ["MASTER", "ROYALTY", "SERVICES"], ["Artist", "Label"], "critical"],
    ["Label Services Agreement", "label-services", "À-la-carte label services without exclusive recording deal.", ["SERVICES", "DISTRIBUTION", "MASTER"], ["Artist", "Label"], "high"],
    ["Distribution Agreement", "distribution", "Physical/digital distribution appointment.", ["DISTRIBUTION", "MASTER"], ["Artist", "Distributor"], "high"],
    ["Digital Distribution Agreement", "digital-distribution", "Digital DSP distribution terms and revenue share.", ["DISTRIBUTION", "MASTER", "REVENUE_SHARE"], ["Artist", "Distributor"], "medium"],
    ["Artist Services Agreement", "artist-services", "General artist services engagement.", ["SERVICES"], ["Artist", "Label"], "medium"],
    ["Artist Development Agreement", "artist-development", "Development funding, services, and option fields.", ["SERVICES", "MASTER", "ROYALTY"], ["Artist", "Label"], "high"],
    ["Marketing Services Agreement", "marketing-services", "Marketing campaign services and deliverables.", ["SERVICES"], ["Artist", "Brand"], "low"],
    ["Publicity Agreement", "publicity", "Publicity / PR services engagement.", ["SERVICES", "NAME_IMAGE_LIKENESS"], ["Artist", "Brand"], "low"],
    ["Merchandising Agreement", "merchandising", "Merchandise rights and revenue participation.", ["MERCHANDISING", "NAME_IMAGE_LIKENESS", "REVENUE_SHARE"], ["Artist", "Brand"], "medium"],
  ] as const).map(([name, slug, description, rights, parties, risk]) =>
    base({
      name,
      type: slug,
      slug,
      category: "artist-label",
      description,
      agreementType: "artist_label",
      status: "internal_review",
      rightsCategories: rights as unknown as RightsCategory[],
      requiredParties: parties as unknown as PartyType[],
      riskLevel: risk as RiskLevel,
      fields: withCommon([
        F.title(),
        F.party("partyA", parties[0]),
        F.party("partyB", parties[1]),
        F.fee(),
        F.royaltyPct("revenueShare", "Revenue Share %"),
        F.deliverables(),
        F.effectiveDate(),
      ]),
    }),
  ),

  // ── E. Licensing ─────────────────────────────────────────────────────────
  ...([
    ["Sync License", "sync-license", "General synchronization license covering composition and/or master.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Master Sync License", "master-sync-license", "Sync license limited to the master recording.", ["SYNCHRONIZATION", "MASTER", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Composition Sync License", "composition-sync-license", "Sync license limited to the underlying composition.", ["SYNCHRONIZATION", "COMPOSITION", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Film Music License", "film-music-license", "Music license for theatrical / film use.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Film Producer"], "high"],
    ["Television Music License", "television-music-license", "Music license for television programming.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Television Producer"], "high"],
    ["Advertising Music License", "advertising-music-license", "Music license for advertising / commercial use.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Advertiser"], "critical"],
    ["Video Game Music License", "video-game-music-license", "Music license for interactive / game use.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Licensee"], "high"],
    ["Podcast Music License", "podcast-music-license", "Music license for podcast episodes.", ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"], ["Licensor", "Content Creator"], "medium"],
    ["Creator / YouTube Music License", "creator-youtube-music-license", "Music license for online creator / YouTube use.", ["LICENSE", "COMPOSITION", "MASTER"], ["Licensor", "Content Creator"], "medium"],
    ["Social Media Music License", "social-media-music-license", "Music license for social platform content.", ["LICENSE", "COMPOSITION", "MASTER"], ["Licensor", "Content Creator"], "medium"],
  ] as const).map(([name, slug, description, rights, parties, risk]) =>
    base({
      name,
      type: slug,
      slug,
      category: "licensing",
      description,
      agreementType: "license",
      status: "internal_review",
      rightsCategories: rights as unknown as RightsCategory[],
      requiredParties: parties as unknown as PartyType[],
      riskLevel: risk as RiskLevel,
      fields: withCommon([
        F.title(),
        F.songTitle(),
        F.recordingTitle(),
        F.party("licensor", parties[0]),
        F.party("licensee", parties[1]),
        F.rightsSelection(),
        F.fee("licenseFee", "License Fee"),
        { name: "media", label: "Media / Usage", type: "textarea", required: true, section: "transaction" },
        F.effectiveDate(),
      ]),
    }),
  ),

  // ── F. Live / Touring ────────────────────────────────────────────────────
  base({
    name: "Artist Performance Agreement",
    type: "performance",
    slug: "performance",
    category: "live-touring",
    description: "Secure artist performance bookings with venues and organizers.",
    agreementType: "live_performance",
    status: "active",
    legacy: true,
    rightsCategories: ["SERVICES", "PERFORMANCE", "NAME_IMAGE_LIKENESS"],
    requiredParties: ["Artist", "Venue"],
    optionalParties: ["Promoter"],
    riskLevel: "medium",
    fields: [
      F.title("Event Title"),
      { name: "venue", label: "Venue", type: "text", required: true, section: "parties" },
      { name: "eventDate", label: "Event Date", type: "datetime", required: true, section: "transaction" },
      { name: "performanceFee", label: "Performance Fee", type: "number", required: true, section: "compensation" },
      { name: "technicalRequirements", label: "Technical Requirements", type: "textarea", required: false, section: "services" },
      F.additionalTerms(),
    ],
  }),
  ...([
    ["Live Performance Agreement", "live-performance", "General live performance engagement terms.", ["SERVICES", "PERFORMANCE"], ["Artist", "Promoter"], "medium"],
    ["Venue Agreement", "venue-agreement", "Venue hire / house agreement for a performance.", ["SERVICES"], ["Artist", "Venue"], "medium"],
    ["Promoter Agreement", "promoter-agreement", "Promoter engagement and settlement terms.", ["SERVICES", "REVENUE_SHARE"], ["Artist", "Promoter"], "high"],
    ["Booking Agreement", "booking-agreement", "Booking agent appointment and commission.", ["SERVICES", "REVENUE_SHARE"], ["Artist", "Booking Agent"], "medium"],
    ["Tour Agreement", "tour-agreement", "Multi-date tour services and settlement.", ["SERVICES", "REVENUE_SHARE"], ["Artist", "Promoter"], "high"],
    ["Festival Performance Agreement", "festival-performance", "Festival appearance fee, slot, and rider fields.", ["SERVICES", "PERFORMANCE"], ["Artist", "Promoter"], "medium"],
    ["Sponsorship Agreement", "sponsorship", "Brand sponsorship of artist / tour / event.", ["SERVICES", "NAME_IMAGE_LIKENESS"], ["Artist", "Brand"], "medium"],
  ] as const).map(([name, slug, description, rights, parties, risk]) =>
    base({
      name,
      type: slug,
      slug,
      category: "live-touring",
      description,
      agreementType: "live",
      status: "internal_review",
      rightsCategories: rights as unknown as RightsCategory[],
      requiredParties: parties as unknown as PartyType[],
      riskLevel: risk as RiskLevel,
      fields: withCommon([
        F.title(),
        F.party("partyA", parties[0]),
        F.party("partyB", parties[1]),
        { name: "eventDate", label: "Event / Start Date", type: "date", required: true, section: "transaction" },
        F.fee("fee", "Fee / Guarantee"),
        F.deliverables(),
        F.effectiveDate(),
      ]),
    }),
  ),
];

export function buildTemplateJson(seed: CatalogTemplateSeed) {
  return {
    version: seed.version,
    sections: seed.sections.map((id) => CORE_SECTIONS.find((s) => s.id === id) ?? { id, title: id }),
    fields: seed.fields,
    legalClauses: PLACEHOLDER_CLAUSES,
    disclaimer: LEGAL_DISCLAIMER,
    fieldEngine: true,
  };
}

export function catalogToDbRow(seed: CatalogTemplateSeed) {
  return {
    name: seed.name,
    type: seed.type,
    slug: seed.slug,
    description: seed.description,
    category: seed.category,
    subcategory: seed.subcategory ?? null,
    industry: seed.industry,
    agreementType: seed.agreementType,
    version: seed.version,
    status: seed.status,
    jurisdiction: seed.jurisdiction,
    legalReviewStatus: seed.legalReviewStatus,
    rightsCategories: seed.rightsCategories,
    requiredParties: seed.requiredParties,
    optionalParties: seed.optionalParties,
    riskLevel: seed.riskLevel,
    workflowType: seed.workflowType,
    supportedTransactions: seed.supportedTransactions,
    isActive: seed.status === "active",
    template: buildTemplateJson(seed),
  };
}

/** Production-usable statuses for creating agreements */
export function isCreatableStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "approved";
}

/** Internal operators may still draft from internal_review with a warning */
export function isDraftableStatus(status: string | null | undefined): boolean {
  return isCreatableStatus(status) || status === "internal_review" || status === "legal_review";
}

export type RecommendationInput = {
  roles?: string[];
  hasProducer?: boolean;
  hasExternalBeat?: boolean;
  songwriterCount?: number;
  hasMaster?: boolean;
  hasPublishing?: boolean;
  hasLiveEvent?: boolean;
  hasSyncUse?: boolean;
  notes?: string;
};

export type TemplateRecommendation = {
  template: string;
  priority: "high" | "medium" | "low";
  required: boolean;
  reason: string;
  riskLevel: RiskLevel;
};

export function recommendAgreements(input: RecommendationInput): TemplateRecommendation[] {
  const recs: TemplateRecommendation[] = [];
  const roles = (input.roles ?? []).map((r) => r.toLowerCase());
  const hasRole = (...names: string[]) =>
    names.some((n) => roles.some((r) => r.includes(n)));

  const push = (r: TemplateRecommendation) => {
    if (!recs.some((x) => x.template === r.template)) recs.push(r);
  };

  // Always recommend split sheet when multiple writers / ownership likely
  if ((input.songwriterCount ?? 0) >= 2 || hasRole("writer", "songwriter", "composer")) {
    push({
      template: "split-sheet",
      priority: "high",
      required: true,
      reason: "Project includes multiple songwriters or composition contributors requiring documented ownership splits.",
      riskLevel: "medium",
    });
  }

  if (input.hasProducer || hasRole("producer")) {
    push({
      template: "producer",
      priority: "high",
      required: true,
      reason: "Project includes an external producer receiving compensation or royalty participation.",
      riskLevel: "medium",
    });
    push({
      template: "producer-royalty",
      priority: "medium",
      required: false,
      reason: "Consider a dedicated producer royalty participation agreement when backend points are negotiated separately.",
      riskLevel: "high",
    });
  }

  if (input.hasExternalBeat || hasRole("beatmaker", "beat")) {
    push({
      template: "producer",
      priority: "high",
      required: true,
      reason: "External beat / instrumental detected — document production license and credit terms.",
      riskLevel: "medium",
    });
  }

  if (input.hasMaster || hasRole("label", "engineer")) {
    push({
      template: "master-ownership",
      priority: "high",
      required: true,
      reason: "Project references a master recording — clarify master ownership before release or license.",
      riskLevel: "high",
    });
  }

  if (input.hasPublishing || hasRole("publisher", "publish")) {
    push({
      template: "publishing-admin",
      priority: "medium",
      required: false,
      reason: "Publishing administration is indicated for composition rights and royalty collection.",
      riskLevel: "high",
    });
  }

  if (hasRole("featured", "feature")) {
    push({
      template: "featured-artist",
      priority: "high",
      required: true,
      reason: "Featured artist participation should be documented before release.",
      riskLevel: "medium",
    });
  }

  if (hasRole("remix", "remixer")) {
    push({
      template: "remixer",
      priority: "high",
      required: true,
      reason: "Remix deliverables and remix master rights should be documented.",
      riskLevel: "medium",
    });
  }

  if (hasRole("session", "musician", "instrument")) {
    push({
      template: "session-musician",
      priority: "medium",
      required: false,
      reason: "Session musicians are present — capture fee and neighboring-rights acknowledgements.",
      riskLevel: "low",
    });
  }

  if (input.hasLiveEvent || hasRole("venue", "promoter", "tour", "festival")) {
    push({
      template: "performance",
      priority: "high",
      required: true,
      reason: "Live event metadata indicates a performance engagement should be documented.",
      riskLevel: "medium",
    });
  }

  if (input.hasSyncUse || hasRole("sync", "film", "tv", "ad", "game", "podcast")) {
    push({
      template: "sync-license",
      priority: "high",
      required: true,
      reason: "Audiovisual / sync use case detected — composition and/or master sync terms are recommended.",
      riskLevel: "high",
    });
  }

  if (hasRole("manager", "management")) {
    push({
      template: "management",
      priority: "medium",
      required: false,
      reason: "Manager relationship indicated — document commission and scope.",
      riskLevel: "high",
    });
  }

  // Default baseline for any music project
  if (recs.length === 0) {
    push({
      template: "split-sheet",
      priority: "medium",
      required: false,
      reason: "Baseline recommendation for music projects: document composition ownership early.",
      riskLevel: "medium",
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

export function validateOwnershipPercents(values: Array<{ percentage?: number | string }>): {
  ok: boolean;
  total: number;
  message?: string;
} {
  const total = values.reduce((sum, v) => sum + Number(v.percentage ?? 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, total, message: `Ownership must total 100%. Current total: ${total.toFixed(2)}%` };
  }
  return { ok: true, total };
}

export function validateTemplateFieldValues(
  fields: TemplateFieldDef[],
  data: Record<string, unknown>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    const val = data[field.name];
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      errors.push(`${field.label} is required`);
    }
  }
  const ownership = data.ownershipSplit ?? data.collaborators;
  if (Array.isArray(ownership) && ownership.length > 0) {
    const check = validateOwnershipPercents(
      ownership.map((row: any) => ({
        percentage: row.ownershipPercentage ?? row.percentage ?? row.share,
      })),
    );
    if (!check.ok && check.message) errors.push(check.message);
  }
  const royaltyFields = fields.filter((f) => f.type === "royalty" || f.type === "percentage");
  for (const rf of royaltyFields) {
    const n = Number(data[rf.name]);
    if (data[rf.name] !== undefined && data[rf.name] !== "" && (Number.isNaN(n) || n < 0 || n > 100)) {
      errors.push(`${rf.label} must be a percentage between 0 and 100`);
    }
  }
  return { ok: errors.length === 0, errors };
}
