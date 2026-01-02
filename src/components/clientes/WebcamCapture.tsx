import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X, RefreshCw, VideoOff, Move, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  
  // Estados para crop
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    setLoading(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Seu navegador não suporta acesso à câmera");
      setLoading(false);
      return;
    }

    try {
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
        setCameraError("Acesso à câmera foi negado.");
      } else if (error.name === "NotFoundError") {
        setCameraError("Nenhuma câmera encontrada.");
      } else if (error.name === "NotReadableError") {
        setCameraError("Câmera em uso por outro app.");
      } else {
        setCameraError(`Erro: ${error.message}`);
      }
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }

    return () => {
      stopCamera();
    };
  }, [open]);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(imageDataUrl);
    
    // Carregar imagem para crop
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = imageDataUrl;

    video.pause();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Tirar outra
  const retakePhoto = () => {
    setCapturedImage(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // Handlers para arrastar
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  // Confirmar foto com crop - replica EXATAMENTE as transformações CSS
  const confirmPhoto = () => {
    const cropCanvas = cropCanvasRef.current;
    const img = imageRef.current;
    
    if (!cropCanvas || !img) return;

    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;

    // Tamanho do container visual (256px - o círculo de preview)
    const containerSize = 256;
    // Tamanho de saída final
    const outputSize = 512;
    
    cropCanvas.width = outputSize;
    cropCanvas.height = outputSize;

    // Limpar e fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // ========================================
    // REPLICAR EXATAMENTE O CSS DO PREVIEW
    // ========================================
    
    // No CSS a imagem tem height: 256px, width: auto
    const imgAspect = img.width / img.height;
    const displayHeight = containerSize; // 256
    const displayWidth = displayHeight * imgAspect;
    
    // Fator de escala para 512px de saída
    const outputScale = outputSize / containerSize; // 2
    
    // Dimensões finais da imagem (escaladas para output)
    const finalImgWidth = displayWidth * outputScale;
    const finalImgHeight = displayHeight * outputScale;
    
    // Centro do canvas de saída
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    
    // Aplicar as mesmas transformações CSS:
    // transform: translate(position.x, position.y) scale(scale)
    // transformOrigin: center
    // A imagem está centralizada no container
    
    ctx.save();
    
    // 1. Mover para o centro do canvas
    ctx.translate(centerX, centerY);
    
    // 2. Aplicar a posição (offset do drag) - escalada para output
    ctx.translate(position.x * outputScale, position.y * outputScale);
    
    // 3. Aplicar o zoom do usuário
    ctx.scale(scale, scale);
    
    // 4. Desenhar a imagem centrada (metade para cada lado)
    ctx.drawImage(
      img,
      -finalImgWidth / 2,
      -finalImgHeight / 2,
      finalImgWidth,
      finalImgHeight
    );
    
    ctx.restore();

    // Converter para blob e salvar
    cropCanvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `foto-cliente-${Date.now()}.jpg`, {
            type: "image/jpeg"
          });
          onCapture(file);
          toast({ title: "Foto salva!" });
          handleClose();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5" />
            {capturedImage ? "Ajustar Foto" : "Capturar Foto"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Área de preview/crop */}
          <div className="relative bg-black rounded-lg overflow-hidden mx-auto" style={{ width: 280, height: capturedImage ? 280 : 210 }}>
            {loading && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2" />
                <p className="text-sm">Iniciando...</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <VideoOff className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm mb-3">{cameraError}</p>
                <Button variant="secondary" size="sm" onClick={startCamera}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Tentar
                </Button>
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
                
                {!loading && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-32 h-40 border-2 border-dashed border-white/70 rounded-full" />
                  </div>
                )}
              </>
            )}

            {capturedImage && (
              <div 
                className="relative w-64 h-64 mx-auto my-2 rounded-full overflow-hidden border-4 border-white/30 cursor-move bg-muted"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {/* Container centralizado para a imagem */}
                <div 
                  className="absolute inset-0 flex items-center justify-center select-none"
                >
                  <img
                    src={capturedImage}
                    alt="Preview"
                    className="max-w-none pointer-events-none"
                    style={{ 
                      height: 256,
                      width: 'auto',
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                </div>
                
                {/* Indicador de arrasto */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Move className="h-8 w-8 text-white/40" />
                </div>
              </div>
            )}
          </div>

          {/* Canvas ocultos */}
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={cropCanvasRef} className="hidden" />

          {/* Controles de zoom (apenas no modo crop) */}
          {capturedImage && (
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {capturedImage && (
            <p className="text-center text-xs text-muted-foreground">
              Arraste para posicionar • Use o zoom para ajustar
            </p>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            {!capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={loading || !!cameraError}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={loading || !!cameraError}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
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
                  Outra
                </Button>
                <Button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Usar Foto
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
