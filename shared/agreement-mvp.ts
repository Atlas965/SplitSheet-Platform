/**
 * SplitSheet MVP Template Library (12) — product/legal planning config.
 *
 * Product-planning guidance only. Not legal advice. Counsel must verify
 * before commercial launch. SplitSheet is not a law firm.
 */

import type { LegalReviewStatus, RiskLevel, RightsCategory, TemplateStatus } from "./agreement-catalog";

export type MvpPriority = "Must Have" | "Should Have" | "Later";
export type MvpPhase = "mvp" | "phase2" | "high_risk_hold";
export type GenerationMode = "automated_draft" | "controlled_workflow" | "counsel_required";

export type MvpTemplateSpec = {
  type: string;
  name: string;
  priority: MvpPriority;
  phase: MvpPhase;
  primaryUsers: string[];
  requiredParties: string[];
  transaction: string;
  rightsAffected: RightsCategory[];
  ownershipInfo: string;
  compensationInfo: string;
  territory: string;
  term: string;
  exclusivity: string;
  requiredMetadata: string[];
  requiredFields: string[];
  dependencies: string[];
  riskLevel: RiskLevel;
  jurisdictionReviewRequired: boolean;
  lawyerReviewBeforeExecution: boolean;
  generationMode: GenerationMode;
  structuredExtract: string[];
  analyticsValue: string[];
  rightsGraphContribution: string;
};

/** Final 12 MVP templates — smallest commercially useful loop. */
export const MVP_TEMPLATE_SPECS: MvpTemplateSpec[] = [
  {
    type: "split-sheet",
    name: "Split Sheet",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Independent artists", "Producers", "Studios", "Songwriters"],
    requiredParties: ["Songwriter / contributor (2+)"],
    transaction: "Document composition (and related) ownership splits for a song",
    rightsAffected: ["COMPOSITION", "OWNERSHIP", "PUBLISHING", "ROYALTY"],
    ownershipInfo: "Per-contributor composition % totaling 100%",
    compensationInfo: "PRO/mechanical routing; no fee required",
    territory: "Default CA / configurable",
    term: "Life of copyright / as agreed",
    exclusivity: "N/A (ownership record)",
    requiredMetadata: ["songTitle", "effectiveDate", "jurisdiction", "templateVersion"],
    requiredFields: ["title", "collaborators/ownershipSplit", "roles", "PRO/IPI optional"],
    dependencies: ["Confirmation workflow", "100% validation", "Rights Ledger sync"],
    riskLevel: "medium",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: false,
    generationMode: "controlled_workflow",
    structuredExtract: ["contributors", "roles", "compositionOwnership%", "pros", "songId"],
    analyticsValue: ["ownership verification", "catalog analytics", "royalty forecasting inputs"],
    rightsGraphContribution: "Song → Contributors → Roles → Composition ownership",
  },
  {
    type: "co-writing",
    name: "Co-Writing Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Songwriters", "Publishers (light)"],
    requiredParties: ["Songwriter", "Co-Writer"],
    transaction: "Define co-write relationship, credit, and ownership before/at creation",
    rightsAffected: ["COMPOSITION", "OWNERSHIP", "PUBLISHING"],
    ownershipInfo: "Writer shares totaling 100%",
    compensationInfo: "Optional advance; royalty via ownership",
    territory: "Configurable",
    term: "Per composition / catalogue window",
    exclusivity: "Usually non-exclusive co-write",
    requiredMetadata: ["songTitle", "writers", "credit", "effectiveDate"],
    requiredFields: ["parties", "ownershipSplit", "credit", "territory", "term"],
    dependencies: ["Often precedes or accompanies Split Sheet"],
    riskLevel: "medium",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["writers", "ownership%", "credit", "term", "territory"],
    analyticsValue: ["collaboration graph", "ownership verification"],
    rightsGraphContribution: "Contributors → Composition ownership → Credit",
  },
  {
    type: "producer",
    name: "Producer Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Artists", "Producers", "Studios"],
    requiredParties: ["Artist", "Producer"],
    transaction: "Production services, fee, credit, and optional royalty points",
    rightsAffected: ["MASTER", "ROYALTY", "SERVICES"],
    ownershipInfo: "Optional master points; clarify vs composition",
    compensationInfo: "Fee + royalty % + recoupment flags",
    territory: "Configurable",
    term: "Per track / delivery-based",
    exclusivity: "Exclusive or non-exclusive production",
    requiredMetadata: ["recordingTitle", "fee", "royalty%", "credit"],
    requiredFields: ["artist", "producer", "fee", "royaltyPercentage", "credit", "deliverables"],
    dependencies: ["May link to Master Ownership + Split Sheet"],
    riskLevel: "medium",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["fee", "royalty%", "credit", "masterParticipation", "territory"],
    analyticsValue: ["contractual economics", "royalty forecasting", "risk analysis"],
    rightsGraphContribution: "Services → Master economics → Royalty config",
  },
  {
    type: "featured-artist",
    name: "Featured Artist Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Artists", "Labels (indie)", "Managers"],
    requiredParties: ["Primary Artist", "Featured Artist"],
    transaction: "Feature appearance, fee/royalty, credit, NIL usage for promo",
    rightsAffected: ["MASTER", "ROYALTY", "NAME_IMAGE_LIKENESS"],
    ownershipInfo: "Usually no composition; optional master points",
    compensationInfo: "Feature fee and/or royalty points",
    territory: "Configurable",
    term: "Per recording + promo window",
    exclusivity: "Typically non-exclusive feature",
    requiredMetadata: ["recordingTitle", "featureFee", "royalty%", "credit"],
    requiredFields: ["parties", "fee", "royalty", "credit", "territory", "term"],
    dependencies: ["Master ownership clarity recommended"],
    riskLevel: "medium",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["fee", "royalty%", "credit", "nilScope", "term"],
    analyticsValue: ["feature economics", "catalog collaboration graph"],
    rightsGraphContribution: "Parties → Master royalty → Credit / NIL",
  },
  {
    type: "session-musician",
    name: "Session Musician Agreement",
    priority: "Should Have",
    phase: "mvp",
    primaryUsers: ["Artists", "Producers", "Studios"],
    requiredParties: ["Artist / hiring party", "Session Musician"],
    transaction: "Session performance for fee; neighboring-rights acknowledgement",
    rightsAffected: ["SERVICES", "NEIGHBORING_RIGHTS", "MASTER"],
    ownershipInfo: "Usually work-for-hire / no ownership unless stated",
    compensationInfo: "Session fee; rare royalty",
    territory: "Recording territory",
    term: "Session / delivery",
    exclusivity: "Non-exclusive services",
    requiredMetadata: ["recordingTitle", "sessionFee", "instrument/role"],
    requiredFields: ["parties", "fee", "deliverables", "rightsGranted"],
    dependencies: ["Clarify vs Work-for-Hire when assignment claimed"],
    riskLevel: "low",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: false,
    generationMode: "automated_draft",
    structuredExtract: ["fee", "role", "neighboringRightsAck", "assignmentFlag"],
    analyticsValue: ["cost basis of masters", "risk flags if unpaid sessions"],
    rightsGraphContribution: "Services → Master deliverables (no default ownership)",
  },
  {
    type: "vocalist",
    name: "Vocalist Agreement",
    priority: "Should Have",
    phase: "mvp",
    primaryUsers: ["Artists", "Producers"],
    requiredParties: ["Artist / hiring party", "Vocalist"],
    transaction: "Vocal performance services + optional points",
    rightsAffected: ["SERVICES", "MASTER", "ROYALTY"],
    ownershipInfo: "Optional master/composition points if negotiated",
    compensationInfo: "Vocal fee ± royalty %",
    territory: "Configurable",
    term: "Per recording",
    exclusivity: "Usually non-exclusive",
    requiredMetadata: ["recordingTitle", "vocalFee", "royalty%"],
    requiredFields: ["parties", "fee", "royalty", "deliverables", "credit"],
    dependencies: ["Split Sheet if composition claim"],
    riskLevel: "low",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: false,
    generationMode: "automated_draft",
    structuredExtract: ["fee", "royalty%", "credit", "ownershipClaimFlag"],
    analyticsValue: ["session cost + royalty liability"],
    rightsGraphContribution: "Services → optional Royalty / Ownership edges",
  },
  {
    type: "work-for-hire-music",
    name: "Work-for-Hire Music Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Brands", "Studios", "Commissioning parties", "Creators"],
    requiredParties: ["Commissioning Party", "Creator"],
    transaction: "Commissioned music with assignment / WFH intent fields",
    rightsAffected: ["COMPOSITION", "MASTER", "OWNERSHIP", "SERVICES"],
    ownershipInfo: "Intended full assignment to commissioner (jurisdiction-sensitive)",
    compensationInfo: "Commission fee; usually no ongoing royalty",
    territory: "Often worldwide",
    term: "Perpetual / assignment",
    exclusivity: "Exclusive ownership transfer intent",
    requiredMetadata: ["commissionFee", "rightsGranted", "deliverables", "jurisdiction"],
    requiredFields: ["parties", "fee", "rightsSelection", "ownership/assignment flags", "territory", "term"],
    dependencies: ["Counsel gate strongly recommended before execution"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "counsel_required",
    structuredExtract: ["assignmentFlag", "fee", "rightsGranted", "territory", "term"],
    analyticsValue: ["ownership verification", "chain-of-title risk", "due diligence"],
    rightsGraphContribution: "Services → Ownership transfer edge (high-risk)",
  },
  {
    type: "master-ownership",
    name: "Master Recording Ownership Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Artists", "Labels", "Producers", "Investors"],
    requiredParties: ["Artist / Rights Holder", "Label / Co-owner"],
    transaction: "Document who owns the sound recording master",
    rightsAffected: ["MASTER", "OWNERSHIP"],
    ownershipInfo: "Master % totaling 100%",
    compensationInfo: "Optional buyout / consideration",
    territory: "Configurable (often worldwide)",
    term: "Life of copyright / perpetual",
    exclusivity: "Ownership (not license)",
    requiredMetadata: ["recordingTitle", "ISRC optional", "ownershipSplit"],
    requiredFields: ["parties", "ownershipSplit", "territory", "term", "consideration"],
    dependencies: ["Pairs with Split Sheet for full song graph"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["masterOwnership%", "ISRC", "parties", "territory"],
    analyticsValue: ["asset valuation", "ownership verification", "catalog acquisition DD"],
    rightsGraphContribution: "Song → Master ownership nodes",
  },
  {
    type: "master-license",
    name: "Master License Agreement",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Rights holders", "Licensees", "Distributors", "Sync buyers"],
    requiredParties: ["Licensor", "Licensee"],
    transaction: "License master for defined uses (exclusivity via field, not separate templates)",
    rightsAffected: ["MASTER", "LICENSE", "ROYALTY"],
    ownershipInfo: "Licensor retains ownership; licensee gets usage rights",
    compensationInfo: "License fee ± royalty / revenue share",
    territory: "Required",
    term: "Required",
    exclusivity: "Exclusive | Non-Exclusive | Semi-Exclusive (field)",
    requiredMetadata: ["media/use", "fee", "territory", "term", "exclusivity"],
    requiredFields: ["parties", "rightsGranted", "fee", "territory", "term", "exclusivity"],
    dependencies: ["Master ownership should be established first"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["licenseType", "exclusivity", "territory", "term", "fee", "royalty%"],
    analyticsValue: ["licensing activity", "revenue forecasting", "catalog analytics"],
    rightsGraphContribution: "Master → License edges (territory/term/exclusivity)",
  },
  {
    type: "master-use-license",
    name: "Master Use / Recording License",
    priority: "Should Have",
    phase: "mvp",
    primaryUsers: ["Sync agents", "Film/TV/ad buyers", "Rights holders"],
    requiredParties: ["Licensor", "Licensee"],
    transaction: "Master use for audiovisual / defined exploitation",
    rightsAffected: ["MASTER", "LICENSE", "SYNCHRONIZATION"],
    ownershipInfo: "No ownership transfer",
    compensationInfo: "Master use fee ± backend",
    territory: "Required",
    term: "Required + media options",
    exclusivity: "Usually non-exclusive per media",
    requiredMetadata: ["project/media", "fee", "territory", "term", "options"],
    requiredFields: ["parties", "media", "fee", "territory", "term", "rightsGranted"],
    dependencies: ["Often paired with Composition Sync / Sync License"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["media", "fee", "territory", "term", "options"],
    analyticsValue: ["sync revenue", "licensing velocity", "valuation comps"],
    rightsGraphContribution: "Master → Sync/use license edges",
  },
  {
    type: "sync-license",
    name: "Synchronization License",
    priority: "Must Have",
    phase: "mvp",
    primaryUsers: ["Publishers", "Labels", "Sync agents", "Brands/film/TV"],
    requiredParties: ["Licensor", "Licensee"],
    transaction: "Sync composition and/or master for AV use (MVP unified sync scaffold)",
    rightsAffected: ["SYNCHRONIZATION", "COMPOSITION", "MASTER", "LICENSE"],
    ownershipInfo: "No transfer; licensed use only",
    compensationInfo: "Sync fee ± most-favored / options",
    territory: "Required",
    term: "Required",
    exclusivity: "Per campaign/media",
    requiredMetadata: ["songTitle", "recordingTitle", "media", "fee", "territory", "term"],
    requiredFields: ["parties", "media", "rightsGranted", "fee", "territory", "term", "exclusivity"],
    dependencies: ["Chain of title for composition + master"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["media", "fee", "compositionLicensed", "masterLicensed", "territory", "term"],
    analyticsValue: ["licensing activity", "sync comps", "catalog monetization"],
    rightsGraphContribution: "Composition/Master → Sync license edges",
  },
  {
    type: "producer-royalty",
    name: "Producer Royalty Participation Agreement",
    priority: "Should Have",
    phase: "mvp",
    primaryUsers: ["Producers", "Artists", "Labels"],
    requiredParties: ["Artist / payor", "Producer"],
    transaction: "Backend producer points without full services agreement",
    rightsAffected: ["MASTER", "ROYALTY", "REVENUE_SHARE"],
    ownershipInfo: "Points ≠ ownership unless stated",
    compensationInfo: "Royalty % + advance/recoupment",
    territory: "Configurable",
    term: "Life of recording / as agreed",
    exclusivity: "N/A or limited",
    requiredMetadata: ["recordingTitle", "producerRoyalty%", "advance"],
    requiredFields: ["parties", "royaltyPercentage", "advance", "recoupment flags"],
    dependencies: ["Often accompanies Producer Agreement"],
    riskLevel: "high",
    jurisdictionReviewRequired: true,
    lawyerReviewBeforeExecution: true,
    generationMode: "controlled_workflow",
    structuredExtract: ["royalty%", "advance", "recoupment", "base (PPD/net)"],
    analyticsValue: ["royalty forecasting", "contractual economics", "risk analysis"],
    rightsGraphContribution: "Royalty config node linked to Master",
  },
];

/** Cut from the proposed 15 — wait for Phase 2 (specialize after MVP loop works). */
export const PHASE2_WAIT_TEMPLATES = [
  {
    type: "composition-sync-license",
    name: "Composition Sync License",
    reason: "Specialize after unified Sync License proves data model; avoid duplicate sync UX in MVP.",
  },
  {
    type: "non-exclusive-master-license",
    name: "Non-Exclusive Master License",
    reason: "Covered by Master License exclusivity field; separate template adds confusion without new data.",
  },
  {
    type: "recording-services",
    name: "Recording Services Agreement",
    reason: "Lower urgency vs ownership/license loop; Session + Producer cover most studio needs.",
  },
  {
    type: "songwriter-collaboration",
    name: "Songwriter Collaboration Agreement",
    reason: "Overlaps Co-Writing; add when multi-party writer deals demand richer admin terms.",
  },
  {
    type: "remixer",
    name: "Remixer Agreement",
    reason: "Important niche; not required to prove core ownership→license→ledger loop.",
  },
  {
    type: "publishing-admin",
    name: "Publishing Administration Agreement",
    reason: "Publishing suite is Phase 2 rights-management expansion.",
  },
  {
    type: "music-publishing",
    name: "Music Publishing Agreement",
    reason: "High commercial + legal complexity; defer until counsel package ready.",
  },
  {
    type: "digital-distribution",
    name: "Digital Distribution Agreement",
    reason: "Distribution economics matter later; not needed for first rights-record loop.",
  },
  {
    type: "performance",
    name: "Artist Performance Agreement",
    reason: "Live vertical is separate GTM motion from song/master rights MVP.",
  },
  {
    type: "management",
    name: "Artist Management Agreement",
    reason: "Fiduciary/commission sensitivity; not part of song asset graph MVP.",
  },
] as const;

/** Highest-risk — do not fully automate without specialized entertainment counsel. */
export const HIGH_RISK_HOLD_TEMPLATES = [
  { type: "master-assignment", name: "Master Rights Assignment", reason: "Chain-of-title / permanent transfer" },
  { type: "copyright-assignment", name: "Copyright Assignment", reason: "Copyright statute + moral rights issues" },
  { type: "publishing-assignment", name: "Publishing Assignment", reason: "Long-term economic transfer" },
  { type: "music-publishing", name: "Music Publishing Agreement", reason: "Complex term/territory/reversion" },
  { type: "recording-artist", name: "Recording Artist Agreement", reason: "Multi-option label deal complexity" },
  { type: "exclusive-master-license", name: "Exclusive Master License", reason: "Near-assignment economics" },
  { type: "advertising-music-license", name: "Advertising Music License", reason: "Brand/media liability + exclusivity" },
  { type: "management", name: "Artist Management Agreement", reason: "Fiduciary duties / commission disputes" },
  { type: "work-for-hire-music", name: "Work-for-Hire Music Agreement", reason: "Jurisdiction-sensitive WFH doctrine — in MVP but counsel_required mode" },
  { type: "co-publishing", name: "Co-Publishing Agreement", reason: "Shared publishing ownership complexity" },
] as const;

export const MVP_TEMPLATE_TYPES = MVP_TEMPLATE_SPECS.map((t) => t.type);

export function isMvpTemplateType(type: string): boolean {
  return MVP_TEMPLATE_TYPES.includes(type);
}

export function mvpStatusForType(type: string): TemplateStatus {
  if (isMvpTemplateType(type)) return "active";
  if (HIGH_RISK_HOLD_TEMPLATES.some((t) => t.type === type && t.type !== "work-for-hire-music")) {
    return "draft";
  }
  return "draft";
}

export function mvpLegalReviewForType(type: string): LegalReviewStatus {
  if (isMvpTemplateType(type)) return "INTERNAL_REVIEW";
  return "NOT_REVIEWED";
}

/** Core structured schema every agreement should capture for the rights graph. */
export const AGREEMENT_DATA_SCHEMA = {
  agreement: [
    "agreementId",
    "templateType",
    "templateVersion",
    "status",
    "jurisdiction",
    "effectiveDate",
    "executedAt",
    "legalReviewStatus",
  ],
  song: ["songTitle", "recordingTitle", "isrc", "iswc", "slSongId"],
  parties: ["partyId", "name", "email", "role", "partyType", "pro", "ipi"],
  ownership: ["rightType", "percentage", "territory", "term", "exclusive"],
  compensation: ["fee", "currency", "royaltyPercent", "recoupment", "revenueShareBase"],
  license: ["licenseType", "media", "territory", "term", "exclusivity", "fee", "options"],
  workflow: ["acknowledgements", "confirmationStatus", "signatureStatus", "counselGate"],
  analyticsHooks: [
    "ownershipGraphEdges",
    "royaltyConfigs",
    "licenseEvents",
    "economicTerms",
    "riskFlags",
  ],
} as const;

export const LEGAL_LAUNCH_CHECKLIST = [
  "Confirm SplitSheet ToS / Privacy / DPA state: not a law firm; no legal advice; templates are workflow docs",
  "User acknowledgement checkbox before first agreement create (disclaimer + jurisdiction)",
  "E-signature / e-commerce compliance for Ontario (and target markets): identity, consent, audit trail",
  "Data retention & deletion policy for contracts, signatures, IP logs, confirmations",
  "IP ownership of user-generated agreement content vs SoundLedger platform IP",
  "Limitation of liability / disclaimer of warranties for template suitability",
  "Counsel review of all 12 MVP templates + placeholder clauses before COUNSEL_APPROVED",
  "Work-for-Hire counsel memo (Canada vs US doctrine differences)",
  "Cross-border data transfer if hosting/users outside Canada",
  "Privacy: PII in collaborator emails/names; public confirmation link minimization",
  "Consumer protection / unfair practices review of pricing + template marketing copy",
  "Version lock: executed agreements retain templateVersion forever",
  "Incident response for leaked confirmation tokens / signature images",
  "Insurance / E&O discussion for legal-tech adjacent products",
  "Export controls / sanctions screening if international licensing later",
] as const;

export const LEGAL_REVIEW_WORKFLOW = [
  "Template (draft) — product authors field engine + metadata",
  "Internal Review — ops/product check completeness + disclaimer",
  "Counsel Review — entertainment counsel marks COUNSEL_REVIEW",
  "Approval — COUNSEL_APPROVED + status approved/active",
  "Execution — user confirmations + e-sign; counsel_required templates block send until acknowledgement",
  "Rights Record — append-only ledger / license_records sync",
  "Analytics — structured extracts feed rights intelligence (future)",
] as const;

export const VERSIONING_POLICY = {
  scheme: "semver-like major.minor on contract_templates.version",
  minor: "Field label/help/placeholder changes; additive optional fields",
  major: "Required field changes, rights semantics, or clause pack changes",
  rule: "Never mutate executed contracts; new version creates new template row; old row deprecated; contracts keep templateId + templateVersion snapshot",
} as const;

export const JURISDICTION_STRATEGY = {
  launch: "Ontario / Canada (CA) first",
  mustChangeBeforeIntl: [
    "Governing law / venue clauses per market",
    "E-sign statutes (e.g. ESIGN/UETA US, eIDAS EU)",
    "Work-for-hire / assignment language (US vs Canada/UK)",
    "Moral rights waivers (Canada/EU sensitivity)",
    "Consumer vs commercial user treatment",
    "Tax/VAT display on fees",
    "PRO defaults (SOCAN → ASCAP/BMI/PRS etc.)",
    "Privacy (PIPEDA → GDPR/CCPA addenda)",
  ],
} as const;

export const AUTOMATION_BOUNDARY = {
  automate: [
    "Template selection & field forms",
    "Ownership % validation",
    "Draft generation from structured fields",
    "Confirmation link issuance + audit timestamps",
    "PDF export of user-entered structured data",
    "Rights Ledger append on completed ownership/license deals",
    "Recommendations from project roles",
  ],
  userConfirmation: [
    "Party identity and contact accuracy",
    "Ownership and royalty figures",
    "Territory / term / exclusivity selections",
    "Disclaimer acknowledgement",
    "Send for confirmation / signature",
  ],
  requireCounsel: [
    "Interpreting legal effect of clauses",
    "Jurisdiction-specific enforceability",
    "WFH / assignment / publishing transfers",
    "Exclusive long-term label/publishing deals",
    "Dispute strategy or litigation advice",
    "Custom clause drafting beyond placeholders",
  ],
} as const;
