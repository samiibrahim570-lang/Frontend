import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private tenant = inject(TenantService);

  /** Company / branch lines written above the data on every exported sheet. */
  private headerRows(title: string): string[][] {
    const l = this.tenant.currentLetterhead();
    const company = l?.companyName ?? this.tenant.currentCompany()?.name ?? '';
    const branch = l?.branchName ?? this.tenant.currentBranch()?.name ?? '';
    const contact = [l?.address, l?.phone ? `Phone: ${l.phone}` : null, l?.email, l?.ntnNo ? `NTN: ${l.ntnNo}` : null]
      .filter(Boolean).join('  |  ');
    return [
      [company],
      [`Branch: ${branch}`],
      [contact],
      [`${title}  -  Generated ${new Date().toLocaleString()}`],
      []
    ];
  }

  private sheetWithHeader(data: any[], title: string): XLSX.WorkSheet {
    const header = this.headerRows(title);
    const worksheet = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(worksheet, data, { origin: header.length });
    return worksheet;
  }
  /**
   * Exports an array of flat objects to a downloadable .xlsx file.
   * @param data     Array of plain objects - object keys become column headers.
   * @param fileName File name without extension, e.g. "Sale-Report-2026-09-13"
   * @param sheetName Optional sheet tab name (defaults to "Sheet1", max 31 chars enforced by Excel)
   */
  exportToExcel(data: any[], fileName: string, sheetName = 'Sheet1'): void {
    if (!data || data.length === 0) {
      window.alert('No data to export.');
      return;
    }
    const worksheet = this.sheetWithHeader(data, sheetName);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /**
   * Exports multiple sheets in a single workbook - used for the "whole application" export
   * where each module (Sale, Purchase, Production, Vouchers, Customers, Suppliers, Items...) gets its own tab.
   */
  exportMultiSheet(sheets: { name: string; data: any[] }[], fileName: string): void {
    const nonEmpty = sheets.filter((s) => s.data && s.data.length > 0);
    if (nonEmpty.length === 0) {
      window.alert('No data to export.');
      return;
    }
    const workbook = XLSX.utils.book_new();
    for (const sheet of nonEmpty) {
      const worksheet = this.sheetWithHeader(sheet.data, sheet.name);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
    }
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  todayStamp(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
