'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

const requestAccountSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  reason: z
    .string()
    .min(20, 'Please provide a more detailed reason (at least 20 characters)')
    .max(500, 'Reason must be less than 500 characters'),
});

type RequestAccountFormData = z.infer<typeof requestAccountSchema>;

export default function RequestAccountForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestAccountFormData>({
    resolver: zodResolver(requestAccountSchema),
  });

  const onSubmit = async (data: RequestAccountFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      await api.post('/auth/request-account', data);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Request account error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="rounded-card border border-meraki-gray-200 bg-white p-8 shadow-card text-center">
          {/* Success icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-meraki-gray-900 mb-2">Request Submitted</h2>
          <p className="text-sm text-meraki-gray-500 mb-6">
            Your account request has been submitted. An administrator will review your request and contact you via email.
          </p>
          <Link href="/login" className="font-medium text-meraki-blue hover:text-meraki-blue-dark">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="rounded-card border border-meraki-gray-200 bg-white p-8 shadow-card">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-meraki-blue to-meraki-blue-dark mb-4">
            <span className="text-white font-bold text-xl">II</span>
          </div>
          <h2 className="text-2xl font-semibold text-meraki-gray-900">Request Account Access</h2>
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
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Full name
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                autoComplete="name"
                className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>
              )}
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
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Reason for request
              </label>
              <textarea
                {...register('reason')}
                id="reason"
                rows={4}
                className="block w-full rounded-input border border-meraki-gray-300 bg-white px-3.5 py-2.5 text-sm text-meraki-gray-900 placeholder:text-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent transition-all resize-none"
                placeholder="Please explain why you need access to IIoT Account Intelligence..."
              />
              {errors.reason && (
                <p className="mt-1.5 text-xs text-red-600">{errors.reason.message}</p>
              )}
              <p className="mt-1.5 text-xs text-meraki-gray-500">
                Minimum 20 characters, maximum 500 characters
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-input bg-meraki-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-meraki-blue-dark focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Submitting request...' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}
