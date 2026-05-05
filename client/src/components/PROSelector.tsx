/**
 * PROSelector.tsx  (self-contained — no @shared/schema dependency)
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines PRO_TYPE and ipiNumberSchema locally so this component works
 * even if shared/schema.ts hasn't been updated yet in Replit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// ── Local definitions (no @shared/schema import needed) ───────────────────────

const PRO_TYPE_VALUES = ["SOCAN", "BMI", "ASCAP", "PRS", "SESAC", "Other"] as const;
export type ProType = typeof PRO_TYPE_VALUES[number];

const ipiNumberSchema = z
  .string()
  .regex(/^\d{9}$/, "IPI number must be exactly 9 digits")
  .optional()
  .or(z.literal(""));

// ── Zod schema ────────────────────────────────────────────────────────────────
export const proSelectorSchema = z.object({
  proAffiliation: z.enum(PRO_TYPE_VALUES).default("SOCAN"),
  ipiNumber:      ipiNumberSchema,
});

export type PROSelectorValues = z.infer<typeof proSelectorSchema>;

// ── PRO options ───────────────────────────────────────────────────────────────
const PRO_OPTIONS: {
  value: ProType;
  shortLabel: string;
  description: string;
  isCanadian: boolean;
}[] = [
  { value: "SOCAN",  shortLabel: "SOCAN",               description: "Standard for Canadian Songwriters & Publishers.", isCanadian: true  },
  { value: "BMI",    shortLabel: "BMI",                  description: "Broadcast Music, Inc. — USA",                     isCanadian: false },
  { value: "ASCAP",  shortLabel: "ASCAP",                description: "American Society of Composers — USA",             isCanadian: false },
  { value: "PRS",    shortLabel: "PRS",                  description: "Performing Right Society — UK",                   isCanadian: false },
  { value: "SESAC",  shortLabel: "SESAC",                description: "Society of European Stage Authors — USA/EU",      isCanadian: false },
  { value: "Other",  shortLabel: "Other / Not affiliated", description: "Another PRO or no current affiliation.",        isCanadian: false },
];

// ── Tooltip helper ────────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help" tabIndex={0}>
            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-accent transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── PROSelectorFields — self-contained, no FormContext dependency ──────────────
interface PROSelectorFieldsProps {
  defaultPRO?: ProType;
  defaultIPI?: string;
  onChange?: (values: PROSelectorValues) => void;
  namePrefix?: string;
}

export function PROSelectorFields({
  defaultPRO = "SOCAN",
  defaultIPI = "",
  onChange,
}: PROSelectorFieldsProps) {
  const [selectedPRO, setSelectedPRO] = useState<ProType>(defaultPRO);
  const [ipiValue,    setIpiValue]    = useState(defaultIPI);
  const [ipiError,    setIpiError]    = useState("");

  const socanInfo = PRO_OPTIONS.find((o) => o.value === "SOCAN")!;

  const handleProChange = useCallback((val: string) => {
    const pro = val as ProType;
    setSelectedPRO(pro);
    onChange?.({ proAffiliation: pro, ipiNumber: ipiValue });
  }, [ipiValue, onChange]);

  const handleIpiChange = useCallback((val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    setIpiValue(digits);
    if (digits && digits.length !== 9) {
      setIpiError("IPI number must be exactly 9 digits");
    } else {
      setIpiError("");
    }
    onChange?.({ proAffiliation: selectedPRO, ipiNumber: digits });
  }, [selectedPRO, onChange]);

  return (
    <div className="space-y-4">
      {/* PRO Affiliation */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          PRO Affiliation
          {selectedPRO === "SOCAN" && <InfoTooltip text={socanInfo.description} />}
        </label>

        <Select value={selectedPRO} onValueChange={handleProChange}>
          <SelectTrigger className="h-9" data-testid="select-pro-affiliation">
            <SelectValue placeholder="Select PRO…" />
          </SelectTrigger>
          <SelectContent>
            {PRO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} data-testid={`pro-option-${opt.value}`}>
                <span className="flex items-center gap-2">
                  {opt.isCanadian && (
                    <span className="text-base leading-none select-none" role="img" aria-label="Canadian">🇨🇦</span>
                  )}
                  <span className="font-medium">{opt.shortLabel}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">— {opt.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPRO === "SOCAN" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <span className="text-sm" role="img" aria-label="Canadian flag">🇨🇦</span>
            {socanInfo.description}
            <a href="https://www.socan.com/register" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Register →
            </a>
          </p>
        )}
      </div>

      {/* IPI Number */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          IPI Number
          <InfoTooltip text="Your 9-digit Interested Parties Information number assigned by your PRO. Leave blank if not yet registered." />
          <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
        </label>
        <div className="relative">
          <Input
            inputMode="numeric"
            maxLength={9}
            value={ipiValue}
            placeholder="e.g. 001234567"
            className="h-9 font-mono tracking-widest pr-16"
            data-testid="input-ipi-number"
            onChange={(e) => handleIpiChange(e.target.value)}
          />
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${
              ipiValue.length === 9 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            }`}
          >
            {ipiValue.length}/9
          </span>
        </div>
        {ipiError && <p className="text-xs text-destructive">{ipiError}</p>}
      </div>
    </div>
  );
}

// ── Standalone PROSelector (own form context + submit button) ─────────────────
interface PROSelectorProps {
  defaultValues?: Partial<PROSelectorValues>;
  onSubmit?: (values: PROSelectorValues) => void | Promise<void>;
  onChange?: (values: PROSelectorValues) => void;
  hideSubmit?: boolean;
}

export default function PROSelector({
  defaultValues,
  onSubmit,
  onChange,
  hideSubmit = false,
}: PROSelectorProps) {
  const form = useForm<PROSelectorValues>({
    resolver: zodResolver(proSelectorSchema),
    defaultValues: {
      proAffiliation: "SOCAN",
      ipiNumber:      "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (values: PROSelectorValues) => {
    await onSubmit?.(values);
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          data-testid="pro-selector-form"
        >
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <span className="text-lg" role="img" aria-label="Musical note">🎵</span>
            <h3 className="text-sm font-semibold text-foreground">Performance Rights Organization</h3>
            <span className="ml-auto text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">
              🇨🇦 Canadian-first
            </span>
          </div>

          <FormField
            control={form.control}
            name="proAffiliation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">PRO Affiliation</FormLabel>
                <Select value={field.value ?? "SOCAN"} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-9" data-testid="select-pro-standalone">
                      <SelectValue placeholder="Select PRO…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          {opt.isCanadian && <span role="img" aria-label="Canadian">🇨🇦</span>}
                          <span className="font-medium">{opt.shortLabel}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ipiNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm flex items-center gap-1.5">
                  IPI Number
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      inputMode="numeric"
                      maxLength={9}
                      placeholder="e.g. 001234567"
                      className="h-9 font-mono tracking-widest pr-16"
                      data-testid="input-ipi-standalone"
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                        field.onChange(digits);
                      }}
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                      (field.value as string)?.length === 9
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}>
                      {(field.value as string)?.length ?? 0}/9
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!hideSubmit && (
            <button
              type="submit"
              className="w-full bg-accent text-accent-foreground h-9 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
              data-testid="pro-selector-submit"
            >
              Save PRO Details
            </button>
          )}
        </form>
      </Form>
    </FormProvider>
  );
}