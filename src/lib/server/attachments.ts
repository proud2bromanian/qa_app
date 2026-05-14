const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function valideazaAtasamenteImagine(files: File[]): { valid: boolean; error?: string } {
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { valid: false, error: `Fișierul ${file.name} depășește 5MB` };
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { valid: false, error: `Tip nepermis: ${file.name}. Folosiți PNG, JPEG, GIF sau WebP.` };
    }
  }
  return { valid: true };
}

export function filtreazaFisiereIncarcate(files: File[]): File[] {
  return files.filter((file) => file.size > 0);
}

export function salveazaAtasamenteCaDataUrls(files: File[]): Promise<string[]> {
  return Promise.all(files.map(fileToDataUrl));
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}
