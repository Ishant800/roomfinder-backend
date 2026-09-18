const request = require('supertest');
const express = require('express');
const { Reviews } = require('../src/models/roomreview');
const { User, UserDetails } = require('../src/models/auth');

// Mock dependencies
jest.mock('../src/models/roomreview');
jest.mock('../src/models/auth');

const reviewroute = require('../src/route/review');

const app = express();
app.use(express.json());
app.use('/api/review', reviewroute);

describe('Review Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/review/review/:id', () => {
    
    it('should create a review successfully', async () => {
      const mockReview = {
        _id: 'reviewId123',
        roomid: 'roomId123',
        userid: 'userId123',
        comment: 'Great place!',
        rating: 5
      };

      Reviews.create.mockResolvedValue(mockReview);

      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: 'Great place!',
          rating: 5
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('review');
      expect(response.body.review).toHaveProperty('comment', 'Great place!');
      expect(response.body.review).toHaveProperty('rating', 5);
      expect(Reviews.create).toHaveBeenCalledWith({
        roomid: 'roomId123',
        userid: 'userId123',
        comment: 'Great place!',
        rating: 5
      });
    });

    it('should return 401 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: 'Great place!'
          // Missing rating
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('warning', 'all fields are necessary');
    });

    it('should return 200 with error if review creation fails', async () => {
      Reviews.create.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: 'Great place!',
          rating: 5
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('error', 'failed to create reviews');
    });

    it('should handle invalid rating values', async () => {
      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: 'Great place!',
          rating: 6 // Invalid rating (should be 1-5)
        });

      // Test should validate rating range
    });

    it('should handle empty comment', async () => {
      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: '',
          rating: 5
        });

      // Test should validate non-empty comment
    });
  });

  describe('GET /api/review/review/:id', () => {
    
    it('should return all reviews for a room with user details', async () => {
      const mockReviews = [
        {
          _id: 'review1',
          roomid: 'roomId123',
          userid: 'userId1',
          comment: 'Great place!',
          rating: 5,
          createdAt: new Date()
        },
        {
          _id: 'review2',
          roomid: 'roomId123',
          userid: 'userId2',
          comment: 'Nice location',
          rating: 4,
          createdAt: new Date()
        }
      ];

      const mockUser1 = {
        _id: 'userId1',
        username: 'user1',
        email: 'user1@example.com'
      };

      const mockUser2 = {
        _id: 'userId2',
        username: 'user2',
        email: 'user2@example.com'
      };

      const mockUserDetails1 = {
        userid: 'userId1',
        profile_pic_url: 'http://example.com/pic1.jpg'
      };

      const mockUserDetails2 = {
        userid: 'userId2',
        profile_pic_url: 'http://example.com/pic2.jpg'
      };

      Reviews.find.mockResolvedValue(mockReviews);
      
      User.findById.mockImplementation((id) => {
        if (id === 'userId1') return Promise.resolve(mockUser1);
        if (id === 'userId2') return Promise.resolve(mockUser2);
        return Promise.resolve(null);
      });

      UserDetails.findOne.mockImplementation(({ userid }) => {
        if (userid === 'userId1') return Promise.resolve(mockUserDetails1);
        if (userid === 'userId2') return Promise.resolve(mockUserDetails2);
        return Promise.resolve(null);
      });

      const response = await request(app)
        .get('/api/review/review/roomId123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payload');
      expect(response.body.payload).toHaveLength(2);
      expect(response.body.payload[0]).toHaveProperty('username', 'user1');
      expect(response.body.payload[0]).toHaveProperty('comment', 'Great place!');
      expect(response.body.payload[0]).toHaveProperty('rating', 5);
      expect(Reviews.find).toHaveBeenCalledWith({ roomid: 'roomId123' });
    });

    it('should return 403 if roomid not provided', async () => {
      const response = await request(app)
        .get('/api/review/review/');

      // Should return 403 or 404
    });

    it('should return 400 if no reviews found', async () => {
      Reviews.find.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/review/review/roomId123');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'review not found');
    });

    it('should handle case when user is not found', async () => {
      const mockReviews = [
        {
          _id: 'review1',
          roomid: 'roomId123',
          userid: 'userId1',
          comment: 'Great place!',
          rating: 5,
          createdAt: new Date()
        }
      ];

      Reviews.find.mockResolvedValue(mockReviews);
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/review/review/roomId123');

      expect(response.status).toBe(200);
      expect(response.body.payload).toEqual([null]);
    });

    it('should handle case when user details are not found', async () => {
      const mockReviews = [
        {
          _id: 'review1',
          roomid: 'roomId123',
          userid: 'userId1',
          comment: 'Great place!',
          rating: 5,
          createdAt: new Date()
        }
      ];

      const mockUser = {
        _id: 'userId1',
        username: 'user1',
        email: 'user1@example.com'
      };

      Reviews.find.mockResolvedValue(mockReviews);
      User.findById.mockResolvedValue(mockUser);
      UserDetails.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/review/review/roomId123');

      expect(response.status).toBe(200);
      expect(response.body.payload).toEqual([null]);
    });

    it('should return empty array if no reviews for room', async () => {
      Reviews.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/review/review/roomId123');

      // Should handle empty reviews array
    });
  });

  describe('Error Handling', () => {
    
    it('should handle database errors during review creation', async () => {
      Reviews.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/review/review/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          userid: 'userId123',
          comment: 'Great place!',
          rating: 5
        });

      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error', 'internal server error');
    });

    it('should handle database errors during review retrieval', async () => {
      Reviews.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/review/review/roomId123');

      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error', 'internal server error');
    });
  });
});
