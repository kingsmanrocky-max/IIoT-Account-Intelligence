'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ScheduleCard from '@/components/schedules/ScheduleCard';
import ScheduleForm from '@/components/schedules/ScheduleForm';
import {
  schedulesAPI,
  Schedule,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '@/lib/api';
import { Plus, RefreshCw, Search, Clock, Filter } from 'lucide-react';

type FilterStatus = 'all' | 'active' | 'paused';

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { isActive?: boolean } = {};
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'paused') params.isActive = false;

      const response = await schedulesAPI.list(params);
      setSchedules(response.data.data || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError('Failed to load schedules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreateSchedule = async (data: CreateScheduleInput | UpdateScheduleInput) => {
    setIsSubmitting(true);
    try {
      await schedulesAPI.create(data as CreateScheduleInput);
      setShowForm(false);
      loadSchedules();
    } catch (err) {
      console.error('Failed to create schedule:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSchedule = async (data: CreateScheduleInput | UpdateScheduleInput) => {
    if (!editingSchedule) return;
    setIsSubmitting(true);
    try {
      await schedulesAPI.update(editingSchedule.id, data as UpdateScheduleInput);
      setEditingSchedule(null);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm(`Are you sure you want to delete "${schedule.name}"?`)) return;
    try {
      await schedulesAPI.delete(schedule.id);
      loadSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError('Failed to delete schedule. Please try again.');
    }
  };

  const handleActivateSchedule = async (schedule: Schedule) => {
    try {
      await schedulesAPI.activate(schedule.id);
      loadSchedules();
    } catch (err) {
      console.error('Failed to activate schedule:', err);
      setError('Failed to activate schedule. Please try again.');
    }
  };

  const handleDeactivateSchedule = async (schedule: Schedule) => {
    try {
      await schedulesAPI.deactivate(schedule.id);
      loadSchedules();
    } catch (err) {
      console.error('Failed to deactivate schedule:', err);
      setError('Failed to deactivate schedule. Please try again.');
    }
  };

  const handleTriggerSchedule = async (schedule: Schedule) => {
    if (!confirm(`Run "${schedule.name}" now?`)) return;
    try {
      const response = await schedulesAPI.trigger(schedule.id);
      // Navigate to reports page to see the new report
      router.push('/reports');
    } catch (err: any) {
      console.error('Failed to trigger schedule:', err);
      const message = err.response?.data?.error?.message || 'Failed to trigger schedule.';
      setError(message);
    }
  };

  // Filter schedules by search term
  const filteredSchedules = schedules.filter((schedule) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      schedule.name.toLowerCase().includes(search) ||
      schedule.description?.toLowerCase().includes(search) ||
      schedule.template?.name.toLowerCase().includes(search)
    );
  });

  // Count stats
  const activeCount = schedules.filter((s) => s.isActive).length;
  const pausedCount = schedules.filter((s) => !s.isActive).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">Schedules</h1>
            <p className="text-sm text-meraki-gray-500 mt-1">
              Automate recurring report generation
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Schedule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-meraki-gray-200 rounded-lg p-4">
            <p className="text-sm text-meraki-gray-500">Total Schedules</p>
            <p className="text-2xl font-semibold text-meraki-gray-900">{schedules.length}</p>
          </div>
          <div className="bg-white border border-meraki-gray-200 rounded-lg p-4">
            <p className="text-sm text-meraki-gray-500">Active</p>
            <p className="text-2xl font-semibold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white border border-meraki-gray-200 rounded-lg p-4">
            <p className="text-sm text-meraki-gray-500">Paused</p>
            <p className="text-2xl font-semibold text-meraki-gray-400">{pausedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-meraki-gray-400" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-700 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>
          <button
            onClick={loadSchedules}
            disabled={isLoading}
            className="p-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-600 hover:bg-meraki-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-meraki-blue/20 border-t-meraki-blue rounded-full animate-spin" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="bg-white border border-meraki-gray-200 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-meraki-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-meraki-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-meraki-gray-900">No schedules found</h3>
              <p className="text-sm text-meraki-gray-500 mt-1">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create a schedule to automate report generation'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
                >
                  Create Schedule
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto">
              {filteredSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={(s) => setEditingSchedule(s)}
                  onDelete={handleDeleteSchedule}
                  onActivate={handleActivateSchedule}
                  onDeactivate={handleDeactivateSchedule}
                  onTrigger={handleTriggerSchedule}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Schedule Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Create New Schedule</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <ScheduleForm
                  onSubmit={handleCreateSchedule}
                  onCancel={() => setShowForm(false)}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Schedule Modal */}
        {editingSchedule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Edit Schedule</h2>
                  <button
                    onClick={() => setEditingSchedule(null)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <ScheduleForm
                  schedule={editingSchedule}
                  onSubmit={handleUpdateSchedule}
                  onCancel={() => setEditingSchedule(null)}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
