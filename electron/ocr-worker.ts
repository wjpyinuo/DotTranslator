/**
 * OCR Worker 池 — 复用 tesseract.js worker，避免每次创建/销毁的开销
 *
 * 策略：
 *  - 懒初始化：首次调用时才创建 worker
 *  - 单 worker 实例，串行识别（tesseract.js 本身单线程）
 *  - 应用退出时自动清理
 *  - 初始化失败时记录错误，后续调用返回空结果
 */

type TesseractWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};

let worker: TesseractWorker | null = null;
let initPromise: Promise<TesseractWorker> | null = null;
let initFailed = false;

async function getWorker(): Promise<TesseractWorker> {
  if (worker) return worker;
  if (initFailed) throw new Error('OCR worker failed to initialize previously');
  if (!initPromise) {
    initPromise = (async () => {
      let createWorker: typeof import('tesseract.js').createWorker;
      try {
        const tesseract = await import('tesseract.js');
        createWorker = tesseract.createWorker;
      } catch {
        throw new Error('tesseract.js not installed (optional dependency). Run: npm install tesseract.js');
      }
      const w = await createWorker('chi_sim+eng');
      worker = w as unknown as TesseractWorker;
      initPromise = null;
      return worker;
    })().catch((err) => {
      initFailed = true;
      initPromise = null;
      console.warn('[OCR] Not available:', err.message);
      throw err;
    });
  }
  return initPromise;
}

export async function recognize(imageBase64: string): Promise<{ text: string; confidence: number; error?: string }> {
  try {
    const w = await getWorker();
    const buffer = Buffer.from(imageBase64, 'base64');
    const { data } = await w.recognize(buffer);
    return { text: data.text.trim(), confidence: data.confidence };
  } catch (err: any) {
    console.error('[OCR] Recognition failed:', err);
    return { text: '', confidence: 0, error: err.message };
  }
}

export async function destroyOcrWorker(): Promise<void> {
  if (worker) {
    try {
      await worker.terminate();
    } catch {
      /* ignore */
    }
    worker = null;
  }
}
