import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const splitSheetSchema = z.object({
  title: z.string().min(1, "Song title is required"),
  releaseDate: z.string().optional(),
  collaborators: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().min(1, "Role is required"),
    ownershipPercentage: z.preprocess(
      (val) => val === "" ? 0 : Number(val),
      z.number().min(0, "Must be 0 or greater").max(100, "Cannot exceed 100%")
    ),
  })).min(1, "At least one collaborator is required"),
  performanceRoyalties: z.string().default("equal"),
  mechanicalRoyalties: z.string().default("equal"),
  additionalTerms: z.string().optional(),
}).refine(
  (data) => {
    const total = data.collaborators.reduce((sum, c) => sum + c.ownershipPercentage, 0);
    return Math.abs(total - 100) < 0.01;
  },
  {
    message: "Total ownership must equal 100%",
    path: ["collaborators"],
  }
);

const performanceSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  venue: z.string().min(1, "Venue is required"),
  eventDate: z.string().min(1, "Event date is required"),
  performanceFee: z.preprocess(
    (val) => val === "" ? 0 : Number(val),
    z.number().min(0, "Performance fee must be positive")
  ),
  technicalRequirements: z.string().optional(),
  additionalTerms: z.string().optional(),
});

const producerSchema = z.object({
  title: z.string().min(1, "Track title is required"),
  producerName: z.string().min(1, "Producer name is required"),
  beatPrice: z.preprocess(
    (val) => val === "" ? 0 : Number(val),
    z.number().min(0, "Beat price must be positive")
  ),
  royaltyPercentage: z.preprocess(
    (val) => val === "" ? 0 : Number(val),
    z.number().min(0, "Must be 0 or greater").max(100, "Cannot exceed 100%")
  ),
  creditRequirement: z.string().min(1, "Credit requirement is required"),
  additionalTerms: z.string().optional(),
});

const managementSchema = z.object({
  title: z.string().min(1, "Agreement title is required"),
  managerName: z.string().min(1, "Manager name is required"),
  commissionRate: z.preprocess(
    (val) => val === "" ? 0 : Number(val),
    z.number().min(0, "Must be 0 or greater").max(100, "Cannot exceed 100%")
  ),
  contractDuration: z.string().min(1, "Contract duration is required"),
  responsibilities: z.string().min(1, "Responsibilities are required"),
  additionalTerms: z.string().optional(),
});

interface ContractFormProps {
  contractType: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
  isEdit?: boolean;
  "data-testid"?: string;
}

export default function ContractForm({ contractType, onSubmit, onCancel, isLoading = false, initialData, isEdit = false, "data-testid": testId }: ContractFormProps) {
  const [collaborators, setCollaborators] = useState(() => {
    if (isEdit && initialData?.collaborators && Array.isArray(initialData.collaborators) && initialData.collaborators.length > 0) {
      return initialData.collaborators;
    }
    return [
      { name: "", role: "writer", ownershipPercentage: 50 },
      { name: "", role: "writer", ownershipPercentage: 50 },
    ];
  });

  const getSchema = () => {
    switch (contractType) {
      case "split-sheet":
        return splitSheetSchema;
      case "performance":
        return performanceSchema;
      case "producer":
        return producerSchema;
      case "management":
        return managementSchema;
      default:
        return splitSheetSchema;
    }
  };

  const getDefaultValues = () => {
    // If editing and initial data exists, use it
    if (isEdit && initialData) {
      return {
        ...initialData,
        collaborators: initialData.collaborators || collaborators,
      };
    }
    
    // Otherwise use default values
    switch (contractType) {
      case "split-sheet":
        return {
          title: "",
          releaseDate: "",
          collaborators,
          performanceRoyalties: "equal",
          mechanicalRoyalties: "equal",
          additionalTerms: "",
        };
      case "performance":
        return {
          title: "",
          venue: "",
          eventDate: "",
          performanceFee: 0,
          technicalRequirements: "",
          additionalTerms: "",
        };
      case "producer":
        return {
          title: "",
          producerName: "",
          beatPrice: 0,
          royaltyPercentage: 0,
          creditRequirement: "",
          additionalTerms: "",
        };
      case "management":
        return {
          title: "",
          managerName: "",
          commissionRate: 0,
          contractDuration: "",
          responsibilities: "",
          additionalTerms: "",
        };
      default:
        return {};
    }
  };

  const form = useForm<any>({
    resolver: zodResolver(getSchema()),
    defaultValues: getDefaultValues(),
  });

  const addCollaborator = () => {
    setCollaborators([...collaborators, { name: "", role: "writer", ownershipPercentage: 0 }]);
  };

  const removeCollaborator = (index: number) => {
    if (collaborators.length > 1) {
      setCollaborators(collaborators.filter((_: any, i: number) => i !== index));
    }
  };

  const updateCollaborator = (index: number, field: string, value: any) => {
    const updated = [...collaborators];
    updated[index] = { ...updated[index], [field]: value };
    setCollaborators(updated);
    if (contractType === "split-sheet") {
      form.setValue("collaborators", updated);
    }
  };

  const handleSubmit = (data: any) => {
    onSubmit({ ...data, collaborators: contractType === "split-sheet" ? collaborators : undefined });
  };

  const totalOwnership = collaborators.reduce((sum, collab) => sum + (collab.ownershipPercentage || 0), 0);

  return (
    <div data-testid={testId}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {contractType === "split-sheet" && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Song Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter song title" {...field} data-testid="input-song-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-release-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Collaborators */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Collaborators</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCollaborator}
                    data-testid="button-add-collaborator"
                  >
                    <i className="fas fa-plus mr-1"></i>Add Collaborator
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {collaborators.map((collaborator, index) => (
                    <div key={index} className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Name</label>
                          <Input
                            placeholder="Collaborator name"
                            value={collaborator.name}
                            onChange={(e) => updateCollaborator(index, "name", e.target.value)}
                            data-testid={`input-collaborator-name-${index}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Role</label>
                          <Select 
                            value={collaborator.role} 
                            onValueChange={(value) => updateCollaborator(index, "role", value)}
                          >
                            <SelectTrigger data-testid={`select-collaborator-role-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="writer">Writer</SelectItem>
                              <SelectItem value="producer">Producer</SelectItem>
                              <SelectItem value="performer">Performer</SelectItem>
                              <SelectItem value="co-writer">Co-writer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Ownership %</label>
                            <Input
                              type="number"
                              placeholder="50"
                              min="0"
                              max="100"
                              value={collaborator.ownershipPercentage}
                              onChange={(e) => updateCollaborator(index, "ownershipPercentage", parseInt(e.target.value) || 0)}
                              data-testid={`input-collaborator-percentage-${index}`}
                            />
                          </div>
                          {collaborators.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeCollaborator(index)}
                              data-testid={`button-remove-collaborator-${index}`}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={`mt-4 p-3 border rounded-lg ${totalOwnership === 100 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <p className={`text-sm ${totalOwnership === 100 ? 'text-green-800' : 'text-yellow-800'}`}>
                    <i className="fas fa-info-circle mr-2"></i>
                    Total ownership percentage: <span className="font-semibold">{totalOwnership}%</span>
                  </p>
                </div>
              </div>

              {/* Revenue Distribution */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="performanceRoyalties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performance Royalties</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-performance-royalties">
                              <SelectValue placeholder="Select split method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equal">Split equally among writers</SelectItem>
                            <SelectItem value="custom">Custom split</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mechanicalRoyalties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mechanical Royalties</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mechanical-royalties">
                              <SelectValue placeholder="Select split method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equal">Split equally among writers</SelectItem>
                            <SelectItem value="custom">Custom split</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </>
          )}

          {contractType === "performance" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} data-testid="input-event-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter venue name" {...field} data-testid="input-venue" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-event-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="performanceFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performance Fee ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1000" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-performance-fee" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="technicalRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Sound system, lighting, etc." 
                        {...field} 
                        data-testid="textarea-tech-requirements"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {contractType === "producer" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Track Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter track title" {...field} data-testid="input-track-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="producerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter producer name" {...field} data-testid="input-producer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="beatPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beat Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="500" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-beat-price" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="royaltyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Royalty Percentage (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="20" 
                          min="0" 
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-royalty-percentage" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="creditRequirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Requirement *</FormLabel>
                    <FormControl>
                      <Input placeholder="Produced by [Producer Name]" {...field} data-testid="input-credit-requirement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {contractType === "management" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreement Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Management Agreement" {...field} data-testid="input-agreement-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="managerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter manager name" {...field} data-testid="input-manager-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15" 
                          min="0" 
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-commission-rate" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Duration *</FormLabel>
                      <FormControl>
                        <Input placeholder="1 year" {...field} data-testid="input-contract-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="responsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Responsibilities *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Booking, promotion, career guidance..." 
                        {...field} 
                        data-testid="textarea-responsibilities"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Additional Terms - Common to all contract types */}
          <FormField
            control={form.control}
            name="additionalTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Terms</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add any additional terms or conditions..." 
                    className="h-24"
                    {...field} 
                    data-testid="textarea-additional-terms"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => handleSubmit({ ...form.getValues(), saveAsDraft: true })}
              disabled={isLoading}
              data-testid="button-save-draft"
            >
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
              data-testid="button-create-contract"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                "Create Contract & Send for Signatures"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
