import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, RefreshCw, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WebcamCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function WebcamCapture({ open, onClose, onCapture }: WebcamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    setLoading(true);
    setCameraError(null);

    // Verificar suporte do navegador
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Seu navegador não suporta acesso à câmera");
      setLoading(false);
      return;
    }

    try {
      // Parar stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facingMode
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      
      if (error.name === "NotAllowedError") {
        setCameraError("Acesso à câmera foi negado. Por favor, permita o acesso nas configurações do navegador.");
      } else if (error.name === "NotFoundError") {
        setCameraError("Nenhuma câmera foi encontrada neste dispositivo.");
      } else if (error.name === "NotReadableError") {
        setCameraError("A câmera está sendo usada por outro aplicativo.");
      } else {
        setCameraError(`Erro ao acessar câmera: ${error.message}`);
      }
    }
  }, [facingMode, stream]);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Iniciar quando abrir
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  // Reiniciar quando trocar câmera
  useEffect(() => {
    if (open && !capturedImage) {
      startCamera();
    }
  }, [facingMode]);

  // Capturar foto
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Definir tamanho do canvas igual ao vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame atual
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(imageDataUrl);

    // Pausar vídeo
    video.pause();
  };

  // Tirar outra foto
  const retakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // Confirmar foto
  const confirmPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `foto-cliente-${Date.now()}.jpg`, {
            type: "image/jpeg"
          });
          onCapture(file);
          toast({ title: "Foto capturada com sucesso!" });
          handleClose();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Trocar câmera (frontal/traseira)
  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Fechar e limpar
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {capturedImage ? "Foto Capturada" : "Capturar Foto do Cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Área de preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {loading && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
                <p>Iniciando câmera...</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                <VideoOff className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-semibold mb-2">Câmera não disponível</p>
                <p className="text-sm opacity-75 mb-4">{cameraError}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={startCamera}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClose}>
                    Usar upload
                  </Button>
                </div>
              </div>
            )}

            {!capturedImage && !cameraError && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    loading && "opacity-0"
                  )}
                  onLoadedMetadata={() => setLoading(false)}
                />
                
                {/* Overlay com guia de enquadramento */}
                {!loading && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-64 border-2 border-dashed border-white/60 rounded-full flex items-center justify-center">
                        <span className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                          Centralize o rosto
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Instruções */}
          {!capturedImage && !cameraError && !loading && (
            <p className="text-center text-sm text-muted-foreground">
              🎯 Posicione o cliente e clique em "Capturar Foto"
            </p>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3">
            {!capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={switchCamera}
                  disabled={loading || !!cameraError}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Trocar Câmera
                </Button>
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={loading || !!cameraError}
                  className="flex-[2] bg-primary hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar Foto
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Tirar Outra
                </Button>
                <Button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex-[2] bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Usar Esta Foto
                </Button>
              </>
            )}
          </div>

          {/* Botão cancelar */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
