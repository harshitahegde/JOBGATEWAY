"use client";

import React, { useState } from 'react';
import { Send, Sparkles, CheckCircle, AlertCircle, Mail, Info } from 'lucide-react';
import { api } from '@/lib/api';

export default function OutreachPage() {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [recruiter, setRecruiter] = useState<any>(null);
  const [providerInfo, setProviderInfo] = useState<any>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [isMockResult, setIsMockResult] = useState<boolean | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      alert('Target Company and Job Title are required');
      return;
    }

    setGenerating(true);
    setStatusMessage('');
    setIsMockResult(null);

    try {
      const res = await api.post('/outreach/generate', {
        companyName,
        jobTitle,
        recruiterName,
        videoIntroUrl: videoUrl
      });

      setRecruiter(res.data.recruiter);
      setGeneratedEmail(res.data.email);
      setSubject(res.data.email.subject);
      setBody(res.data.email.body);
      setProviderInfo(res.data.provider || null);
    } catch (err: any) {
      alert('Email generation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!recruiter?.email) {
      alert('Recipient recruiter email missing');
      return;
    }

    setSending(true);
    setStatusMessage('');

    try {
      const res = await api.post('/outreach/send', {
        recipientEmail: recruiter.email,
        subject,
        body
      });

      setIsMockResult(res.data.isMock);
      setStatusMessage(res.data.message || (res.data.isMock ? "Demo email created successfully. No email was actually sent." : "Email sent successfully."));
    } catch (err: any) {
      alert('Send failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>LLM Recruiter Outreach Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Recruiter Outreach</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lookup recruiter credentials, generate tailored pitch emails, review/edit content, and confirm dispatch.
        </p>
      </div>

      {/* Provider Status Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Mail className="w-4 h-4 text-purple-600" />
          <span>Email Provider Mode:</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          providerInfo?.isMockMode !== false ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
        }`}>
          {providerInfo?.isMockMode !== false ? 'Demo Mode (No Real Emails Sent)' : 'Production SMTP Provider'}
        </span>
      </div>

      {/* Status Output Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 text-sm font-medium ${
          isMockResult ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {isMockResult ? (
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="font-bold">{isMockResult ? 'Demo Record Saved:' : 'Confirmation:'}</strong> {statusMessage}
          </div>
        </div>
      )}

      {/* Target Role & Recruiter Form */}
      <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Target Opportunity Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Company</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Job Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Full Stack Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Recruiter Name (Optional)</label>
            <input
              type="text"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              placeholder="e.g. Hiring Manager"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Video Intro Link (Optional)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="e.g. http://localhost:5000/uploads/videos/..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 transition"
        >
          {generating ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Cold Outreach Pitch</span>
            </>
          )}
        </button>
      </form>

      {/* Review & Confirm Outreach Card */}
      {generatedEmail && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Review & Edit Recruiter Outreach</h3>
              <p className="text-xs text-slate-500 mt-0.5">Target Recruiter: {recruiter?.name} ({recruiter?.email})</p>
            </div>
            {recruiter?.isDemo && (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                Demo Recruiter Data
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Personalized Email Body</label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Manual Confirmation Required:</strong> Emails are never sent automatically. Clicking confirm will log this outreach. In Demo Mode, no email is transmitted externally.
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
          >
            {sending ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Confirm & Send Outreach</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
