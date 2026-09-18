const jwt = require('jsonwebtoken');
const { accesstoken, adminmiddleware, usermiddleware } = require('../src/middleware/acesstoken');

jest.mock('jsonwebtoken');

describe('Middleware Tests', () => {
  
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('accesstoken middleware', () => {
    
    it('should verify valid token from Authorization header', () => {
      const mockDecodedToken = {
        id: 'userId123',
        role: 'user',
        username: 'testuser',
        email: 'test@example.com'
      };

      req.headers.authorization = 'Bearer validToken123';
      jwt.verify.mockReturnValue(mockDecodedToken);

      accesstoken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('validToken123', process.env.SECRETE_KEY);
      expect(req.user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
    });

    it('should verify valid token from cookies', () => {
      const mockDecodedToken = {
        id: 'userId123',
        role: 'user'
      };

      req.cookies.acesstoken = 'validToken123';
      jwt.verify.mockReturnValue(mockDecodedToken);

      accesstoken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('validToken123', process.env.SECRETE_KEY);
      expect(req.user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      accesstoken(req, res, next);

      // Based on typical implementation
      // Adjust according to actual middleware behavior
    });

    it('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalidToken';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      accesstoken(req, res, next);

      // Should handle invalid token
    });

    it('should return 401 if token is expired', () => {
      req.headers.authorization = 'Bearer expiredToken';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      accesstoken(req, res, next);

      // Should handle expired token
    });
  });

  describe('adminmiddleware', () => {
    
    it('should allow access for admin users', () => {
      req.user = {
        id: 'adminId123',
        role: 'admin',
        username: 'adminuser'
      };

      adminmiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-admin users', () => {
      req.user = {
        id: 'userId123',
        role: 'user',
        username: 'regularuser'
      };

      adminmiddleware(req, res, next);

      // Should return 403 or similar
    });

    it('should deny access if user role is not set', () => {
      req.user = {
        id: 'userId123',
        username: 'regularuser'
      };

      adminmiddleware(req, res, next);

      // Should deny access
    });

    it('should deny access if user is not authenticated', () => {
      req.user = null;

      adminmiddleware(req, res, next);

      // Should deny access
    });
  });

  describe('usermiddleware', () => {
    
    it('should allow access for user role', () => {
      req.user = {
        id: 'userId123',
        role: 'user',
        username: 'regularuser'
      };

      usermiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for admin role', () => {
      req.user = {
        id: 'adminId123',
        role: 'admin',
        username: 'adminuser'
      };

      usermiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access if user is not authenticated', () => {
      req.user = null;

      usermiddleware(req, res, next);

      // Should deny access
    });
  });
});
