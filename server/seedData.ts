import { db } from "./db";
import { contractTemplates } from "@shared/schema";

const templates = [
  {
    name: "Split Sheet Agreement",
    type: "split-sheet",
    description: "Define ownership percentages and revenue splits for collaborative music projects.",
    template: {
      fields: [
        { name: "title", label: "Song Title", type: "text", required: true },
        { name: "releaseDate", label: "Release Date", type: "date", required: false },
        { name: "collaborators", label: "Collaborators", type: "array", required: true },
        { name: "performanceRoyalties", label: "Performance Royalties", type: "select", required: true },
        { name: "mechanicalRoyalties", label: "Mechanical Royalties", type: "select", required: true },
        { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
      ],
      legalClauses: [
        "All parties agree to the ownership percentages as specified herein.",
        "Revenue splits shall be distributed according to the agreed percentages.",
        "Publishing rights shall be administered according to ownership shares.",
        "This agreement shall be governed by the laws of [State/Country]."
      ]
    }
  },
  {
    name: "Performance Agreement",
    type: "performance",
    description: "Secure bookings with venues, festivals, and event organizers.",
    template: {
      fields: [
        { name: "title", label: "Event Title", type: "text", required: true },
        { name: "venue", label: "Venue", type: "text", required: true },
        { name: "eventDate", label: "Event Date", type: "datetime", required: true },
        { name: "performanceFee", label: "Performance Fee", type: "number", required: true },
        { name: "technicalRequirements", label: "Technical Requirements", type: "textarea", required: false },
        { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
      ],
      legalClauses: [
        "Artist agrees to perform at the specified venue on the agreed date and time.",
        "Venue agrees to provide adequate sound system and technical support.",
        "Payment shall be made within 30 days of performance completion.",
        "Force majeure clause applies to unforeseen circumstances preventing performance."
      ]
    }
  },
  {
    name: "Producer Agreement",
    type: "producer",
    description: "Establish terms for beat licensing, production credits, and royalties.",
    template: {
      fields: [
        { name: "title", label: "Track Title", type: "text", required: true },
        { name: "producerName", label: "Producer Name", type: "text", required: true },
        { name: "beatPrice", label: "Beat Price", type: "number", required: true },
        { name: "royaltyPercentage", label: "Royalty Percentage", type: "number", required: true },
        { name: "creditRequirement", label: "Credit Requirement", type: "text", required: true },
        { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
      ],
      legalClauses: [
        "Producer grants exclusive/non-exclusive rights to the beat as specified.",
        "Artist agrees to provide proper production credits as specified.",
        "Royalty payments shall be made according to the agreed percentage.",
        "Producer retains ownership of the underlying musical composition."
      ]
    }
  },
  {
    name: "Management Agreement",
    type: "management",
    description: "Define roles and responsibilities with your artist manager or booking agent.",
    template: {
      fields: [
        { name: "title", label: "Agreement Title", type: "text", required: true },
        { name: "managerName", label: "Manager Name", type: "text", required: true },
        { name: "commissionRate", label: "Commission Rate", type: "number", required: true },
        { name: "contractDuration", label: "Contract Duration", type: "text", required: true },
        { name: "responsibilities", label: "Manager Responsibilities", type: "textarea", required: true },
        { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
      ],
      legalClauses: [
        "Manager agrees to provide professional representation and career guidance.",
        "Artist agrees to pay the specified commission rate on gross earnings.",
        "Either party may terminate this agreement with 30 days written notice.",
        "Manager shall act in the best interests of the artist at all times."
      ]
    }
  }
];

export async function seedContractTemplates() {
  try {
    console.log("Seeding contract templates...");
    
    // Check if templates already exist
    const existingTemplates = await db.select().from(contractTemplates);
    if (existingTemplates.length > 0) {
      console.log("Templates already exist, skipping seed");
      return;
    }
    
    // Insert templates
    for (const template of templates) {
      await db.insert(contractTemplates).values(template);
    }
    
    console.log("Contract templates seeded successfully");
  } catch (error) {
    console.error("Error seeding contract templates:", error);
  }
}
