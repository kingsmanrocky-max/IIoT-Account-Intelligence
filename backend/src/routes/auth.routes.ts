import { FastifyInstance } from 'fastify';
import authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export default async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.post('/register', authController.register.bind(authController));
  fastify.post('/login', authController.login.bind(authController));

  // Protected routes
  fastify.get('/me', {
    preHandler: authMiddleware,
  }, authController.getCurrentUser.bind(authController));

  fastify.post('/logout', {
    preHandler: authMiddleware,
  }, authController.logout.bind(authController));

  fastify.post('/change-password', {
    preHandler: authMiddleware,
  }, authController.changePassword.bind(authController));
}
