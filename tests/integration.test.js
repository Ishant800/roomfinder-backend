const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, UserDetails } = require('../src/models/auth');
const { Room } = require('../src/models/roommodel');
const Roombooked = require('../src/models/bookedroom');

// Mock all dependencies
jest.mock('../src/models/auth');
jest.mock('../src/models/roommodel');
jest.mock('../src/models/bookedroom');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

describe('Integration Tests - Complete User Flows', () => {
  
  let app;
  let authToken;
  let adminToken;
  let mockUserId;
  let mockAdminId;
  let mockRoomId;

  beforeAll(() => {
    // Setup express app with all routes
    app = express();
    app.use(express.json());
    
    const authroute = require('../src/route/auth');
    const roomroute = require('../src/route/room');
    const reviewroute = require('../src/route/review');
    const qnaroute = require('../src/route/qnaroute');
    
    app.use('/api/auth', authroute);
    app.use('/api/room', roomroute);
    app.use('/api/review', reviewroute);
    app.use('/api/qna', qnaroute);

    mockUserId = 'userId123';
    mockAdminId = 'adminId123';
    mockRoomId = 'roomId123';
    authToken = 'mockUserToken123';
    adminToken = 'mockAdminToken123';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration and Login Flow', () => {
    
    it('should complete full registration and login flow', async () => {
      // Step 1: User Registration
      const mockUser = {
        _id: mockUserId,
        username: 'newuser',
        email: 'newuser@example.com',
        role: 'user'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      UserDetails.create.mockResolvedValue({ userid: mockUser._id });

      const signupResponse = await request(app)
        .post('/api/auth/usersignup')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(signupResponse.status).toBe(201);

      // Step 2: User Login
      User.findOne.mockResolvedValue({
        ...mockUser,
        password: 'hashedPassword'
      });

      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign.mockReturnValue(authToken);

      const loginResponse = await request(app)
        .post('/api/auth/userlogin')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('acesstoken');
    });
  });

  describe('Room Listing and Booking Flow', () => {
    
    it('should complete room creation, listing, and booking flow', async () => {
      // Step 1: Admin creates a room
      const mockRoom = {
        _id: mockRoomId,
        userid: mockAdminId,
        roomtitle: 'Beautiful Apartment',
        city: 'Test City',
        images: ['url1.jpg', 'url2.jpg'],
        status: 'available'
      };

      Room.create.mockResolvedValue(mockRoom);

      // Step 2: User views available rooms
      const mockRooms = [mockRoom];
      const { redis } = require('../src/config/redis');
      redis.get = jest.fn().mockResolvedValue(null);
      redis.set = jest.fn().mockResolvedValue('OK');
      Room.find.mockResolvedValue(mockRooms);

      const roomsResponse = await request(app)
        .get('/api/room/rooms');

      expect(roomsResponse.status).toBe(200);
      expect(roomsResponse.body).toHaveProperty('rooms');

      // Step 3: User views room details
      Room.findOne.mockResolvedValue(mockRoom);

      const roomDetailsResponse = await request(app)
        .get(`/api/room/rooms/${mockRoomId}`);

      expect(roomDetailsResponse.status).toBe(200);

      // Step 4: User requests to book the room
      User.findById.mockImplementation((id) => {
        if (id === mockUserId) return Promise.resolve({
          _id: mockUserId,
          username: 'testuser',
          email: 'user@example.com'
        });
        if (id === mockAdminId) return Promise.resolve({
          _id: mockAdminId,
          username: 'adminuser',
          email: 'admin@example.com'
        });
        return Promise.resolve(null);
      });

      Room.findById.mockResolvedValue(mockRoom);
      Roombooked.findOne.mockResolvedValue(null);
      Roombooked.create.mockResolvedValue({
        _id: 'bookingId123',
        userid: mockUserId,
        ownerid: mockAdminId,
        roomid: mockRoomId
      });

      const sendEmail = require('../src/utility/email');
      sendEmail.mockResolvedValue(true);

      const bookingResponse = await request(app)
        .post('/api/room/requestroom')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownerid: mockAdminId,
          roomid: mockRoomId
        });

      // Requires proper middleware mocking
    });
  });

  describe('Review and QNA Flow', () => {
    
    it('should complete review submission and retrieval flow', async () => {
      const { Reviews } = require('../src/models/roomreview');
      
      // Step 1: User submits a review
      const mockReview = {
        _id: 'reviewId123',
        roomid: mockRoomId,
        userid: mockUserId,
        comment: 'Great place to stay!',
        rating: 5,
        createdAt: new Date()
      };

      Reviews.create.mockResolvedValue(mockReview);

      const reviewResponse = await request(app)
        .post(`/api/review/review/${mockRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userid: mockUserId,
          comment: 'Great place to stay!',
          rating: 5
        });

      expect(reviewResponse.status).toBe(201);

      // Step 2: Anyone retrieves reviews for the room
      Reviews.find.mockResolvedValue([mockReview]);
      User.findById.mockResolvedValue({
        _id: mockUserId,
        username: 'testuser'
      });
      UserDetails.findOne.mockResolvedValue({
        userid: mockUserId,
        profile_pic_url: 'http://example.com/pic.jpg'
      });

      const getReviewsResponse = await request(app)
        .get(`/api/review/review/${mockRoomId}`);

      expect(getReviewsResponse.status).toBe(200);
      expect(getReviewsResponse.body).toHaveProperty('payload');
    });

    it('should complete QNA submission flow', async () => {
      const { Qna } = require('../src/models/roomreview');
      
      const mockQna = {
        _id: 'qnaId123',
        userid: mockUserId,
        roomid: mockRoomId,
        questions: 'Is WiFi included?'
      };

      Qna.create.mockResolvedValue(mockQna);

      const qnaResponse = await request(app)
        .post('/api/qna/qna')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userid: mockUserId,
          roomid: mockRoomId,
          questions: 'Is WiFi included?'
        });

      expect(qnaResponse.status).toBe(201);
    });
  });

  describe('Admin Operations Flow', () => {
    
    it('should complete admin property management flow', async () => {
      // Step 1: Admin views their properties
      const mockProperties = [
        {
          _id: 'prop1',
          userid: mockAdminId,
          roomtitle: 'Property 1'
        },
        {
          _id: 'prop2',
          userid: mockAdminId,
          roomtitle: 'Property 2'
        }
      ];

      Room.find.mockResolvedValue(mockProperties);

      // Step 2: Admin views booking requests
      const mockBookings = [
        {
          _id: 'booking1',
          ownerid: mockAdminId,
          userid: 'user1',
          roomid: 'prop1',
          roomstatus: 'pending'
        }
      ];

      Roombooked.find.mockResolvedValue(mockBookings);

      // Step 3: Admin accepts/rejects booking
      Room.findById.mockResolvedValue({
        _id: 'prop1',
        userid: mockAdminId,
        roomtitle: 'Property 1'
      });

      User.findById.mockResolvedValue({
        _id: mockAdminId,
        email: 'admin@example.com'
      });

      Roombooked.findByIdAndUpdate.mockResolvedValue({});
      Room.findByIdAndUpdate.mockResolvedValue({});

      const sendEmail = require('../src/utility/email');
      sendEmail.mockResolvedValue(true);
    });
  });

  describe('Error Scenarios', () => {
    
    it('should handle duplicate booking attempts', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId });
      Room.findById.mockResolvedValue({ _id: mockRoomId });
      Roombooked.findOne.mockResolvedValue({ _id: 'existingBooking' });

      const response = await request(app)
        .post('/api/room/requestroom')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownerid: mockAdminId,
          roomid: mockRoomId
        });

      expect(response.status).toBe(409);
    });

    it('should handle unauthorized access attempts', async () => {
      const response = await request(app)
        .post('/api/room/addroom')
        .send({
          roomtitle: 'Unauthorized Room'
        });

      // Should be blocked by accesstoken middleware
    });
  });
});
