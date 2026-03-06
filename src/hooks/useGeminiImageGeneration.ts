import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// API KEY — Busca dinâmica do Supabase (tabela api_keys)
// ============================================================
let _cachedApiKeys: string[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function fetchApiKeysFromSupabase(): Promise<string[]> {
    // Se o cache ainda é válido, retorna
    if (_cachedApiKeys && Date.now() - _cacheTimestamp < CACHE_TTL) {
        return _cachedApiKeys;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[GeminiHook] Supabase não configurado, sem API keys disponíveis.');
        return [];
    }

    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/api_keys?service=eq.gemini&is_active=eq.true&select=api_key`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.warn(`[GeminiHook] Erro ao buscar API keys: ${response.status}`);
            return _cachedApiKeys || [];
        }

        const data = await response.json();
        const keys = data
            .map((row: { api_key: string }) => row.api_key)
            .filter((k: string) => k && k.trim().length > 0);

        if (keys.length > 0) {
            _cachedApiKeys = keys;
            _cacheTimestamp = Date.now();
        }

        return keys;
    } catch (err) {
        console.warn('[GeminiHook] Falha ao buscar API keys do Supabase:', err);
        return _cachedApiKeys || [];
    }
}

// ============================================================
// SYSTEM PROMPT — Adaptado para salão de beleza
// ============================================================
const SYSTEM_PROMPT = `Você é um Especialista em Design Gráfico para Salões de Beleza. Sua missão é criar prompts para peças visuais incríveis.

REGRA DE ESTILO:
Se o Estilo Escolhido "{estilo_selecionado}" for fornecido, incorpore as características visuais fundamentais desse estilo em toda a composição.

REGRA DE QUALIDADE:
Gere APENAS prompts para DESIGN GRÁFICO / MATERIAL DE DIVULGAÇÃO profissional. 
O resultado DEVE parecer um flyer/banner/post PROFISSIONAL de salão de beleza, com:
- Tipografia elegante e legível
- Paleta de cores sofisticada (rosé, dourado, nude, branco, preto)
- Elementos decorativos que remetam a beleza e cuidado
- Hierarquia visual clara: título → subtítulo → detalhes
- Espaço para informações adicionais

NUNCA gere apenas uma fotografia. Sempre gere MATERIAL GRÁFICO com texto composto na arte.

Retorne APENAS o prompt final montado, em inglês.`;

// ============================================================
// Tipos
// ============================================================
export interface GenerationConfig {
    niche: string;
    gender: string;
    subjectDescription?: string;
    environment?: string;
    sobriety: number;
    style?: string;
    useStyle?: boolean;
    colors: {
        ambient: string;
        rim: string;
        complementary: string;
    };
    colorFlags: {
        ambient: boolean;
        rim: boolean;
        complementary: boolean;
    };
    ambientOpacity: number;
    useBlur: boolean;
    useGradient: boolean;
    useFloatingElements: boolean;
    floatingElementsDescription?: string;
    shotType: string;
    additionalInstructions?: string;
    dimension: string;
    safeAreaSide?: 'LEFT' | 'RIGHT' | 'CENTER';
    personCount?: number;
    textOverlay?: {
        h1: string;
        h2: string;
        cta: string;
        position: string;
        useGradient?: boolean;
    };
}

export interface ReferenceImage {
    data: string;
    mimeType: string;
    description?: string;
    category?: 'style' | 'environment';
}

export interface GenerationResult {
    imageBase64: string;
    mimeType: string;
    finalPrompt: string;
}

// ============================================================
// Modelos padrão — Gemini 3 (principal) + fallbacks
// ============================================================
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash-preview-05-20';
const DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

const IMAGE_MODEL_FALLBACKS: string[] = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.5-flash-image',
];

const TEXT_MODEL_FALLBACKS: string[] = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash',
];

// ============================================================
// Calcula aspectRatio
// ============================================================
function getAspectRatio(dimension: string): string {
    const parts = dimension.toLowerCase().split('x');
    if (parts.length !== 2) return '9:16';
    const w = parseInt(parts[0]);
    const h = parseInt(parts[1]);
    if (!w || !h) return '9:16';
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.05) return '1:1';
    if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
    if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
    if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5';
    if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4';
    return ratio < 1 ? '9:16' : '16:9';
}

// ============================================================
// Monta o user message para a etapa 1 (geração do prompt)
// ============================================================
function buildUserMessage(config: GenerationConfig): string {
    return `
    INPUTS PARA DESIGN DE SALÃO:
    - Categoria: ${config.niche}
    - Título do Material: ${config.subjectDescription || 'Material Promocional'}
    - Ambiente/Tema Visual: ${config.environment || 'Salão elegante e moderno'}
    
    ESTILO E TOM:
    - Estilo Escolhido: ${config.style || 'Elegante e Sofisticado'}
    - Instruções Adicionais: ${config.additionalInstructions || 'Nenhuma'}
    
    ${config.textOverlay && (config.textOverlay.h1 || config.textOverlay.h2) ? `
    TEXTO NA ARTE:
    - Título: "${config.textOverlay.h1}"
    - Subtítulo: "${config.textOverlay.h2}"
    - CTA: "${config.textOverlay.cta}"
    ` : ''}
    
    CONFIGURAÇÃO DE CORES:
    - Cor Principal: ${config.colors.ambient}
    - Cor Destaque: ${config.colors.rim}
    - Cor Complementar: ${config.colors.complementary}
    
    DIMENSÃO: ${config.dimension}
    `;
}

// ============================================================
// Verifica se erro é retryável (503/500/429)
// ============================================================
function classifyError(err: unknown): { is429: boolean; is5xx: boolean; isRetryable: boolean } {
    const errObj = err as { message?: string; status?: number; httpCode?: number };
    const msg = errObj?.message || '';
    const status = errObj?.status || errObj?.httpCode || 0;
    const is429 =
        msg.includes('429') || status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
    const is5xx =
        msg.includes('503') || msg.includes('500') || status === 503 || status === 500 ||
        msg.includes('SERVICE_UNAVAILABLE') || msg.includes('UNAVAILABLE') || msg.includes('INTERNAL') ||
        msg.includes('overloaded') || msg.includes('temporarily') || msg.includes('high demand') ||
        (status >= 500 && status < 600);
    return { is429, is5xx, isRetryable: is429 || is5xx };
}

// ============================================================
// SDK Key Pool com retry
// ============================================================
async function callWithKeyPool<T>(
    keys: string[],
    fn: (apiKey: string, keyIndex: number, attempt: number) => Promise<T>,
    maxRetries = 3,
    rounds = 2,
    baseDelay = 5000
): Promise<T> {
    if (keys.length === 0) throw new Error('Nenhuma API key disponível. Verifique a configuração no Supabase.');

    const shuffled = [...keys].sort(() => 0.5 - Math.random());

    let globalAttempt = 0;
    for (let round = 0; round < rounds; round++) {
        if (round > 0) {
            const roundDelay = baseDelay * (round + 1);
            console.log(`[KeyPool] Round ${round + 1}/${rounds} — aguardando ${roundDelay / 1000}s...`);
            await new Promise(r => setTimeout(r, roundDelay));
        }
        for (let ki = 0; ki < shuffled.length; ki++) {
            const key = shuffled[ki];
            for (let retry = 0; retry < maxRetries; retry++) {
                try {
                    return await fn(key, ki, globalAttempt++);
                } catch (err: unknown) {
                    const { is5xx, isRetryable } = classifyError(err);
                    if (!isRetryable) throw err;
                    console.warn(`[KeyPool] Key ${ki + 1}/${shuffled.length} falhou, tentando próxima...`);
                    if (is5xx) break;
                    if (retry < maxRetries - 1) {
                        const delay = baseDelay * Math.pow(2, retry);
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }
        }
    }

    throw new Error('Todas as chaves falharam. Tente novamente em alguns minutos.');
}

// ============================================================
// Fallback de modelos
// ============================================================
async function callWithModelFallback<T>(
    primaryModel: string,
    fn: (model: string) => Promise<T>,
    progressCallback?: (msg: string) => void,
    fallbackList?: string[]
): Promise<{ result: T; usedModel: string }> {
    const autoList = fallbackList
        || (primaryModel.includes('image') ? IMAGE_MODEL_FALLBACKS : TEXT_MODEL_FALLBACKS);
    const models = [primaryModel, ...autoList.filter(m => m !== primaryModel)];

    let lastError: unknown = null;
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
            if (i > 0) {
                progressCallback?.(`🔄 Modelo ${models[i - 1]} indisponível, tentando ${model}...`);
            }
            const result = await fn(model);
            return { result, usedModel: model };
        } catch (err: unknown) {
            lastError = err;
            const { is5xx } = classifyError(err);
            if (!is5xx) throw err;
            console.warn(`[ModelFallback] ❌ Modelo ${model} falhou com 5xx`);
        }
    }

    throw lastError || new Error('Todos os modelos falharam.');
}

// ============================================================
// Hook principal — SDK @google/genai com API key do Supabase
// ============================================================
export function useGeminiImageGeneration() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const generationRef = useRef(false);

    // ============================================================
    // Retorna as keys do Supabase (com cache)
    // ============================================================
    const getKeys = useCallback(async (): Promise<string[]> => {
        return fetchApiKeysFromSupabase();
    }, []);

    // ============================================================
    // Etapa 1: Gera o prompt de texto via SDK
    // ============================================================
    const generatePromptText = useCallback(async (
        keys: string[],
        textModel: string,
        config: GenerationConfig,
        styleLabel: string,
    ): Promise<string> => {
        const userMessage = buildUserMessage(config);
        const systemPrompt = SYSTEM_PROMPT.replace(/{estilo_selecionado}/g, styleLabel);

        const result = await callWithKeyPool(keys, async (apiKey) => {
            const genAI = new GoogleGenAI({ apiKey });

            const response = await genAI.models.generateContent({
                model: textModel,
                contents: userMessage,
                config: {
                    systemInstruction: systemPrompt,
                },
            });

            const text = response.text;
            if (!text) throw new Error('Nenhum prompt retornado pela API.');
            return text.trim();
        });

        return result;
    }, []);

    // ============================================================
    // Etapa 2: Gera a imagem via SDK
    // ============================================================
    const generateImage = useCallback(async (
        keys: string[],
        imageModel: string,
        finalPrompt: string,
        config: GenerationConfig,
        referenceImages: ReferenceImage[],
    ): Promise<{ imageBase64: string; mimeType: string }> => {
        const aspectRatio = getAspectRatio(config.dimension);

        const result = await callWithKeyPool(keys, async (apiKey) => {
            const genAI = new GoogleGenAI({ apiKey });

            const contentParts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
            for (const img of referenceImages) {
                contentParts.push({
                    inlineData: {
                        data: img.data.replace(/^data:[^,]+,/, ''),
                        mimeType: 'image/png',
                    }
                });
            }
            contentParts.push({ text: finalPrompt });

            const response = await genAI.models.generateContent({
                model: imageModel,
                contents: contentParts,
                config: {
                    responseModalities: ['Text', 'Image'],
                },
            });

            const candidates = response.candidates;
            if (!candidates?.length) throw new Error('Nenhum candidato retornado pela API.');

            for (const part of candidates[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return {
                        imageBase64: part.inlineData.data || '',
                        mimeType: part.inlineData.mimeType || 'image/png',
                    };
                }
            }

            throw new Error('Nenhuma imagem encontrada na resposta da API.');
        });

        return result;
    }, []);

    // ============================================================
    // Função principal de geração (2 etapas)
    // ============================================================
    const generate = useCallback(async (
        config: GenerationConfig,
        referenceImages: ReferenceImage[] = []
    ): Promise<GenerationResult> => {
        if (generationRef.current) {
            throw new Error('Já existe uma geração em andamento. Aguarde.');
        }
        generationRef.current = true;

        setIsGenerating(true);
        setProgress('✨ Criando a mágica...');

        try {
            const keys = await getKeys();
            const textModel = DEFAULT_TEXT_MODEL;
            const imageModel = DEFAULT_IMAGE_MODEL;

            const styleLabel = config.useStyle && config.style ? config.style : 'Elegante e Sofisticado';

            // Etapa 1: Gera o prompt refinado
            setProgress('🎨 Criando o conceito...');
            const { result: finalPrompt } = await callWithModelFallback(
                textModel,
                async (textModelToUse) => {
                    return generatePromptText(keys, textModelToUse, config, styleLabel);
                },
                (msg) => setProgress(msg)
            );

            // Etapa 2: Gera a imagem
            setProgress('🖼️ Gerando sua arte...');
            const { result: imageResult } = await callWithModelFallback(
                imageModel,
                async (modelToUse) => {
                    return generateImage(
                        keys,
                        modelToUse,
                        finalPrompt,
                        config,
                        referenceImages,
                    );
                },
                (msg) => setProgress(msg)
            );

            const { imageBase64, mimeType } = imageResult;

            setProgress('🎉 Arte pronta!');
            return { imageBase64, mimeType, finalPrompt };

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            throw new Error(msg);
        } finally {
            setIsGenerating(false);
            setProgress('');
            generationRef.current = false;
        }
    }, [getKeys, generatePromptText, generateImage]);

    return {
        generate,
        isGenerating,
        progress,
    };
}
