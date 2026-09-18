# Backend Test Suite

This directory contains comprehensive test cases for all API endpoints in the backend application.

## Test Structure

```
tests/
├── auth.test.js          # Authentication endpoint tests
├── room.test.js          # Room management endpoint tests
├── review.test.js        # Review endpoint tests
├── qna.test.js           # Q&A endpoint tests
├── server.test.js        # Server-specific endpoint tests (rate limiting, task queue)
├── middleware.test.js    # Middleware tests (authentication, authorization)
├── integration.test.js   # End-to-end integration tests
├── setup.js              # Test setup and configuration
└── README.md             # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test auth.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should create"
```

## Test Coverage

The test suite covers:

### Authentication Endpoints (auth.test.js)
- ✅ POST /api/auth/usersignup - User registration
- ✅ POST /api/auth/userlogin - User login
- ✅ POST /api/auth/userupdate - Profile update
- ✅ POST /api/auth/createuser - Create user
- ✅ GET /api/auth/users - Get all users
- ✅ GET /api/auth/users/:userid - Get specific user
- ✅ GET /api/auth/mydetails - Get authenticated user details

### Room Endpoints (room.test.js)
- ✅ POST /api/room/addroom - Create new room (admin only)
- ✅ PUT /api/room/updateroom/:id - Update room (admin only)
- ✅ DELETE /api/room/roomdelete/:id - Delete room (admin only)
- ✅ GET /api/room/rooms - Get all rooms (with Redis caching)
- ✅ GET /api/room/rooms/:id - Get room details (with Redis caching)
- ✅ GET /api/room/getproperties - Get owner's properties (admin only)
- ✅ POST /api/room/requestroom - Request room booking (user only)
- ✅ POST /api/room/updaterequest - Accept/reject booking (admin only)
- ✅ POST /api/room/usersbookinglist - Get owner's booking list (admin only)
- ✅ GET /api/room/customers - Get customers list (admin only)
- ✅ GET /api/room/deleterequest/:id - Delete room bookings (admin only)

### Review Endpoints (review.test.js)
- ✅ POST /api/review/review/:id - Submit review
- ✅ GET /api/review/review/:id - Get reviews for room

### Q&A Endpoints (qna.test.js)
- ✅ POST /api/qna/qna - Submit question
- ✅ GET /api/qna/qna/:id - Get Q&A for room

### Server Endpoints (server.test.js)
- ✅ GET /ratelimit - Rate limiting functionality
- ✅ POST /assign-task - Task queue assignment

### Middleware (middleware.test.js)
- ✅ accesstoken - JWT token verification
- ✅ adminmiddleware - Admin role authorization
- ✅ usermiddleware - User role authorization

### Integration Tests (integration.test.js)
- ✅ Complete user registration and login flow
- ✅ Room creation, listing, and booking flow
- ✅ Review and Q&A submission flow
- ✅ Admin operations flow
- ✅ Error scenarios and edge cases

## Test Features

### Mocking
- Database models (Mongoose)
- JWT authentication
- bcrypt password hashing
- Redis caching
- Email service
- File uploads (Cloudinary)

### Assertions
- HTTP status codes
- Response body structure
- Error messages
- Database method calls
- Email sending
- Cache hits/misses

### Test Categories
1. **Happy Path Tests** - Valid inputs, expected success
2. **Validation Tests** - Missing fields, invalid formats
3. **Error Handling Tests** - Database errors, network failures
4. **Authorization Tests** - Role-based access control
5. **Edge Cases** - Empty data, null values, large inputs

## Test Configuration

### jest.config.js
- Test environment: Node.js
- Coverage collection from `src/**/*.js`
- Test timeout: 10 seconds
- Mock cleanup after each test

### setup.js
- Environment variables for testing
- Global mock data (users, tokens)
- Console log suppression
- JWT token mocks

## Best Practices

1. **Isolation** - Each test is independent
2. **Cleanup** - Mocks are cleared between tests
3. **Naming** - Descriptive test names using "should..."
4. **Coverage** - Aim for >80% code coverage
5. **Speed** - Fast execution with proper mocking

## Common Issues

### Issue: Tests timing out
**Solution**: Increase timeout in jest.config.js or individual tests

### Issue: Module not found
**Solution**: Check mock paths and module imports

### Issue: Async test failures
**Solution**: Ensure all promises are properly awaited

### Issue: Mock not working
**Solution**: Verify mock is declared before importing module

## Adding New Tests

When adding new endpoints:

1. Create test file or add to existing file
2. Mock all external dependencies
3. Test happy path first
4. Add validation tests
5. Add error handling tests
6. Update this README

## Dependencies

```json
{
  "jest": "^29.x",
  "supertest": "^6.x"
}
```

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test
  
- name: Generate coverage
  run: npm run test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Notes

- Some tests require proper middleware mocking (accesstoken, multer)
- File upload tests need additional multer mock configuration
- Integration tests simulate complete user workflows
- Redis caching is fully mocked for predictable testing
- Email sending is mocked to prevent actual emails during tests
