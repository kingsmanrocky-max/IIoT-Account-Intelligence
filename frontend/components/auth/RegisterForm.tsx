'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      const { confirmPassword, ...registerData } = data;
      const response = await authAPI.register(registerData);
      const { token, user } = response.data.data;
      login(token, user);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="rounded-card border border-meraki-gray-200 bg-white p-8 shadow-card">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-meraki-blue to-meraki-blue-dark mb-4">
            <span className="text-white font-bold text-xl">II</span>
          </div>
          <h2 className="text-2xl font-semibold text-meraki-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-meraki-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-meraki-blue hover:text-meraki-blue-dark">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                  First name
                </label>
                <input
                  {...register('firstName')}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                  Last name
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="new-password"
                className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Confirm password
              </label>
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 rounded border-meraki-gray-300 text-meraki-blue focus:ring-2 focus:ring-meraki-blue focus:ring-offset-0"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-meraki-gray-700">
              I agree to the{' '}
              <a href="#" className="font-medium text-meraki-blue hover:text-meraki-blue-dark">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-meraki-blue hover:text-meraki-blue-dark">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-input bg-meraki-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-meraki-blue-dark focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
