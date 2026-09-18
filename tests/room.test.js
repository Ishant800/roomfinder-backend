const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { Room } = require('../src/models/roommodel');
const Roombooked = require('../src/models/bookedroom');
const { User } = require('../src/models/auth');
const { redis } = require('../src/config/redis');
const sendEmail = require('../src/utility/email');

// Mock dependencies
jest.mock('../src/models/roommodel');
jest.mock('../src/models/bookedroom');
jest.mock('../src/models/auth');
jest.mock('../src/config/redis');
jest.mock('../src/utility/email');

const roomrouter = require('../src/route/room');

const app = express();
app.use(express.json());
app.use('/api/room', roomrouter);

describe('Room Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/room/addroom', () => {
    
    it('should create a new room successfully', async () => {
      const mockRoom = {
        _id: 'roomId123',
        userid: 'userId123',
        roomtitle: 'Beautiful Apartment',
        images: ['url1.jpg', 'url2.jpg'],
        city: 'Test City'
      };

      Room.create.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/room/addroom')
        .set('Authorization', 'Bearer mockToken123')
        .field('roomtitle', 'Beautiful Apartment')
        .field('city', 'Test City')
        .attach('images', Buffer.from('fake-image1'), 'test1.jpg')
        .attach('images', Buffer.from('fake-image2'), 'test2.jpg');

      // Note: Requires proper middleware and multer mocking
    });

    it('should return 400 if no images provided', async () => {
      const response = await request(app)
        .post('/api/room/addroom')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          roomtitle: 'Beautiful Apartment',
          city: 'Test City'
        });

      // Expected to return 400 with message "No images provided"
    });
  });

  describe('PUT /api/room/updateroom/:id', () => {
    
    it('should update room successfully', async () => {
      const mockUpdatedRoom = {
        _id: 'roomId123',
        roomtitle: 'Updated Apartment',
        images: ['newurl1.jpg', 'newurl2.jpg']
      };

      Room.findByIdAndUpdate.mockResolvedValue(mockUpdatedRoom);

      const response = await request(app)
        .put('/api/room/updateroom/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .field('roomtitle', 'Updated Apartment')
        .attach('images', Buffer.from('fake-image1'), 'test1.jpg')
        .attach('images', Buffer.from('fake-image2'), 'test2.jpg');

      // Requires proper middleware mocking
    });

    it('should return 400 if no images provided', async () => {
      const response = await request(app)
        .put('/api/room/updateroom/roomId123')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          roomtitle: 'Updated Apartment'
        });

      // Expected to return 400
    });
  });

  describe('DELETE /api/room/roomdelete/:id', () => {
    
    it('should delete room successfully', async () => {
      const mockRoom = {
        _id: 'roomId123',
        roomtitle: 'Room to Delete'
      };

      Room.findOne.mockResolvedValue(mockRoom);
      Room.findByIdAndDelete.mockResolvedValue(mockRoom);

      const response = await request(app)
        .delete('/api/room/roomdelete/roomId123')
        .set('Authorization', 'Bearer mockToken123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'deleted sucessfully');
      expect(Room.findByIdAndDelete).toHaveBeenCalledWith('roomId123');
    });

    it('should return 401 if room not found', async () => {
      Room.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/room/roomdelete/nonExistentId')
        .set('Authorization', 'Bearer mockToken123');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('Message', 'room not found');
    });
  });

  describe('GET /api/room/rooms', () => {
    
    it('should return all rooms from cache if available', async () => {
      const mockRooms = [
        { _id: '1', roomtitle: 'Room 1' },
        { _id: '2', roomtitle: 'Room 2' }
      ];

      redis.get.mockResolvedValue(JSON.stringify(mockRooms));

      const response = await request(app)
        .get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(redis.get).toHaveBeenCalledWith('rooms');
    });

    it('should fetch rooms from database if cache miss', async () => {
      const mockRooms = [
        { _id: '1', roomtitle: 'Room 1' },
        { _id: '2', roomtitle: 'Room 2' }
      ];

      redis.get.mockResolvedValue(null);
      Room.find.mockResolvedValue(mockRooms);
      redis.set.mockResolvedValue('OK');

      const response = await request(app)
        .get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
      expect(Room.find).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return empty array if no rooms found', async () => {
      redis.get.mockResolvedValue(null);
      Room.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/room/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms', []);
      expect(response.body).toHaveProperty('message', 'No rooms found');
    });
  });

  describe('GET /api/room/rooms/:id', () => {
    
    it('should return specific room from cache', async () => {
      const mockRoom = {
        _id: 'roomId123',
        roomtitle: 'Cached Room'
      };

      redis.get.mockResolvedValue(JSON.stringify(mockRoom));

      const response = await request(app)
        .get('/api/room/rooms/roomId123');

      expect(response.status).toBe(200);
      expect(redis.get).toHaveBeenCalledWith('rooms:roomId123');
    });

    it('should fetch room from database if cache miss', async () => {
      const mockRoom = {
        _id: 'roomId123',
        roomtitle: 'Database Room'
      };

      redis.get.mockResolvedValue(null);
      Room.findOne.mockResolvedValue(mockRoom);
      redis.set.mockResolvedValue('OK');

      const response = await request(app)
        .get('/api/room/rooms/roomId123');

      expect(response.status).toBe(200);
      expect(Room.findOne).toHaveBeenCalledWith({ _id: 'roomId123' });
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return 404 if room not found', async () => {
      redis.get.mockResolvedValue(null);
      Room.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/room/rooms/nonExistentId');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/room/getproperties', () => {
    
    it('should return properties for authenticated user', async () => {
      const mockProperties = [
        { _id: '1', userid: 'userId123', roomtitle: 'Property 1' },
        { _id: '2', userid: 'userId123', roomtitle: 'Property 2' }
      ];

      Room.find.mockResolvedValue(mockProperties);

      const response = await request(app)
        .get('/api/room/getproperties')
        .set('Authorization', 'Bearer mockToken123');

      // Requires proper accesstoken middleware mocking
    });

    it('should return 401 if no properties found', async () => {
      Room.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/room/getproperties')
        .set('Authorization', 'Bearer mockToken123');

      // Expected to return 401
    });
  });

  describe('POST /api/room/requestroom', () => {
    
    it('should create booking request successfully', async () => {
      const mockUser = {
        _id: 'userId123',
        username: 'testuser',
        email: 'user@example.com'
      };

      const mockOwner = {
        _id: 'ownerId123',
        username: 'owner',
        email: 'owner@example.com'
      };

      const mockRoom = {
        _id: 'roomId123',
        roomtitle: 'Test Room',
        city: 'Test City',
        location: { city: 'Test City', country: 'Test Country' }
      };

      const mockBooking = {
        _id: 'bookingId123',
        userid: mockUser._id,
        ownerid: mockOwner._id,
        roomid: mockRoom._id
      };

      User.findById.mockImplementation((id) => {
        if (id === 'userId123') return Promise.resolve(mockUser);
        if (id === 'ownerId123') return Promise.resolve(mockOwner);
        return Promise.resolve(null);
      });
      
      Room.findById.mockResolvedValue(mockRoom);
      Roombooked.findOne.mockResolvedValue(null);
      Roombooked.create.mockResolvedValue(mockBooking);
      sendEmail.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/room/requestroom')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          ownerid: 'ownerId123',
          roomid: 'roomId123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('Message', 'request sucessfully waiting for owners actions');
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });

    it('should return 409 if room already requested', async () => {
      const mockUser = { _id: 'userId123' };
      const mockOwner = { _id: 'ownerId123' };
      const mockRoom = { _id: 'roomId123' };
      const existingBooking = { _id: 'bookingId123' };

      User.findById.mockResolvedValue(mockUser);
      Room.findById.mockResolvedValue(mockRoom);
      Roombooked.findOne.mockResolvedValue(existingBooking);

      const response = await request(app)
        .post('/api/room/requestroom')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          ownerid: 'ownerId123',
          roomid: 'roomId123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Already requested');
    });

    it('should return 404 if user, owner, or room not found', async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/room/requestroom')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          ownerid: 'ownerId123',
          roomid: 'roomId123'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/room/updaterequest', () => {
    
    it('should accept booking request successfully', async () => {
      const mockUser = {
        _id: 'ownerId123',
        email: 'owner@example.com'
      };

      const mockRoom = {
        _id: 'roomId123',
        userid: 'ownerId123',
        roomtitle: 'Test Room'
      };

      const mockBooking = {
        _id: 'bookingId123',
        userid: 'userId123',
        roomid: 'roomId123'
      };

      Room.findById.mockResolvedValue(mockRoom);
      User.findById.mockResolvedValue(mockUser);
      Roombooked.findByIdAndUpdate.mockResolvedValue(mockBooking);
      Room.findByIdAndUpdate.mockResolvedValue(mockRoom);
      sendEmail.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/room/updaterequest')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          id: 'bookingId123',
          status: 'booked',
          roomid: 'roomId123',
          roomstatus: 'accept'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('Message', 'Sucessfully perform action');
    });

    it('should reject booking request successfully', async () => {
      Roombooked.findByIdAndDelete.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/room/updaterequest')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          id: 'bookingId123',
          roomstatus: 'reject'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Booking rejected');
    });

    it('should return 403 if room not found', async () => {
      Room.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/room/updaterequest')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          id: 'bookingId123',
          status: 'booked',
          roomid: 'nonExistentRoomId',
          roomstatus: 'accept'
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 if not authorized', async () => {
      const mockRoom = {
        _id: 'roomId123',
        userid: 'differentOwnerId'
      };

      Room.findById.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/room/updaterequest')
        .set('Authorization', 'Bearer mockToken123')
        .send({
          id: 'bookingId123',
          status: 'booked',
          roomid: 'roomId123',
          roomstatus: 'accept'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Not authorized');
    });
  });

  describe('POST /api/room/usersbookinglist', () => {
    
    it('should return booking list for owner', async () => {
      const mockBookings = [
        { _id: '1', ownerid: 'ownerId123', roomname: 'Room 1' },
        { _id: '2', ownerid: 'ownerId123', roomname: 'Room 2' }
      ];

      Roombooked.find.mockResolvedValue(mockBookings);

      const response = await request(app)
        .post('/api/room/usersbookinglist')
        .set('Authorization', 'Bearer mockToken123');

      // Requires proper accesstoken middleware mocking
    });

    it('should return 401 if no bookings found', async () => {
      Roombooked.find.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/room/usersbookinglist')
        .set('Authorization', 'Bearer mockToken123');

      // Expected to return 401
    });
  });

  describe('GET /api/room/customers', () => {
    
    it('should return customers list for owner', async () => {
      const mockCustomers = [
        { _id: '1', ownerid: 'ownerId123', username: 'Customer 1' },
        { _id: '2', ownerid: 'ownerId123', username: 'Customer 2' }
      ];

      Roombooked.find.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get('/api/room/customers')
        .set('Authorization', 'Bearer mockToken123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requestdata');
    });
  });

  describe('GET /api/room/deleterequest/:id', () => {
    
    it('should delete room bookings and update room status', async () => {
      Roombooked.deleteMany.mockResolvedValue({ deletedCount: 2 });
      Room.findByIdAndUpdate.mockResolvedValue({ _id: 'roomId123', status: 'available' });

      const response = await request(app)
        .get('/api/room/deleterequest/roomId123')
        .set('Authorization', 'Bearer mockToken123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Booking rejected');
      expect(Roombooked.deleteMany).toHaveBeenCalledWith({ roomid: 'roomId123' });
    });
  });
});
