import React, { useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { useGeminiImageGeneration } from '@/hooks/useGeminiImageGeneration';
import { useSalaoAssets } from '@/hooks/useSalaoAssets';
import { toast } from 'sonner';

// ── Tipos ──
interface ReferenceImage {
    base64: string;
    mimeType: string;
    preview: string;
}

interface GeneratedImage {
    src: string;
    prompt: string;
    timestamp: number;
}

// ── Opções de formulário ──
const INTENCOES = [
    'Promover serviço',
    'Anunciar promoção',
    'Divulgar evento',
    'Informar horários',
    'Dica de beleza',
    'Antes & Depois',
    'Inauguração',
    'Novo serviço',
    'Outro',
];

const TIPOS_PECA = [
    { id: 'story', label: 'Story', dimension: '1080x1920', icon: '📱' },
    { id: 'post', label: 'Post Feed', dimension: '1080x1080', icon: '📷' },
    { id: 'banner', label: 'Banner', dimension: '1920x1080', icon: '🖼️' },
    { id: 'cartaz', label: 'Cartaz A4', dimension: '1080x1527', icon: '📄' },
];

const ESTILOS = [
    { id: 'elegant', label: '✨ Elegante' },
    { id: 'modern', label: '🎨 Moderno' },
    { id: 'minimal', label: '⬜ Minimalista' },
    { id: 'glamour', label: '💎 Glamour' },
    { id: 'romantic', label: '🌸 Romântico' },
    { id: 'bold', label: '🔥 Ousado' },
];

const GALLERY_KEY = 'salao_arte_gallery';
const MAX_GALLERY = 50;

// ── Componente Principal ──
export default function SalaoArteGenerator() {
    const [step, setStep] = useState(1);

    // Step 1 — Informações
    const [categoria, setCategoria] = useState('');
    const [titulo, setTitulo] = useState('');
    const [intencao, setIntencao] = useState('');
    const [detalhes, setDetalhes] = useState('');

    // Step 2 — Visual
    const [tipoPeca, setTipoPeca] = useState('post');
    const [estiloVisual, setEstiloVisual] = useState('elegant');
    const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);

    // Step 3 — Resultado
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

    // ── Process Image ──
    const processImage = useCallback(async (file: File): Promise<ReferenceImage> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                    base64: base64.split(',')[1],
                    mimeType: file.type || 'image/png',
                    preview: base64,
                });
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const img = await processImage(file);
        setReferenceImage(img);
    }, [processImage]);

    // ── Gerar ──
    const handleGenerate = useCallback(async () => {
        const getDimension = (): string => {
            const peca = TIPOS_PECA.find(t => t.id === tipoPeca);
            return peca?.dimension || '1080x1080';
        };
        if (!titulo.trim()) {
            toast.error('Preencha o título do material');
            return;
        }

        setError('');
        setStep(3);

        try {
            const pecaLabel = TIPOS_PECA.find(t => t.id === tipoPeca)?.label || 'Post';
            const estiloLabel = ESTILOS.find(s => s.id === estiloVisual)?.label || 'Elegante';
            const catObj = categoriasLista.find(c => c.slug === categoria);
            const prompt = buildSalaoPrompt(
                pecaLabel,
                titulo,
                intencao || 'Promover serviço',
                detalhes,
                catObj?.nome
            );

            const refImages = referenceImage ? [{
                data: `data:${referenceImage.mimeType};base64,${referenceImage.base64}`,
                mimeType: referenceImage.mimeType,
            }] : [];

            const result = await generate(
                {
                    niche: catObj?.nome || 'Salão de Beleza',
                    gender: 'female',
                    subjectDescription: titulo,
                    environment: 'Salão de beleza elegante e moderno',
                    sobriety: 40,
                    style: estiloLabel,
                    useStyle: true,
                    colors: {
                        ambient: catObj?.corPrimaria || '#D4A574',
                        rim: catObj?.corSecundaria || '#B8860B',
                        complementary: '#FFFFFF',
                    },
                    colorFlags: { ambient: true, rim: true, complementary: false },
                    ambientOpacity: 30,
                    useBlur: false,
                    useGradient: false,
                    useFloatingElements: false,
                    shotType: 'MEDIUM',
                    additionalInstructions: `${prompt}\n\nINSTRUÇÕES DE COR: Use os tons ${catObj?.corPrimaria || '#D4A574'} e ${catObj?.corSecundaria || '#B8860B'} como base da paleta`,
                    dimension: getDimension(),
                },
                refImages
            );

            const imgSrc = `data:${result.mimeType};base64,${result.imageBase64}`;
            const newImage: GeneratedImage = {
                src: imgSrc,
                prompt: result.finalPrompt,
                timestamp: Date.now(),
            };

            setCurrentImage(newImage);
            const updated = [newImage, ...generatedImages].slice(0, MAX_GALLERY);
            setGeneratedImages(updated);
            localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao gerar imagem';
            setError(msg);
            toast.error(msg);
        }
    }, [titulo, intencao, detalhes, tipoPeca, estiloVisual, categoria, referenceImage, categoriasLista, buildSalaoPrompt, generate, generatedImages]);

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
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`📥 Baixando ${filename}`);
            })
            .catch(() => toast.error('Erro ao baixar'));
    }, []);

    // ── Delete gallery item ──
    const handleDeleteGalleryItem = useCallback((index: number) => {
        const updated = generatedImages.filter((_, i) => i !== index);
        setGeneratedImages(updated);
        localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));
        toast.success('Imagem removida da galeria');
    }, [generatedImages]);

    // ══════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
            {/* Lightbox */}
            {lightboxIndex >= 0 && generatedImages[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
                    onClick={() => setLightboxIndex(-1)}
                >
                    <button
                        onClick={() => setLightboxIndex(-1)}
                        className="absolute top-4 right-4 z-[110] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                        title="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={generatedImages[lightboxIndex].src}
                        alt="Arte gerada"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(generatedImages[lightboxIndex]); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold"
                        >
                            <Download className="w-4 h-4" /> Baixar PNG
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 text-rose-700 text-sm font-medium mb-4">
                        <Sparkles className="w-4 h-4" />
                        Gerador de Artes com IA
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                        Crie Artes Incríveis para o Salão
                    </h1>
                    <p className="text-gray-500 mt-2">Flyers, posts e banners profissionais em minutos</p>
                </div>

                {/* Steps Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[
                        { num: 1, label: 'Informações' },
                        { num: 2, label: 'Visual' },
                        { num: 3, label: 'Resultado' },
                    ].map((s) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === s.num
                                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200'
                                    : step > s.num
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <span className={`text-sm font-medium hidden sm:inline ${step === s.num ? 'text-rose-600' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                            {s.num < 3 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                        </div>
                    ))}
                </div>

                {/* ══════ STEP 1 — INFORMAÇÕES ══════ */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-6 space-y-6 animate-in fade-in duration-300">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            💇‍♀️ Informações do Material
                        </h2>

                        {/* Categoria */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {categoriasLista.map((cat) => (
                                    <button
                                        key={cat.slug}
                                        onClick={() => setCategoria(cat.slug)}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${categoria === cat.slug
                                            ? 'border-rose-400 bg-rose-50 shadow-md'
                                            : 'border-gray-200 hover:border-rose-200 hover:bg-rose-25'
                                            }`}
                                    >
                                        <span className="text-xl">{cat.icone}</span>
                                        <span className="block text-sm font-medium mt-1">{cat.nome}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Título */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Título do Material *
                            </label>
                            <input
                                type="text"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Ex: Promoção de Verão - 30% OFF em Coloração"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                            />
                        </div>

                        {/* Intenção */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Intenção</label>
                            <select
                                value={intencao}
                                onChange={(e) => setIntencao(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white"
                                title="Selecione a intenção"
                            >
                                <option value="">Selecione...</option>
                                {INTENCOES.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>

                        {/* Detalhes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Detalhes adicionais (opcional)
                            </label>
                            <textarea
                                value={detalhes}
                                onChange={(e) => setDetalhes(e.target.value)}
                                placeholder="Informações extras como preço, horário, endereço, telefone..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!titulo.trim()}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold disabled:opacity-40 hover:shadow-lg hover:shadow-rose-200 transition-all"
                            >
                                Avançar <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════ STEP 2 — VISUAL ══════ */}
                {step === 2 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-6 space-y-6 animate-in fade-in duration-300">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            🎨 Configuração Visual
                        </h2>

                        {/* Tipo de peça */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Peça</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {TIPOS_PECA.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTipoPeca(t.id)}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${tipoPeca === t.id
                                            ? 'border-rose-400 bg-rose-50 shadow-md'
                                            : 'border-gray-200 hover:border-rose-200'
                                            }`}
                                    >
                                        <span className="text-2xl">{t.icon}</span>
                                        <span className="block text-sm font-medium mt-1">{t.label}</span>
                                        <span className="block text-xs text-gray-400 mt-0.5">{t.dimension}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estilo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estilo Visual</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {ESTILOS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setEstiloVisual(s.id)}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${estiloVisual === s.id
                                            ? 'border-rose-400 bg-rose-50 shadow-md'
                                            : 'border-gray-200 hover:border-rose-200'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upload de referência */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Foto de referência (opcional)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    aria-label="Upload de imagem de referência"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-rose-300 text-gray-500 hover:text-rose-500 transition-all"
                                >
                                    <Upload className="w-4 h-4" />
                                    {referenceImage ? 'Trocar imagem' : 'Upload de referência'}
                                </button>
                                {referenceImage && (
                                    <div className="relative">
                                        <img
                                            src={referenceImage.preview}
                                            alt="Referência"
                                            className="w-16 h-16 object-cover rounded-lg border border-rose-200"
                                        />
                                        <button
                                            onClick={() => setReferenceImage(null)}
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                                            title="Remover imagem"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" /> Voltar
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold disabled:opacity-40 hover:shadow-lg hover:shadow-rose-200 transition-all"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Gerar Arte</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════ STEP 3 — RESULTADO ══════ */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Generating state */}
                        {isGenerating && (
                            <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-12 text-center">
                                <div className="relative inline-block mb-6">
                                    <div className="w-20 h-20 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin" />
                                    <Sparkles className="w-8 h-8 text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-lg font-medium text-gray-700">{progress || 'Gerando sua arte...'}</p>
                                <p className="text-sm text-gray-400 mt-2">Isso pode levar até 30 segundos</p>
                            </div>
                        )}

                        {/* Error */}
                        {error && !isGenerating && (
                            <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-700">Erro na geração</p>
                                    <p className="text-sm text-red-600 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Generated image */}
                        {currentImage && !isGenerating && (
                            <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    🎉 Arte Gerada
                                </h3>
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1 relative group">
                                        <img
                                            src={currentImage.src}
                                            alt="Arte gerada"
                                            className="w-full rounded-xl shadow-md cursor-pointer hover:shadow-xl transition-shadow"
                                            onClick={() => setLightboxIndex(0)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Eye className="w-8 h-8 text-white drop-shadow" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 lg:w-56">
                                        <button
                                            onClick={() => handleDownload(currentImage)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all"
                                        >
                                            <Download className="w-4 h-4" /> Baixar PNG
                                        </button>
                                        <button
                                            onClick={() => { setStep(2); setCurrentImage(null); setError(''); }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold transition-all"
                                        >
                                            <Sparkles className="w-4 h-4" /> Gerar Nova
                                        </button>
                                        <button
                                            onClick={() => { setStep(1); setCurrentImage(null); setError(''); }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Recomeçar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Back button while generating */}
                        {!currentImage && !isGenerating && (
                            <div className="text-center">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-white transition-all mx-auto"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Voltar ao Configuração Visual
                                </button>
                            </div>
                        )}

                        {/* Gallery */}
                        {generatedImages.length > 0 && !isGenerating && (
                            <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-rose-500" />
                                    Galeria ({generatedImages.length})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {generatedImages.map((img, idx) => (
                                        <div key={img.timestamp} className="relative group">
                                            <img
                                                src={img.src}
                                                alt={`Arte ${idx + 1}`}
                                                className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:shadow-lg transition-all border border-gray-100"
                                                onClick={() => setLightboxIndex(idx)}
                                            />
                                            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                                                    className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-emerald-50"
                                                    title="Baixar"
                                                >
                                                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGalleryItem(idx); }}
                                                    className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
