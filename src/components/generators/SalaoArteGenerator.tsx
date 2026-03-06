import React, { useState, useCallback, useRef, useEffect } from 'react';
import logoMaiconMaksuel from '../../assets/logo-maicon-maksuel.png';
import {
    Sparkles,
    Upload,
    Download,
    Loader2,
    AlertCircle,
    X,
    Image as ImageIcon,
    ChevronRight,
    ChevronLeft,
    Eye,
    Trash2,
    ArrowLeft,
    Check,
    Wand2,
    Camera,
    Tag,
    DollarSign,
    PartyPopper,
    ClipboardList,
    Lightbulb,
    Star,
    PlusCircle,
    CalendarDays,
    Smartphone,
    Square,
    Columns,
    Monitor,
    FileText,
    RectangleVertical,
    Palette,
} from 'lucide-react';
import { useGeminiImageGeneration, GenerationConfig } from '@/hooks/useGeminiImageGeneration';
import { useSalaoAssets } from '@/hooks/useSalaoAssets';
import { toast } from 'sonner';

// ── Tipos ──
interface ReferenceImage {
    base64: string;
    mimeType: string;
    preview: string;
    description?: string;
    category?: 'style' | 'environment';
}

interface GeneratedImage {
    src: string;
    prompt: string;
    timestamp: number;
}

// ── Opcoes de formulario ──
const INTENCOES = [
    { id: 'promover', label: 'Promover servico', desc: 'Divulgar um servico ou tratamento', Icon: Tag },
    { id: 'promocao', label: 'Promocao', desc: 'Desconto, combo ou oferta especial', Icon: DollarSign },
    { id: 'evento', label: 'Evento', desc: 'Inauguracao, workshop, dia da noiva', Icon: PartyPopper },
    { id: 'informar', label: 'Informar', desc: 'Horarios, regras, novidades', Icon: ClipboardList },
    { id: 'dica', label: 'Dica de beleza', desc: 'Conteudo educativo e dicas', Icon: Lightbulb },
    { id: 'antes_depois', label: 'Antes & Depois', desc: 'Resultados de transformacoes', Icon: Star },
    { id: 'novo_servico', label: 'Novo Servico', desc: 'Lancamento de um novo servico', Icon: PlusCircle },
    { id: 'agenda', label: 'Agenda', desc: 'Horarios disponiveis e agendamento', Icon: CalendarDays },
];

const TIPOS_PECA = [
    { id: 'story', label: 'Story', dimension: '1080x1920', Icon: Smartphone },
    { id: 'post', label: 'Post Feed', dimension: '1080x1080', Icon: Square },
    { id: 'feed', label: 'Feed Novo', dimension: '1080x1440', Icon: RectangleVertical },
    { id: 'carrossel', label: 'Carrossel', dimension: '1080x1080', Icon: Columns },
    { id: 'banner', label: 'Banner', dimension: '1920x1080', Icon: Monitor },
    { id: 'cartaz', label: 'Cartaz A4', dimension: '1080x1527', Icon: FileText },
];

const FORMATOS = [
    { id: 'quadrado', label: 'Quadrado', ratio: '1:1', dimension: '1080x1080' },
    { id: 'vertical', label: 'Vertical', ratio: '9:16', dimension: '1080x1920' },
    { id: 'paisagem', label: 'Paisagem', ratio: '16:9', dimension: '1920x1080' },
];

// ── 16 Estilos Visuais ──
const ESTILOS = [
    { id: 'elegant', label: 'Elegante', desc: 'Sofisticado e refinado' },
    { id: 'modern', label: 'Moderno', desc: 'Contemporaneo e arrojado' },
    { id: 'minimalist', label: 'Minimalista', desc: 'Limpo e essencial' },
    { id: 'glamour', label: 'Glamour', desc: 'Luxuoso e brilhante' },
    { id: 'romantic', label: 'Romantico', desc: 'Suave e delicado' },
    { id: 'bold', label: 'Ousado', desc: 'Vibrante e impactante' },
    { id: 'ultra_realistic', label: 'Realista', desc: 'Fotorrealista 8K' },
    { id: 'institutional', label: 'Institucional', desc: 'Profissional e corporativo' },
    { id: 'classic', label: 'Classico', desc: 'Atemporal e tradicional' },
    { id: 'tech', label: 'Tecnologico', desc: 'Futurista e digital' },
    { id: 'glassmorphism', label: 'Glassmorphism', desc: 'Vidro translucido' },
    { id: 'playful', label: 'Ludico', desc: 'Colorido e divertido' },
    { id: 'infoproduct', label: 'Infoproduto', desc: 'Marketing digital' },
    { id: 'jovial', label: 'Jovial', desc: 'Jovem e descontraido' },
    { id: 'pro_portrait', label: 'Retrato Pro', desc: 'Retrato profissional' },
    { id: 'glow', label: 'Glow', desc: 'Brilho e luminosidade' },
];

const GALLERY_KEY = 'salao_arte_gallery';
const MAX_GALLERY = 50;

// ── Componente Principal ──
export default function SalaoArteGenerator() {
    const [step, setStep] = useState(1);

    // Step 1
    const [categoria, setCategoria] = useState('');
    const [titulo, setTitulo] = useState('');
    const [intencao, setIntencao] = useState('');
    const [detalhes, setDetalhes] = useState('');

    // Step 2
    const [tipoPeca, setTipoPeca] = useState('post');
    const [formato, setFormato] = useState('quadrado');
    const [estiloVisual, setEstiloVisual] = useState('elegant');
    const [subjectImage, setSubjectImage] = useState<ReferenceImage | null>(null);
    const [refImage, setRefImage] = useState<ReferenceImage | null>(null);

    // Step 3
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
        try {
            const saved = localStorage.getItem(GALLERY_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [error, setError] = useState('');

    // Hooks
    const { generate, isGenerating, progress } = useGeminiImageGeneration();
    const { categorias: categoriasLista, buildSalaoPrompt } = useSalaoAssets(categoria);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const refInputRef = useRef<HTMLInputElement>(null);

    // Persist gallery
    useEffect(() => {
        try {
            localStorage.setItem(GALLERY_KEY, JSON.stringify(generatedImages));
        } catch {
            // Quota exceeded — remove oldest images and retry
            const trimmed = generatedImages.slice(0, 10);
            try {
                localStorage.setItem(GALLERY_KEY, JSON.stringify(trimmed));
            } catch {
                // Still failing — clear gallery from storage
                localStorage.removeItem(GALLERY_KEY);
            }
        }
    }, [generatedImages]);

    // ── Processar imagem ──
    const processImage = useCallback(async (file: File): Promise<ReferenceImage> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve({
                    base64,
                    mimeType: file.type || 'image/jpeg',
                    preview: result,
                });
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsDataURL(file);
        });
    }, []);

    const handleSubjectUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const img = await processImage(file);
            setSubjectImage(img);
            toast.success('Foto carregada!');
        } catch {
            toast.error('Arquivo invalido');
        }
    }, [processImage]);

    const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const img = await processImage(file);
            setRefImage(img);
            toast.success('Referencia carregada!');
        } catch {
            toast.error('Arquivo invalido');
        }
    }, [processImage]);

    // ── Resolve dimensao ──
    const getDimension = useCallback((): string => {
        if (tipoPeca === 'story') return '1080x1920';
        if (tipoPeca === 'feed') return '1080x1440';
        if (tipoPeca === 'banner') return '1920x1080';
        if (tipoPeca === 'cartaz') return '1080x1527';
        const fmtDef = FORMATOS.find(f => f.id === formato);
        return fmtDef?.dimension || '1080x1080';
    }, [tipoPeca, formato]);

    // ── Overlay Logo via Canvas ──
    const applyLogoOverlay = useCallback(async (imageSrc: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const logo = new Image();
                logo.crossOrigin = 'anonymous';
                logo.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(imageSrc); return; }

                    // Desenha a imagem base
                    ctx.drawImage(img, 0, 0);

                    // Calcula tamanho do logo (15% da largura da imagem)
                    const logoMaxW = img.width * 0.15;
                    const logoScale = logoMaxW / logo.width;
                    const logoW = logo.width * logoScale;
                    const logoH = logo.height * logoScale;

                    // Margem de 3% da menor dimensão
                    const margin = Math.min(img.width, img.height) * 0.03;

                    // Posição: canto inferior direito
                    const logoX = img.width - logoW - margin;
                    const logoY = img.height - logoH - margin;

                    // Pill escuro atrás do logo — contraste garantido em qualquer fundo
                    const fadeW = logoW + margin * 2.5;
                    const fadeH = logoH + margin * 2;
                    const fadeX = img.width - fadeW - margin * 0.5;
                    const fadeY = img.height - fadeH - margin * 0.5;
                    const rx = fadeH * 0.35;

                    ctx.save();
                    ctx.globalAlpha = 0.65;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.beginPath();
                    ctx.moveTo(fadeX + rx, fadeY);
                    ctx.arcTo(fadeX + fadeW, fadeY, fadeX + fadeW, fadeY + fadeH, rx);
                    ctx.arcTo(fadeX + fadeW, fadeY + fadeH, fadeX, fadeY + fadeH, rx);
                    ctx.arcTo(fadeX, fadeY + fadeH, fadeX, fadeY, rx);
                    ctx.arcTo(fadeX, fadeY, fadeX + fadeW, fadeY, rx);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();

                    // Drop-shadow branco + logo em screen (fica branca sobre fundo escuro do pill)
                    ctx.save();
                    ctx.shadowColor = 'rgba(255,255,255,0.7)';
                    ctx.shadowBlur = 6;
                    ctx.globalCompositeOperation = 'screen';
                    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
                    ctx.restore();

                    // Restaura composição normal
                    ctx.globalCompositeOperation = 'source-over';

                    resolve(canvas.toDataURL('image/png'));
                };
                logo.onerror = () => resolve(imageSrc);
                logo.src = logoMaiconMaksuel;
            };
            img.onerror = () => resolve(imageSrc);
            img.src = imageSrc;
        });
    }, []);

    // ── Gerar ──
    const handleGenerate = useCallback(async () => {
        if (!titulo.trim()) {
            toast.error('Preencha o titulo do material');
            return;
        }

        setError('');
        setStep(3);

        try {
            const pecaLabel = TIPOS_PECA.find(t => t.id === tipoPeca)?.label || 'Post';
            const estiloObj = ESTILOS.find(s => s.id === estiloVisual);
            const estiloLabel = estiloObj?.label || 'Elegante';
            const catObj = categoriasLista.find(c => c.slug === categoria);
            const dimension = getDimension();

            const prompt = buildSalaoPrompt(
                pecaLabel,
                titulo,
                intencao || 'Promover servico',
                detalhes,
                catObj?.nome
            );

            let sobriety = 60;
            if (estiloVisual === 'institutional') sobriety = 85;
            else if (estiloVisual === 'ultra_realistic' || estiloVisual === 'pro_portrait') sobriety = 70;
            else if (estiloVisual === 'classic' || estiloVisual === 'minimalist') sobriety = 80;
            else if (estiloVisual === 'bold' || estiloVisual === 'glow') sobriety = 35;
            else if (estiloVisual === 'glamour' || estiloVisual === 'romantic') sobriety = 50;

            const referenceImages: Array<{
                data: string;
                mimeType: string;
                description?: string;
                category?: 'style' | 'environment';
            }> = [];

            if (subjectImage) {
                referenceImages.push({
                    data: `data:${subjectImage.mimeType};base64,${subjectImage.base64}`,
                    mimeType: subjectImage.mimeType,
                    description: 'FOTO PRINCIPAL do sujeito. REPLIQUE fielmente as caracteristicas fisicas, expressao facial e aparencia desta referencia. Mantenha a identidade visual do sujeito EXATAMENTE como na foto.',
                    category: 'style' as const,
                });
            }

            if (refImage) {
                referenceImages.push({
                    data: `data:${refImage.mimeType};base64,${refImage.base64}`,
                    mimeType: refImage.mimeType,
                    description: 'Referencia de ESTILO VISUAL. Use as cores, texturas, composicao e estetica desta imagem como inspiracao para o design.',
                    category: 'style' as const,
                });
            }

            const hasPersonPhoto = !!subjectImage;

            const generationConfig: GenerationConfig = {
                niche: catObj?.nome || titulo || 'Criacao de Arte',
                gender: 'female',
                subjectDescription: hasPersonPhoto
                    ? `Replique FIELMENTE a pessoa da foto de referencia. Mantenha 100% das caracteristicas faciais, expressao e aparencia. ${titulo}`
                    : `Material promocional premium sobre: ${titulo}. ${prompt}`,
                environment: hasPersonPhoto
                    ? 'Ambiente profissional, elegante e moderno. Iluminacao cinematografica premium.'
                    : 'Ambiente premium, elegante e moderno. Estetica clean e sofisticada.',
                sobriety,
                style: estiloLabel,
                useStyle: true,
                colors: {
                    ambient: catObj?.corPrimaria || '#D4A574',
                    rim: catObj?.corSecundaria || '#B8860B',
                    complementary: '#FFFFFF',
                },
                colorFlags: {
                    ambient: true,
                    rim: true,
                    complementary: false,
                },
                ambientOpacity: 30,
                useBlur: hasPersonPhoto,
                useGradient: false,
                useFloatingElements: false,
                floatingElementsDescription: '',
                shotType: hasPersonPhoto ? 'MEDIUM' : 'CLOSE_UP',
                additionalInstructions: `${hasPersonPhoto ? prompt : `O titulo "${titulo}" deve aparecer em texto grande e legivel no material. ${prompt}`}\n\n${detalhes || ''}`,
                dimension,
                safeAreaSide: 'CENTER',
                personCount: hasPersonPhoto ? 1 : 0,
            };

            const result = await generate(generationConfig, referenceImages);

            const rawImgSrc = `data:${result.mimeType};base64,${result.imageBase64}`;

            // ── Overlay do logo via Canvas ──
            const imgSrc = await applyLogoOverlay(rawImgSrc);

            const newImage: GeneratedImage = {
                src: imgSrc,
                prompt: result.finalPrompt,
                timestamp: Date.now(),
            };

            setCurrentImage(newImage);
            setGeneratedImages(prev => [newImage, ...prev].slice(0, MAX_GALLERY));
            toast.success('Arte gerada com sucesso!');

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao gerar imagem';
            setError(msg);
            toast.error(msg);
        }
    }, [titulo, intencao, detalhes, tipoPeca, estiloVisual, categoria, subjectImage, refImage, categoriasLista, buildSalaoPrompt, generate, getDimension, applyLogoOverlay]);

    // ── Download ──
    const handleDownload = useCallback((img: GeneratedImage) => {
        const d = new Date(img.timestamp);
        const pad = (n: number) => String(n).padStart(2, '0');
        const filename = `salao-arte-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.png`;

        fetch(img.src)
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Download iniciado!');
            });
    }, []);

    const handleDelete = useCallback((index: number) => {
        setGeneratedImages(prev => prev.filter((_, i) => i !== index));
        toast.success('Imagem removida');
    }, []);

    // ══════════════════════════════════════════════════════════════
    // RENDER -- Layout clean/minimalista (tons cinza-azulado)
    // ══════════════════════════════════════════════════════════════

    const stepLabels = [
        { n: 1, label: 'Informacoes' },
        { n: 2, label: 'Visual' },
        { n: 3, label: 'Resultado' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-gray-900 dark:to-blue-950/30">
            {/* Lightbox */}
            {lightboxIndex >= 0 && generatedImages[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    onClick={() => setLightboxIndex(-1)}
                >
                    <button
                        onClick={() => setLightboxIndex(-1)}
                        className="absolute top-4 right-4 z-[110] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        title="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={generatedImages[lightboxIndex].src}
                        alt="Arte gerada"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(generatedImages[lightboxIndex]); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            <Download className="w-4 h-4" /> Baixar PNG
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
                    <div className="w-24" />
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                            ✨ Gerador de Artes
                        </h1>
                        <p className="text-xs text-slate-400 mt-0.5">Crie materiais profissionais para o salão</p>
                    </div>
                    <div className="w-24" />
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 sm:px-10 py-8">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-10">
                    {stepLabels.map((s, idx) => (
                        <React.Fragment key={s.n}>
                            <button
                                onClick={() => s.n <= step && setStep(s.n)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${step === s.n
                                    ? 'bg-amber-700 text-white shadow-md scale-105'
                                    : step > s.n
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : 'bg-white text-slate-400 border border-slate-200'
                                    }`}
                            >
                                {step > s.n ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{s.n}</span>}
                                <span>{s.label}</span>
                            </button>
                            {idx < stepLabels.length - 1 && (
                                <div className={`w-10 h-0.5 ${step > s.n ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* ═══ STEP 1: Informacoes ═══ */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Categoria */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                📂 Categoria
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {categoriasLista.map((cat) => (
                                    <button
                                        key={cat.slug}
                                        onClick={() => setCategoria(cat.slug)}
                                        className={`p-4 rounded-xl text-left transition-all ${categoria === cat.slug
                                            ? 'bg-amber-700 text-white shadow-md scale-[1.02]'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <span className="text-base font-semibold">{cat.nome}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Titulo */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                📝 Título do Material *
                            </label>
                            <input
                                type="text"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Ex: Promoção de Verão - 30% OFF em Coloração"
                                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-800 placeholder-slate-400 rounded-xl px-5 py-4 outline-none transition-all text-base"
                            />
                        </div>

                        {/* Intencao */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                🎯 Intenção
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {INTENCOES.map((i) => (
                                    <button
                                        key={i.id}
                                        onClick={() => setIntencao(i.id)}
                                        className={`p-4 rounded-xl text-left transition-all ${intencao === i.id
                                            ? 'bg-amber-700 text-white shadow-md scale-[1.02]'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <i.Icon className={`w-5 h-5 mb-2 ${intencao === i.id ? 'text-amber-200' : 'text-slate-400'}`} />
                                        <span className="block text-sm font-semibold">{i.label}</span>
                                        <p className={`text-xs mt-1 ${intencao === i.id ? 'text-amber-200' : 'text-slate-400'}`}>{i.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                💬 Detalhes adicionais <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                            </label>
                            <textarea
                                value={detalhes}
                                onChange={(e) => setDetalhes(e.target.value)}
                                placeholder="Ex: Preço R$99, horário 9h às 19h, telefone (11) 9999-9999..."
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-800 placeholder-slate-400 rounded-xl px-5 py-4 outline-none transition-all resize-none text-base"
                            />
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!titulo.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-amber-700 text-white font-semibold py-3.5 rounded-xl hover:bg-amber-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            Proximo
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ═══ STEP 2: Visual ═══ */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Tipo de peca */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                🖼️ Tipo de Peça
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
                                {TIPOS_PECA.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTipoPeca(t.id)}
                                        className={`p-4 rounded-xl text-center transition-all ${tipoPeca === t.id
                                            ? 'bg-amber-700 text-white shadow-md scale-[1.02]'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <t.Icon className={`w-6 h-6 mx-auto mb-2 ${tipoPeca === t.id ? 'text-amber-200' : 'text-slate-400'}`} />
                                        <span className="block text-xs font-semibold">{t.label}</span>
                                        <span className={`block text-[10px] mt-1 ${tipoPeca === t.id ? 'text-amber-200' : 'text-slate-400'}`}>{t.dimension}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Formato (so para post e carrossel) */}
                        {(tipoPeca === 'post' || tipoPeca === 'carrossel') && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Formato
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {FORMATOS.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFormato(f.id)}
                                            className={`p-3 rounded-xl text-center transition-all ${formato === f.id
                                                ? 'bg-amber-700 text-white shadow-sm'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                                                }`}
                                        >
                                            <span className="text-sm font-semibold">{f.label}</span>
                                            <p className={`text-xs mt-0.5 ${formato === f.id ? 'text-slate-400' : 'text-slate-400'}`}>{f.ratio}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Estilo Visual -- 16 presets */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                                <Palette className="w-4 h-4 inline mr-2 -mt-0.5" />
                                Estilo Visual
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {ESTILOS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setEstiloVisual(s.id)}
                                        className={`p-4 rounded-xl text-left transition-all ${estiloVisual === s.id
                                            ? 'bg-amber-700 text-white shadow-md scale-[1.02]'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm font-semibold">{s.label}</span>
                                        <p className={`text-xs mt-1 ${estiloVisual === s.id ? 'text-amber-200' : 'text-slate-400'}`}>{s.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upload de foto principal */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Foto da pessoa <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                            </label>
                            <p className="text-[11px] text-slate-400 mb-3">
                                Se enviar uma foto, a IA gerara um retrato fotorrealista mantendo as caracteristicas faciais.
                            </p>
                            {subjectImage ? (
                                <div className="relative inline-block">
                                    <img src={subjectImage.preview} alt="Foto do sujeito" className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                    <button
                                        onClick={() => setSubjectImage(null)}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors shadow"
                                        title="Remover foto"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                    <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-emerald-500 rounded-md text-[9px] text-white font-semibold flex items-center gap-1">
                                        <Camera className="w-2.5 h-2.5" /> OK
                                    </div>
                                </div>
                            ) : (
                                <label className="block cursor-pointer">
                                    <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center transition-all group">
                                        <Upload className="w-6 h-6 text-slate-300 group-hover:text-slate-400 mx-auto mb-1.5 transition-colors" />
                                        <p className="text-slate-500 text-xs">Clique para enviar foto</p>
                                    </div>
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleSubjectUpload} />
                                </label>
                            )}
                        </div>

                        {/* Referencia visual */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Referencia visual <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                            </label>
                            <p className="text-[11px] text-slate-400 mb-3">
                                Envie uma imagem de estilo/inspiracao para copiar cores e composicao.
                            </p>
                            {refImage ? (
                                <div className="relative inline-block">
                                    <img src={refImage.preview} alt="Referencia visual" className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                    <button
                                        onClick={() => setRefImage(null)}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors shadow"
                                        title="Remover referencia"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <label className="block cursor-pointer">
                                    <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center transition-all group">
                                        <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-slate-400 mx-auto mb-1.5 transition-colors" />
                                        <p className="text-slate-500 text-xs">Clique para enviar referencia</p>
                                    </div>
                                    <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={handleRefUpload} />
                                </label>
                            )}
                        </div>

                        {/* Acoes */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-500 border border-slate-200 font-medium py-3.5 rounded-xl hover:bg-slate-50 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Voltar
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="flex-[2] flex items-center justify-center gap-2 bg-amber-700 text-white font-semibold py-3.5 rounded-xl hover:bg-amber-800 transition-all disabled:opacity-60 shadow-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Gerar Arte
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Progress durante geracao */}
                        {isGenerating && progress && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mt-2">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto mb-1.5" />
                                <p className="text-slate-600 text-xs font-medium">{progress}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ STEP 3: Resultado ═══ */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Generating state */}
                        {isGenerating && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-10 text-center">
                                <div className="relative inline-block mb-5">
                                    <div className="w-16 h-16 rounded-full border-[3px] border-slate-200 border-t-slate-600 animate-spin" />
                                    <Sparkles className="w-6 h-6 text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">{progress || 'Gerando sua arte...'}</p>
                                <p className="text-xs text-slate-400 mt-1">Isso pode levar ate 30 segundos</p>
                            </div>
                        )}

                        {/* Error */}
                        {error && !isGenerating && (
                            <div className="bg-red-50 rounded-2xl border border-red-200 p-5 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-red-700">Erro na geracao</p>
                                    <p className="text-xs text-red-600 mt-1">{error}</p>
                                    <button
                                        onClick={() => { setError(''); setStep(2); }}
                                        className="mt-2 text-xs text-red-600 underline hover:text-red-500"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Generated image */}
                        {currentImage && !isGenerating && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                    Arte Gerada
                                </h3>
                                <div
                                    className="relative cursor-pointer group"
                                    onClick={() => {
                                        const idx = generatedImages.findIndex(g => g.timestamp === currentImage.timestamp);
                                        setLightboxIndex(idx >= 0 ? idx : 0);
                                    }}
                                >
                                    <img
                                        src={currentImage.src}
                                        className="w-full rounded-xl border border-slate-100 hover:shadow-md transition-all"
                                        alt="Arte gerada"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all">
                                            <Eye className="w-3 h-3" /> Ampliar
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                    <button
                                        onClick={() => handleDownload(currentImage)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white font-semibold py-3 rounded-xl hover:bg-slate-700 transition-all shadow-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Baixar PNG
                                    </button>
                                    <button
                                        onClick={() => { setStep(2); setCurrentImage(null); setError(''); }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-200 font-medium py-3 rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        <Wand2 className="w-4 h-4" />
                                        Gerar Nova
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Voltar */}
                        {!isGenerating && !currentImage && !error && (
                            <div className="text-center">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all mx-auto text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Voltar
                                </button>
                            </div>
                        )}

                        {/* Gallery */}
                        {generatedImages.length > 0 && !isGenerating && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                                <h3 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    Galeria ({generatedImages.length})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {generatedImages.map((img, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={img.src}
                                                alt={`Arte ${idx + 1}`}
                                                className="w-full aspect-square object-cover rounded-xl cursor-pointer border border-slate-100 hover:shadow-md transition-all"
                                                onClick={() => setLightboxIndex(idx)}
                                            />
                                            <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDownload(img)}
                                                    className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm transition-all"
                                                    title="Baixar"
                                                >
                                                    <Download className="w-3 h-3 text-slate-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(idx)}
                                                    className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 shadow-sm transition-all"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recomecar */}
                        {!isGenerating && (
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setCurrentImage(null);
                                    setError('');
                                    setTitulo('');
                                    setDetalhes('');
                                    setIntencao('');
                                    setSubjectImage(null);
                                    setRefImage(null);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-white text-slate-400 border border-slate-200 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Recomecar do Inicio
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
