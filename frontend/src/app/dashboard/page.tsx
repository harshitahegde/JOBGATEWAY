"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Target, 
  FileText, 
  Send, 
  Video, 
  Kanban, 
  CheckCircle, 
  Clock, 
  Award,
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalApplications: 0,
    savedJobsCount: 0,
    resumesCount: 0,
    avgAtsScore: 78,
    statusBreakdown: { Saved: 0, Applied: 0, Interview: 0, Selected: 0, Rejected: 0 }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Smart Job System Active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Streamline your Career Search with AI
          </h1>
          <p className="text-indigo-200 text-sm leading-relaxed">
            Optimize your resume, match job requirements using TF-IDF ATS scoring, generate recruiter outreach emails, record video self-intros, and track your applications.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applications</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalApplications}</h3>
            <span className="text-xs text-indigo-600 font-medium flex items-center mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Active Tracker
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Kanban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg ATS Score</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.avgAtsScore}%</h3>
            <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verified TF-IDF Match
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saved Jobs</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.savedJobsCount}</h3>
            <span className="text-xs text-amber-600 font-medium flex items-center mt-1">
              <Clock className="w-3.5 h-3.5 mr-1" /> Ready to Apply
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interviews Scheduled</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.statusBreakdown?.Interview || 0}</h3>
            <span className="text-xs text-purple-600 font-medium flex items-center mt-1">
              <Award className="w-3.5 h-3.5 mr-1" /> Pipeline Stage
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Six Core Modules Quick Access Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Core Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/resume/builder" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">1. AI Resume Builder</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Upload PDF/DOCX resumes, edit sections, optimize wording, and export clean PDF resume versions.
            </p>
          </Link>

          <Link href="/ats-analyzer" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition">2. ATS Score Analyzer</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Transparent TF-IDF cosine matching score, keyword gaps, and actionable improvement suggestions.
            </p>
          </Link>

          <Link href="/jobs" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition">3. Job Alert & Discovery</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Search roles, filter by skills and location, view job match ratings, and save target positions.
            </p>
          </Link>

          <Link href="/outreach" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition">4. Smart Email Outreach</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Find recruiter emails, generate personalized pitches, review emails, and send confirmed emails.
            </p>
          </Link>

          <Link href="/video" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition">5. Video Self-Introduction</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Record short video self-introductions using browser webcam, preview, and attach to outreach.
            </p>
          </Link>

          <Link href="/applications" className="group bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Kanban className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">6. Application Tracker</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Track status history (Saved, Applied, Interview, Selected, Rejected, Withdrawn) with notes.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Applications List */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Recent Applications</h3>
          <Link href="/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
            View All Applications →
          </Link>
        </div>

        {data?.recentApplications?.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.recentApplications.map((app: any) => (
              <div key={app.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{app.jobTitle}</h4>
                  <p className="text-xs text-slate-500">{app.companyName} • Applied on {app.appliedDate || 'Recent'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  app.status === 'Interview' ? 'bg-purple-100 text-purple-700' :
                  app.status === 'Applied' ? 'bg-blue-100 text-blue-700' :
                  app.status === 'Selected' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            No job applications recorded yet. Start by discovering jobs and generating outreach!
          </div>
        )}
      </div>
    </div>
  );
}
