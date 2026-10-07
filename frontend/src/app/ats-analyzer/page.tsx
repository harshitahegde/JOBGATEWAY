"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, FileText, Info, HelpCircle, ShieldCheck, Layers, Award, BookOpen, Clock, Send } from 'lucide-react';
import { api } from '@/lib/api';

export default function ATSAnalyzerPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumeText, setResumeText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      const list = res.data.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        setSelectedResumeId(String(list[0].id));
        if (list[0].parsedContent) {
          const p = list[0].parsedContent;
          const text = p.raw_text || `${p.summary || ''} ${(p.skills || []).join(' ')} ${JSON.stringify(p.experience || [])}`;
          setResumeText(text.trim());
        }
      }
    } catch (err) {
      console.error('Failed to load user resumes', err);
    }
  };

  const handleSelectResume = (idStr: string) => {
    setSelectedResumeId(idStr);
    if (!idStr) return;
    const found = resumes.find(r => r.id === Number(idStr));
    if (found && found.parsedContent) {
      const p = found.parsedContent;
      const text = p.raw_text || `${p.summary || ''} ${(p.skills || []).join(' ')} ${JSON.stringify(p.experience || [])}`;
      setResumeText(text.trim());
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!jobDesc.trim()) {
      setErrorMsg('Please enter or paste the target job description.');
      return;
    }
    if (!resumeText.trim()) {
      setErrorMsg('Please enter or select resume text to analyze.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/ats/analyze', {
        resumeId: selectedResumeId ? Number(selectedResumeId) : null,
        jobTitle: jobTitle || 'Target Role',
        company: company || 'Company',
        jobDescription: jobDesc,
        resumeText
      });
      setResult(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'ATS Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Deterministic 5-Component ATS Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ATS Resume Match Analyzer</h1>
        <p className="text-sm text-slate-500 mt-1">
          Calculate reproducible ATS match scores based strictly on your actual resume and target job description facts. No random scores, no fictional skills.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Select Resume Source if resumes exist */}
        {resumes.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Select Saved Resume:</span>
            </div>
            <select
              value={selectedResumeId}
              onChange={(e) => handleSelectResume(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Manual Text Input --</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originalFilename} ({new Date(r.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Job Title</label>
            <input
              type="text"
              placeholder="e.g. Full Stack Developer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TechCorp Inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Actual Resume Content</label>
            <textarea
              rows={8}
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your actual resume text here..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Job Description</label>
            <textarea
              rows={8}
              required
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste actual target job description requirements here..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition"
        >
          {loading ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : (
            <>
              <Target className="w-5 h-5" />
              <span>Analyze ATS Match</span>
            </>
          )}
        </button>
      </form>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Score Header Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Analysis Results for</span>
              <h2 className="text-xl font-bold text-slate-900">{result.jobTitle} {result.company ? `@ ${result.company}` : ''}</h2>
              <p className="text-xs text-slate-500 mt-1">Calculated via 5-Component Weighted Formula (No LLM Numerical Fallbacks)</p>
              
              <div className="mt-3">
                <Link
                  href={`/outreach?${new URLSearchParams({
                    ...(selectedResumeId ? { resumeId: selectedResumeId } : {}),
                    ...(result.jobTitle && result.jobTitle !== 'Target Role' ? { jobTitle: result.jobTitle } : jobTitle ? { jobTitle } : {}),
                    ...(result.company && result.company !== 'Company' ? { companyName: result.company } : company ? { companyName: company } : {}),
                    ...(jobDesc ? { jobDescription: jobDesc } : {})
                  }).toString()}`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Draft Outreach for this Role</span>
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-4xl font-extrabold text-indigo-600">{result.atsScore}%</div>
                <div className="text-xs font-semibold text-slate-500">Overall ATS Score</div>
              </div>
              <div className={`h-16 w-16 rounded-full flex items-center justify-center font-extrabold text-sm text-white shadow-inner ${
                result.atsScore >= 75 ? 'bg-emerald-500' : result.atsScore >= 45 ? 'bg-amber-500' : 'bg-rose-500'
              }`}>
                {result.atsScore >= 75 ? 'GREAT' : result.atsScore >= 45 ? 'FAIR' : 'LOW'}
              </div>
            </div>
          </div>

          {/* Formula Transparency Card: "How this score is calculated" */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">How This Score is Calculated</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">100% Deterministic & Grounded</span>
            </div>

            {/* 5 Components Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Component 1: Required Skills */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Required Skills</span>
                  <span className="text-indigo-600">35%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {result.breakdown?.required_skills?.score || 0} <span className="text-xs font-normal text-slate-500">/ 35 pts</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {result.breakdown?.required_skills?.details || 'N/A'}
                </p>
              </div>

              {/* Component 2: Preferred Skills */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Preferred Skills</span>
                  <span className="text-indigo-600">15%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {result.breakdown?.preferred_skills?.score || 0} <span className="text-xs font-normal text-slate-500">/ 15 pts</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {result.breakdown?.preferred_skills?.details || 'N/A'}
                </p>
              </div>

              {/* Component 3: Keywords & Overlap */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Keywords / TF-IDF</span>
                  <span className="text-indigo-600">20%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {result.breakdown?.keywords?.score || 0} <span className="text-xs font-normal text-slate-500">/ 20 pts</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {result.breakdown?.keywords?.details || 'N/A'}
                </p>
              </div>

              {/* Component 4: Experience & Education */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Exp & Education</span>
                  <span className="text-indigo-600">15%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {result.breakdown?.experience_and_education?.score || 0} <span className="text-xs font-normal text-slate-500">/ 15 pts</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium truncate" title={result.breakdown?.experience_and_education?.experience_status}>
                  {result.breakdown?.experience_and_education?.experience_status || 'N/A'}
                </p>
              </div>

              {/* Component 5: Resume Structure */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Resume Structure</span>
                  <span className="text-indigo-600">15%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {result.breakdown?.resume_structure?.score || 0} <span className="text-xs font-normal text-slate-500">/ 15 pts</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {result.breakdown?.resume_structure?.details || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Required vs Preferred Skills Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Required Skills */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Required Skills ({result.breakdown?.required_skills?.matched_count || 0}/{result.breakdown?.required_skills?.total_count || 0})</span>
              </h3>
              
              {/* Matched Required */}
              <div>
                <div className="text-xs font-semibold text-emerald-700 uppercase mb-2">Matched Required Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.breakdown?.required_skills?.matched?.length > 0 ? (
                    result.breakdown.required_skills.matched.map((kw: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium">
                        ✓ {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              {/* Missing Required */}
              <div>
                <div className="text-xs font-semibold text-rose-700 uppercase mb-2">Missing Required Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.breakdown?.required_skills?.missing?.length > 0 ? (
                    result.breakdown.required_skills.missing.map((kw: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-medium">
                        ✗ {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">All required skills matched!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Preferred Skills ({result.breakdown?.preferred_skills?.matched_count || 0}/{result.breakdown?.preferred_skills?.total_count || 0})</span>
              </h3>

              {/* Matched Preferred */}
              <div>
                <div className="text-xs font-semibold text-indigo-700 uppercase mb-2">Matched Preferred Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.breakdown?.preferred_skills?.matched?.length > 0 ? (
                    result.breakdown.preferred_skills.matched.map((kw: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-medium">
                        ✓ {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              {/* Missing Preferred */}
              <div>
                <div className="text-xs font-semibold text-amber-700 uppercase mb-2">Missing Preferred Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.breakdown?.preferred_skills?.missing?.length > 0 ? (
                    result.breakdown.preferred_skills.missing.map((kw: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium">
                        ✗ {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No missing preferred skills</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Verification of Experience, Education & Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experience & Education Audit */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Experience & Education Verification</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Work Experience Match:</span>
                  <p className="text-slate-800 font-medium">
                    {result.breakdown?.experience_and_education?.experience_status}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Education Degree Level Match:</span>
                  <p className="text-slate-800 font-medium">
                    {result.breakdown?.experience_and_education?.education_status}
                  </p>
                </div>
              </div>
            </div>

            {/* Resume Structure & Issues */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Resume Structure & Audit</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Sections Detected:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {result.detectedSections?.length > 0 ? (
                      result.detectedSections.map((sec: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium">
                          {sec}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">None detected</span>
                    )}
                  </div>
                </div>

                {result.potentialIssues?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-amber-800">
                    <span className="font-bold uppercase text-[10px] flex items-center space-x-1 text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Potential Issues Detected:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {result.potentialIssues.map((iss: string, i: number) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Grounded Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Grounded Improvement Recommendations</span>
            </h3>
            <ul className="space-y-2">
              {result.suggestions?.length > 0 ? (
                result.suggestions.map((sug: string, i: number) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{sug}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-500">No major improvement suggestions needed. Excellent resume alignment!</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
