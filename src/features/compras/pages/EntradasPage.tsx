import { useState } from "react";
import { Plus, Upload, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HistoricoEntradas } from "../components/HistoricoEntradas";
import { XmlUploader } from "../components/XmlUploader";
import { ConferenciaPage } from "../components/ConferenciaPage";
import { EntradaManualForm } from "../components/EntradaManualForm";
import { NfeParseResult } from "../types/nfe.types";

export default function EntradasPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [conferenciaData, setConferenciaData] = useState<NfeParseResult | null>(null);

  const handleXmlParsed = (data: NfeParseResult) => {
    setIsUploading(false);
    setConferenciaData(data);
  };

  const handleManualSubmit = (data: NfeParseResult) => {
    setIsManualEntry(false);
    setConferenciaData(data);
  };

  if (conferenciaData) {
    return (
      <ConferenciaPage 
        data={conferenciaData} 
        onCancel={() => setConferenciaData(null)}
        onSuccess={() => {
          setConferenciaData(null);
          // O react-query vai invalidar o histórico automaticamente se fizermos direitinho
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Notas de Compra</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as compras e importe notas fiscais (XML) dos seus fornecedores
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão de Upload será o gatilho principal da Fase 3 */}
          <Button 
            onClick={() => setIsUploading(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar XML
          </Button>
          
          <Button
            variant="outline"
            className="border-white/10"
            onClick={() => setIsManualEntry(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Entrada Manual
          </Button>
        </div>
      </div>

      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Importar Nota Fiscal</DialogTitle>
            <DialogDescription>
              Selecione o arquivo .xml da nota fiscal do seu fornecedor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <XmlUploader onXmlParsed={handleXmlParsed} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualEntry} onOpenChange={setIsManualEntry}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Entrada Manual de Nota Fiscal</DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor, nota e itens da compra.
            </DialogDescription>
          </DialogHeader>

          <EntradaManualForm
            onSubmit={handleManualSubmit}
            onCancel={() => setIsManualEntry(false)}
          />
        </DialogContent>
      </Dialog>

      <HistoricoEntradas />
    </div>
  );
}
