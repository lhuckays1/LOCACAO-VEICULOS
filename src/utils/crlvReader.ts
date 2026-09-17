import * as pdfjsLib from 'pdfjs-dist';

export interface CRLVData {
  plate?: string;
  renavam?: string;
  brand?: string;
  model?: string;
  version?: string;
  manufactureYear?: number;
  modelYear?: number;
  color?: string;
  fuel?: string;
  category?: string;
  vehicleType?: string;
  chassis?: string;
  engine?: string;
  power?: string;
  displacement?: string;
  passengerCapacity?: number;
}

export interface CRLVReadResult {
  data: CRLVData;
  rawText: string;
  source: 'PDF_TEXT' | 'OCR_IMAGE' | 'OCR_PDF';
  pagesProcessed: number;
}

/**
 * Remove acentos e normaliza o texto.
 */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Limpa valores extraídos pelo OCR.
 */
function cleanValue(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[|]+/g, '')
    .trim();
}

/**
 * Retorna o primeiro valor encontrado através de várias expressões.
 */
function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const value = cleanValue(match[1]);

      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

/**
 * Tenta localizar um valor que aparece na mesma linha do campo.
 */
function valueAfterLabel(
  text: string,
  labels: string[],
  valuePattern: string,
): string | undefined {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(
      `${escaped}\\s*[:\\-]?\\s*(${valuePattern})`,
      'i',
    );

    const match = text.match(regex);

    if (match?.[1]) {
      const value = cleanValue(match[1]);

      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

/**
 * Extrai o texto de todas as páginas de um PDF.
 */
async function extractPdfText(file: File): Promise<{
  text: string;
  pages: number;
}> {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });

  const pdf = await loadingTask.promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: any) => {
        if ('str' in item) {
          return item.str;
        }

        return '';
      })
      .join(' ');

    pages.push(pageText);
  }

  return {
    text: pages.join('\n'),
    pages: pdf.numPages,
  };
}

/**
 * Configuração do OCR.
 */
async function runOCR(
  source: File | HTMLCanvasElement,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('por');

  try {
    const result = await worker.recognize(source);

    return result.data.text || '';
  } finally {
    await worker.terminate();
  }
}

/**
 * Executa OCR diretamente em uma imagem.
 */
async function extractImageOCR(file: File): Promise<{
  text: string;
  pages: number;
}> {
  const text = await runOCR(file);

  return {
    text,
    pages: 1,
  };
}

/**
 * Renderiza uma página do PDF para canvas.
 */
async function renderPdfPage(
  pdf: any,
  pageNumber: number,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({
    scale: 2,
  });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Não foi possível criar o canvas para leitura do CRLV.');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

/**
 * OCR de PDF escaneado.
 *
 * Processamos no máximo as 3 primeiras páginas porque o CRLV
 * normalmente possui poucas páginas e isso evita processamento
 * excessivo no navegador.
 */
async function extractPdfOCR(file: File): Promise<{
  text: string;
  pages: number;
}> {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });

  const pdf = await loadingTask.promise;

  const maxPages = Math.min(pdf.numPages, 3);

  const texts: string[] = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const canvas = await renderPdfPage(pdf, pageNumber);

    const pageText = await runOCR(canvas);

    texts.push(pageText);
  }

  return {
    text: texts.join('\n'),
    pages: maxPages,
  };
}

/**
 * Extrai os dados relevantes do CRLV a partir do texto.
 */
function parseCRLVText(rawText: string): CRLVData {
  const text = normalizeText(rawText);

  const data: CRLVData = {};

  // ---------------------------------------------------------
  // PLACA
  // ---------------------------------------------------------

  const plate =
    valueAfterLabel(
      text,
      ['PLACA'],
      '[A-Z]{3}[- ]?[0-9A-Z][0-9A-Z][0-9]{2}',
    ) ||
    text.match(
      /\b([A-Z]{3}[- ]?(?:[0-9]{4}|[0-9][A-Z][0-9]{2}))\b/,
    )?.[1];

  if (plate) {
    data.plate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  // ---------------------------------------------------------
  // RENAVAM
  // ---------------------------------------------------------

  const renavam = valueAfterLabel(
    text,
    ['RENAVAM'],
    '[0-9]{8,12}',
  );

  if (renavam) {
    data.renavam = renavam.replace(/\D/g, '');
  }

  // ---------------------------------------------------------
  // CHASSI / VIN
  // ---------------------------------------------------------

  const chassis =
    valueAfterLabel(
      text,
      ['CHASSI', 'CHASSI / VIN', 'CHASSI/VIN'],
      '[A-Z0-9]{17}',
    ) ||
    text.match(
      /\b([A-HJ-NPR-Z0-9]{17})\b/,
    )?.[1];

  if (chassis) {
    data.chassis = chassis.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  // ---------------------------------------------------------
  // MARCA / MODELO
  // ---------------------------------------------------------

  const brandModel =
    valueAfterLabel(
      text,
      [
        'MARCA/MODELO',
        'MARCA / MODELO',
        'MARCA MODELO',
        'MARCA-MODELO',
      ],
      '.{3,80}',
    );

  if (brandModel) {
    const value = cleanValue(brandModel);

    /*
     * O CRLV normalmente apresenta algo como:
     *
     * FIAT/ARGO DRIVE 1.0
     *
     * Não tentamos adivinhar perfeitamente a separação
     * entre marca e modelo. Mantemos a informação completa
     * no modelo quando não for possível separar com segurança.
     */

    const separatorMatch = value.match(/^([A-Z]{2,20})[\/\s]+(.+)$/);

    if (separatorMatch) {
      data.brand = cleanValue(separatorMatch[1]);
      data.model = cleanValue(separatorMatch[2]);
    } else {
      data.model = value;
    }
  }

  // ---------------------------------------------------------
  // ANO DE FABRICAÇÃO
  // ---------------------------------------------------------

  const manufactureYear = valueAfterLabel(
    text,
    [
      'ANO FABRICACAO',
      'ANO FABR.',
      'ANO FAB',
      'ANO DE FABRICACAO',
    ],
    '(?:19|20)[0-9]{2}',
  );

  if (manufactureYear) {
    const year = Number(manufactureYear);

    if (year >= 1980 && year <= 2035) {
      data.manufactureYear = year;
    }
  }

  // ---------------------------------------------------------
  // ANO MODELO
  // ---------------------------------------------------------

  const modelYear = valueAfterLabel(
    text,
    [
      'ANO MODELO',
      'ANO MOD.',
      'ANO MOD',
      'MODELO',
    ],
    '(?:19|20)[0-9]{2}',
  );

  if (modelYear) {
    const year = Number(modelYear);

    if (year >= 1980 && year <= 2036) {
      data.modelYear = year;
    }
  }

  /*
   * Caso o OCR não consiga associar os anos aos respectivos
   * campos, tentamos encontrar pares de anos.
   */
  if (!data.manufactureYear || !data.modelYear) {
    const years = [...text.matchAll(/\b((?:19|20)[0-9]{2})\b/g)]
      .map((match) => Number(match[1]))
      .filter((year) => year >= 1980 && year <= 2036);

    const uniqueYears = [...new Set(years)];

    if (uniqueYears.length >= 2) {
      if (!data.manufactureYear) {
        data.manufactureYear = uniqueYears[0];
      }

      if (!data.modelYear) {
        data.modelYear = uniqueYears[1];
      }
    }
  }

  // ---------------------------------------------------------
  // COR
  // ---------------------------------------------------------

  const color = valueAfterLabel(
    text,
    [
      'COR PREDOMINANTE',
      'COR',
    ],
    '[A-ZÀ-Ú ]{3,30}',
  );

  if (color) {
    data.color = cleanValue(color);
  }

  // ---------------------------------------------------------
  // COMBUSTÍVEL
  // ---------------------------------------------------------

  const fuel = valueAfterLabel(
    text,
    [
      'COMBUSTIVEL',
      'COMBUSTIVEL /',
      'COMB.',
    ],
    '[A-ZÀ-Ú /-]{3,30}',
  );

  if (fuel) {
    data.fuel = normalizeFuel(fuel);
  }

  // ---------------------------------------------------------
  // CATEGORIA
  // ---------------------------------------------------------

  const category = valueAfterLabel(
    text,
    ['CATEGORIA'],
    '[A-ZÀ-Ú /-]{3,40}',
  );

  if (category) {
    data.category = cleanValue(category);
  }

  // ---------------------------------------------------------
  // ESPÉCIE / TIPO
  // ---------------------------------------------------------

  const vehicleType = valueAfterLabel(
    text,
    [
      'ESPECIE/TIPO',
      'ESPECIE / TIPO',
      'ESPECIE-TIPO',
      'TIPO',
    ],
    '[A-ZÀ-Ú /-]{3,60}',
  );

  if (vehicleType) {
    data.vehicleType = cleanValue(vehicleType);
  }

  // ---------------------------------------------------------
  // MOTOR
  // ---------------------------------------------------------

  const engine = valueAfterLabel(
    text,
    [
      'MOTOR',
      'N MOTOR',
      'NUMERO DO MOTOR',
      'N DO MOTOR',
    ],
    '[A-Z0-9./-]{3,30}',
  );

  if (engine) {
    data.engine = cleanValue(engine);
  }

  // ---------------------------------------------------------
  // POTÊNCIA
  // ---------------------------------------------------------

  const power = valueAfterLabel(
    text,
    [
      'POTENCIA',
      'POTENCIA/CV',
      'POTENCIA CV',
    ],
    '[0-9., ]{2,15}(?:CV|HP)?',
  );

  if (power) {
    data.power = cleanValue(power);
  }

  // ---------------------------------------------------------
  // CILINDRADA
  // ---------------------------------------------------------

  const displacement = valueAfterLabel(
    text,
    [
      'CILINDRADA',
      'CILINDRADAS',
      'CILINDR.',
    ],
    '[0-9., ]{2,15}(?:CC)?',
  );

  if (displacement) {
    data.displacement = cleanValue(displacement);
  }

  // ---------------------------------------------------------
  // CAPACIDADE DE PASSAGEIROS
  // ---------------------------------------------------------

  const passengerCapacity = valueAfterLabel(
    text,
    [
      'CAPACIDADE',
      'LOTACAO',
      'PASSAGEIROS',
    ],
    '[0-9]{1,2}',
  );

  if (passengerCapacity) {
    const capacity = Number(
      passengerCapacity.replace(/\D/g, ''),
    );

    if (capacity >= 1 && capacity <= 50) {
      data.passengerCapacity = capacity;
    }
  }

  return data;
}

/**
 * Normaliza diferentes formas de combustível encontradas
 * em documentos oficiais.
 */
function normalizeFuel(value: string): string {
  const normalized = normalizeText(value);

  if (
    normalized.includes('FLEX') ||
    normalized.includes('ALCOOL/GASOLINA') ||
    normalized.includes('ALCOOL / GASOLINA')
  ) {
    return 'FLEX';
  }

  if (normalized.includes('GASOLINA')) {
    return 'GASOLINA';
  }

  if (normalized.includes('ETANOL') || normalized.includes('ALCOOL')) {
    return 'ETANOL';
  }

  if (normalized.includes('DIESEL')) {
    return 'DIESEL';
  }

  if (
    normalized.includes('ELETRICO') ||
    normalized.includes('ELETRIC')
  ) {
    return 'ELETRICO';
  }

  if (normalized.includes('HIBRIDO')) {
    return 'HIBRIDO';
  }

  if (normalized.includes('GNV')) {
    return 'GNV';
  }

  return cleanValue(value);
}

/**
 * Validação básica do arquivo.
 */
function validateFile(file: File): void {
  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      'O arquivo é muito grande. Envie um PDF ou imagem de até 10 MB.',
    );
  }

  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!validTypes.includes(file.type)) {
    throw new Error(
      'Formato não suportado. Envie um CRLV em PDF, JPG, PNG ou WEBP.',
    );
  }
}

/**
 * Função principal utilizada pelo VehiclesPage.
 */
export async function readCRLV(
  file: File,
): Promise<CRLVReadResult> {
  validateFile(file);

  let rawText = '';
  let source: CRLVReadResult['source'];
  let pagesProcessed = 1;

  if (file.type === 'application/pdf') {
    /*
     * Primeiro tentamos extrair o texto diretamente.
     * É muito mais rápido que OCR.
     */
    const pdfText = await extractPdfText(file);

    if (normalizeText(pdfText.text).length >= 80) {
      rawText = pdfText.text;
      source = 'PDF_TEXT';
      pagesProcessed = pdfText.pages;
    } else {
      /*
       * PDF provavelmente é uma imagem digitalizada.
       * Nesse caso utilizamos OCR.
       */
      const ocrResult = await extractPdfOCR(file);

      rawText = ocrResult.text;
      source = 'OCR_PDF';
      pagesProcessed = ocrResult.pages;
    }
  } else {
    const ocrResult = await extractImageOCR(file);

    rawText = ocrResult.text;
    source = 'OCR_IMAGE';
    pagesProcessed = ocrResult.pages;
  }

  if (!rawText.trim()) {
    throw new Error(
      'Não foi possível encontrar texto no documento. Tente uma imagem ou PDF com melhor qualidade.',
    );
  }

  const data = parseCRLVText(rawText);

  const fieldsFound = Object.values(data).filter(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  ).length;

  if (fieldsFound === 0) {
    throw new Error(
      'O documento foi lido, mas não conseguimos identificar os dados do veículo. Tente uma foto mais nítida ou um CRLV-e original.',
    );
  }

  return {
    data,
    rawText,
    source,
    pagesProcessed,
  };
}

/**
 * Quantidade de campos identificados.
 */
export function countCRLVFields(data: CRLVData): number {
  return Object.values(data).filter(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  ).length;
}