import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ContractCardProps {
  contract: {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  onView?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function ContractCard({ contract, onView, onDownload, onShare }: ContractCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Signed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "split-sheet":
        return "fas fa-chart-pie";
      case "performance":
        return "fas fa-microphone";
      case "producer":
        return "fas fa-sliders-h";
      case "management":
        return "fas fa-handshake";
      default:
        return "fas fa-file-contract";
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border hover:border-accent transition-colors" data-testid={`contract-card-${contract.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <i className={`${getTypeIcon(contract.type)} text-accent`}></i>
          </div>
          <div>
            <h3 className="font-semibold text-lg">{contract.title}</h3>
            <p className="text-muted-foreground text-sm capitalize">{contract.type.replace('-', ' ')}</p>
          </div>
        </div>
        {getStatusBadge(contract.status)}
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(contract.updatedAt).toLocaleDateString()}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView?.(contract.id)}
          data-testid={`button-view-${contract.id}`}
        >
          <i className="fas fa-eye mr-1"></i>
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload?.(contract.id)}
          data-testid={`button-download-${contract.id}`}
        >
          <i className="fas fa-download mr-1"></i>
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onShare?.(contract.id)}
          data-testid={`button-share-${contract.id}`}
        >
          <i className="fas fa-share mr-1"></i>
          Share
        </Button>
      </div>
    </div>
  );
}
