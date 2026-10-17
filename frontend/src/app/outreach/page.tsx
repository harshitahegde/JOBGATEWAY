"use client";

import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Mail,
  Copy,
  Save,
  RotateCcw,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileText,
  UserCheck,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';

type OutreachStatus = 'DRAFT' | 'READY_TO_SEND' | 'SENDING' | 'SENT' | 'FAILED';

export default function OutreachPage() {
  // Form State
  const [outreachType, setOutreachType] = useState('recruiter_outreach');
  const [tone, setTone] = useState('professional');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [videoShareWarning, setVideoShareWarning] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');

  // Dropdown data
  const [resumes, setResumes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [savedVideos, setSavedVideos] = useState<any[]>([]);

  // Generation & Draft State
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);

  // Editable Message Fields
  const [editableRecipientEmail, setEditableRecipientEmail] = useState('');
  const [editableRecipientName, setEditableRecipientName] = useState('');
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [currentStatus, setCurrentStatus] = useState<OutreachStatus>('DRAFT');
  const [groundedSkills, setGroundedSkills] = useState<string[]>([]);
  const [traceableFacts, setTraceableFacts] = useState<any>(null);

  // Status & Feedback
  const [copied, setCopied] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Real Email Provider Status from Backend
  const [providerStatus, setProviderStatus] = useState<{
    isConfigured: boolean;
    providerType: string;
    details?: any;
  }>({
    isConfigured: false,
    providerType: 'draft_only'
  });

  // History / Saved Outreach List
  const [savedOutreaches, setSavedOutreaches] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qCompany = params.get('companyName');
      const qTitle = params.get('jobTitle');
      const qDesc = params.get('jobDescription');

      if (qCompany) setCompanyName(qCompany);
      if (qTitle) setJobTitle(qTitle);
      if (qDesc) setJobDescription(qDesc);
    }
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch provider status
      const providerRes = await api.get('/outreach/provider-status');
      setProviderStatus(providerRes.data);

      // 2. Fetch resumes
      const resumeRes = await api.get('/resumes');
      const resumeList = resumeRes.data.resumes || [];
      setResumes(resumeList);
      if (resumeList.length > 0) {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const qResumeId = params?.get('resumeId');
        if (qResumeId && resumeList.some((r: any) => String(r.id) === qResumeId)) {
          setSelectedResumeId(qResumeId);
        } else {
          setSelectedResumeId(String(resumeList[0].id));
        }
      }

      // 3. Fetch applications
      const appRes = await api.get('/applications');
      setApplications(appRes.data.applications || []);

      // 4. Fetch saved videos for outreach pitch selection
      const videoRes = await api.get('/videos');
      setSavedVideos(videoRes.data.videos || []);

      // 5. Fetch user's outreach drafts/records
      fetchOutreachHistory();
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const handleVideoSelect = (vidId: string) => {
    setSelectedVideoId(vidId);
    if (!vidId) {
      setVideoUrl('');
      setVideoShareWarning(null);
      return;
    }
    const v = savedVideos.find(x => String(x.id) === vidId);
    if (v) {
      if (v.shareDetails?.isShareable && v.shareDetails?.shareUrl) {
        setVideoUrl(v.shareDetails.shareUrl);
        setVideoShareWarning(null);
      } else {
        setVideoUrl('');
        setVideoShareWarning(
          v.shareDetails?.reason ||
          'This video is stored locally on the application server. External recruiters cannot access private server paths. Before a link can be included in emails, upload this video to a supported cloud storage provider (e.g. AWS S3 or Cloudinary).'
        );
      }
    }
  };

  const fetchOutreachHistory = async () => {
    try {
      const res = await api.get('/outreach');
      setSavedOutreaches(res.data.outreachRecords || []);
    } catch (err) {
      console.warn('History fetch warning:', err);
    }
  };

  const handleApplicationSelect = (appId: string) => {
    setSelectedApplicationId(appId);
    if (!appId) return;
    const app = applications.find(a => String(a.id) === appId);
    if (app) {
      setCompanyName(app.companyName || '');
      setJobTitle(app.jobTitle || '');
      if (app.job?.description) {
        setJobDescription(app.job.description);
      }
    }
  };

  // STEP 3, 4, 5 — Fact-Grounded Message Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setStatusFeedback(null);

    try {
      const res = await api.post('/outreach/generate', {
        type: outreachType,
        tone,
        resumeId: selectedResumeId || undefined,
        applicationId: selectedApplicationId || undefined,
        companyName,
        jobTitle,
        jobDescription,
        recruiterName,
        recruiterEmail,
        videoIntroUrl: videoUrl
      });

      const generated = res.data.outreach;
      setActiveDraftId(null);
      setEditableRecipientEmail(generated.recipientEmail || recruiterEmail || '');
      setEditableRecipientName(generated.recipientName || recruiterName || '');
      setEditableSubject(generated.subject || '');
      setEditableBody(generated.body || '');
      setGroundedSkills(generated.groundedSkills || []);
      setTraceableFacts(generated.factsTraceable || null);
      setCurrentStatus('DRAFT');

      setStatusFeedback({
        type: 'info',
        title: 'Draft Generated (Fact-Grounded)',
        message: 'Draft created using verifiable facts from your resume. No information has been sent.'
      });
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        title: 'Generation Failed',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setGenerating(false);
    }
  };

  // STEP 6 — Save Draft / Ready to Send
  const handleSaveDraft = async (markReadyToSend = false) => {
    if (!editableRecipientEmail.trim()) {
      alert('Recipient Email is required to save a draft.');
      return;
    }
    if (!editableSubject.trim() || !editableBody.trim()) {
      alert('Subject and Body cannot be empty.');
      return;
    }

    setSaving(true);
    const targetStatus = markReadyToSend ? 'READY_TO_SEND' : 'DRAFT';

    try {
      if (activeDraftId) {
        // Update existing record
        const res = await api.put(`/outreach/${activeDraftId}`, {
          recipientEmail: editableRecipientEmail,
          recipientName: editableRecipientName,
          companyName,
          jobTitle,
          subject: editableSubject,
          body: editableBody,
          type: outreachType,
          status: targetStatus
        });
        setCurrentStatus(res.data.outreach.status as OutreachStatus);
        setStatusFeedback({
          type: 'success',
          title: markReadyToSend ? 'Status: Ready to Send' : 'Draft Updated',
          message: markReadyToSend
            ? 'Draft marked as Ready to Send. Review your final content below.'
            : 'Your changes have been safely saved as a Draft.'
        });
      } else {
        // Create new record
        const res = await api.post('/outreach/save-draft', {
          applicationId: selectedApplicationId || undefined,
          recipientEmail: editableRecipientEmail,
          recipientName: editableRecipientName,
          companyName,
          jobTitle,
          subject: editableSubject,
          body: editableBody,
          type: outreachType,
          status: targetStatus
        });
        setActiveDraftId(res.data.outreach.id);
        setCurrentStatus(res.data.outreach.status as OutreachStatus);
        setStatusFeedback({
          type: 'success',
          title: markReadyToSend ? 'Ready to Send' : 'Draft Saved',
          message: markReadyToSend
            ? 'Draft saved and marked Ready to Send.'
            : 'Draft saved in your outreach records.'
        });
      }
      fetchOutreachHistory();
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        title: 'Failed to Save Draft',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setSaving(false);
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    const formatted = `To: ${editableRecipientEmail}\nSubject: ${editableSubject}\n\n${editableBody}`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // STEP 7, 8, 9 — Real Send or Honest Draft Rejection
  const handleSend = async () => {
    if (!editableRecipientEmail.trim()) {
      alert('Recipient Email is required.');
      return;
    }
    if (!editableSubject.trim() || !editableBody.trim()) {
      alert('Subject and Body cannot be empty.');
      return;
    }

    // Honest Provider Check upfront
    if (!providerStatus.isConfigured) {
      setCurrentStatus('FAILED');
      setStatusFeedback({
        type: 'warning',
        title: 'Email sending is not configured',
        message:
          'Email sending is not configured. You can copy or save this draft, but JobGateway will not claim that it was sent.'
      });
      return;
    }

    setSending(true);
    setCurrentStatus('SENDING');
    setStatusFeedback({
      type: 'info',
      title: 'Sending in Progress',
      message: 'Connecting to configured outbound email provider...'
    });

    try {
      const res = await api.post('/outreach/send', {
        id: activeDraftId || undefined,
        applicationId: selectedApplicationId || undefined,
        recipientEmail: editableRecipientEmail,
        recipientName: editableRecipientName,
        companyName,
        jobTitle,
        subject: editableSubject,
        body: editableBody,
        resumeId: selectedResumeId || undefined
      });

      if (res.data.status === 'SENT') {
        setCurrentStatus('SENT');
        setStatusFeedback({
          type: 'success',
          title: 'Confirmed: Email Sent',
          message: `The configured email provider accepted and sent the message (Message ID: ${res.data.providerMessageId || 'N/A'}).`
        });
      } else {
        setCurrentStatus('FAILED');
        setStatusFeedback({
          type: 'error',
          title: 'Sending Failed',
          message: res.data.error || 'Provider rejected request.'
        });
      }
      fetchOutreachHistory();
    } catch (err: any) {
      setCurrentStatus('FAILED');
      const errMsg = err.response?.data?.error || err.message;
      setStatusFeedback({
        type: 'error',
        title: 'Sending Failed',
        message: errMsg
      });
      fetchOutreachHistory();
    } finally {
      setSending(false);
    }
  };

  // Load draft from history
  const handleLoadDraft = (record: any) => {
    setActiveDraftId(record.id);
    setEditableRecipientEmail(record.recipientEmail || '');
    setEditableRecipientName(record.recipientName || '');
    setEditableSubject(record.subject || '');
    setEditableBody(record.body || '');
    setCompanyName(record.companyName || '');
    setJobTitle(record.jobTitle || '');
    setOutreachType(record.type || 'recruiter_outreach');
    setCurrentStatus((record.status as OutreachStatus) || 'DRAFT');
    setStatusFeedback({
      type: 'info',
      title: `Loaded Record #${record.id}`,
      message: `Status: ${record.status}`
    });
  };

  // Render Status Badge
  const renderStatusBadge = (status: OutreachStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Draft — Not Sent
          </span>
        );
      case 'READY_TO_SEND':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Ready to Send
          </span>
        );
      case 'SENDING':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            Sending…
          </span>
        );
      case 'SENT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Sent
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Fact-Grounded Outreach Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Outreach & Recruiter Contact</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate professional, honest outreach messages based strictly on verifiable facts from your resume and actual job details.
        </p>
      </div>

      {/* Provider Honest Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          providerStatus.isConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center space-x-3">
          {providerStatus.isConfigured ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <Mail className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {providerStatus.isConfigured ? 'Email Provider Mode: Configured SMTP' : 'Email Provider Mode: Draft-Only Mode'}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {providerStatus.isConfigured
                ? `Ready for real dispatch via ${providerStatus.details?.host || 'SMTP'}.`
                : 'Email sending is not configured. You can copy or save this draft, but JobGateway will not claim that it was sent.'}
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            providerStatus.isConfigured
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {providerStatus.isConfigured ? 'Live Sending Available' : 'Draft Mode Only'}
        </span>
      </div>

      {/* Status Feedback Notification */}
      {statusFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-sm animate-fadeIn ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : statusFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusFeedback.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
          {statusFeedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
          {statusFeedback.type === 'warning' && <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
          {statusFeedback.type === 'info' && <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <strong className="font-bold block">{statusFeedback.title}</strong>
            <p className="mt-0.5 text-xs sm:text-sm">{statusFeedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Outreach Generator Form */}
      <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">1. Select Information & Target Opportunity</h2>
          <span className="text-xs text-slate-500 font-medium">Fact-grounded • Anti-fabrication enabled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Select Source Resume */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Source Resume (Facts Grounded Here)
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              {resumes.length === 0 ? (
                <option value="">No resumes found (Profile skills used)</option>
              ) : (
                resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.originalFilename})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Existing Application (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Link to Application (Optional)
            </label>
            <select
              value={selectedApplicationId}
              onChange={(e) => handleApplicationSelect(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- None (Enter manual details below) --</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName} — {app.jobTitle} [{app.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Outreach Type */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Outreach Type</label>
            <select
              value={outreachType}
              onChange={(e) => setOutreachType(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="recruiter_outreach">1. Recruiter Outreach / Cold Introduction</option>
              <option value="job_application">2. Job Application Message</option>
              <option value="referral_request">3. Referral Request</option>
              <option value="follow_up">4. Application Follow-up Message</option>
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Message Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="professional">Professional & Balanced</option>
              <option value="concise">Concise & Direct</option>
              <option value="enthusiastic">Enthusiastic & Interested</option>
              <option value="confident">Confident & Technical</option>
            </select>
          </div>

          {/* Target Company */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Company</label>
            <input
              type="text"
              placeholder="e.g. Acme Innovations"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Target Job Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Job Title</label>
            <input
              type="text"
              placeholder="e.g. Backend Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Recruiter Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Recruiter Name (Leave blank if unknown)
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins (Never invented if empty)"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Recruiter / Company Email */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Recipient Email (Optional at draft creation)
            </label>
            <input
              type="email"
              placeholder="e.g. hiring@acme.com"
              value={recruiterEmail}
              onChange={(e) => setRecruiterEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Target Job Description for JD Skill Grounding */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Target Job Description (Optional - used strictly to intersect verifiable skills)
          </label>
          <textarea
            rows={3}
            placeholder="Paste job description text here. The generator will only mention required skills that you ACTUALLY possess in your resume."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        {/* Video Pitch Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Attach Video Elevator Pitch (Optional)
          </label>
          <select
            value={selectedVideoId}
            onChange={(e) => handleVideoSelect(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- None (Do not include a video in this outreach) --</option>
            {savedVideos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} ({v.durationSeconds}s) — {v.shareDetails?.isShareable ? '✅ Shareable link ready' : '⚠️ Local server only'}
              </option>
            ))}
          </select>

          {videoUrl && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Verified public video URL will be included in draft: <code className="bg-emerald-100/60 px-1 py-0.5 rounded text-[11px] font-mono">{videoUrl}</code>
              </span>
            </div>
          )}

          {videoShareWarning && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px]">
                <p className="font-semibold text-amber-900">Video Storage Limitation:</p>
                <p>{videoShareWarning}</p>
              </div>
            </div>
          )}
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
              <span>Generate Fact-Grounded Outreach Draft</span>
            </>
          )}
        </button>
      </form>

      {/* STEP 6 — Review, Edit & User Control Section */}
      {(editableSubject || editableBody) && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-slate-900">2. Review, Edit & Confirm Message</h3>
                {renderStatusBadge(currentStatus)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every field is editable. You have 100% control over the final content before saving or dispatching.
              </p>
            </div>

            {/* Traceable Grounded Skills Badges */}
            {groundedSkills.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Verified Skills Mentioned:</span>
                {groundedSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs rounded-md font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Recipient Email & Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editableRecipientEmail}
                  onChange={(e) => setEditableRecipientEmail(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Recipient Name (Optional)
                </label>
                <input
                  type="text"
                  value={editableRecipientName}
                  onChange={(e) => setEditableRecipientName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Email Subject Line <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={11}
                required
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans whitespace-pre-wrap"
              />
            </div>

            {/* Resume Attachment Verification Indicator */}
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              selectedResumeId 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              {selectedResumeId ? (
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Resume Attached:</strong> {resumes.find(r => String(r.id) === selectedResumeId)?.title || 'Selected Resume'} ({resumes.find(r => String(r.id) === selectedResumeId)?.originalFilename || 'Document'})
                  </span>
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>No Resume File Attached:</strong> The draft mentions an attached resume, but no resume file is currently selected. If you send or export this message, select a resume from the dropdown above to include the actual file attachment.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveDraft(false)}
                disabled={saving}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
              >
                <Save className="w-4 h-4 text-indigo-600" />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveDraft(true)}
                disabled={saving}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Mark Ready to Send</span>
              </button>
            </div>

            {/* Honest Send Button */}
            <div>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition ${
                  providerStatus.isConfigured
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer'
                }`}
              >
                {sending ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {providerStatus.isConfigured ? 'Send via Email Provider' : 'Send (Draft Mode Only)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Outreaches / Status History */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-base text-slate-900">Your Outreach Records</h3>
          </div>
          <button
            onClick={fetchOutreachHistory}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {savedOutreaches.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No outreach drafts or records yet. Create a fact-grounded draft above!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Company / Role</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created / Sent At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedOutreaches.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {r.recipientName ? `${r.recipientName} (${r.recipientEmail})` : r.recipientEmail}
                    </td>
                    <td className="py-3 px-3">
                      {r.companyName || r.jobTitle
                        ? `${r.jobTitle || 'Role'} @ ${r.companyName || 'Target'}`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 truncate max-w-xs">{r.subject}</td>
                    <td className="py-3 px-3">{renderStatusBadge(r.status as OutreachStatus)}</td>
                    <td className="py-3 px-3">
                      {r.sentAt
                        ? new Date(r.sentAt).toLocaleString()
                        : new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleLoadDraft(r)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold text-[11px]"
                      >
                        Load / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
