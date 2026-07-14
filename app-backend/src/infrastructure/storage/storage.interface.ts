export const IFileStorageServiceToken = Symbol('IFileStorageService');

export interface IFileStorageService {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}
