/**
 * imageCompressor.ts
 * Compressão automática de imagens para WebP otimizado.
 * Suporta File (upload local) e URL (imagem externa).
 */

const MAX_INPUT_SIZE_MB = 10;
const MAX_DIMENSION = 800;
const WEBP_QUALITY = 0.85;

export class ImageCompressorError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageCompressorError';
    }
}

/**
 * Comprime um File de imagem para WebP otimizado.
 */
export async function compressImageFile(file: File): Promise<File> {
    if (file.size > MAX_INPUT_SIZE_MB * 1024 * 1024) {
        throw new ImageCompressorError(
            `Arquivo muito grande. Máximo permitido: ${MAX_INPUT_SIZE_MB}MB.`
        );
    }

    const accepted = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!accepted.includes(file.type)) {
        throw new ImageCompressorError(
            'Formato não suportado. Use JPG, JPEG, PNG ou WEBP.'
        );
    }

    const objectUrl = URL.createObjectURL(file);
    try {
        const blob = await resizeAndConvertToWebP(objectUrl);
        return new File([blob], `${stripExtension(file.name)}.webp`, {
            type: 'image/webp',
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/**
 * Baixa uma imagem por URL e comprime para WebP.
 * Retorna null se a URL for inválida ou não carregar.
 */
export async function compressImageUrl(url: string): Promise<File | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
            img.src = '';
            resolve(null);
        }, 10_000);

        img.onload = async () => {
            clearTimeout(timeout);
            try {
                const canvas = drawToCanvas(img);
                const blob = await canvasToWebP(canvas);
                const filename = urlToFilename(url);
                resolve(new File([blob], filename, { type: 'image/webp' }));
            } catch {
                resolve(null);
            }
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };

        img.src = url;
    });
}

/**
 * Valida se uma URL aponta para uma imagem válida (sem baixar).
 */
export function validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            img.src = '';
            resolve(false);
        }, 8_000);

        img.onload = () => { clearTimeout(timeout); resolve(true); };
        img.onerror = () => { clearTimeout(timeout); resolve(false); };
        img.src = url;
    });
}

// ─── Internos ─────────────────────────────────────────────────────────────

async function resizeAndConvertToWebP(src: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = drawToCanvas(img);
                canvasToWebP(canvas).then(resolve).catch(reject);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new ImageCompressorError('Falha ao carregar imagem.'));
        img.src = src;
    });
}

function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    let { width, height } = img;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
        } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

function canvasToWebP(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new ImageCompressorError('Falha ao gerar WebP.'));
            },
            'image/webp',
            WEBP_QUALITY
        );
    });
}

function stripExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
}

function urlToFilename(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const base = pathname.split('/').pop() || 'image';
        return `${stripExtension(base)}.webp`;
    } catch {
        return 'image.webp';
    }
}
