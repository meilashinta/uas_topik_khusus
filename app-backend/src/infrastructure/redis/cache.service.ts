import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn(`Failed to get cache for key: ${key}`, err);
    }

    const data = await fetcher();

    try {
      if (data !== undefined && data !== null) {
        await this.redisService.set(key, JSON.stringify(data), ttl);
      }
    } catch (err) {
      this.logger.warn(`Failed to set cache for key: ${key}`, err);
    }

    return data;
  }
}
