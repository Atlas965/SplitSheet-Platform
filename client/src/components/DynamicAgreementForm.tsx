import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LEGAL_DISCLAIMER, RIGHTS_TAXONOMY, type TemplateFieldDef } from "@shared/agreement-catalog";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  fields: TemplateFieldDef[];
  sections?: Array<{ id: string; title: string }>;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  disabled?: boolean;
};

function OwnershipSplitEditor({
  value,
  onChange,
  disabled,
}: {
  value: Array<{ name: string; role: string; ownershipPercentage: string; email?: string }>;
  onChange: (rows: any[]) => void;
  disabled?: boolean;
}) {
  const rows = value?.length ? value : [{ name: "", role: "writer", ownershipPercentage: "", email: "" }];
  const total = rows.reduce((s, r) => s + (parseFloat(r.ownershipPercentage) || 0), 0);

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div>
            <Label>Name</Label>
            <Input
              value={row.name}
              disabled={disabled}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], name: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label>Role</Label>
            <Input
              value={row.role}
              disabled={disabled}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], role: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label>Ownership %</Label>
            <Input
              type="number"
              value={row.ownershipPercentage}
              disabled={disabled}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], ownershipPercentage: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || rows.length <= 1}
              onClick={() => onChange(rows.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...rows, { name: "", role: "writer", ownershipPercentage: "", email: "" }])}
        >
          <Plus className="h-4 w-4 mr-1" /> Add party
        </Button>
        <span className={Math.abs(total - 100) < 0.01 ? "text-sm text-green-600" : "text-sm text-destructive"}>
          Total: {total.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default function DynamicAgreementForm({ fields, sections, values, onChange, disabled }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, TemplateFieldDef[]>();
    for (const field of fields) {
      const key = field.section || "additional";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(field);
    }
    return map;
  }, [fields]);

  const sectionTitle = (id: string) =>
    sections?.find((s) => s.id === id)?.title ||
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const setField = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  const renderField = (field: TemplateFieldDef) => {
    const val = values[field.name];

    if (field.type === "ownership_split" || field.type === "array") {
      return (
        <OwnershipSplitEditor
          value={Array.isArray(val) ? val : []}
          disabled={disabled}
          onChange={(rows) => setField(field.name, rows)}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          value={val ?? ""}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.name, e.target.value)}
        />
      );
    }

    if (field.type === "select" || field.type === "territory" || field.type === "term") {
      const options = field.options ?? (field.type === "territory"
        ? ["Worldwide", "CA", "US", "UK", "EU", "AU", "Other"]
        : []);
      if (options.length > 0) {
        return (
          <Select
            value={val ?? ""}
            disabled={disabled}
            onValueChange={(v) => setField(field.name, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }

    if (field.type === "rights_selection" || field.type === "multiselect") {
      const selected: string[] = Array.isArray(val) ? val : [];
      const options = field.options ?? [...RIGHTS_TAXONOMY];
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(c) => {
                    const next = c
                      ? [...selected, opt]
                      : selected.filter((x) => x !== opt);
                    setField(field.name, next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(val)}
            disabled={disabled}
            onCheckedChange={(c) => setField(field.name, Boolean(c))}
          />
          {field.helpText || field.label}
        </label>
      );
    }

    const inputType =
      field.type === "email" ? "email" :
      field.type === "phone" ? "tel" :
      field.type === "date" || field.type === "datetime" ? "date" :
      field.type === "number" || field.type === "currency" || field.type === "percentage" || field.type === "royalty"
        ? "number"
        : "text";

    return (
      <Input
        type={inputType}
        value={val ?? ""}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(e) => setField(field.name, e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 text-sm text-amber-900 dark:text-amber-200">
        {LEGAL_DISCLAIMER}
      </div>

      {[...grouped.entries()].map(([sectionId, sectionFields]) => (
        <section key={sectionId} className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">
            {sectionTitle(sectionId)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectionFields.map((field) => (
              <div
                key={field.name}
                className={
                  field.type === "textarea" ||
                  field.type === "ownership_split" ||
                  field.type === "array" ||
                  field.type === "rights_selection"
                    ? "md:col-span-2"
                    : ""
                }
              >
                <Label className="mb-1.5 block">
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                {renderField(field)}
                {field.helpText && field.type !== "checkbox" ? (
                  <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
