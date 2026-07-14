import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelGeneratorService {
  async generateTicketReportExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ticket Report');

    // Add Title
    sheet.addRow(['Ticket Report']);
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.addRow([`Period: ${data.period}`]);
    sheet.addRow([`Generated At: ${data.generatedAt}`]);
    sheet.addRow([]);

    // Add Summary
    sheet.addRow(['Summary']);
    sheet.getCell('A5').font = { bold: true };
    sheet.addRow(['Total Tickets', data.summary.totalTickets]);
    sheet.addRow(['SLA Compliance', `${data.summary.slaComplianceRate.toFixed(2)}%`]);
    sheet.addRow([]);

    // Add Table Header
    const headerRow = sheet.addRow(['No', 'Ticket #', 'Title', 'Priority', 'Status', 'Created At', 'Technician']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    data.tickets.forEach((t: any, i: number) => {
      const row = sheet.addRow([
        i + 1,
        t.ticketNumber,
        t.title,
        t.priority,
        t.status,
        t.createdAt,
        t.technician
      ]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns (simple approximation)
    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell!({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateTechnicianReportExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Technician Performance');

    // Add Title
    sheet.addRow(['Technician Performance Report']);
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.addRow([`Period: ${data.period}`]);
    sheet.addRow([`Generated At: ${data.generatedAt}`]);
    sheet.addRow([]);

    // Add Table Header
    const headerRow = sheet.addRow(['Technician', 'Total Tickets', 'Resolved', 'Avg Time (m)', 'Avg Rating', 'SLA %']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    data.technicians.forEach((t: any) => {
      const row = sheet.addRow([
        t.name,
        t.totalTickets,
        t.resolved,
        t.avgResolutionTime.toFixed(1),
        t.avgRating.toFixed(1),
        `${t.slaComplianceRate.toFixed(1)}%`
      ]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell!({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
