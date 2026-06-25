import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Entradas de Compra</h2>
          <p className="text-muted-foreground mt-1">
            Registre compras via XML ou entrada manual
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="border-border"
                onClick={() => setIsManualEntry(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Entrada Manual
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cadastre uma compra digitando os dados manualmente</p>
            </TooltipContent>
          </Tooltip>

          <Button
            onClick={() => setIsUploading(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar XML
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

      <Sheet open={isManualEntry} onOpenChange={setIsManualEntry}>
        <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Entrada Manual de Nota Fiscal</SheetTitle>
            <SheetDescription>
              Preencha os dados do fornecedor, nota e itens da compra.
            </SheetDescription>
          </SheetHeader>

          <EntradaManualForm
            onSubmit={handleManualSubmit}
            onCancel={() => setIsManualEntry(false)}
          />
        </SheetContent>
      </Sheet>

      <HistoricoEntradas onImportXml={() => setIsUploading(true)} onManualEntry={() => setIsManualEntry(true)} />
    </div>
  );
}
