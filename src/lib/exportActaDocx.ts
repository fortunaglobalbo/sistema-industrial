import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  VerticalAlign,
  ShadingType,
} from 'docx';

export interface WorkerInfo {
  fullName: string;
  ci: string;
  position: string;
  department: string;
  supervisorName: string;
}

export interface TransactionItemInfo {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  conditionReason: string;
  photoUrl?: string | null;
}

export interface TransactionInfo {
  id: string;
  folio: string;
  createdAt: string;
  supervisorName: string;
  transactionType: 'devolucion' | 'entrega' | 'intercambio' | 'dotacion' | 'desuso' | string;
  signatureUrl?: string | null;
  worker: WorkerInfo;
}

const translateType = (type: string) => {
  switch (type) {
    case 'dotacion':
      return 'DOTACIÓN DE EQUIPO (PERSONAL NUEVO)';
    case 'entrega':
      return 'ENTREGA DE EPP / INSUMOS';
    case 'devolucion':
      return 'DEVOLUCIÓN Y DESCARGO';
    case 'intercambio':
      return 'INTERCAMBIO POR REPOSICIÓN';
    case 'desuso':
      return 'EQUIPO EN DESUSO / DADO DE BAJA';
    default:
      return type.toUpperCase();
  }
};

const translateReason = (reason: string) => {
  switch (reason) {
    case 'nuevo':
      return 'Nuevo / Dotación';
    case 'desgaste_natural':
      return 'Desgaste Natural';
    case 'dano_operativo':
      return 'Daño Operativo';
    case 'defecto_fabrica':
      return 'Defecto de Fábrica';
    case 'cambio_talla':
      return 'Cambio de Talla';
    case 'en_desuso':
      return 'En Desuso / Dado de Baja';
    default:
      return reason;
  }
};

const formatQuantity = (qty: number) => {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toLocaleString('es-ES', { maximumFractionDigits: 2 });
};

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export async function exportActaToDocx(
  transaction: TransactionInfo,
  items: TransactionItemInfo[]
): Promise<void> {
  // Intentar cargar la imagen del logo
  let logoImageRun: ImageRun | null = null;
  try {
    const res = await fetch('/logo-ende.png');
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      logoImageRun = new ImageRun({
        data: buffer,
        transformation: {
          width: 130,
          height: 38,
        },
        type: 'png',
      });
    }
  } catch {
    // Si falla cargar el logo (por ejemplo en entornos offline), se continúa sin logo
    logoImageRun = null;
  }

  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  // Encabezado con Logo y Folio
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...borderNone,
      bottom: { style: BorderStyle.SINGLE, size: 8, color: '0F172A' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            verticalAlign: VerticalAlign.CENTER,
            children: logoImageRun
              ? [new Paragraph({ children: [logoImageRun] })]
              : [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'ENDE DEORURO',
                        bold: true,
                        size: 24,
                        color: '1E3A8A',
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `N° FOLIO: ${transaction.folio || 'S/F'}`,
                    bold: true,
                    size: 22,
                    color: '1E293B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ACTA DE CONFORMIDAD Y DESCARGO',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Título Principal
  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 200 },
    children: [
      new TextRun({
        text: `ACTA DE CONFORMIDAD Y DESCARGO\n${translateType(transaction.transactionType)}`,
        bold: true,
        size: 24,
        color: '0F172A',
        font: 'Calibri',
      }),
    ],
  });

  // Tabla de Datos del Trabajador / Responsable
  const workerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Trabajador: ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: transaction.worker.fullName, bold: true, size: 19, color: '0F172A', font: 'Calibri' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Cédula de Identidad (C.I.): ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: transaction.worker.ci, bold: true, size: 19, color: '0F172A', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Cargo / Puesto: ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: transaction.worker.position, size: 18, color: '1E293B', font: 'Calibri' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Área / Departamento: ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: transaction.worker.department, size: 18, color: '1E293B', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Inmediato Superior (Autoriza): ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: transaction.supervisorName, bold: true, size: 18, color: '1E293B', font: 'Calibri' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Fecha y Hora de Registro: ', bold: true, size: 18, color: '475569', font: 'Calibri' }),
                  new TextRun({ text: formatDate(transaction.createdAt), size: 18, color: '1E293B', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Espaciado antes de la tabla de items
  const itemsHeaderParagraph = new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: 'DETALLE DE INSUMOS, EQUIPOS Y HERRAMIENTAS:',
        bold: true,
        size: 19,
        color: '1E293B',
        font: 'Calibri',
      }),
    ],
  });

  // Cabecera de la tabla de items
  const tableHeaderRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { fill: '1E293B', type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Cant.', bold: true, size: 17, color: 'FFFFFF', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { fill: '1E293B', type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'Categoría', bold: true, size: 17, color: 'FFFFFF', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 38, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { fill: '1E293B', type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'Descripción del Insumo / Herramienta', bold: true, size: 17, color: 'FFFFFF', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { fill: '1E293B', type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Operación', bold: true, size: 17, color: 'FFFFFF', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { fill: '1E293B', type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'Estado / Motivo', bold: true, size: 17, color: 'FFFFFF', font: 'Calibri' })],
          }),
        ],
      }),
    ],
  });

  // Filas de Items
  const itemRows = items.map((item, index) => {
    const isEven = index % 2 === 0;
    const bgFill = isEven ? 'FFFFFF' : 'F8FAFC';
    const opText =
      transaction.transactionType === 'dotacion'
        ? 'Dotación'
        : transaction.transactionType === 'intercambio'
        ? 'Entrega/Dev.'
        : transaction.transactionType.toUpperCase();

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: formatQuantity(item.quantity), bold: true, size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: item.category, size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 38, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: item.itemName, bold: true, size: 18, font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: opText, size: 17, color: '334155', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: translateReason(item.conditionReason), size: 17, color: '475569', font: 'Calibri' })],
            }),
          ],
        }),
      ],
    });
  });

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder,
    rows: [tableHeaderRow, ...itemRows],
  });

  // Términos y Conformidad Legal
  const termsParagraph = new Paragraph({
    spacing: { before: 200, after: 300 },
    children: [
      new TextRun({
        text: '* Al firmar este documento, el trabajador declara haber recibido a conformidad y en perfecto estado los elementos de protección personal, ropa de trabajo o herramientas descritos en la lista, comprometiéndose a darles un uso correcto y adecuado en cumplimiento de las normativas vigentes de seguridad industrial e higiene ocupacional de la empresa.',
        italics: true,
        size: 16,
        color: '64748B',
        font: 'Calibri',
      }),
    ],
  });

  // Tabla de Firmas
  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                spacing: { before: 500, after: 60 },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '________________________________________',
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: transaction.worker.fullName,
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `C.I. ${transaction.worker.ci}`,
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Firma del Trabajador',
                    bold: true,
                    size: 16,
                    color: '475569',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                spacing: { before: 500, after: 60 },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '________________________________________',
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: transaction.supervisorName || 'Supervisora / Responsable EPP',
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Supervisora / Unidad de Seguridad Industrial',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Firma, Sello y Fecha',
                    bold: true,
                    size: 16,
                    color: '475569',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          headerTable,
          titleParagraph,
          workerTable,
          itemsHeaderParagraph,
          itemsTable,
          termsParagraph,
          signaturesTable,
        ],
      },
    ],
  });

  // Generar y disparar descarga
  const blob = await Packer.toBlob(doc);
  const cleanWorker = (transaction.worker.fullName || 'Trabajador')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Acta_${transaction.folio || 'EPP'}_${cleanWorker}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
