import { FileValidationPipe, MAX_FILE_SIZE } from './file-validation.pipe';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  it('should validate allowed image file', () => {
    const file = { mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File;
    expect(pipe.transform(file)).toEqual(file);
  });

  it('should validate allowed PDF file', () => {
    const file = { mimetype: 'application/pdf', size: 1024 } as Express.Multer.File;
    expect(pipe.transform(file)).toEqual(file);
  });

  it('should throw BadRequestException if file is missing', () => {
    expect(() => pipe.transform(undefined as any)).toThrow(BadRequestException);
  });

  it('should throw PayloadTooLargeException if file exceeds limit', () => {
    const file = { mimetype: 'image/jpeg', size: MAX_FILE_SIZE + 1 } as Express.Multer.File;
    expect(() => pipe.transform(file)).toThrow(PayloadTooLargeException);
  });

  it('should throw BadRequestException if mimetype is not allowed', () => {
    const file = { mimetype: 'application/x-msdownload', size: 1024 } as Express.Multer.File;
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
  });
});
