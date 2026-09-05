import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const TYPES = ["text", "textarea", "number", "date", "select", "checkbox"] as const;

type Field = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  displayOrder: number;
};

export default function CustomFieldsManager({ templateType = "split-sheet" }: { templateType?: string }) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [options, setOptions] = useState("");
  const { data: fields = [] } = useQuery<Field[]>({
    queryKey: ["/api/custom-fields", templateType],
    queryFn: () => fetch(`/api/custom-fields?templateType=${templateType}`, { credentials: "include" }).then((r) => r.json()),
  });
  const add = useMutation({
    mutationFn: () => apiRequest("POST", "/api/custom-fields", {
      label,
      fieldType,
      templateType,
      options: fieldType === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
      displayOrder: fields.length,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", templateType] });
      setLabel("");
      setOptions("");
      toast({ title: "Field added" });
    },
    onError: (err: Error) => toast({ title: "Could not add field", description: err.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/custom-fields/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", templateType] }),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-sm">Custom template fields</h3>
        <p className="text-xs text-muted-foreground">Saved with each project version. Changing a field later does not rewrite old documents.</p>
      </div>
      {fields.map((field) => (
        <div key={field.id} className="flex items-center justify-between text-sm gap-2">
          <span>{field.label} <span className="text-muted-foreground">({field.fieldType})</span></span>
          <Button size="sm" variant="ghost" onClick={() => remove.mutate(field.id)}>Remove</Button>
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={fieldType} onValueChange={setFieldType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {fieldType === "select" && (
          <div>
            <Label>Options (comma-separated)</Label>
            <Input value={options} onChange={(e) => setOptions(e.target.value)} />
          </div>
        )}
      </div>
      <Button size="sm" disabled={!label.trim() || add.isPending} onClick={() => add.mutate()}>
        {add.isPending ? "Adding…" : "Add field"}
      </Button>
    </div>
  );
}
