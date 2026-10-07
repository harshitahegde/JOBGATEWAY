"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Kanban,
  Plus,
  Search,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  ExternalLink,
  MapPin,
  Building,
  Briefcase,
  History,
  X,
  Save,
  Filter,
  CheckSquare
} from 'lucide-react';
import { api } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SAVED: { label: 'Saved', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  APPLIED: { label: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ASSESSMENT: { label: 'Assessment', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  INTERVIEW: { label: 'Interview', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  OFFER: { label: 'Offer', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  WITHDRAWN: { label: 'Withdrawn', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' }
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    saved: 0,
    applied: 0,
    assessment: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formStatus, setFormStatus] = useState('SAVED');
  const [formAppliedDate, setFormAppliedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Details Drawer / Modal
  const [detailApp, setDetailApp] = useState<any | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [filterStatus, searchQuery]);

  const fetchApplications = async () => {
    try {
      const params: any = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/applications', { params });
      setApplications(res.data.applications || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormCompany('');
    setFormTitle('');
    setFormLocation('');
    setFormJobUrl('');
    setFormStatus('SAVED');
    setFormAppliedDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (app: any) => {
    setEditingId(app.id);
    setFormCompany(app.companyName || '');
    setFormTitle(app.jobTitle || '');
    setFormLocation(app.location || '');
    setFormJobUrl(app.jobUrl || '');
    setFormStatus(app.status?.toUpperCase() || 'SAVED');
    setFormAppliedDate(app.appliedDate || '');
    setFormNotes(app.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formTitle.trim()) {
      alert('Company Name and Job Title are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingId) {
        // Update existing application
        const res = await api.put(`/applications/${editingId}`, {
          companyName: formCompany,
          jobTitle: formTitle,
          location: formLocation,
          jobUrl: formJobUrl,
          status: formStatus,
          appliedDate: formAppliedDate || null,
          notes: formNotes
        });
        if (detailApp && detailApp.id === editingId) {
          setDetailApp(res.data.application);
        }
      } else {
        // Create new application
        await api.post('/applications', {
          companyName: formCompany,
          jobTitle: formTitle,
          location: formLocation,
          jobUrl: formJobUrl,
          status: formStatus,
          appliedDate: formAppliedDate || null,
          notes: formNotes
        });
      }

      setIsModalOpen(false);
      fetchApplications();
    } catch (err: any) {
      alert('Error saving application: ' + (err.response?.data?.error || err.message));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await api.put(`/applications/${id}`, { status: newStatus });
      fetchApplications();
      if (detailApp && detailApp.id === id) {
        setDetailApp(res.data.application);
      }
    } catch (err: any) {
      alert('Status update error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this application record?')) return;
    try {
      await api.delete(`/applications/${id}`);
      if (detailApp && detailApp.id === id) {
        setDetailApp(null);
      }
      fetchApplications();
    } catch (err: any) {
      alert('Delete error: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Kanban className="w-3.5 h-3.5 text-blue-600" />
            <span>Job Application Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Tracker</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track real job applications throughout their full lifecycle from Saved to Offer.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center justify-center space-x-2 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Track Application</span>
        </button>
      </div>

      {/* Real Database Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{summary.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Saved</span>
          <span className="text-2xl font-extrabold text-slate-700 mt-1 block">{summary.saved}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm text-center bg-blue-50/20">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">Applied</span>
          <span className="text-2xl font-extrabold text-blue-700 mt-1 block">{summary.applied}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm text-center bg-amber-50/20">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">Assessment</span>
          <span className="text-2xl font-extrabold text-amber-700 mt-1 block">{summary.assessment}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm text-center bg-purple-50/20">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">Interview</span>
          <span className="text-2xl font-extrabold text-purple-700 mt-1 block">{summary.interview}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm text-center bg-emerald-50/20">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Offer</span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{summary.offer}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm text-center bg-rose-50/20">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">Rejected</span>
          <span className="text-2xl font-extrabold text-rose-700 mt-1 block">{summary.rejected}</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, role, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : STATUS_CONFIG[st]?.label || st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <Building className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-700">No Applications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus !== 'ALL' || searchQuery
              ? 'No applications match your active filter. Try resetting your search or filter.'
              : 'You haven\'t tracked any job applications yet. Click "Track Application" to add your first real job opportunity.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition"
          >
            + Add New Application
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const currentNorm = (app.status || 'SAVED').toUpperCase();
            const config = STATUS_CONFIG[currentNorm] || STATUS_CONFIG.SAVED;

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:border-indigo-200 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => setDetailApp(app)}>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="font-bold text-base text-slate-900 hover:text-indigo-600 transition">
                      {app.jobTitle}
                    </h3>
                    <span className="text-xs font-semibold text-indigo-600">• {app.companyName}</span>
                    {app.location && (
                      <span className="text-xs text-slate-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                        {app.location}
                      </span>
                    )}
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center"
                        title="Open Job Posting"
                      >
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500">
                    {app.appliedDate && (
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Applied: {app.appliedDate}
                      </span>
                    )}
                    {app.notes && (
                      <span className="truncate max-w-md text-slate-600 italic">
                        "{app.notes}"
                      </span>
                    )}
                    {app.outreachEmails && app.outreachEmails.length > 0 && (
                      <span className="text-purple-600 font-medium flex items-center">
                        <Send className="w-3 h-3 mr-1" />
                        {app.outreachEmails.length} Outreach Pitch
                      </span>
                    )}
                  </div>
                </div>

                {/* Status selector & Action Buttons */}
                <div className="flex items-center space-x-2.5">
                  <select
                    value={currentNorm}
                    onChange={(e) => handleQuickStatusChange(app.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${config.bg} ${config.text} ${config.border}`}
                  >
                    {Object.keys(STATUS_CONFIG).map((stKey) => (
                      <option key={stKey} value={stKey}>
                        {STATUS_CONFIG[stKey].label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setDetailApp(app)}
                    title="View Timeline & Details"
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(app)}
                    title="Edit Application"
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(app.id)}
                    title="Delete Application"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingId ? 'Edit Application Record' : 'Track New Job Application'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Full Stack Engineer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Location (Optional)</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Remote / New York, NY"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Job Posting URL (Optional)</label>
                  <input
                    type="url"
                    value={formJobUrl}
                    onChange={(e) => setFormJobUrl(e.target.value)}
                    placeholder="https://company.com/careers/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Lifecycle Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {Object.keys(STATUS_CONFIG).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-slate-500 mb-1">Application Date</label>
                  <input
                    type="date"
                    value={formAppliedDate}
                    onChange={(e) => setFormAppliedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase text-slate-500 mb-1">Notes / Recruiter Contacts / Follow-up info</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Connected with engineering manager on LinkedIn; technical assessment due Friday."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{formSubmitting ? 'Saving...' : 'Save Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Status History Drawer */}
      {detailApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{detailApp.jobTitle}</h3>
                <p className="text-xs text-slate-500">{detailApp.companyName} {detailApp.location ? `• ${detailApp.location}` : ''}</p>
              </div>
              <button
                onClick={() => setDetailApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    STATUS_CONFIG[detailApp.status?.toUpperCase()]?.bg || 'bg-slate-100'
                  } ${STATUS_CONFIG[detailApp.status?.toUpperCase()]?.text || 'text-slate-700'}`}>
                    {STATUS_CONFIG[detailApp.status?.toUpperCase()]?.label || detailApp.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Application Date:</span>
                  <span className="font-semibold text-slate-800">{detailApp.appliedDate || 'Not specified'}</span>
                </div>
                {detailApp.jobUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Job Posting:</span>
                    <a
                      href={detailApp.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center"
                    >
                      <span>View Listing</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                )}
                {detailApp.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Notes:</span>
                    <p className="text-slate-800 font-normal leading-relaxed">{detailApp.notes}</p>
                  </div>
                )}
              </div>

              {/* Status History Timeline */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Lifecycle History Timeline</span>
                </h4>

                {detailApp.statusHistory && detailApp.statusHistory.length > 0 ? (
                  <div className="space-y-2.5 border-l-2 border-slate-200 pl-4 ml-2">
                    {detailApp.statusHistory.map((item: any) => (
                      <div key={item.id} className="relative space-y-0.5">
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full absolute -left-[21px] top-1"></div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {item.newStatus}
                            {item.previousStatus ? ` (from ${item.previousStatus})` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {item.notes && <p className="text-slate-500 text-[11px]">{item.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No previous history transitions recorded.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <Link
                href="/outreach"
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Create Outreach Pitch for this Role</span>
              </Link>
              <button
                onClick={() => {
                  const toEdit = detailApp;
                  setDetailApp(null);
                  openEditModal(toEdit);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
