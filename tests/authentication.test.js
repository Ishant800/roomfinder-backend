const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('../src/cloud/cloudinary', () => ({
  upload: {
    single: jest.fn(() => (req, res, next) => next()),
    array: jest.fn(() => (req, res, next) => next())
  }
}));

jest.mock('../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    on: jest.fn()
  },
  QUEUE_NAME: 'test-queue',
  SOCKET_QUEUE: 'test-socket-queue'
}));

jest.mock('../src/models/auth', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn()
  },
  UserDetails: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
}));

jest.mock('../src/models/roommodel', () => ({
  Room: {
    find: jest.fn()
  }
}));

const authroute = require('../src/route/auth');
const roomroute = require('../src/route/room');
const { User, UserDetails } = require('../src/models/auth');
const { Room } = require('../src/models/roommodel');
const { redis } = require('../src/config/redis');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authroute);
  app.use('/api/room', roomroute);
  return app;
};

describe('Authentication endpoints', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    process.env.SECRETE_KEY = 'jest-test-secret';
  });

  describe('POST /api/auth/usersignup', () => {
    it('registers a new user', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      User.create.mockResolvedValue({
        _id: 'user-id-1',
        username: 'Test User',
        email: 'test@example.com',
        role: 'user'
      });
      UserDetails.create.mockResolvedValue({ userid: 'user-id-1' });

      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'Test User',
          email: 'test@example.com',
          password: 'secret123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'User created successfully' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(User.create).toHaveBeenCalledWith({
        username: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user'
      });
      expect(UserDetails.create).toHaveBeenCalledWith({ userid: 'user-id-1' });
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({ email: 'test@example.com', password: 'secret123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'All fields are mandatory' });
      expect(User.create).not.toHaveBeenCalled();
    });

    it('returns 409 when user already exists', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing-user' });

      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'Test User',
          email: 'test@example.com',
          password: 'secret123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'User already exists' });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/userlogin', () => {
    it('logs in a valid user and returns an access token', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user-id-1',
        username: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user'
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'test@example.com',
          password: 'secret123'
        });

      expect(response.status).toBe(200);
      expect(response.body.acesstoken).toEqual(expect.any(String));
      expect(response.body.user).toEqual({
        id: 'user-id-1',
        username: 'Test User',
        email: 'test@example.com',
        role: 'user'
      });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'hashed-password');
    });

    it('returns 400 when login fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'All fields are mandatory' });
    });

    it('returns 401 for invalid credentials', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user-id-1',
        password: 'hashed-password'
      });
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'test@example.com',
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid email or password' });
    });
  });

  describe('GET /api/room/rooms', () => {
    it('returns rooms from database and caches them', async () => {
      const rooms = [
        {
          _id: 'room-id-1',
          roomtitle: 'Sunny Room',
          city: 'Kathmandu',
          room_price_monthly: 12000
        }
      ];
      redis.get.mockResolvedValue(null);
      Room.find.mockResolvedValue(rooms);
      redis.set.mockResolvedValue('OK');

      const response = await request(app).get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ rooms });
      expect(redis.get).toHaveBeenCalledWith('rooms');
      expect(Room.find).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith('rooms', JSON.stringify(rooms), 'EX', 3600);
    });

    it('returns cached rooms when available', async () => {
      const cachedRooms = [
        {
          _id: 'room-id-1',
          roomtitle: 'Cached Room',
          city: 'Pokhara',
          room_price_monthly: 10000
        }
      ];
      redis.get.mockResolvedValue(JSON.stringify(cachedRooms));

      const response = await request(app).get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ rooms: cachedRooms });
      expect(Room.find).not.toHaveBeenCalled();
    });

    it('returns an empty room list when no rooms exist', async () => {
      redis.get.mockResolvedValue(null);
      Room.find.mockResolvedValue([]);

      const response = await request(app).get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        rooms: [],
        message: 'No rooms found'
      });
      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
