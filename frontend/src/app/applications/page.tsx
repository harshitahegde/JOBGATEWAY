"use client";

import React, { useState, useEffect } from 'react';
import { Kanban, Plus, Search, Trash2, Edit3, Clock, CheckCircle, AlertCircle, FileText, Send, Video } from 'lucide-react';
import { api } from '@/lib/api';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState('Applied');
  const [notes, setNotes] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/applications', {
        companyName,
        jobTitle,
        status,
        notes,
        appliedDate: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      setCompanyName('');
      setJobTitle('');
      setNotes('');
      fetchApplications();
    } catch (err: any) {
      alert('Creation error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/applications/${id}`, { status: newStatus });
      fetchApplications();
    } catch (err: any) {
      alert('Update status error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application record?')) return;
    try {
      await api.delete(`/applications/${id}`);
      fetchApplications();
    } catch (err: any) {
      alert('Delete error: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredApps = applications.filter(a => filterStatus === 'All' || a.status === filterStatus);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Tracker Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Centralized lifecycle tracker for all active job applications</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Application</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {['All', 'Saved', 'Applied', 'Interview', 'Selected', 'Rejected', 'Withdrawn'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Application Cards List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-bold text-base text-slate-900">{app.jobTitle}</h3>
                  <span className="text-xs font-semibold text-indigo-600">• {app.companyName}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Applied on {app.appliedDate || 'N/A'} {app.notes ? `• ${app.notes}` : ''}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status Dropdown */}
                <select
                  value={app.status}
                  onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                    app.status === 'Interview' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    app.status === 'Applied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    app.status === 'Selected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    app.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>

                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredApps.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
              No applications found for status "{filterStatus}".
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Track New Application</h3>
            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Microsoft"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Selected">Selected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Recruiter contact, interview dates, etc."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
