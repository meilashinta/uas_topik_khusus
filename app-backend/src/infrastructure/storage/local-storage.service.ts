import { Injectable, NotFoundException } from '@nestjs/common';
import { IFileStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IFileStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.init();
  }

  private async init() {
    if (!existsSync(this.uploadDir)) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, filename: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename);
    await fs.writeFile(filePath, file.buffer);
    return `/uploads/${filename}`;
  }

  async download(fileUrl: string): Promise<Buffer> {
    const filename = fileUrl.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, filename);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found in storage');
    }
    
    return fs.readFile(filePath);
  }

  async delete(fileUrl: string): Promise<void> {
    const filename = fileUrl.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, filename);
    
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  }
}
