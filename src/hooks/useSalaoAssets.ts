import { useState, useEffect } from 'react';

// ============================================================
// Tipos
// ============================================================
export interface SalaoConfig {
    categorias: Record<string, CategoriaConfig>;
    global: GlobalConfig;
}

export interface CategoriaConfig {
    nome: string;
    corPrimaria: string;
    corSecundaria: string;
    fonteTitulo: string;
    fonteCorpo: string;
    icone: string;
}

export interface GlobalConfig {
    fontePadrao: string;
    logoSalao: string;
    nomeSalao: string;
}

// ============================================================
// Config de categorias — paleta de cores e tipografia
// ============================================================
const DEFAULT_CONFIG: SalaoConfig = {
    categorias: {
        promocao: {
            nome: 'Promoção',
            corPrimaria: '#D4A574',
            corSecundaria: '#8B6914',
            fonteTitulo: 'Playfair Display',
            fonteCorpo: 'Poppins',
            icone: '🏷️',
        },
        servico: {
            nome: 'Serviço',
            corPrimaria: '#E8B4B8',
            corSecundaria: '#C48B9F',
            fonteTitulo: 'Cormorant Garamond',
            fonteCorpo: 'Lato',
            icone: '💇‍♀️',
        },
        evento: {
            nome: 'Evento Especial',
            corPrimaria: '#B8860B',
            corSecundaria: '#DAA520',
            fonteTitulo: 'Great Vibes',
            fonteCorpo: 'Montserrat',
            icone: '🎉',
        },
        antes_depois: {
            nome: 'Antes & Depois',
            corPrimaria: '#2C3E50',
            corSecundaria: '#E74C3C',
            fonteTitulo: 'Oswald',
            fonteCorpo: 'Open Sans',
            icone: '✨',
        },
        dica: {
            nome: 'Dica de Beleza',
            corPrimaria: '#9B59B6',
            corSecundaria: '#8E44AD',
            fonteTitulo: 'Dancing Script',
            fonteCorpo: 'Roboto',
            icone: '💡',
        },
        agenda: {
            nome: 'Agenda / Horários',
            corPrimaria: '#1ABC9C',
            corSecundaria: '#16A085',
            fonteTitulo: 'Nunito',
            fonteCorpo: 'Inter',
            icone: '📅',
        },
    },
    global: {
        fontePadrao: 'Poppins',
        logoSalao: '',
        nomeSalao: 'Maicon Maksuel Concept',
    },
};

// ============================================================
// NEGATIVE SPACE RULES — extraídos diretamente do DesignBuilder JS
// (arquivo index-CC_-9Jns.js, linha 346)
// ============================================================

/**
 * NEGATIVE SPACE RULE — defines which side stays open for text overlay.
 * The entire LEFT or RIGHT side (from edge to center) must be kept open for text.
 */
const NEGATIVE_SPACE: Record<string, string> = {
    left: 'NEGATIVE SPACE RULE: The entire LEFT side (from left edge to center) must be kept open for text. The subject must occupy the RIGHT side of the frame only.',
    right: 'NEGATIVE SPACE RULE: The entire RIGHT side (from right edge to center) must be kept open for text. The subject must occupy the LEFT side of the frame only.',
    center: 'NEGATIVE SPACE RULE: Subject is centered. Top 25% and bottom 25% reserved for large headline text overlay.',
    top: 'NEGATIVE SPACE RULE: Subject anchored to bottom 60% of frame. Top 40% must be kept completely clear for typography.',
    bottom: 'NEGATIVE SPACE RULE: Subject anchored to top 60% of frame. Bottom 40% kept open for CTA text block.',
};

/**
 * BLENDING ATTRIBUTE — DesignBuilder JS linha 346
 * Apply gradient fade on negative space for text readability.
 */
const BLENDING_ATTRIBUTE = 'BLENDING ATTRIBUTE: Apply a soft, seamless GRADIENT FADE on the negative space side. The gradient should use the DOMINANT BACKGROUND COLOR to fade out any complex details, ensuring maximum text readability.';

/**
 * DEPTH ATTRIBUTE (RACK FOCUS) — DesignBuilder JS linha 346
 * Blur the background edges for depth while keeping subject sharp.
 */
const DEPTH_ATTRIBUTE = 'DEPTH ATTRIBUTE (RACK FOCUS): First, render the entire image with full sharp details. THEN, overlay a subtle GRADIENT BLUR (Rack Focus effect) that is heaviest on the negative space edge and gradually fades to 0% blur towards the center/subject. The subject must remain 100% sharp. The blur acts as a background softening layer for text overlay.';

// ============================================================
// SHOT TYPES — extraídos do array jN do DesignBuilder JS
// ============================================================
const SHOT_TYPES: Record<string, { label: string; icon: string; prompt: string }> = {
    CLOSE_UP: {
        label: 'Close-up (Rosto)',
        icon: 'fa-user-circle',
        prompt: 'Extreme Close-up shot, focusing on facial expressions and eyes, cutting off at the neck/shoulders.',
    },
    MEDIUM: {
        label: 'Plano Médio (Busto)',
        icon: 'fa-user',
        prompt: 'Medium Shot (Mid-shot), capturing the subject from the waist up, focusing on body language and expression.',
    },
    AMERICAN: {
        label: 'Plano Americano',
        icon: 'fa-user-tie',
        prompt: 'American Shot (Cowboy Shot), capturing the subject from the knees up, including hand gestures and posture.',
    },
};

// ============================================================
// LENTES — com câmeras reais como o DesignBuilder usa
// (linha 584: "Canon EOS R5, 85mm f/1.4 lens, shallow depth of field")
// (linha 590: "Sony Alpha 7R IV, 85mm f/1.4 lens, cinematic tone")
// ============================================================
const LENS_MAP: Record<string, string> = {
    close_up: 'Photographed with a Sony Alpha 7R IV, 85mm f/1.4 lens, shallow depth of field, intense background bokeh, subject razor-sharp, skin texture visible, cinematic tone',
    medium: 'Photographed with a Canon EOS R5, 50mm f/1.8 lens, natural perspective, gentle background blur, full mid-shot framing',
    wide: 'Photographed with a Nikon Z9, 35mm f/2.8, environmental context visible, balanced depth of field, cinematic widescreen feel',
    ultra_wide: 'Photographed with a Sony Alpha a7 III, 24mm f/4, full scene context, architectural scale, dramatic wide composition',
    macro: 'Photographed with a Canon EOS 5D Mark IV, 100mm macro f/2.8, extreme detail rendering, micro-texture visible, product-grade sharpness',
};

// ============================================================
// ILUMINAÇÃO — 3 camadas fotográficas reais
// ============================================================
const LIGHTING_MAP: Record<string, string> = {
    studio: 'professional studio lighting, key light softbox at 45°, fill light reflector, rim backlight separating subject from background, catch lights in eyes',
    golden: 'golden hour natural light, warm 5600K sunlight from side, long shadows, atmospheric haze, lens flare subtle, warm rim light from left, soft shadows on the background',
    cinematic: 'cinematic lighting, dramatic one-point key light, deep shadow on opposite side, moody chiaroscuro contrast, practical background lights, film noir quality',
    neon: 'neon RGB accent lights, cool purple-blue ambiance, reflected colored highlights on skin, urban night atmosphere, street light bokeh',
    soft: 'overcast diffused light, zero harsh shadows, flat even illumination, ideal for skin tones and fine detail, beauty photography softbox',
    butterfly: 'beauty butterfly lighting, key light directly above subject, soft fill below, classic Hollywood glamour portrait look, skin luminosity',
    rembrandt: 'Rembrandt triangle lighting, dramatic 45° key light, deep contrasting shadow on opposite cheek, painterly Renaissance quality',
    editorial: 'high-key editorial lighting, bright clean white background, minimal directional shadow, Vogue magazine-grade clarity',
};

// ============================================================
// RENDER QUALITY — tokens técnicos de qualidade
// ============================================================
const RENDER_QUALITY: Record<string, string> = {
    ultra_realistic: '8K ultra-photorealistic, octane render, ray tracing, physically-based rendering, subsurface skin scattering, micro-detail pores, film grain, award-winning photography',
    cinematic: 'cinematic 4K, film grain 35mm, ARRI ALEXA color science, anamorphic lens flares, DCI-P3 color gamut, Hollywood grade color grading',
    editorial: 'Vogue editorial photography standard, Hasselblad medium format quality, professional color grading, Lightroom mastergrade, magazine-ready',
    product: 'product photography render, HDRI studio environment, perfectly seamless background, sharp focus edge-to-edge, commercial photography quality',
    artistic: 'digital concept art, highly detailed, trending on Behance and ArtStation, hyperdetailed, professional CGI quality',
    minimalist: 'clean minimal composition, Swiss grid design system, negative space philosophy, premium white space, refined visual hierarchy',
};

// ============================================================
// STYLE TOKENS — baseados no array OW do DesignBuilder (17 estilos)
// Com tokens de prompt ricos para cada um
// ============================================================
const STYLE_TOKENS: Record<string, string> = {
    classic: 'timeless classic aesthetic, serif typography influence, warm vintage tones, enduring visual quality, refined traditional composition',
    formal: 'formal corporate communication, structured authoritative palette, professional grid layout, trusted institutional look',
    elegant: 'sophisticated luxury brand aesthetic, quiet luxury, restrained color palette, tasteful premium positioning, high-end editorial quality',
    sexy: 'bold sensual art direction, dynamic silhouette, high contrast dramatic lighting, fashion editorial, confident allure',
    institutional: 'institutional brand communication, trusted authority palette, conservative professionalism, structured hierarchy',
    tech: 'futuristic UI aesthetic, neon grid lines, dark mode interface, HUD overlays, cyberpunk-influenced, digital innovation feel',
    glassmorphism: 'frosted glass panels, 70% transparency backdrop blur, white stroke border, layered depth, Apple-inspired design language',
    ui_interface: 'clean digital interface design, card-based layout, modern app aesthetic, minimal UI components, structured information hierarchy',
    minimalist: 'radical minimalism, maximum 2 colors, extensive white space, single focal point, zen-like clarity, Bauhaus influence',
    playful: 'bright primary colors, rounded organic shapes, dynamic energy, approachable fun personality, Gen-Alpha visual appeal',
    cartoon: 'stylized cartoon illustration, bold outlines, saturated flat colors, character-driven composition, animated aesthetic',
    infoproduct: 'digital marketing design, strong CTA hierarchy, authority positioning, conversion-optimized layout, trust-building visual cues',
    jovial: 'youthful vibrant palette, casual typography mix, relatable human authenticity, social media native aesthetic, Gen-Z energy',
    gamer: 'gaming culture aesthetic, dark background, neon accent colors, dynamic angular design, esports visual language',
    pro_portrait: 'high-end portrait campaign quality, professional skin retouch, razor-sharp hair detail, fashion magazine editorial, luxury advertising standard',
    ultra_realistic: 'photorealistic output, indistinguishable from real high-end photograph, camera imperfections included, natural grain, lived-in authenticity',
    glow: 'luminous glow effects, bloom lighting, angelic radiant aura, dreamy soft-focus edges, celestial ethereal quality',
};

// ============================================================
// COMPOSITION MAP — com safe zone de 10%
// ============================================================
const COMPOSITION_MAP: Record<string, string> = {
    rule_of_thirds: 'rule of thirds composition, subject on left vertical third, breathing room on right side, safe zone 10% all edges',
    centered: 'centered symmetrical composition, subject perfectly centered, balanced negative space both sides',
    left_text: 'subject occupying right 60% of frame, clean gradient space on left 40% reserved for typography overlay',
    right_text: 'subject occupying left 60% of frame, clean space on right 40% for headline and CTA text',
    full_bleed: 'full bleed composition, subject fills entire frame, text integrated through design overlay elements',
    hero_top: 'subject anchored in upper 65%, bottom 35% kept clear for large headline and call-to-action text block',
};

// ============================================================
// Hook principal
// ============================================================
export function useSalaoAssets(categoriaSlug?: string) {
    const [config] = useState<SalaoConfig>(DEFAULT_CONFIG);
    const [currentCategoria, setCurrentCategoria] = useState<CategoriaConfig | null>(null);

    useEffect(() => {
        if (config && categoriaSlug) {
            const key = Object.keys(config.categorias).find(k =>
                k.toLowerCase() === categoriaSlug.toLowerCase()
            );
            if (key) {
                setCurrentCategoria(config.categorias[key]);
            } else {
                setCurrentCategoria(null);
            }
        }
    }, [config, categoriaSlug]);

    /**
     * buildSalaoPrompt — Fórmula real do DesignBuilder (extraída do JS)
     *
     * Estrutura de 13 partes (linha 593 do index-CC_-9Jns.js):
     * [Sujeito Principal] [Pose ou Ação] [Cenário/Ambiente] [Ângulo ou Perspectiva]
     * [Estilo da Imagem] [Adjetivos e Detalhes Físicos] [Textura e Iluminação]
     * [Cores Específicas] [Estilos Artísticos e Eras] [Comandos de Negação]
     * [Códigos de Realismo] [Códigos de Textura] [Estilo de Câmera]
     * [Direção de Luz] [Foco na Qualidade: 8K, DOF, cinematic, ultra-detailed]
     *
     * REGRAS OBRIGATÓRIAS (linhas 598-607 do JS):
     * - Sempre gere prompts baseados na referência enviada
     * - Nunca inclua características físicas de rosto, cor de pele, idade ou etnia
     * - Sempre inclua nome da câmera e lente
     * - Todos os prompts em INGLÊS
     * - Adicionar: --ar 2:3 --v 5 --style cinematic
     * - Adicionar textura de pele, iluminação direcional e profundidade cinematográfica
     */
    const buildSalaoPrompt = (
        material: string,
        tema: string,
        intencao: string,
        detalhes: string,
        categoriaNome?: string,
        dimensao?: string,
        options?: {
            lens?: string;
            lighting?: string;
            renderQuality?: string;
            composition?: string;
            estiloVisual?: string;
            shotType?: string;
            negativeSpaceSide?: string;
            sobriety?: number; // 0-100: 0=máx criativo, 100=máx sóbrio
        }
    ) => {
        // ── Padrões inteligentes por intenção ──
        const intLow = (intencao || '').toLowerCase();

        const lens = options?.lens ?? (
            intLow.includes('retrato') || intLow.includes('antes') || intLow.includes('close') ? 'close_up' :
                intLow.includes('evento') || intLow.includes('grupo') ? 'wide' : 'medium'
        );

        const lighting = options?.lighting ?? (
            intLow.includes('evento') || intLow.includes('lançamento') ? 'cinematic' :
                intLow.includes('antes') || intLow.includes('resultado') || intLow.includes('beleza') ? 'butterfly' :
                    intLow.includes('produto') ? 'editorial' :
                        intLow.includes('noite') || intLow.includes('neon') ? 'neon' : 'studio'
        );

        const renderQuality = options?.renderQuality ?? (
            intLow.includes('foto') || intLow.includes('realista') ? 'ultra_realistic' : 'editorial'
        );

        const composition = options?.composition ?? (
            intLow.includes('promover') || intLow.includes('promoção') || intLow.includes('oferta') ? 'left_text' :
                intLow.includes('antes') || intLow.includes('resultado') ? 'centered' :
                    intLow.includes('story') ? 'hero_top' : 'rule_of_thirds'
        );

        const shotType = options?.shotType ?? (
            intLow.includes('close') || intLow.includes('rosto') || intLow.includes('detalhe') ? 'CLOSE_UP' :
                intLow.includes('corpo') || intLow.includes('full') ? 'AMERICAN' : 'MEDIUM'
        );

        const negativeSpaceSide = options?.negativeSpaceSide ?? (
            intLow.includes('story') ? 'top' :
                intLow.includes('direita') ? 'right' :
                    'left'
        );

        const styleKey = options?.estiloVisual || 'elegant';
        const styleTokens = STYLE_TOKENS[styleKey] || STYLE_TOKENS['elegant'];

        // Paleta de cores da categoria
        const colorPalette = currentCategoria
            ? `Dominant color palette: primary ${currentCategoria.corPrimaria}, accent ${currentCategoria.corSecundaria}. These colors should appear in background gradients, light reflections and subtle environmental elements.`
            : 'Neutral luxury color palette: warm champagne gold, slate grey and rich cream tones. Premium brand color language.';

        // Shot type (enquadramento)
        const shotDesc = SHOT_TYPES[shotType]?.prompt || SHOT_TYPES.MEDIUM.prompt;

        // Negative space para texto (regra real do DesignBuilder)
        const negSpaceRule = NEGATIVE_SPACE[negativeSpaceSide] || NEGATIVE_SPACE.left;

        // Dimensões → aspect ratio
        const aspectRatio = dimensao?.includes('1080x1920') ? '--ar 9:16' :
            dimensao?.includes('1920x1080') ? '--ar 16:9' :
                dimensao?.includes('1080x1350') ? '--ar 4:5' : '--ar 2:3';

        // Sobriety: quanto mais alto, menos efeitos dramáticos
        const sobriety = options?.sobriety ?? 40;
        const sobrietyNote = sobriety > 70
            ? 'Keep the composition clean and SOBER: minimal dramatic effects, natural lighting, restrained color saturation.'
            : sobriety < 30
                ? 'GO BOLD and CREATIVE: push visual drama to maximum. Unexpected composition, peak artistic expression, WOW factor.'
                : 'Balance between creative impact and brand professionalism.';

        // ── Montagem do prompt completo (estrutura de 13 partes) ──
        // Baseado na linha 593-596 do index-CC_-9Jns.js
        const prompt = [
            // [SUJEITO + POSE] — enquadramento e tipo de shot
            `${shotDesc}`,

            // [CENÁRIO/AMBIENTE] — contexto da peça
            `Scene created for: "${tema}". Creative intent: ${intencao || 'professional brand visual'}. ${detalhes ? `Specific details: ${detalhes}.` : ''}`,

            // [ÂNGULO / PERSPECTIVA / CÂMERA / LENTE] — câmera e lente reais
            `${LENS_MAP[lens] || LENS_MAP.medium}.`,

            // [ESTILO VISUAL]
            `Visual style: ${styleTokens}.`,

            // [ADJETIVOS E DETALHES FÍSICOS DA CENA]
            `Realistic lighting diffusion, ultra-sharp details, skin texture visible, fabric texture rendered with precision, environmental details carefully crafted.`,

            // [TEXTURA E ILUMINAÇÃO]
            `${LIGHTING_MAP[lighting] || LIGHTING_MAP.studio}. Directional light creating dimensionality. Subsurface skin scattering for photorealism. Soft shadows with visible light direction.`,

            // [CORES ESPECÍFICAS]
            colorPalette,

            // [ESTILOS ARTÍSTICOS / QUALIDADE]
            `${RENDER_QUALITY[renderQuality] || RENDER_QUALITY.editorial}. Film grain finish. Ultra-detailed output.`,

            // [NEGATIVE SPACE RULE + BLENDING + DEPTH] — segredos reais do DesignBuilder
            negSpaceRule,
            BLENDING_ATTRIBUTE,
            DEPTH_ATTRIBUTE,

            // [COMPOSIÇÃO + SAFE ZONE]
            `COMPOSITION: ${COMPOSITION_MAP[composition] || COMPOSITION_MAP.rule_of_thirds}.`,

            // [SOBRIETY / INTENSIDADE CRIATIVA]
            sobrietyNote,

            // [COMANDOS DE NEGAÇÃO]
            `AVOID: watermarks, logos, visible text in image, stock photo clichés, generic clipart, blurry faces, distorted anatomy, oversaturated flat colors, amateur composition. No salon-specific props unless they serve the narrative.`,

            // [ASPECT RATIO + PARÂMETROS FINAIS — linha 607 do JS]
            `${aspectRatio} --v 5 --style cinematic`,
        ].filter(Boolean).join('\n');

        return prompt;
    };

    // ── Helpers para UI ──
    return {
        config,
        currentCategoria,
        categorias: Object.entries(config.categorias).map(([slug, cat]) => ({
            slug,
            ...cat,
        })),
        buildSalaoPrompt,
        // Mapas exportados para seletores na UI
        lensOptions: Object.entries(LENS_MAP).map(([key]) => ({ key, label: key.replace('_', ' ').toUpperCase() })),
        lightingOptions: Object.keys(LIGHTING_MAP),
        renderOptions: Object.keys(RENDER_QUALITY),
        compositionOptions: Object.keys(COMPOSITION_MAP),
        styleOptions: Object.entries(STYLE_TOKENS).map(([key]) => ({ key, label: key.replace('_', ' ') })),
        shotTypeOptions: Object.entries(SHOT_TYPES).map(([key, val]) => ({ key, label: val.label, icon: val.icon })),
        negativeSpaceOptions: Object.keys(NEGATIVE_SPACE),
    };
}
