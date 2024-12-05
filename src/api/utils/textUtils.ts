export const containsJapanese = (text: string): boolean => {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
};

export const isEnglishOnly = (text: string): boolean => {
  return /^[a-zA-Z0-9_\s-]+$/.test(text);
};

export const formatEnglishTag = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const sanitizeInput = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ');
};

export const validateInput = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;
  if (text.length > 5000) return false;
  if (/^[\d\s\W]+$/.test(text)) return false;
  return true;
};