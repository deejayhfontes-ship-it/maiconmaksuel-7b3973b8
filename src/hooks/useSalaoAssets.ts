import { useState, useEffect } from 'react';

// ============================================================
// Tipos de configuração do salão
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
// Config default inline (sem necessidade de fetch JSON)
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
     * Constrói o prompt de design gráfico para salão de beleza
     */
    const buildSalaoPrompt = (
        material: string,
        tema: string,
        intencao: string,
        detalhes: string,
        categoriaNome?: string,
        dimensao?: string
    ) => {
        const catNome = categoriaNome || currentCategoria?.nome || 'Promoção';
        const cores = currentCategoria
            ? `Primária ${currentCategoria.corPrimaria}, Secundária ${currentCategoria.corSecundaria}`
            : 'Rosé gold (#D4A574), Dourado (#B8860B)';
        const fontes = currentCategoria
            ? `${currentCategoria.fonteTitulo} (títulos), ${currentCategoria.fonteCorpo} (corpo)`
            : 'Playfair Display (títulos), Poppins (corpo)';

        // Layout baseado na intenção
        let layoutDesc = "diagramação moderna, elegante e feminina de material gráfico para salão de beleza";
        if (intencao.toLowerCase().includes('promover') || intencao.toLowerCase().includes('promoção')) {
            layoutDesc = "layout de promoção com preço em destaque, desconto chamativo, composição vibrante e convidativa com elementos de beleza";
        } else if (intencao.toLowerCase().includes('informar')) {
            layoutDesc = "layout informativo clean com horários, serviços e informações bem organizadas, aspecto profissional e elegante";
        } else if (intencao.toLowerCase().includes('evento')) {
            layoutDesc = "layout de convite especial com data e local em destaque, detalhes glamourosos e sofisticados";
        } else if (intencao.toLowerCase().includes('dica')) {
            layoutDesc = "layout educativo sobre beleza com visual moderno, ícones e seções bem definidas";
        }

        const prompt = [
            `DESIGN GRÁFICO PARA SALÃO DE BELEZA: Crie um(a) ${material} profissional para "${catNome}".`,
            '',
            `TÍTULO PRINCIPAL (DEVE aparecer composto na arte em destaque): "${tema}"`,
            `O título "${tema}" DEVE ser renderizado como TEXTO VISUAL na imagem, com tipografia grande, legível e elegante. NÃO gere apenas uma foto — gere um MATERIAL GRÁFICO/FLYER com o texto integrado ao design.`,
            '',
            `Intenção da comunicação: ${intencao}.`,
            `Estilo de layout: ${layoutDesc}.`,
            '',
            `DIRETRIZES DE DESIGN:`,
            `- Cores do salão: ${cores}`,
            `- Tipografia: similar a ${fontes}`,
            `- O resultado DEVE parecer um flyer/post profissional de salão de beleza feminino premium`,
            `- Estética: sofisticada, glamourosa, luxury — tons rosé gold, dourado, nude, branco e preto`,
            `- Elementos decorativos PERMITIDOS: brilhos sutis, partículas douradas, efeito bokeh, glitter, linhas geométricas elegantes, folhas douradas minimalistas, texturas de mármore ou seda`,
            `- PROIBIDO: flores, plantas, elementos naturais excessivos, cliparts genéricos`,
            `- Hierarquia visual: título grande → serviço/promoção → detalhes → espaço para contato`,
            `- Reserve espaço no canto inferior direito para logotipo do salão (15% da largura)`,
            `- TEXTURA DE FUNDO: mármore branco ou nude, seda rose gold, gradiente dourado premium`,
            `- Composição com regra dos terços, área segura de 10% nas bordas`,
            '',
            detalhes ? `Informações adicionais para incluir no material: ${detalhes}` : '',
            '',
            `IMPORTANTE: O resultado final deve ser um FLYER/PEÇA GRÁFICA elegante e sofisticada com texto composto, NÃO uma fotografia ou imagem genérica. Deve parecer saído de uma agência de design premium de alto padrão. Resolução: ${dimensao || '1080x1080'}.`
        ].filter(Boolean).join('\n');

        return prompt;
    };

    return {
        config,
        currentCategoria,
        categorias: Object.entries(config.categorias).map(([slug, cat]) => ({
            slug,
            ...cat,
        })),
        buildSalaoPrompt,
    };
}
