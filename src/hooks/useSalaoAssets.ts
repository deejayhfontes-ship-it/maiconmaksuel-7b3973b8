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
// Config de categorias — apenas paleta de cores e fonte (sem hardcode de estilo "salão")
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
// MAPAS DE PARÂMETROS PROFISSIONAIS — técnica do DesignBuilder
// ============================================================

/** Lentes virtuais — determinam crop, bokeh e perspectiva */
const LENS_MAP: Record<string, string> = {
    'close_up': '85mm portrait lens, f/1.8 aperture, shallow depth of field, intense background bokeh, subject razor-sharp',
    'medium': '50mm standard lens, f/2.8 aperture, natural perspective, soft background blur',
    'wide': '35mm lens, f/4 aperture, environmental context visible, natural depth of field',
    'ultra_wide': '24mm wide-angle, f/5.6, full scene context, minimal compression',
    'macro': '100mm macro lens, f/2.8, extreme detail, micro-texture visible',
};

/** Iluminação — 3 camadas como no DesignBuilder */
const LIGHTING_MAP: Record<string, string> = {
    'studio': 'professional studio lighting, key light softbox at 45°, fill light reflector, rim backlight separating subject from background, catch lights in eyes',
    'golden': 'golden hour natural light, warm 5600K sunlight from side, long shadows, atmospheric haze, lens flare subtle',
    'cinematic': 'cinematic lighting, dramatic one-point key light, deep shadow on opposite side, moody chiaroscuro contrast, practical background lights',
    'neon': 'neon RGB accent lights, cool purple-blue ambiance, reflected colored highlights on skin, urban night atmosphere',
    'soft': 'overcast diffused light, zero harsh shadows, flat even illumination, ideal for skin tones and product detail',
    'butterfly': 'beauty butterfly lighting, key light directly above subject, soft fill below, classic glamour portrait look',
    'rembrandt': 'Rembrandt triangle lighting, dramatic 45° key light, deep contrasting shadow, painterly quality',
    'editorial': 'high-key editorial lighting, bright clean white background, minimal shadow, magazine-grade clarity',
};

/** Técnicas de renderização — injectadas para forçar qualidade */
const RENDER_QUALITY: Record<string, string> = {
    'ultra_realistic': '8K ultra-photorealistic, octane render, ray tracing, physically-based rendering, subsurface skin scattering, micro-detail pores, award-winning photography',
    'cinematic': 'cinematic 4K, film grain 35mm, ARRI ALEXA color science, anamorphic lens flares, DCI-P3 color gamut, Hollywood grade',
    'editorial': 'Vogue editorial photography, Hasselblad medium format, color-graded, Lightroom mastergrade, professional color science',
    'product': 'product photography render, HDRI studio environment, perfectly white seamless background, sharp focus edge-to-edge, commercial quality',
    'artistic': 'digital art, highly detailed concept art, trending on ArtStation, hyperdetailed, professional illustration',
    'minimalist': 'clean minimal composition, negative space, Swiss grid design system, Helvetica typographic hierarchy, premium white space',
};

/** Composição — regra dos terços e enquadramento */
const COMPOSITION_MAP: Record<string, string> = {
    'rule_of_thirds': 'rule of thirds composition, subject on left vertical third, breathing room right side for text overlay',
    'centered': 'centered symmetrical composition, subject perfectly centered, balanced negative space',
    'left_text': 'subject occupying right 60%, clean solid-color or gradient space on left 40% reserved for typography overlay',
    'right_text': 'subject occupying left 60%, clean space on right 40% for text placement',
    'full_bleed': 'full bleed composition, subject fills entire frame, text overlay integrated with design elements',
    'hero_top': 'subject in upper 70%, bottom 30% reserved for headline and CTA text block',
};

/** Estilos visuais — fórmula de tokens de estilo */
const STYLE_TOKENS: Record<string, string> = {
    'elegant': 'sophisticated, luxury brand aesthetic, restrained color palette, tasteful typography, premium feel, quiet luxury',
    'modern': 'contemporary design language, bold geometric shapes, dynamic diagonal layout, progressive visual identity',
    'minimalist': 'radical minimalism, max 2 colors, extensive white space, single focal point, zen-like clarity',
    'glamour': 'high-glamour, metallic accents, rich saturated tones, dramatic lighting, celebrity campaign quality',
    'romantic': 'soft pastel color palette, delicate floral-inspired textures, flowing curves, tender emotional warmth',
    'bold': 'high-contrast, vibrant saturated colors, oversized typography, graphic punch, Gen-Z energy',
    'ultra_realistic': 'photorealistic, indistinguishable from real photograph, camera imperfections, natural grain, lived-in authenticity',
    'institutional': 'corporate brand communication, trusted authoritative palette, structured grid layout, conservative professionalism',
    'classic': 'timeless design principles, serif typography, muted vintage palette, enduring aesthetic quality',
    'tech': 'futuristic UI aesthetic, neon grid lines, dark mode, HUD overlays, cyberpunk influenced',
    'glassmorphism': 'frosted glass panels, 70% transparency, soft blur backdrop, white stroke border, depth layers',
    'playful': 'bright primary colors, rounded organic shapes, dynamic energy, approachable fun, Gen-Alpha appeal',
    'infoproduct': 'digital marketing funnel design, strong CTA hierarchy, trust badges, authority positioning, conversion-optimized',
    'jovial': 'youthful vibrant palette, casual typography mix, relatable human authenticity, social media native',
    'pro_portrait': 'high-end portrait campaign, skin retouch, hair detail, fashion magazine quality',
    'glow': 'luminous glow effects, bloom lighting, angelic aura, dreamy soft-focus edges, celestial quality',
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
     * Constrói um prompt profissional de geração de imagem
     * seguindo a fórmula do DesignBuilder:
     * [Subject] + [Lens] + [Lighting] + [Composition] + [Style] + [Render Quality] + [Text placement]
     */
    const buildSalaoPrompt = (
        material: string,
        tema: string,
        intencao: string,
        detalhes: string,
        categoriaNome?: string,
        dimensao?: string,
        // Parâmetros extras opcionais
        options?: {
            lens?: keyof typeof LENS_MAP;
            lighting?: keyof typeof LIGHTING_MAP;
            renderQuality?: keyof typeof RENDER_QUALITY;
            composition?: keyof typeof COMPOSITION_MAP;
            estiloVisual?: keyof typeof STYLE_TOKENS;
        }
    ) => {
        // ── Padrões inteligentes por intenção ──
        const intLow = (intencao || '').toLowerCase();

        const lens = options?.lens ?? (
            intLow.includes('retrato') || intLow.includes('antes') ? 'close_up' :
                intLow.includes('evento') ? 'wide' : 'medium'
        );

        const lighting = options?.lighting ?? (
            intLow.includes('evento') || intLow.includes('lançamento') ? 'cinematic' :
                intLow.includes('antes') || intLow.includes('resultado') ? 'butterfly' :
                    intLow.includes('produto') ? 'editorial' : 'studio'
        );

        const renderQuality = options?.renderQuality ?? (
            intLow.includes('foto') || intLow.includes('realista') ? 'ultra_realistic' : 'editorial'
        );

        const composition = options?.composition ?? (
            intLow.includes('promover') || intLow.includes('promoção') ? 'left_text' :
                intLow.includes('antes') ? 'centered' :
                    intLow.includes('story') ? 'hero_top' : 'rule_of_thirds'
        );

        const styleKey = (options?.estiloVisual as string) || 'editorial';
        const styleTokens = STYLE_TOKENS[styleKey] || STYLE_TOKENS['elegant'];

        // Cores da categoria (se houver)
        const colorPalette = currentCategoria
            ? `Color palette anchored to ${currentCategoria.corPrimaria} as primary and ${currentCategoria.corSecundaria} as accent`
            : 'Neutral premium color palette, warm champagne and slate tones';

        // Reserva de espaço para texto (inspirado no DesignBuilder)
        const textSpace = tema
            ? `Typography area: headline "${tema}" must be placed in the composition's negative space — use a gradient or blurred overlay zone to ensure text legibility without masking the main subject. Font style: ${currentCategoria?.fonteTitulo || 'clean sans-serif'}, large scale, high contrast against background.`
            : '';

        // ── Montagem do prompt profissional ──
        const prompt = [
            // 1. Intenção e peça
            `Create a professional ${material} for: "${tema}".`,
            `Creative intent: ${intencao || 'brand communication'}.`,
            detalhes ? `Additional context: ${detalhes}.` : '',
            '',

            // 2. Configuração de câmera e lente (DesignBuilder secret #1)
            `CAMERA & LENS: ${LENS_MAP[lens]}.`,

            // 3. Iluminação 3 camadas (DesignBuilder secret #2)
            `LIGHTING SETUP: ${LIGHTING_MAP[lighting]}.`,

            // 4. Composição (DesignBuilder secret #3)
            `COMPOSITION: ${COMPOSITION_MAP[composition]}, safe zone 10% all sides.`,

            // 5. Estilo visual
            `VISUAL STYLE: ${styleTokens}.`,

            // 6. Tokens de renderização técnica (DesignBuilder secret #4)
            `RENDER QUALITY: ${RENDER_QUALITY[renderQuality]}.`,

            // 7. Paleta de cores
            `${colorPalette}.`,

            // 8. Espaço para texto
            textSpace,

            // 9. Dimensões e regras finais
            `Output dimensions: ${dimensao || '1080x1080'}.`,
            `CRITICAL: Do NOT include visible watermarks, generic clipart, or stock photo clichés. The image must feel like a premium commissioned work by a top creative agency.`,
        ].filter(Boolean).join('\n');

        return prompt;
    };

    // Expõe os mapas para uso na UI (sliders, botões de escolha)
    return {
        config,
        currentCategoria,
        categorias: Object.entries(config.categorias).map(([slug, cat]) => ({
            slug,
            ...cat,
        })),
        buildSalaoPrompt,
        // Mapas para UI avançada
        lensOptions: Object.keys(LENS_MAP) as (keyof typeof LENS_MAP)[],
        lightingOptions: Object.keys(LIGHTING_MAP) as (keyof typeof LIGHTING_MAP)[],
        renderOptions: Object.keys(RENDER_QUALITY) as (keyof typeof RENDER_QUALITY)[],
        compositionOptions: Object.keys(COMPOSITION_MAP) as (keyof typeof COMPOSITION_MAP)[],
        styleOptions: Object.keys(STYLE_TOKENS) as (keyof typeof STYLE_TOKENS)[],
    };
}
