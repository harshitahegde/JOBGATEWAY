"use client";

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, FileText, ArrowRight } from 'lucide-react';
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
          const text = `${p.summary || ''} ${(p.skills || []).join(' ')} ${JSON.stringify(p.experience || [])}`;
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
      const text = `${p.summary || ''} ${(p.skills || []).join(' ')} ${JSON.stringify(p.experience || [])}`;
      setResumeText(text.trim());
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDesc.trim()) {
      alert('Please enter a target job description');
      return;
    }
    if (!resumeText.trim()) {
      alert('Please enter or select resume text to analyze');
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
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Dynamic TF-IDF & Keyword Match Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ATS Resume Match Analyzer</h1>
        <p className="text-sm text-slate-500 mt-1">
          Calculate deterministic match scores and keyword overlap based on your actual resume and target job description.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        {/* Select Resume Source if resumes exist */}
        {resumes.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Use Uploaded Resume:</span>
            </div>
            <select
              value={selectedResumeId}
              onChange={(e) => handleSelectResume(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Custom Text Input --</option>
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
              placeholder="e.g. Acme Corp"
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
              rows={7}
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste actual resume text here..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Actual Target Job Description</label>
            <textarea
              rows={7}
              required
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste actual job description requirements here..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition"
        >
          {loading ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : (
            <>
              <Target className="w-5 h-5" />
              <span>Run Genuine ATS Analysis</span>
            </>
          )}
        </button>
      </form>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* Score Badge Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Analysis Results for</span>
              <h2 className="text-xl font-bold text-slate-900">{result.jobTitle} {result.company ? `@ ${result.company}` : ''}</h2>
              <p className="text-xs text-slate-500 mt-1">Calculated using TF-IDF Cosine Similarity & Keyword Ratio</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-4xl font-extrabold text-indigo-600">{result.atsScore}%</div>
                <div className="text-xs font-semibold text-slate-500">ATS Score</div>
              </div>
              <div className={`h-16 w-16 rounded-full flex items-center justify-center font-extrabold text-lg text-white shadow-inner ${
                result.atsScore >= 75 ? 'bg-emerald-500' : result.atsScore >= 45 ? 'bg-amber-500' : 'bg-rose-500'
              }`}>
                {result.atsScore >= 75 ? 'GREAT' : result.atsScore >= 45 ? 'FAIR' : 'WEAK'}
              </div>
            </div>
          </div>

          {/* Keywords Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Keywords */}
            <div className="bg-white rounded-xl border border-emerald-100 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center space-x-2 border-b border-emerald-100 pb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Matched Keywords ({result.matchedKeywords?.length || 0})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedKeywords?.length > 0 ? (
                  result.matchedKeywords.map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                      ✓ {kw}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No keyword overlap detected between inputs.</p>
                )}
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="bg-white rounded-xl border border-rose-100 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-rose-800 flex items-center space-x-2 border-b border-rose-100 pb-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Missing Keywords ({result.missingKeywords?.length || 0})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords?.length > 0 ? (
                  result.missingKeywords.map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
                      ✗ {kw}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No missing keywords found for this role!</p>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Actionable Recommendations</span>
            </h3>
            <ul className="space-y-2">
              {result.suggestions?.map((sug: string, i: number) => (
                <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>{sug}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
