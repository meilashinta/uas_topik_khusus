import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisServiceMock: jest.Mocked<Partial<RedisService>>;

  beforeEach(() => {
    redisServiceMock = {
      get: jest.fn(),
      set: jest.fn(),
    };
    cacheService = new CacheService(redisServiceMock as any);
  });

  it('should return cached value if it exists (hit)', async () => {
    const cachedData = { foo: 'bar' };
    redisServiceMock.get?.mockResolvedValue(JSON.stringify(cachedData));
    const fetcher = jest.fn();

    const result = await cacheService.getOrSet('my_key', 60, fetcher);

    expect(result).toEqual(cachedData);
    expect(redisServiceMock.get).toHaveBeenCalledWith('my_key');
    expect(fetcher).not.toHaveBeenCalled();
    expect(redisServiceMock.set).not.toHaveBeenCalled();
  });

  it('should call fetcher and save to cache if not exists (miss)', async () => {
    redisServiceMock.get?.mockResolvedValue(null);
    const fetchedData = { foo: 'baz' };
    const fetcher = jest.fn().mockResolvedValue(fetchedData);

    const result = await cacheService.getOrSet('my_key', 60, fetcher);

    expect(result).toEqual(fetchedData);
    expect(redisServiceMock.get).toHaveBeenCalledWith('my_key');
    expect(fetcher).toHaveBeenCalled();
    expect(redisServiceMock.set).toHaveBeenCalledWith('my_key', JSON.stringify(fetchedData), 60);
  });
});
