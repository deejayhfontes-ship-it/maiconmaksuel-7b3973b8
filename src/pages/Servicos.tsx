import { Scissors } from "lucide-react";

const Servicos = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Scissors className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground">Catálogo de serviços</p>
        </div>
      </div>
    </div>
  );
};

export default Servicos;
