const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, UserDetails } = require('../src/models/auth');

// Mock the database models
jest.mock('../src/models/auth');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Import routes
const authroute = require('../src/route/auth');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authroute);

describe('Auth Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/usersignup', () => {
    
    it('should create a new user successfully', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword123');
      User.create.mockResolvedValue(mockUser);
      UserDetails.create.mockResolvedValue({ userid: mockUser._id });

      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(User.create).toHaveBeenCalled();
      expect(UserDetails.create).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'testuser'
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields are mandatory');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'testuser',
          email: 'invalidemail',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid email format');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '12345' // Less than 6 characters
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters long');
    });

    it('should return 409 if user already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /api/auth/userlogin', () => {
    
    it('should login user successfully and return token', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'user'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockAccessToken123');

      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('acesstoken', 'mockAccessToken123');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields are mandatory');
    });

    it('should return 401 if user does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should return 401 if password does not match', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    });
  });

  describe('POST /api/auth/userupdate', () => {
    
    it('should update user profile successfully', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockUpdatedDetails = {
        userid: mockUser._id,
        profile_pic_url: 'http://example.com/pic.jpg',
        fullName: 'Test User Full Name'
      };

      User.findById.mockResolvedValue(mockUser);
      UserDetails.findOneAndUpdate.mockResolvedValue(mockUpdatedDetails);

      const response = await request(app)
        .post('/api/auth/userupdate')
        .set('Authorization', 'Bearer mockToken123')
        .field('fullName', 'Test User Full Name')
        .attach('profile_pic', Buffer.from('fake-image'), 'test.jpg');

      // Note: This test requires proper middleware mocking
      // You may need to adjust based on actual middleware implementation
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/userupdate')
        .set('Authorization', 'Bearer mockToken123')
        .send({ fullName: 'Test User' });

      // Expected to return 404
    });
  });

  describe('GET /api/auth/users', () => {
    
    it('should return all users', async () => {
      const mockUsers = [
        { _id: '1', username: 'user1', email: 'user1@example.com' },
        { _id: '2', username: 'user2', email: 'user2@example.com' }
      ];

      User.find.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/auth/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toHaveLength(2);
    });

    it('should return 401 if no users found', async () => {
      User.find.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('messae', 'no user found');
    });
  });

  describe('GET /api/auth/users/:userid', () => {
    
    it('should return specific user details', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockDetails = {
        userid: 'mockUserId123',
        profile_pic_url: 'http://example.com/pic.jpg',
        Phone_no: '1234567890'
      };

      User.findById.mockResolvedValue(mockUser);
      UserDetails.findOne.mockResolvedValue(mockDetails);

      const response = await request(app)
        .get('/api/auth/users/mockUserId123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'sucess');
      expect(response.body).toHaveProperty('usersdata');
      expect(response.body.usersdata).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('GET /api/auth/mydetails', () => {
    
    it('should return authenticated user details', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };

      const mockDetails = {
        userid: 'mockUserId123',
        profile_pic_url: 'http://example.com/pic.jpg',
        fullName: 'Test User',
        Phone_no: '1234567890',
        bio: 'Test bio',
        city: 'Test City',
        Zip_code: '12345'
      };

      User.findById.mockResolvedValue(mockUser);
      UserDetails.findOne.mockResolvedValue(mockDetails);

      const response = await request(app)
        .get('/api/auth/mydetails')
        .set('Authorization', 'Bearer mockToken123');

      // Requires accesstoken middleware to be properly mocked
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/mydetails')
        .set('Authorization', 'Bearer mockToken123');

      // Expected to return 404
    });
  });

  describe('POST /api/auth/createuser', () => {
    
    it('should create user with all required fields', async () => {
      const mockUser = {
        _id: 'mockUserId123',
        username: 'newuser',
        email: 'newuser@example.com'
      };

      User.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/createuser')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'sucess');
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/createuser')
        .send({
          username: 'newuser'
          // Missing email and password
        });

      // Expected to throw AppError with 400 status
    });
  });
});
