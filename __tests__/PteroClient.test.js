/**
 * PteroClient Tests
 */

const PteroClient = require('../lib/PteroClient');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('PteroClient', () => {
  let client;

  beforeEach(() => {
    client = new PteroClient('https://panel.example.com', 'test-api-key', {
      maxRetries: 2,
      retryDelay: 100,
      cacheTTL: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy status when API is reachable', async () => {
      axios.mockResolvedValue({
        data: { data: [] },
        headers: {},
      });

      const result = await client.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return unhealthy status when API is not reachable', async () => {
      axios.mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('error');
    });
  });

  describe('getServer', () => {
    it('should fetch server data', async () => {
      const mockServer = {
        attributes: {
          id: 1,
          name: 'Test Server',
        },
      };

      axios.mockResolvedValue({
        data: mockServer,
        headers: {},
      });

      const result = await client.getServer(1);

      expect(result).toEqual(mockServer);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://panel.example.com/api/application/servers/1?include=allocations,user',
          method: 'GET',
        })
      );
    });

    it('should use cached data when available', async () => {
      const mockServer = {
        attributes: { id: 1, name: 'Test Server' },
      };

      axios.mockResolvedValue({
        data: mockServer,
        headers: {},
      });

      // First call - should hit API
      await client.getServer(1);
      expect(axios).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await client.getServer(1);
      expect(axios).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when fresh=true', async () => {
      const mockServer = {
        attributes: { id: 1, name: 'Test Server' },
      };

      axios.mockResolvedValue({
        data: mockServer,
        headers: {},
      });

      await client.getServer(1);
      await client.getServer(1, true);

      expect(axios).toHaveBeenCalledTimes(2);
    });
  });

  describe('rate limiting', () => {
    it('should retry on 429 with exponential backoff', async () => {
      axios
        .mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '1' },
          },
        })
        .mockResolvedValueOnce({
          data: { data: [] },
          headers: {},
        });

      const result = await client.listServers();

      expect(result).toBeDefined();
      expect(axios).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should fail after max retries on rate limit', async () => {
      axios.mockRejectedValue({
        response: {
          status: 429,
          headers: {},
        },
      });

      await expect(client.listServers()).rejects.toThrow('Rate limit exceeded');
      expect(axios).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 10000);
  });

  describe('cache management', () => {
    it('should clear all cached data', async () => {
      const mockServer = {
        attributes: { id: 1, name: 'Test Server' },
      };

      axios.mockResolvedValue({
        data: mockServer,
        headers: {},
      });

      // Populate cache
      await client.getServer(1);
      expect(axios).toHaveBeenCalledTimes(1);

      // Clear cache
      client.clearCache();

      // Next call should hit API again
      await client.getServer(1);
      expect(axios).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information', () => {
      const info = client.getRateLimitInfo();

      expect(info).toHaveProperty('remaining');
      expect(info).toHaveProperty('reset');
    });
  });
});
