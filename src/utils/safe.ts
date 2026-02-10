// Helpers seguros para manipulação de strings - previne crash em campos null/undefined
export const safeStr = (v: any): string => (v ?? '').toString();
export const onlyDigits = (v: any): string => safeStr(v).replace(/\D/g, '');
export const safeLower = (v: any): string => safeStr(v).toLowerCase();
export const safeTrim = (v: any): string => safeStr(v).trim();
