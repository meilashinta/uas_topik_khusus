import { Injectable } from '@nestjs/common';
const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable()
export class PdfGeneratorService {
  private printer: any;

  constructor() {
    // Define standard fonts. We use standard Helvetica/Times/Courier mapped to default names.
    // However, pdfmake by default expects Roboto in VFS or file paths.
    // For a backend environment without loading external TTF files from disk,
    // we can use the standard 14 fonts by configuring it to use them.
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    this.printer = new PdfPrinter(fonts);
  }

  generateTicketReportPdf(data: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto' },
      header: { text: 'Ticket Report', margin: 15, fontSize: 18, bold: true, alignment: 'center' },
      footer: (currentPage, pageCount) => {
        return { text: `Page ${currentPage.toString()} of ${pageCount}`, alignment: 'center', margin: 10 };
      },
      content: [
        { text: `Period: ${data.period}`, margin: [0, 0, 0, 10] },
        { text: `Generated At: ${data.generatedAt}`, margin: [0, 0, 0, 20] },
        {
          text: 'Summary',
          style: 'header',
          margin: [0, 10, 0, 10]
        },
        {
          ul: [
            `Total Tickets: ${data.summary.totalTickets}`,
            `SLA Compliance: ${data.summary.slaComplianceRate.toFixed(2)}%`,
          ],
          margin: [0, 0, 0, 20]
        },
        {
          text: 'Ticket Details',
          style: 'header',
          margin: [0, 10, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['No', 'Ticket #', 'Title', 'Priority', 'Status', 'Created At', 'Technician'],
              ...data.tickets.map((t: any, i: number) => [
                i + 1,
                t.ticketNumber,
                t.title,
                t.priority,
                t.status,
                t.createdAt,
                t.technician
              ])
            ]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true
        }
      }
    };

    return this.createPdfBuffer(docDefinition);
  }

  generateTechnicianReportPdf(data: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto' },
      header: { text: 'Technician Performance Report', margin: 15, fontSize: 18, bold: true, alignment: 'center' },
      footer: (currentPage, pageCount) => {
        return { text: `Page ${currentPage.toString()} of ${pageCount}`, alignment: 'center', margin: 10 };
      },
      content: [
        { text: `Period: ${data.period}`, margin: [0, 0, 0, 10] },
        { text: `Generated At: ${data.generatedAt}`, margin: [0, 0, 0, 20] },
        {
          text: 'Performance Summary',
          style: 'header',
          margin: [0, 10, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Technician', 'Total Tickets', 'Resolved', 'Avg Time (m)', 'Avg Rating', 'SLA %'],
              ...data.technicians.map((t: any) => [
                t.name,
                t.totalTickets,
                t.resolved,
                t.avgResolutionTime.toFixed(1),
                t.avgRating.toFixed(1),
                `${t.slaComplianceRate.toFixed(1)}%`
              ])
            ]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true
        }
      }
    };

    return this.createPdfBuffer(docDefinition);
  }

  private createPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
