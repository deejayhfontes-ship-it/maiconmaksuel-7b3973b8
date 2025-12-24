import { ClipboardList } from "lucide-react";

const Atendimentos = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
          <p className="text-muted-foreground">Histórico de atendimentos</p>
        </div>
      </div>
    </div>
  );
};

export default Atendimentos;
