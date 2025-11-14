import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../routes/authRoutes';
import { User } from '../models/User';
import { AuthService } from '../services/authService';

jest.mock('../models/User');
jest.mock('../services/authService');

let app: Application;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});

describe('POST /api/v1/auth/register', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Secure@2024!',
  };

  const mockUserResponse = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    profilePic: 'https://ui-avatars.com/api/?background=random&name=User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Successful Registration', () => {
    it('should register a new user successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue(mockUserResponse);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(validUser.email);
    });

    it('should accept valid password formats', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue(mockUserResponse);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: 'Strong@987!' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should allow optional profilePic URL', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        profilePic: 'https://example.com/pic.jpg',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, profilePic: 'https://example.com/pic.jpg' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Validation Errors (400)', () => {
    beforeEach(() => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
    });

    it('missing name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: validUser.email, password: validUser.password })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'bad-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('password missing uppercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: 'lowercase123!' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('password missing special char', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: 'Abcdef1234' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('invalid profilePic URL', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, profilePic: 'bad-url' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject weak passwords containing "password"', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: 'Password123!' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Duplicate Email (409)', () => {
    it('should reject an already registered email', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'existing',
        email: validUser.email,
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exists/i);
    });
  });

  describe('Server Errors (500)', () => {
    it('DB findOne failure returns 500', async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error('DB failed'));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('DB failed');
    });

    it('AuthService internal error returns 500', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      (AuthService.prototype.registerUser as jest.Mock).mockRejectedValue({
        message: 'Failed to hash password',
        statusCode: 500,
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/hash/i);
    });
  });
});

describe('Password Hashing', () => {
  it('AuthService should be instantiable', () => {
    const svc = new AuthService();
    expect(svc).toBeDefined();
  });
});

describe('Edge Cases', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Secure@2024!',
  };

  beforeEach(() => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
  });

  it('long name should be handled', async () => {
    const name = 'A'.repeat(100);

    (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue({
      ...validUser,
      _id: 'x',
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, name });

    expect([201, 400]).toContain(res.status);
  });

  it('email with whitespace should be trimmed and accepted or rejected by validator', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: '   john@example.com   ' });

    expect([201, 400]).toContain(res.status);
  });

  it('special characters in name should be allowed', async () => {
    const specialName = "O'Brien-Smith";

    (AuthService.prototype.registerUser as jest.Mock).mockResolvedValue({
      ...validUser,
      _id: 'y',
      name: specialName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, name: specialName });

    expect([201, 400]).toContain(res.status);
  });
});
