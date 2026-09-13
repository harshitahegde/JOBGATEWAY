"use client";

import React, { useState, useEffect } from 'react';
import { Briefcase, Search, MapPin, Bookmark, ExternalLink, Plus, Info, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/jobs?title=${encodeURIComponent(titleQuery)}&location=${encodeURIComponent(locationQuery)}`);
      setJobs(res.data.jobs || []);
      setProviderInfo(res.data.provider || null);
    } catch (err: any) {
      console.error('Failed to search jobs', err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch job listings from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleToggleSave = async (jobId: number) => {
    try {
      const res = await api.post(`/jobs/${jobId}/save`);
      setJobs(jobs.map(j => j.id === jobId ? { ...j, isSaved: res.data.isSaved } : j));
    } catch (err: any) {
      alert('Save error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTrackApplication = async (job: any) => {
    try {
      await api.post('/applications', {
        jobId: job.id,
        companyName: job.company,
        jobTitle: job.title,
        status: 'Applied',
        appliedDate: new Date().toISOString().split('T')[0]
      });
      alert(`Application tracked for ${job.title} at ${job.company}!`);
    } catch (err: any) {
      alert('Tracking error: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Discovery Engine</h1>
        <p className="text-sm text-slate-500 mt-1">Search active positions, save postings, and track applications</p>
      </div>

      {/* Demo Mode Banner */}
      {providerInfo?.isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start space-x-3 text-sm">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Demo Mode Notice:</strong> {providerInfo.message}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Bar Form */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Job title, company, or keyword..."
            value={titleQuery}
            onChange={(e) => setTitleQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
        <div className="flex-1 relative">
          <MapPin className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Location (e.g. Remote, San Francisco)..."
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center space-x-2"
        >
          <span>Find Now</span>
        </button>
      </form>

      {/* Job Postings Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No jobs found</h3>
          <p className="text-sm text-slate-500">Try broadening your title or location filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 transition relative">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-lg text-slate-900 leading-snug">{job.title}</h3>
                      {job.isDemo && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded">
                          Demo Listing
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-indigo-600 mt-0.5">{job.company}</p>
                  </div>
                  <button
                    onClick={() => handleToggleSave(job.id)}
                    className={`p-2 rounded-lg transition ${job.isSaved ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                  >
                    <Bookmark className="w-5 h-5 fill-current" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" />{job.location}</span>
                  <span>•</span>
                  <span>{job.type}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{job.salaryRange || 'Competitive'}</span>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Skill Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.requirements?.map((req: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleTrackApplication(job)}
                  className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Track Application</span>
                </button>
                <a
                  href={job.applicationUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition"
                >
                  <span>Apply</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
