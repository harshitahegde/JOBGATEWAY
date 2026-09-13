"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Upload, Sparkles, Download, CheckCircle, AlertTriangle, ArrowRight, Eye } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResumeBuilderPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  
  const [originalData, setOriginalData] = useState<any>(null);
  const [resumeData, setResumeData] = useState<any>({
    personal_info: { full_name: '', email: '', phone: '', location: '', linkedin_url: '', github_url: '' },
    summary: '',
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: []
  });

  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'optimized' | 'original'>('optimized');
  
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetJobDesc, setTargetJobDesc] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      const list = res.data.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        const primary = list[0];
        setSelectedResume(primary);
        if (primary.parsedContent) {
          setOriginalData(primary.parsedContent);
          setResumeData(primary.parsedContent);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resumes', err);
    }
  };

  const handleSelectResume = (resId: number) => {
    const found = resumes.find(r => r.id === resId);
    if (found) {
      setSelectedResume(found);
      if (found.parsedContent) {
        setOriginalData(found.parsedContent);
        setResumeData(found.parsedContent);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setMessage('');
    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Resume "${file.name}" uploaded and parsed successfully!`);
      fetchResumes();
    } catch (err: any) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleOptimize = async () => {
    if (!selectedResume) {
      alert('Please upload or select a resume first');
      return;
    }
    if (!targetJobDesc.trim()) {
      alert('Please enter a target job description to optimize against');
      return;
    }

    setOptimizing(true);
    setMessage('');
    try {
      const res = await api.post(`/resumes/${selectedResume.id}/optimize`, {
        jobDescription: targetJobDesc,
        targetJobTitle: targetJobTitle || 'Target Role'
      });

      const opt = res.data.optimizedContent;
      if (opt.optimized_content) {
        setOriginalData(opt.original_content || originalData);
        setResumeData(opt.optimized_content);
        setMatchedSkills(opt.matched_skills || []);
        setMissingKeywords(opt.missing_keywords || []);
      } else {
        setResumeData(opt);
      }
      setViewMode('optimized');
      setMessage('Resume optimized for target job role based strictly on your uploaded resume facts!');
    } catch (err: any) {
      alert('Optimization failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dataToPrint = viewMode === 'original' && originalData ? originalData : resumeData;
    const pInfo = dataToPrint.personal_info || {};

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pInfo.full_name || 'Resume'} - JobGateway</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            h1 { font-size: 24px; margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; tracking: 1px; }
            .contact { font-size: 12px; color: #475569; margin-bottom: 16px; border-bottom: 1.5px solid #0f172a; padding-bottom: 8px; }
            h2 { font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; color: #1e3a8a; margin-top: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
            p { margin: 4px 0 8px 0; }
            .skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
            .skill-item { background: #f1f5f9; color: #1e293b; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; border: 1px solid #cbd5e1; }
            .section-item { margin-bottom: 12px; }
            .item-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>${pInfo.full_name || 'Candidate Name'}</h1>
          <div class="contact">
            ${[pInfo.email, pInfo.phone, pInfo.location, pInfo.linkedin_url, pInfo.github_url].filter(Boolean).join('  •  ')}
          </div>
          ${dataToPrint.summary ? `<h2>Professional Summary</h2><p>${dataToPrint.summary}</p>` : ''}
          ${Array.isArray(dataToPrint.skills) && dataToPrint.skills.length > 0 ? `
            <h2>Technical Skills</h2>
            <div class="skills-list">
              ${dataToPrint.skills.map((s: string) => `<span class="skill-item">${s}</span>`).join('')}
            </div>
          ` : ''}
          ${Array.isArray(dataToPrint.experience) && dataToPrint.experience.length > 0 ? `
            <h2>Professional Experience</h2>
            ${dataToPrint.experience.map((e: any) => `
              <div class="section-item">
                <div class="item-header">
                  <span>${e.role || ''} ${e.company ? `- ${e.company}` : ''}</span>
                  <span>${e.duration || ''}</span>
                </div>
                <p>${e.description || ''}</p>
              </div>
            `).join('')}
          ` : ''}
          ${Array.isArray(dataToPrint.education) && dataToPrint.education.length > 0 ? `
            <h2>Education</h2>
            ${dataToPrint.education.map((ed: any) => `
              <div class="section-item">
                <div class="item-header">
                  <span>${ed.degree || ''} ${ed.institution ? `- ${ed.institution}` : ''}</span>
                  <span>${ed.year || ''}</span>
                </div>
              </div>
            `).join('')}
          ` : ''}
          ${Array.isArray(dataToPrint.projects) && dataToPrint.projects.length > 0 ? `
            <h2>Projects</h2>
            ${dataToPrint.projects.map((pr: any) => `
              <div class="section-item">
                <strong>${pr.title || ''}</strong>
                <p>${pr.description || ''}</p>
              </div>
            `).join('')}
          ` : ''}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Resume Optimizer</h1>
          <p className="text-sm text-slate-500 mt-1">Upload actual PDF/DOCX resumes, align keywords with target JDs, and export clean PDFs</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-sm flex items-center space-x-2 transition">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Parsing...' : 'Upload PDF/DOCX'}</span>
            <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleDownload}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center space-x-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Select Uploaded Resume Dropdown */}
      {resumes.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">Active Resume Source:</span>
          </div>
          <select
            value={selectedResume?.id || ''}
            onChange={(e) => handleSelectResume(Number(e.target.value))}
            className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.originalFilename} ({new Date(r.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* AI Optimization Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <Sparkles className="w-5 h-5" />
          <span>Fact-Preserving AI Keyword Alignment</span>
        </div>
        <p className="text-xs text-indigo-200">
          Paste a target Job Description below. The AI optimizer will reorder skills and rephrase summary phrasing while preserving your factual background.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Title</label>
            <input
              type="text"
              placeholder="e.g. Senior Full Stack Engineer"
              value={targetJobTitle}
              onChange={(e) => setTargetJobTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Description</label>
            <textarea
              rows={2}
              placeholder="Paste job requirements here..."
              value={targetJobDesc}
              onChange={(e) => setTargetJobDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={optimizing}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold rounded-xl text-sm shadow-md flex items-center space-x-2 transition"
        >
          {optimizing ? (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Optimize Resume for Role</span>
            </>
          )}
        </button>
      </div>

      {/* Missing Keywords Box */}
      {missingKeywords.length > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Missing Job Keywords Identified ({missingKeywords.length})</span>
          </div>
          <p className="text-xs text-amber-700">
            The target job description contains these keywords missing from your uploaded resume. <strong>Only add missing skills if you possess genuine hands-on experience with them.</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.map((kw, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold">
                + {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Original vs Optimized Switcher & Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('optimized')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'optimized' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Optimized Version
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'original' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Original Uploaded Facts
            </button>
          </div>
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Viewing: {viewMode === 'optimized' ? 'AI-Aligned Resume' : 'Original Text Extracted from PDF'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Editor */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Content Editor ({viewMode})</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={resumeData.personal_info?.full_name || ''}
                  onChange={(e) => setResumeData({
                    ...resumeData,
                    personal_info: { ...resumeData.personal_info, full_name: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Professional Summary</label>
                <textarea
                  rows={4}
                  value={resumeData.summary || ''}
                  onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Skills (Comma Separated)</label>
                <input
                  type="text"
                  value={Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : ''}
                  onChange={(e) => setResumeData({ ...resumeData, skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Clean Live Resume Display */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm space-y-6 min-h-[500px]">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-2xl font-extrabold text-slate-900">{resumeData.personal_info?.full_name || 'Candidate Name'}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {[resumeData.personal_info?.email, resumeData.personal_info?.phone, resumeData.personal_info?.location].filter(Boolean).join(' • ')}
              </p>
            </div>

            {resumeData.summary && (
              <div>
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Summary</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{resumeData.summary}</p>
              </div>
            )}

            {Array.isArray(resumeData.skills) && resumeData.skills.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Technical Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {resumeData.skills.map((sk: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-medium">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(resumeData.experience) && resumeData.experience.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Experience</h3>
                {resumeData.experience.map((exp: any, i: number) => (
                  <div key={i} className="mb-4 space-y-1 border-l-2 border-indigo-100 pl-3">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>{exp.role} {exp.company ? `@ ${exp.company}` : ''}</span>
                      <span className="text-slate-500 font-medium">{exp.duration}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(resumeData.education) && resumeData.education.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Education</h3>
                {resumeData.education.map((ed: any, i: number) => (
                  <div key={i} className="text-xs text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">{ed.degree}</span> {ed.institution ? `- ${ed.institution}` : ''} {ed.year ? `(${ed.year})` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
