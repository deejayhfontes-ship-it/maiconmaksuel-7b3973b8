import { useState, useRef } from "react";
import { UploadCloud, FileType, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useImportarXml } from "../hooks/useImportarXml";
import { NfeParseResult } from "../types/nfe.types";
import { toast } from "sonner";

interface XmlUploaderProps {
  onXmlParsed: (data: NfeParseResult) => void;
}

export function XmlUploader({ onXmlParsed }: XmlUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processarXml, isUploading } = useImportarXml();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFile(file);
      // Reset input para permitir selecionar o mesmo arquivo novamente se der erro
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== "text/xml" && !file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Por favor, selecione um arquivo XML válido.");
      return;
    }

    const result = await processarXml(file);
    if (result) {
      onXmlParsed(result);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-xl transition-all duration-200 group cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border bg-card hover:bg-accent/50 hover:border-primary/50"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xml,text/xml"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className={cn(
            "p-4 rounded-full transition-colors duration-200",
            isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            {isUploading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <UploadCloud className="w-10 h-10" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {isUploading ? "Processando XML..." : "Importar Nota Fiscal (XML)"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isUploading 
                ? "Aguarde enquanto fazemos a leitura inteligente dos dados..." 
                : "Arraste e solte o arquivo XML do seu fornecedor aqui, ou clique para procurar no seu computador."}
            </p>
          </div>

          {!isUploading && (
            <Button variant="secondary" className="mt-4 pointer-events-none">
              Selecionar Arquivo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
