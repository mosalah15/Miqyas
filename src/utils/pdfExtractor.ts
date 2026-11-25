import * as pdfjsLib from 'pdfjs-dist';

// Resolve worker URL safely in Vite production & dev bundles
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ExtractedPdfImage {
  id: string;
  name: string;
  data: string;
  mimeType: string;
}

export interface PdfExtractionResult {
  text: string;
  images: ExtractedPdfImage[];
  pageCount: number;
  textPageCount: number;
  renderedPageCount: number;
}

/**
 * Extracts text from digital PDFs and renders scanned/low-text pages as JPEG images
 * so both digital lecture PDFs and scanned exam sheets work seamlessly with AI.
 */
export async function extractPdfContent(
  file: File,
  options?: {
    maxPages?: number;
    maxRenderedImages?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<PdfExtractionResult> {
  const maxPages = options?.maxPages ?? 30;
  const maxRenderedImages = options?.maxRenderedImages ?? 15;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPagesToRead = Math.min(pdf.numPages, maxPages);
  const textChunks: string[] = [];
  const images: ExtractedPdfImage[] = [];
  let textPageCount = 0;
  let renderedPageCount = 0;

  for (let pageNum = 1; pageNum <= totalPagesToRead; pageNum++) {
    options?.onProgress?.(pageNum, totalPagesToRead);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const nonSpaceLength = pageText.replace(/\s/g, '').length;

    if (nonSpaceLength >= 40) {
      textPageCount++;
      textChunks.push(`--- Page ${pageNum} ---\n${pageText}`);
    } else if (renderedPageCount < maxRenderedImages) {
      // Scanned or image-based page: render to offscreen canvas for vision processing
      const baseViewport = page.getViewport({ scale: 1 });
      const targetScale = Math.min(2, Math.max(1.2, 1300 / Math.max(baseViewport.width, 1)));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        renderedPageCount++;
        images.push({
          id: `pdf_${Date.now()}_p${pageNum}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${file.name.replace(/\.pdf$/i, '')}_p${pageNum}.jpg`,
          data: dataUrl,
          mimeType: 'image/jpeg',
        });

        canvas.width = 0;
        canvas.height = 0;
      }
    }
  }

  return {
    text: textChunks.join('\n\n'),
    images,
    pageCount: pdf.numPages,
    textPageCount,
    renderedPageCount,
  };
}

