import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, PdfGeneratorService, ExcelGeneratorService],
  exports: [ReportsService],
})
export class ReportsModule {}
