import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Link, Loader2, Package, Scissors, Coffee } from "lucide-react";
import {
    compressImageFile,
    compressImageUrl,
    validateImageUrl,
    ImageCompressorError,
} from "@/lib/imageCompressor";

type FallbackIcon = "package" | "scissors" | "coffee" | "default";

interface ImageUploadFieldProps {
    /** URL atual da imagem (salva no banco) */
    currentUrl?: string | null;
    /** Chamado quando o usuário seleciona/confirma uma nova imagem comprimida (File WebP) */
    onFileReady: (file: File | null) => void;
    /** Chamado quando o usuário remove a imagem */
    onRemove: () => void;
    /** Ícone de fallback quando não há imagem */
    fallbackIcon?: FallbackIcon;
    /** Label dos botões */
    label?: string;
}

const FallbackIcons: Record<FallbackIcon, React.ReactNode> = {
    package: <Package className="h-8 w-8 text-muted-foreground" />,
    scissors: <Scissors className="h-8 w-8 text-muted-foreground" />,
    coffee: <Coffee className="h-8 w-8 text-muted-foreground" />,
    default: <Package className="h-8 w-8 text-muted-foreground" />,
};

export default function ImageUploadField({
    currentUrl,
    onFileReady,
    onRemove,
    fallbackIcon = "default",
    label = "foto",
}: ImageUploadFieldProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
    const [urlInput, setUrlInput] = useState("");
    const [processing, setProcessing] = useState(false);

    // Sincroniza preview quando a prop muda (ao abrir dialog em edição)
    if (currentUrl !== undefined && currentUrl !== preview && !processing) {
        setPreview(currentUrl ?? null);
    }

    // ── Upload de arquivo local ──────────────────────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ""; // reset para permitir re-selecionar o mesmo arquivo

        setProcessing(true);
        try {
            const compressed = await compressImageFile(file);
            const objectUrl = URL.createObjectURL(compressed);
            setPreview(objectUrl);
            onFileReady(compressed);
        } catch (err) {
            const msg =
                err instanceof ImageCompressorError
                    ? err.message
                    : "Erro ao processar imagem.";
            toast({ title: "Imagem inválida", description: msg, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    // ── Imagem por URL ───────────────────────────────────────────────────────
    const handleUrlConfirm = async () => {
        const url = urlInput.trim();
        if (!url) return;

        setProcessing(true);
        try {
            const valid = await validateImageUrl(url);
            if (!valid) {
                toast({
                    title: "URL inválida",
                    description: "Não foi possível carregar a imagem desta URL.",
                    variant: "destructive",
                });
                setProcessing(false);
                return;
            }

            // Tenta baixar e comprimir; se CORS bloquear, usa a URL diretamente
            const compressed = await compressImageUrl(url);
            if (compressed) {
                const objectUrl = URL.createObjectURL(compressed);
                setPreview(objectUrl);
                onFileReady(compressed);
            } else {
                // Fallback: salva a URL original se não conseguir baixar
                setPreview(url);
                onFileReady(null); // sinaliza que não há file — usar URL diretamente
                toast({
                    title: "Imagem vinculada",
                    description: "A imagem será salva pelo link externo (CORS não permitiu download).",
                });
            }
            setUrlInput("");
        } finally {
            setProcessing(false);
        }
    };

    // ── Remover ──────────────────────────────────────────────────────────────
    const handleRemove = () => {
        setPreview(null);
        setUrlInput("");
        onRemove();
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex items-start gap-6 pb-4 border-b">
            {/* Preview */}
            <div className="relative shrink-0">
                <Avatar className="h-24 w-24 rounded-xl">
                    <AvatarImage src={preview ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-muted rounded-xl">
                        {processing ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            FallbackIcons[fallbackIcon]
                        )}
                    </AvatarFallback>
                </Avatar>
                {preview && !processing && (
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemove}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            {/* Controles */}
            <div className="flex-1 space-y-3">
                <p className="text-sm font-medium text-foreground capitalize">{label}</p>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="h-8 text-xs">
                        <TabsTrigger value="upload" className="text-xs gap-1.5">
                            <Upload className="h-3 w-3" />
                            Arquivo
                        </TabsTrigger>
                        <TabsTrigger value="url" className="text-xs gap-1.5">
                            <Link className="h-3 w-3" />
                            Link URL
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-2 space-y-1.5">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                            id="img-upload-input"
                            aria-label={`Selecionar ${label}`}
                            title={`Selecionar ${label}`}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processing}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                        >
                            {processing ? (
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-3.5 w-3.5 mr-2" />
                            )}
                            {preview ? "Trocar imagem" : "Selecionar arquivo"}
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                            JPG, JPEG, PNG ou WEBP • Máx 10 MB • Comprimido automaticamente para WebP
                        </p>
                    </TabsContent>

                    <TabsContent value="url" className="mt-2 space-y-1.5">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://exemplo.com/imagem.jpg"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUrlConfirm()}
                                className="h-8 text-xs"
                                disabled={processing}
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleUrlConfirm}
                                disabled={processing || !urlInput.trim()}
                                className="shrink-0"
                            >
                                {processing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    "Usar"
                                )}
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Cole um link de imagem da internet
                        </p>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
