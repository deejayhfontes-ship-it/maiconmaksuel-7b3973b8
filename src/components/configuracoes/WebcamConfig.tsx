import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Camera, 
  Video, 
  VideoOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Settings,
  Monitor,
  Smartphone,
  AlertCircle
} from "lucide-react";

interface MediaDeviceInfoExtended {
  deviceId: string;
  label: string;
  kind: string;
}

export default function WebcamConfig() {
  const [devices, setDevices] = useState<MediaDeviceInfoExtended[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string>("720p");
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Carregar dispositivos
  const loadDevices = async () => {
    try {
      // Primeiro solicitar permissão
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Câmera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
      
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
      
      setError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Habilite nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else {
        setError('Erro ao acessar câmeras: ' + err.message);
      }
    }
  };

  // Iniciar preview
  const startPreview = async () => {
    if (!selectedDevice) {
      toast.error('Selecione uma câmera primeiro');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parar stream anterior
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedDevice },
          width: resolution === '1080p' ? { ideal: 1920 } : resolution === '720p' ? { ideal: 1280 } : { ideal: 640 },
          height: resolution === '1080p' ? { ideal: 1080 } : resolution === '720p' ? { ideal: 720 } : { ideal: 480 },
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsConnected(true);
      toast.success('Câmera conectada com sucesso!');
    } catch (err: any) {
      setError('Erro ao iniciar câmera: ' + err.message);
      setIsConnected(false);
      toast.error('Erro ao conectar câmera');
    } finally {
      setLoading(false);
    }
  };

  // Parar preview
  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
  };

  // Salvar configurações
  const saveSettings = () => {
    localStorage.setItem('webcam_config', JSON.stringify({
      selectedDevice,
      resolution,
      mirrorVideo,
      autoStart
    }));
    toast.success('Configurações salvas!');
  };

  // Carregar configurações salvas
  useEffect(() => {
    const saved = localStorage.getItem('webcam_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.selectedDevice) setSelectedDevice(config.selectedDevice);
        if (config.resolution) setResolution(config.resolution);
        if (config.mirrorVideo !== undefined) setMirrorVideo(config.mirrorVideo);
        if (config.autoStart !== undefined) setAutoStart(config.autoStart);
      } catch (e) {
        console.error('Erro ao carregar configurações da webcam');
      }
    }
    loadDevices();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Configuração da Webcam
          </CardTitle>
          <CardDescription>
            Configure e teste a câmera para captura de fotos de clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectada
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <VideoOff className="h-3 w-3 mr-1" />
                  Desconectada
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDevices}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Dispositivos
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Seleção de dispositivo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Câmera</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma câmera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma câmera encontrada
                    </SelectItem>
                  ) : (
                    devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolução</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      480p (SD)
                    </div>
                  </SelectItem>
                  <SelectItem value="720p">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      720p (HD)
                    </div>
                  </SelectItem>
                  <SelectItem value="1080p">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      1080p (Full HD)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Espelhar Vídeo</Label>
                <p className="text-xs text-muted-foreground">
                  Inverte a imagem horizontalmente (recomendado para câmera frontal)
                </p>
              </div>
              <Switch
                checked={mirrorVideo}
                onCheckedChange={setMirrorVideo}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Iniciar Automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Inicia a câmera automaticamente ao abrir captura de foto
                </p>
              </div>
              <Switch
                checked={autoStart}
                onCheckedChange={setAutoStart}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-md">
              {!isConnected ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <VideoOff className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Câmera não conectada</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: mirrorVideo ? 'scaleX(-1)' : 'none' }}
                />
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            {!isConnected ? (
              <Button onClick={startPreview} disabled={loading || !selectedDevice}>
                <Video className="h-4 w-4 mr-2" />
                {loading ? 'Conectando...' : 'Testar Câmera'}
              </Button>
            ) : (
              <Button variant="outline" onClick={stopPreview}>
                <VideoOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}
            <Button variant="secondary" onClick={saveSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dicas de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              Use boa iluminação frontal para melhores resultados
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              Posicione o cliente centralizado na tela
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              Resolução 720p é suficiente para fotos de perfil
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
              Se a câmera não aparecer, verifique permissões do navegador
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
