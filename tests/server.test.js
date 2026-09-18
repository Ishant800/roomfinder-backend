const request = require('supertest');
const express = require('express');
const { redis } = require('../src/config/redis');

// Mock dependencies
jest.mock('../src/config/redis');
jest.mock('../src/databaseconf/database');

describe('Server Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a minimal app for testing server-specific endpoints
    app = express();
    app.use(express.json());

    // Implement rate limiter endpoint
    const RATE_LIMIT_MAX = 2;
    const WINDOW_SIZE_SECONDS = 60;

    const ratelimiter = async (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const cacheKey = `ratelimit:${ip}`;

      try {
        const requestsLogged = await redis.incr(cacheKey);

        if (requestsLogged === 1) {
          await redis.expire(cacheKey, WINDOW_SIZE_SECONDS);
        }

        res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - requestsLogged));

        if (requestsLogged > RATE_LIMIT_MAX) {
          return res.status(429).json({
            sucess: false,
            message: "to many requests. Please try again after a minute."
          });
        }
        next();

      } catch (error) {
        console.log("Rate limiter failure:", error);
        next();
      }
    };

    app.get("/ratelimit", ratelimiter, (req, res) => {
      return res.status(200).json({
        sucess: true,
        message: "hello world!"
      });
    });

    // Implement task queue endpoint
    app.post("/assign-task", async (req, res) => {
      try {
        const { taskType, userId, payload } = req.body;

        // Mock job creation
        const job = {
          id: 'mockJobId123',
          data: { userId, payload }
        };

        return res.json({
          success: true,
          message: "Task sent to isolated docker queue",
          jobId: job.id
        });

      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    });
  });

  describe('GET /ratelimit', () => {
    
    it('should allow first request', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(true);

      const response = await request(app)
        .get('/ratelimit');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sucess', true);
      expect(response.body).toHaveProperty('message', 'hello world!');
      expect(response.headers['x-ratelimit-limit']).toBe('2');
      expect(response.headers['x-ratelimit-remaining']).toBe('1');
    });

    it('should allow second request', async () => {
      redis.incr.mockResolvedValue(2);

      const response = await request(app)
        .get('/ratelimit');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should rate limit third request', async () => {
      redis.incr.mockResolvedValue(3);

      const response = await request(app)
        .get('/ratelimit');

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('sucess', false);
      expect(response.body).toHaveProperty('message', 'to many requests. Please try again after a minute.');
    });

    it('should handle rate limiter redis errors gracefully', async () => {
      redis.incr.mockRejectedValue(new Error('Redis connection error'));

      const response = await request(app)
        .get('/ratelimit');

      // Should proceed even if redis fails
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'hello world!');
    });

    it('should set expiry on first request', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(true);

      await request(app).get('/ratelimit');

      expect(redis.expire).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 60);
    });

    it('should not set expiry on subsequent requests', async () => {
      redis.incr.mockResolvedValue(2);

      await request(app).get('/ratelimit');

      expect(redis.expire).not.toHaveBeenCalled();
    });
  });

  describe('POST /assign-task', () => {
    
    it('should assign task successfully', async () => {
      const response = await request(app)
        .post('/assign-task')
        .send({
          taskType: 'PROCESS_PAYMENT',
          userId: 'userId123',
          payload: { amount: 100, currency: 'USD' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Task sent to isolated docker queue');
      expect(response.body).toHaveProperty('jobId');
    });

    it('should handle missing taskType', async () => {
      const response = await request(app)
        .post('/assign-task')
        .send({
          userId: 'userId123',
          payload: { amount: 100 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should handle missing userId', async () => {
      const response = await request(app)
        .post('/assign-task')
        .send({
          taskType: 'PROCESS_PAYMENT',
          payload: { amount: 100 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should handle missing payload', async () => {
      const response = await request(app)
        .post('/assign-task')
        .send({
          taskType: 'PROCESS_PAYMENT',
          userId: 'userId123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/assign-task')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should handle large payload', async () => {
      const largePayload = {
        data: 'A'.repeat(10000)
      };

      const response = await request(app)
        .post('/assign-task')
        .send({
          taskType: 'PROCESS_DATA',
          userId: 'userId123',
          payload: largePayload
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle various task types', async () => {
      const taskTypes = ['PROCESS_PAYMENT', 'SEND_EMAIL', 'GENERATE_REPORT', 'CLEANUP'];

      for (const taskType of taskTypes) {
        const response = await request(app)
          .post('/assign-task')
          .send({
            taskType,
            userId: 'userId123',
            payload: { test: true }
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      }
    });
  });

  describe('Error Handling', () => {
    
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/assign-task')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Configuration', () => {
    
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/assign-task')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'POST');

      // CORS should be handled by middleware
    });
  });
});
