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
  Sparkles,
  AlertCircle,
  Plus,
  RefreshCw,
  History,
  Check,
  Building,
  User
} from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-slate-500 font-medium">Loading your career dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900">Dashboard Loading Error</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const profileResume = data?.profileResumeOverview || {
    hasResume: false,
    totalResumes: 0,
    latestResumeTitle: null,
    latestResumeOriginalFilename: null,
    latestResumeUpdatedAt: null,
    latestVersionName: null,
    profileName: null,
    profileCompletenessPercentage: 0,
    userSkillsCount: 0
  };

  const appSummary = data?.applicationSummary || {
    total: 0,
    saved: 0,
    applied: 0,
    assessment: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0
  };

  const ats = data?.atsOverview || {
    totalAnalyses: 0,
    latestScore: null,
    avgScore: null,
    recentAnalyses: []
  };

  const outreach = data?.outreachSummary || {
    total: 0,
    draft: 0,
    readyToSend: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    isProviderConfigured: false
  };

  const recentApplications = data?.recentApplications || [];
  const recentActivities = data?.recentActivity || [];

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-7 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>JobGateway Live Data Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back{profileResume.profileName ? `, ${profileResume.profileName}` : ''}!
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
            Your centralized job search overview: actual resume status, real tracked applications, verified ATS scores, and honest outreach dispatch metrics.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 4 Primary Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tracked Applications</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{appSummary.total}</h3>
            <span className="text-xs text-indigo-600 font-medium flex items-center mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {appSummary.total === 0 ? 'No applications yet' : `${appSummary.applied} active / applied`}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Kanban className="w-6 h-6" />
          </div>
        </div>

        {/* ATS Score Card - Strictly No Fake Score */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest ATS Match</p>
            {ats.latestScore !== null ? (
              <>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{ats.latestScore}%</h3>
                <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  {ats.totalAnalyses} analysis {ats.totalAnalyses === 1 ? 'record' : 'records'}
                </span>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-400 mt-1.5">No analyses</h3>
                <Link href="/ats-analyzer" className="text-xs text-indigo-600 hover:underline font-medium block mt-1">
                  Run first match →
                </Link>
              </>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Outreach Summary Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outreach Pitches</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{outreach.total}</h3>
            <span className="text-xs text-purple-600 font-medium flex items-center mt-1">
              <Send className="w-3.5 h-3.5 mr-1" />
              {outreach.sent > 0
                ? `${outreach.sent} confirmed sent`
                : `${outreach.draft} drafts saved`}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Interviews & Pipeline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interviews & Offers</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
              {appSummary.interview + appSummary.offer}
            </h3>
            <span className="text-xs text-amber-600 font-medium flex items-center mt-1">
              <Award className="w-3.5 h-3.5 mr-1" />
              {appSummary.offer > 0 ? `${appSummary.offer} offer received` : `${appSummary.interview} in interview stage`}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2-Column Section: Resume Overview & Application Tracker Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Resume / Profile Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-base text-slate-900">1. Resume & Profile Overview</h2>
            </div>
            <Link href="/resume" className="text-xs font-semibold text-indigo-600 hover:underline">
              Manage Resumes →
            </Link>
          </div>

          {profileResume.hasResume ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Primary Resume:</span>
                  <span className="font-bold text-slate-900">{profileResume.latestResumeTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Original File:</span>
                  <span className="text-slate-700 font-mono">{profileResume.latestResumeOriginalFilename}</span>
                </div>
                {profileResume.latestResumeUpdatedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Last Updated:</span>
                    <span className="text-slate-700">
                      {new Date(profileResume.latestResumeUpdatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {profileResume.latestVersionName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Latest Optimized Version:</span>
                    <span className="text-indigo-600 font-semibold">{profileResume.latestVersionName}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-600 font-medium">Profile Completeness:</span>
                <span className="font-bold text-indigo-600">{profileResume.profileCompletenessPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${profileResume.profileCompletenessPercentage}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Skills Listed in Profile:</span>
                <span className="font-bold text-slate-800">{profileResume.userSkillsCount} skills</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/resume/builder"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Resume Builder</span>
                </Link>
                <Link
                  href="/resume/builder"
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  View Resume →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-500">
                <strong className="block text-slate-700 font-semibold mb-0.5">No resume uploaded yet</strong>
                Upload your resume to unlock fact-grounded outreach and ATS analysis.
              </div>
              <Link
                href="/resume/builder"
                className="inline-block px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                Upload / Build Resume
              </Link>
            </div>
          )}
        </div>

        {/* 2. Application Tracker Lifecycle Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Kanban className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-base text-slate-900">2. Application Lifecycle Overview</h2>
            </div>
            <Link href="/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
              Application Tracker →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Saved</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{appSummary.saved}</span>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-600 uppercase block">Applied</span>
              <span className="text-xl font-bold text-blue-800 mt-1 block">{appSummary.applied}</span>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-600 uppercase block">Assessment</span>
              <span className="text-xl font-bold text-amber-800 mt-1 block">{appSummary.assessment}</span>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200">
              <span className="text-[11px] font-semibold text-purple-600 uppercase block">Interview</span>
              <span className="text-xl font-bold text-purple-800 mt-1 block">{appSummary.interview}</span>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase block">Offer</span>
              <span className="text-xl font-bold text-emerald-800 mt-1 block">{appSummary.offer}</span>
            </div>
            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-600 uppercase block">Rejected</span>
              <span className="text-xl font-bold text-rose-800 mt-1 block">{appSummary.rejected}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase block">Withdrawn</span>
              <span className="text-xl font-bold text-gray-700 mt-1 block">{appSummary.withdrawn}</span>
            </div>
            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase block">Total</span>
              <span className="text-xl font-bold text-indigo-800 mt-1 block">{appSummary.total}</span>
            </div>
          </div>

          {appSummary.total === 0 && (
            <div className="text-center py-3 text-xs text-slate-500">
              No applications tracked yet.
              <Link href="/applications" className="text-indigo-600 hover:underline font-semibold ml-1">
                + Add your first opportunity
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Section: ATS Overview & Outreach Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. ATS Analysis Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-base text-slate-900">3. ATS Match Overview</h2>
            </div>
            <Link href="/ats-analyzer" className="text-xs font-semibold text-indigo-600 hover:underline">
              Analyze Job Match →
            </Link>
          </div>

          {ats.totalAnalyses > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
                <div>
                  <span className="text-emerald-700 font-semibold block">Average Match Score</span>
                  <span className="text-2xl font-extrabold text-emerald-900">{ats.avgScore}%</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 font-semibold block">Total Analyses</span>
                  <span className="text-2xl font-extrabold text-emerald-900">{ats.totalAnalyses}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Job Matches</h4>
                <div className="space-y-2">
                  {ats.recentAnalyses.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{item.jobTitle}</span>
                        <span className="text-[11px] text-slate-500">{item.company || 'Target Company'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-emerald-700 block">{item.atsScore}%</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Target className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-500">
                <strong className="block text-slate-700 font-semibold mb-0.5">No ATS analyses yet.</strong>
                Compare your resume keywords against any job description to evaluate ATS match.
              </div>
              <Link
                href="/ats-analyzer"
                className="inline-block px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
              >
                Run ATS Analyzer
              </Link>
            </div>
          )}
        </div>

        {/* 4. Outreach Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-base text-slate-900">4. Outreach & Recruiter Contact</h2>
            </div>
            <Link href="/outreach" className="text-xs font-semibold text-indigo-600 hover:underline">
              Outreach Engine →
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {/* Honest Provider Status */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                outreach.isProviderConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span className="font-semibold">
                  {outreach.isProviderConfigured ? 'Email Provider: Live SMTP Active' : 'Email Provider: Draft-Only Mode'}
                </span>
              </div>
              <span className="text-[11px] font-bold">
                {outreach.isProviderConfigured ? 'Live Sending' : 'No Live SMTP'}
              </span>
            </div>

            {/* Counts Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Drafts</span>
                <span className="text-lg font-bold text-slate-800">{outreach.draft}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-blue-600 block">Ready</span>
                <span className="text-lg font-bold text-blue-800">{outreach.readyToSend}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Sent</span>
                <span className="text-lg font-bold text-emerald-800">{outreach.sent}</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-rose-600 block">Failed</span>
                <span className="text-lg font-bold text-rose-800">{outreach.failed}</span>
              </div>
            </div>

            {outreach.total === 0 ? (
              <div className="text-center py-4 text-slate-500">
                No outreach activity yet.
                <Link href="/outreach" className="text-indigo-600 hover:underline font-semibold ml-1">
                  Draft a personalized recruiter message →
                </Link>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic text-center pt-1">
                * Note: An outreach is only marked "Sent" when the configured provider confirms successful transmission.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Activity Timeline */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-900">5. Recent Activity (Verified History)</h2>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {recentActivities.length > 0 ? (
          <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-4 text-xs">
            {recentActivities.map((act: any) => (
              <div key={act.id} className="relative space-y-0.5">
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full absolute -left-[21px] top-1"></div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{act.title}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{act.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            No activity recorded yet. Start by uploading a resume or tracking your first job!
          </div>
        )}
      </div>

      {/* 6. Quick Action Navigation Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">6. Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <Link
            href="/resume"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">Analyze Resume</span>
          </Link>

          <Link
            href="/resume/builder"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Edit3 className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">Improve Resume</span>
          </Link>

          <Link
            href="/ats-analyzer"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Target className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">ATS Analyzer</span>
          </Link>

          <Link
            href="/applications"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Kanban className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">Applications</span>
          </Link>

          <Link
            href="/outreach"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Send className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">Outreach</span>
          </Link>

          <Link
            href="/jobs"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-110 transition">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 block">Job Board</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Edit3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
