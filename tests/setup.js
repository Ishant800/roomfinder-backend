// Test setup file
// This file runs before all tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SECRETE_KEY = 'test-secret-key';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpassword';

// Increase timeout for all tests
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global test utilities
global.mockUser = {
  id: 'mockUserId123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user'
};

global.mockAdmin = {
  id: 'mockAdminId123',
  username: 'adminuser',
  email: 'admin@example.com',
  role: 'admin'
};

// Mock JWT token for testing
global.mockToken = 'mockJWTToken123';
global.mockAdminToken = 'mockAdminJWTToken123';
