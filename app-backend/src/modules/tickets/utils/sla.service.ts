import { Injectable } from '@nestjs/common';

@Injectable()
export class SlaService {
  /**
   * Menghitung batas waktu SLA Resolusi (Kapan tiket harus selesai)
   * Beroperasi 24/7 (menambahkan menit langsung ke startTime)
   */
  calculateSlaDueAt(slaResolutionMinutes: number, startTime: Date = new Date()): Date {
    return new Date(startTime.getTime() + slaResolutionMinutes * 60000);
  }

  /**
   * Menghitung batas waktu FRT (First Response Time)
   */
  calculateFrtDueAt(slaResponseMinutes: number, startTime: Date = new Date()): Date {
    return new Date(startTime.getTime() + slaResponseMinutes * 60000);
  }

  /**
   * Mendapatkan sisa waktu dalam menit menuju batas SLA
   */
  getRemainingTime(slaDueAt: Date): number {
    const now = new Date().getTime();
    const dueTime = new Date(slaDueAt).getTime();
    return Math.floor((dueTime - now) / 60000);
  }

  /**
   * Mendapatkan persentase sisa waktu dari total durasi SLA
   */
  getRemainingPercentage(slaDueAt: Date, totalMinutes: number): number {
    if (totalMinutes <= 0) return 0;
    const remaining = this.getRemainingTime(slaDueAt);
    const percentage = (remaining / totalMinutes) * 100;
    return Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
  }

  /**
   * Cek apakah SLA sudah terlampaui
   */
  isOverdue(slaDueAt: Date): boolean {
    return this.getRemainingTime(slaDueAt) < 0;
  }

  /**
   * Cek apakah tiket butuh SLA warning (sisa waktu <= 20%)
   */
  isWarning(slaDueAt: Date, totalMinutes: number): boolean {
    if (this.isOverdue(slaDueAt)) return false; // If overdue, it's a breach, not warning
    return this.getRemainingPercentage(slaDueAt, totalMinutes) <= 20;
  }
}
