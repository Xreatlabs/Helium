/**
 * Discord Webhook Tests
 */

const { sendDiscordWebhook, createEmbed, sendNotification } = require('../lib/discordWebhook');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('Discord Webhook Module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmbed', () => {
    it('should create a basic embed with title and description', () => {
      const embed = createEmbed({
        title: 'Test Title',
        description: 'Test Description',
      });

      expect(embed).toHaveProperty('title', 'Test Title');
      expect(embed).toHaveProperty('description', 'Test Description');
      expect(embed).toHaveProperty('color');
      expect(embed).toHaveProperty('timestamp');
    });

    it('should include fields when provided', () => {
      const fields = [
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: false },
      ];

      const embed = createEmbed({
        title: 'Test',
        description: 'Test',
        fields,
      });

      expect(embed.fields).toEqual(fields);
    });

    it('should use default values when options are not provided', () => {
      const embed = createEmbed();

      expect(embed.title).toBe('Notification');
      expect(embed.description).toBe('');
      expect(embed.color).toBe(0x5865F2);
    });
  });

  describe('sendDiscordWebhook', () => {
    it('should send webhook successfully', async () => {
      axios.post.mockResolvedValue({ status: 204 });

      const result = await sendDiscordWebhook(
        'https://discord.com/api/webhooks/test',
        { content: 'Test message' }
      );

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        { content: 'Test message' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should handle rate limiting with retry', async () => {
      axios.post
        .mockRejectedValueOnce({
          response: {
            status: 429,
            data: { retry_after: 0.1 },
          },
        })
        .mockResolvedValueOnce({ status: 204 });

      const result = await sendDiscordWebhook(
        'https://discord.com/api/webhooks/test',
        { content: 'Test' }
      );

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should fail after max retries', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { retry_after: 0.01 },
        },
      });

      const result = await sendDiscordWebhook(
        'https://discord.com/api/webhooks/test',
        { content: 'Test' }
      );

      expect(result).toBe(false);
      expect(axios.post).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000);
  });

  describe('sendNotification', () => {
    it('should send a notification with embed', async () => {
      axios.post.mockResolvedValue({ status: 204 });

      const result = await sendNotification(
        'https://discord.com/api/webhooks/test',
        'Test Title',
        'Test Description',
        0xFF0000
      );

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalled();
      
      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs).toHaveProperty('embeds');
      expect(callArgs.embeds[0]).toHaveProperty('title', 'Test Title');
      expect(callArgs.embeds[0]).toHaveProperty('description', 'Test Description');
      expect(callArgs.embeds[0]).toHaveProperty('color', 0xFF0000);
    });
  });
});
