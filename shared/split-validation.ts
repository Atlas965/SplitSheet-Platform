/**
 * Deterministic split / required-field validation.
 * Percentages are compared in integer hundredths (50.00% → 5000) so 33.33+33.33+33.34
 * and 50+25+25 are exact. This is workflow validation of entered values — not a
 * legal determination of copyright ownership.
 */

export type ValidationIssue = {
  code: string;
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type SplitContributorInput = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  ownershipPercentage?: string | number | null;
};

/** 100.00% expressed in hundredths of a percent. */
export const SPLIT_TOTAL_HUNDREDTHS = 10_000;

export function toHundredths(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function hundredthsToPercent(hundredths: number): string {
  return (hundredths / 100).toFixed(2);
}

function issue(code: string, field: string, message: string): ValidationIssue {
  return { code, field, message };
}

export function validateSplits(contributors: SplitContributorInput[]): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!contributors.length) {
    errors.push(
      issue(
        "REQUIRED_CONTRIBUTOR_MISSING",
        "contributors",
        "Add at least one contributor before validating this split.",
      ),
    );
    return { valid: false, errors, warnings };
  }

  const emails = new Map<string, number>();
  let totalHundredths = 0;
  let anyPercent = false;

  contributors.forEach((c, index) => {
    const field = `contributors[${index}]`;
    const name = (c.name ?? "").trim();
    if (!name) {
      errors.push(issue("REQUIRED_CONTRIBUTOR_MISSING", `${field}.name`, "Contributor name is required."));
    }

    const role = (c.role ?? "").trim();
    if (!role) {
      errors.push(issue("REQUIRED_ROLE_MISSING", `${field}.role`, "Contributor role is required."));
    }

    const email = (c.email ?? "").trim().toLowerCase();
    if (email) {
      const prev = emails.get(email);
      if (prev !== undefined) {
        errors.push(
          issue(
            "DUPLICATE_CONTRIBUTOR",
            `${field}.email`,
            `The same email is listed more than once (${email}).`,
          ),
        );
      } else {
        emails.set(email, index);
      }
    }

    const hundredths = toHundredths(c.ownershipPercentage);
    if (hundredths === null) {
      errors.push(
        issue("INVALID_PERCENTAGE", `${field}.ownershipPercentage`, "Ownership percentage is missing or not a number."),
      );
      return;
    }
    anyPercent = true;
    if (hundredths < 0) {
      errors.push(
        issue("INVALID_PERCENTAGE", `${field}.ownershipPercentage`, "Ownership percentage cannot be negative."),
      );
      return;
    }
    if (hundredths > SPLIT_TOTAL_HUNDREDTHS) {
      errors.push(
        issue(
          "INVALID_PERCENTAGE",
          `${field}.ownershipPercentage`,
          "A single ownership percentage cannot be greater than 100%.",
        ),
      );
      return;
    }
    totalHundredths += hundredths;
  });

  if (anyPercent && totalHundredths !== SPLIT_TOTAL_HUNDREDTHS) {
    errors.push(
      issue(
        "SPLIT_TOTAL_INVALID",
        "ownershipPercentage",
        `The entered composition percentages do not total 100% (currently ${hundredthsToPercent(totalHundredths)}%).`,
      ),
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
