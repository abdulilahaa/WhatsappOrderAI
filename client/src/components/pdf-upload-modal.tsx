import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload, Loader2, Check, AlertTriangle } from "lucide-react";

interface ExtractedService {
  name: string;
  description: string;
  price: string;
  category?: string;
}

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFUploadModal({ isOpen, onClose }: PDFUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedServices, setExtractedServices] = useState<ExtractedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [isProcessingStep, setIsProcessingStep] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processPDFMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/products/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process PDF');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedServices(data.services);
      setSelectedServices(new Set(data.services.map((_: any, index: number) => index)));
      setIsProcessingStep(false);
      toast({
        title: "PDF Processed Successfully!",
        description: `Extracted ${data.services.length} services from your PDF.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "PDF Processing Failed",
        description: error.message || "Failed to extract services from the PDF.",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (services: ExtractedService[]) => {
      const response = await apiRequest("POST", "/api/products/import", { products: services });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Services Imported Successfully!",
        description: `Successfully imported ${data.created} services. ${data.errors > 0 ? `${data.errors} items had errors.` : ''}`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import services.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select a PDF file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleProcessPDF = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file to process.",
        variant: "destructive",
      });
      return;
    }
    processPDFMutation.mutate(selectedFile);
  };

  const handleImport = () => {
    const servicesToImport = extractedServices.filter((_, index) => selectedServices.has(index));
    if (servicesToImport.length === 0) {
      toast({
        title: "No Services Selected",
        description: "Please select at least one service to import.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(servicesToImport);
  };

  const toggleService = (index: number) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedServices(newSelected);
  };

  const selectAll = () => {
    setSelectedServices(new Set(extractedServices.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedServices(new Set());
  };

  const handleClose = () => {
    setSelectedFile(null);
    setExtractedServices([]);
    setSelectedServices(new Set());
    setIsProcessingStep(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Services from PDF
          </DialogTitle>
          <DialogDescription>
            {isProcessingStep 
              ? "Upload a PDF containing your service menu to automatically extract service information"
              : "Review and select services to import into your catalog"
            }
          </DialogDescription>
        </DialogHeader>

        {isProcessingStep ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Upload PDF File</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={processPDFMutation.isPending}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900">How PDF Processing Works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• AI extracts text content from your PDF service menu</li>
                    <li>• Identifies service names, descriptions, and pricing</li>
                    <li>• Converts prices to KWD automatically</li>
                    <li>• Organizes services by category (Manicure, Pedicure, etc.)</li>
                    <li>• You can review and select which services to import</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleProcessPDF}
                disabled={processPDFMutation.isPending || !selectedFile}
              >
                {processPDFMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Extracted {extractedServices.length} Services</h3>
                <Badge variant="secondary">{selectedServices.size} selected</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {extractedServices.map((service, index) => (
                <Card key={index} className={`transition-colors ${selectedServices.has(index) ? 'border-green-500 bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedServices.has(index)}
                        onCheckedChange={() => toggleService(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{service.name}</h4>
                          <div className="flex items-center gap-2">
                            {service.category && (
                              <Badge variant="outline">{service.category}</Badge>
                            )}
                            <span className="font-bold text-green-600">{service.price} KWD</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsProcessingStep(true)}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importMutation.isPending || selectedServices.size === 0}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import Selected ({selectedServices.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}