"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Sparkles, Download, CheckCircle, AlertTriangle, 
  ShieldCheck, Layers, Lightbulb, Edit3, HelpCircle, 
  Info, Check, X, FileSearch, Zap, Save, RefreshCw, Plus, Clock, Briefcase, GraduationCap, Award, FolderGit2
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ResumeBuilderPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  
  // Versions for active resume
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  // Original unaltered parsed facts (Read-Only baseline)
  const [originalData, setOriginalData] = useState<any>(null);

  // Active editable resume state
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

  const [activeTab, setActiveTab] = useState<'analysis' | 'optimizer' | 'editor'>('analysis');
  
  // Analysis State (3 Layers + Missing Info)
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Optimization State
  const [optimizing, setOptimizing] = useState(false);
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetJobDesc, setTargetJobDesc] = useState('');
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [suggestedRewrites, setSuggestedRewrites] = useState<any[]>([]);
  const [appliedRewrites, setAppliedRewrites] = useState<number[]>([]);
  
  // View mode: 'optimized' vs 'original'
  const [viewMode, setViewMode] = useState<'optimized' | 'original'>('optimized');
  
  // Version metadata for saving
  const [versionNameInput, setVersionNameInput] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
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
        const primary = list[0];
        setSelectedResume(primary);
        if (primary.parsedContent) {
          setOriginalData(primary.parsedContent);
          setResumeData(primary.parsedContent);
          runAnalysisForResume(primary.id, primary.parsedContent);
          fetchVersionsForResume(primary.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resumes', err);
    }
  };

  const fetchVersionsForResume = async (resumeId: number) => {
    try {
      const res = await api.get(`/resumes/${resumeId}/versions`);
      const vList = res.data.versions || [];
      setVersions(vList);
      if (vList.length > 0) {
        // Load latest version by default in optimized mode
        const latest = vList[0];
        setSelectedVersion(latest);
        if (latest.content) {
          setResumeData(latest.content);
          setVersionNameInput(latest.versionName || '');
          setTargetJobTitle(latest.targetJobTitle || '');
          setTargetCompany(latest.targetCompany || '');
        }
      } else {
        setSelectedVersion(null);
      }
    } catch (err) {
      console.error('Failed to fetch versions for resume', err);
    }
  };

  const runAnalysisForResume = async (resumeId: number, contentObj: any, jobDesc: string = "") => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/resumes/${resumeId}/analyze`, {
        targetJobDescription: jobDesc
      });
      setAnalysisResult(res.data.analysis);
      if (res.data.analysis?.fact_grounded_rewrites?.bullet_rewrites) {
        setSuggestedRewrites(res.data.analysis.fact_grounded_rewrites.bullet_rewrites);
      }
    } catch (err: any) {
      console.warn('Fallback to raw analysis:', err);
      try {
        const res = await api.post('/resumes/analyze-raw', {
          resumeData: contentObj,
          targetJobDescription: jobDesc
        });
        setAnalysisResult(res.data.analysis);
      } catch (e: any) {
        setErrorMsg('Failed to complete resume quality analysis.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectResume = (resId: number) => {
    const found = resumes.find(r => r.id === resId);
    if (found) {
      setSelectedResume(found);
      setSelectedVersion(null);
      setUnsavedChanges(false);
      if (found.parsedContent) {
        setOriginalData(found.parsedContent);
        setResumeData(found.parsedContent);
        runAnalysisForResume(found.id, found.parsedContent, targetJobDesc);
        fetchVersionsForResume(found.id);
      }
    }
  };

  const handleSelectVersion = async (vId: string) => {
    if (vId === 'original') {
      setViewMode('original');
      setSelectedVersion(null);
      if (originalData) {
        setResumeData(originalData);
      }
      setUnsavedChanges(false);
      return;
    }

    const versionNum = parseInt(vId, 10);
    try {
      const res = await api.get(`/resumes/versions/${versionNum}`);
      const v = res.data.version;
      setSelectedVersion(v);
      setViewMode('optimized');
      setResumeData(v.content);
      setVersionNameInput(v.versionName || '');
      setTargetJobTitle(v.targetJobTitle || '');
      setTargetCompany(v.targetCompany || '');
      setUnsavedChanges(false);
      setMessage(`Loaded saved version: "${v.versionName}"`);
    } catch (err: any) {
      setErrorMsg('Failed to load version: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setMessage('');
    setErrorMsg(null);
    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Resume "${file.name}" uploaded and parsed successfully!`);
      const newResume = res.data.resume;
      fetchResumes();
      if (newResume && newResume.id) {
        setSelectedResume(newResume);
        setSelectedVersion(null);
        setVersions([]);
        if (newResume.parsedContent) {
          setOriginalData(newResume.parsedContent);
          setResumeData(newResume.parsedContent);
          runAnalysisForResume(newResume.id, newResume.parsedContent, targetJobDesc);
        }
      }
    } catch (err: any) {
      setErrorMsg('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRunAnalysis = () => {
    if (!selectedResume) {
      setErrorMsg('Please upload or select a resume first');
      return;
    }
    runAnalysisForResume(selectedResume.id, resumeData, targetJobDesc);
  };

  const handleOptimize = async () => {
    if (!selectedResume) {
      setErrorMsg('Please upload or select a resume first');
      return;
    }
    if (!targetJobDesc.trim()) {
      setErrorMsg('Please enter a target job description to optimize against');
      return;
    }

    setOptimizing(true);
    setMessage('');
    setErrorMsg(null);
    try {
      const res = await api.post(`/resumes/${selectedResume.id}/optimize`, {
        jobDescription: targetJobDesc,
        targetJobTitle: targetJobTitle || 'Target Role',
        targetCompany: targetCompany || ''
      });

      const opt = res.data.optimizedContent;
      const completeData = opt.optimized_content || opt;
      
      setResumeData(completeData);
      setMatchedSkills(res.data.matchedSkills || opt.matched_skills || []);
      setMissingKeywords(res.data.missingKeywords || opt.missing_keywords || []);
      setSuggestedRewrites(res.data.suggestedRewrites || opt.suggested_rewrites || []);
      
      if (res.data.version) {
        setSelectedVersion(res.data.version);
        setVersionNameInput(res.data.version.versionName);
        fetchVersionsForResume(selectedResume.id);
      }

      setViewMode('optimized');
      setUnsavedChanges(false);
      setMessage('Complete optimized resume generated and saved as a new version! You can now review, edit, and apply suggestions.');
      
      // Update quality analysis
      runAnalysisForResume(selectedResume.id, completeData, targetJobDesc);
    } catch (err: any) {
      setErrorMsg('Optimization failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setOptimizing(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!selectedResume) {
      setErrorMsg('No resume selected to save.');
      return;
    }

    setSavingVersion(true);
    setErrorMsg(null);
    setMessage('');
    try {
      const nameToSave = versionNameInput.trim() || `Optimized Version (${new Date().toLocaleDateString()})`;
      
      if (selectedVersion?.id) {
        // Update existing version
        const res = await api.put(`/resumes/versions/${selectedVersion.id}`, {
          versionName: nameToSave,
          targetJobTitle: targetJobTitle || null,
          targetCompany: targetCompany || null,
          content: resumeData
        });
        setSelectedVersion(res.data.version);
        setMessage(`Version "${nameToSave}" updated successfully!`);
      } else {
        // Create new version
        const res = await api.post(`/resumes/${selectedResume.id}/versions`, {
          versionName: nameToSave,
          targetJobTitle: targetJobTitle || null,
          targetCompany: targetCompany || null,
          content: resumeData
        });
        setSelectedVersion(res.data.version);
        setMessage(`New version "${nameToSave}" created and saved successfully!`);
      }

      setUnsavedChanges(false);
      fetchVersionsForResume(selectedResume.id);
    } catch (err: any) {
      setErrorMsg('Save failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingVersion(false);
    }
  };

  const handleApplyRewrite = (itemIndex: number, suggestedText: string) => {
    const exps = Array.isArray(resumeData.experience) ? [...resumeData.experience] : [];
    if (exps[itemIndex]) {
      exps[itemIndex] = {
        ...exps[itemIndex],
        description: suggestedText
      };
      setResumeData({ ...resumeData, experience: exps });
      if (!appliedRewrites.includes(itemIndex)) {
        setAppliedRewrites([...appliedRewrites, itemIndex]);
      }
      setUnsavedChanges(true);
      setMessage(`Applied action-verb rewrite for experience entry #${itemIndex + 1}. Click "Save Optimized Version" to persist changes.`);
    }
  };

  const handleRevertRewrite = (itemIndex: number, originalText: string) => {
    const exps = Array.isArray(resumeData.experience) ? [...resumeData.experience] : [];
    if (exps[itemIndex]) {
      exps[itemIndex] = {
        ...exps[itemIndex],
        description: originalText
      };
      setResumeData({ ...resumeData, experience: exps });
      setAppliedRewrites(appliedRewrites.filter(i => i !== itemIndex));
      setUnsavedChanges(true);
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
            @page { margin: 15mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            h1 { font-size: 22px; margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .contact { font-size: 11px; color: #475569; margin-bottom: 14px; border-bottom: 1.5px solid #0f172a; padding-bottom: 6px; }
            h2 { font-size: 13px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; color: #1e3a8a; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            p { margin: 4px 0 8px 0; }
            .skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
            .skill-item { background: #f8fafc; color: #1e293b; padding: 2px 7px; border-radius: 3px; font-size: 11px; font-weight: 600; border: 1px solid #cbd5e1; }
            .section-item { margin-bottom: 10px; }
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
                <div class="item-header">
                  <span>${pr.title || pr.name || ''}</span>
                </div>
                <p>${pr.description || ''}</p>
              </div>
            `).join('')}
          ` : ''}
          ${Array.isArray(dataToPrint.certifications) && dataToPrint.certifications.length > 0 ? `
            <h2>Certifications</h2>
            ${dataToPrint.certifications.map((c: any) => `
              <div class="section-item">
                <div class="item-header">
                  <span>${c.name || (typeof c === 'string' ? c : '')} ${c.issuer ? `- ${c.issuer}` : ''}</span>
                  <span>${c.year || ''}</span>
                </div>
              </div>
            `).join('')}
          ` : ''}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const facts = analysisResult?.extracted_facts;
  const audit = analysisResult?.quality_audit;
  const rewrites = analysisResult?.fact_grounded_rewrites;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fact-Grounded Resume Builder & Optimizer</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resume Builder & Optimization</h1>
          <p className="text-sm text-slate-500 mt-1">
            Perform 3-layer factual audit, optimize for target job descriptions, save distinct versions, and print/export clean resumes.
          </p>
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
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Resume & Version Management Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* 1. Select Active Resume Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Active Resume Source</span>
            </label>
            <select
              value={selectedResume?.id || ''}
              onChange={(e) => handleSelectResume(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originalFilename} ({new Date(r.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Saved Optimized Version */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Resume Version / Mode</span>
            </label>
            <select
              value={viewMode === 'original' ? 'original' : (selectedVersion?.id ? String(selectedVersion.id) : 'original')}
              onChange={(e) => handleSelectVersion(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="original">Original Uploaded Resume (Read-Only Baseline)</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  ⭐ {v.versionName} ({new Date(v.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded font-bold uppercase text-[10px] ${
              viewMode === 'optimized' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {viewMode === 'optimized' ? 'Editing Optimized Version' : 'Viewing Original Facts'}
            </span>
            {selectedVersion && (
              <span className="text-slate-600 font-medium">
                Active Version: <strong className="text-slate-900">{selectedVersion.versionName}</strong>
              </span>
            )}
            {unsavedChanges && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] animate-pulse">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1"
            >
              <FileSearch className="w-3.5 h-3.5 text-indigo-600" />
              <span>{analyzing ? 'Auditing...' : 'Re-Audit Quality'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center space-x-4">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3-Layer Quality Audit & Rewrites</span>
        </button>

        <button
          onClick={() => setActiveTab('optimizer')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'optimizer' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Target Job Role Optimization</span>
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'editor' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Content Editor & PDF Preview</span>
        </button>
      </div>

      {/* TAB 1: 3-LAYER QUALITY AUDIT & GROUNDED REWRITES */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {analyzing ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></span>
              <p className="text-sm font-semibold text-slate-600">Performing 3-layer factual resume quality analysis...</p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6">
              {/* Quality Score Header Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Resume Quality Analysis</span>
                  <h2 className="text-xl font-bold text-slate-900">Core Content & Structural Integrity</h2>
                  <p className="text-xs text-slate-500 mt-1">Evaluated based on extracted facts from your uploaded resume. Zero fabricated information.</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-4xl font-extrabold text-indigo-600">{audit?.overall_quality_score || 0}%</div>
                    <div className="text-xs font-semibold text-slate-500">Quality Score</div>
                  </div>
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    (audit?.overall_quality_score || 0) >= 75 ? 'bg-emerald-500' : (audit?.overall_quality_score || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    {(audit?.overall_quality_score || 0) >= 75 ? 'HIGH' : (audit?.overall_quality_score || 0) >= 50 ? 'FAIR' : 'NEEDS IMP.'}
                  </div>
                </div>
              </div>

              {/* Grid: Missing Information & Potential Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Missing Information Panel */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Missing Information Audit</span>
                  </h3>

                  <div className="space-y-2">
                    {audit?.missing_information?.length > 0 ? (
                      audit.missing_information.map((item: string, idx: number) => (
                        <div key={idx} className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs font-medium text-amber-800 flex items-start space-x-2">
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px] shrink-0 uppercase">Not found in resume</span>
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No core section or contact information missing.</p>
                    )}
                  </div>
                </div>

                {/* 2. Improvement Suggestions Panel */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <span>Suggested Improvements</span>
                  </h3>

                  <div className="space-y-2">
                    {audit?.improvement_suggestions?.length > 0 ? (
                      audit.improvement_suggestions.map((sug: string, idx: number) => (
                        <div key={idx} className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-slate-700 flex items-start space-x-2">
                          <span className="text-indigo-600 font-bold shrink-0">•</span>
                          <span>{sug}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No major suggestions required. Solid resume baseline!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* LAYER 1: EXTRACTED FACTS CARD */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">Layer 1: Extracted Facts Baseline</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded">Unaltered Candidate Facts</span>
                </div>

                {/* Contact Facts Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">Full Name</span>
                    <span className="font-semibold text-slate-800">{facts?.personal_info?.full_name}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">Email</span>
                    <span className={facts?.personal_info?.email === 'Not found in resume' ? 'text-amber-600 font-semibold' : 'font-semibold text-slate-800'}>
                      {facts?.personal_info?.email}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">Phone</span>
                    <span className={facts?.personal_info?.phone === 'Not found in resume' ? 'text-amber-600 font-semibold' : 'font-semibold text-slate-800'}>
                      {facts?.personal_info?.phone}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">Location</span>
                    <span className={facts?.personal_info?.location === 'Not found in resume' ? 'text-amber-600 font-semibold' : 'font-semibold text-slate-800'}>
                      {facts?.personal_info?.location}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">LinkedIn</span>
                    <span className={facts?.personal_info?.linkedin_url === 'Not found in resume' ? 'text-amber-600 font-semibold' : 'font-semibold text-slate-800'}>
                      {facts?.personal_info?.linkedin_url}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-bold uppercase text-[10px] text-slate-400 block">GitHub</span>
                    <span className={facts?.personal_info?.github_url === 'Not found in resume' ? 'text-amber-600 font-semibold' : 'font-semibold text-slate-800'}>
                      {facts?.personal_info?.github_url}
                    </span>
                  </div>
                </div>

                {/* Skills Extracted */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Technical Skills Detected ({facts?.skills?.length || 0})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {facts?.skills?.length > 0 ? (
                      facts.skills.map((sk: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium">
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Technical Skills section not found in resume</span>
                    )}
                  </div>
                </div>
              </div>

              {/* LAYER 3: FACT-GROUNDED REWRITES CARD */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">Layer 3: Fact-Grounded Bullet Rewrites</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    Zero Metrics or Skills Invented
                  </span>
                </div>

                {/* Summary Rewrite Comparison */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Fact-Grounded Summary Alignment</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
                    {rewrites?.fact_grounded_summary}
                  </p>
                </div>

                {/* Experience Bullet Rewrites List with Direct Apply Actions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Action-Oriented Bullet Point Rewrites (Review & Apply)</h4>
                  {rewrites?.bullet_rewrites?.length > 0 ? (
                    rewrites.bullet_rewrites.map((bw: any, idx: number) => {
                      const isApplied = appliedRewrites.includes(idx);
                      return (
                        <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800">{bw.role} {bw.company ? `@ ${bw.company}` : ''}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                                bw.metric_guidance === 'Contains verified numbers' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {bw.metric_guidance}
                              </span>

                              {isApplied ? (
                                <button
                                  onClick={() => handleRevertRewrite(idx, bw.original_bullet)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-lg flex items-center space-x-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Applied ✓ (Revert)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApplyRewrite(idx, bw.fact_grounded_rewrite)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1"
                                >
                                  <span>Apply Rewrite to Resume</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Original Bullet Point</span>
                              <p className="p-2.5 bg-slate-50 text-slate-600 rounded border border-slate-200 line-through text-slate-400">
                                {bw.original_bullet}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-indigo-600">Fact-Grounded Action Rewrite</span>
                              <p className="p-2.5 bg-indigo-50/60 text-slate-800 rounded border border-indigo-200 font-medium">
                                {bw.fact_grounded_rewrite}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">No experience bullets extracted for rephrasing.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <FileSearch className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Resume Selected</h3>
              <p className="text-xs text-slate-500">Upload a PDF/DOCX file or select a saved resume to view 3-layer quality audit.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TARGET JOB ROLE OPTIMIZATION */}
      {activeTab === 'optimizer' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-5 h-5" />
              <span>Fact-Preserving Job Description Keyword Alignment</span>
            </div>
            <p className="text-xs text-indigo-200">
              Paste a target job description to generate a complete optimized resume version. Missing skills will be reported without fabricating experience.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Company (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. NextGen Innovations"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Description *</label>
              <textarea
                rows={4}
                placeholder="Paste target job requirements and qualifications here..."
                value={targetJobDesc}
                onChange={(e) => setTargetJobDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400 text-xs"
              />
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
                  <span>Generate Complete Optimized Resume</span>
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
              <p className="text-xs text-amber-700 font-medium">
                The target job description contains these keywords missing from your uploaded resume. <strong>Not found in resume. Only add to skills if you possess genuine hands-on experience with them.</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((kw, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold">
                    ✗ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched Skills Box */}
          {matchedSkills.length > 0 && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Matched Job Skills ({matchedSkills.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((kw, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">
                    ✓ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTENT EDITOR & LIVE PDF PREVIEW */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          {/* Top Version Save Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                value={versionNameInput}
                onChange={(e) => {
                  setVersionNameInput(e.target.value);
                  setUnsavedChanges(true);
                }}
                placeholder="Version Name (e.g. Senior Engineer @ NextGen)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:w-80"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              {unsavedChanges && (
                <span className="text-xs text-amber-600 font-semibold">Unsaved edits</span>
              )}
              <button
                onClick={handleSaveVersion}
                disabled={savingVersion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingVersion ? 'Saving...' : (selectedVersion?.id ? 'Save Changes' : 'Save as New Version')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comprehensive Form Editor */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  {viewMode === 'optimized' ? 'Optimized Resume Editor' : 'Original Resume Content (Read-Only)'}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {viewMode === 'optimized' ? 'Editable' : 'Read-Only'}
                </span>
              </div>

              {/* 1. Contact / Header Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Contact Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Full Name</label>
                    <input
                      type="text"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.full_name || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, full_name: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Email</label>
                    <input
                      type="email"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.email || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, email: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Phone</label>
                    <input
                      type="text"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.phone || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, phone: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Location</label>
                    <input
                      type="text"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.location || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, location: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">LinkedIn URL</label>
                    <input
                      type="text"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.linkedin_url || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, linkedin_url: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">GitHub URL</label>
                    <input
                      type="text"
                      disabled={viewMode === 'original'}
                      value={resumeData.personal_info?.github_url || ''}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          personal_info: { ...resumeData.personal_info, github_url: e.target.value }
                        });
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Professional Summary */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase">Professional Summary</label>
                <textarea
                  rows={3}
                  disabled={viewMode === 'original'}
                  value={resumeData.summary || ''}
                  onChange={(e) => {
                    setResumeData({ ...resumeData, summary: e.target.value });
                    setUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 3. Skills */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase">Technical Skills (Comma-Separated)</label>
                <input
                  type="text"
                  disabled={viewMode === 'original'}
                  value={Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : ''}
                  onChange={(e) => {
                    setResumeData({
                      ...resumeData,
                      skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                    });
                    setUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              {/* 4. Work Experience */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Work Experience Entries ({Array.isArray(resumeData.experience) ? resumeData.experience.length : 0})</span>
                </h3>

                {Array.isArray(resumeData.experience) && resumeData.experience.length > 0 ? (
                  resumeData.experience.map((exp: any, i: number) => {
                    const rewriteSuggestion = suggestedRewrites.find((r: any) => r.itemIndex === i);
                    const isApplied = appliedRewrites.includes(i);

                    return (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400">Role Title</label>
                            <input
                              type="text"
                              disabled={viewMode === 'original'}
                              value={exp.role || ''}
                              onChange={(e) => {
                                const newExps = [...resumeData.experience];
                                newExps[i] = { ...newExps[i], role: e.target.value };
                                setResumeData({ ...resumeData, experience: newExps });
                                setUnsavedChanges(true);
                              }}
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400">Duration</label>
                            <input
                              type="text"
                              disabled={viewMode === 'original'}
                              value={exp.duration || ''}
                              onChange={(e) => {
                                const newExps = [...resumeData.experience];
                                newExps[i] = { ...newExps[i], duration: e.target.value };
                                setResumeData({ ...resumeData, experience: newExps });
                                setUnsavedChanges(true);
                              }}
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400">Company</label>
                          <input
                            type="text"
                            disabled={viewMode === 'original'}
                            value={exp.company || ''}
                            onChange={(e) => {
                              const newExps = [...resumeData.experience];
                              newExps[i] = { ...newExps[i], company: e.target.value };
                              setResumeData({ ...resumeData, experience: newExps });
                              setUnsavedChanges(true);
                            }}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400">Description / Responsibilities</label>
                          <textarea
                            rows={3}
                            disabled={viewMode === 'original'}
                            value={exp.description || ''}
                            onChange={(e) => {
                              const newExps = [...resumeData.experience];
                              newExps[i] = { ...newExps[i], description: e.target.value };
                              setResumeData({ ...resumeData, experience: newExps });
                              setUnsavedChanges(true);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs leading-relaxed"
                          />
                        </div>

                        {/* Direct Rewrite Suggestion Integration */}
                        {rewriteSuggestion && viewMode === 'optimized' && (
                          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-indigo-900 text-[11px] flex items-center space-x-1">
                                <Zap className="w-3 h-3 text-indigo-600" />
                                <span>Suggested Action-Verb Rewrite:</span>
                              </span>
                              {isApplied ? (
                                <button
                                  onClick={() => handleRevertRewrite(i, rewriteSuggestion.original)}
                                  className="text-[10px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded font-bold"
                                >
                                  Applied ✓ (Revert)
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApplyRewrite(i, rewriteSuggestion.suggested)}
                                  className="text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded font-bold shadow-xs"
                                >
                                  Apply Suggestion
                                </button>
                              )}
                            </div>
                            <p className="text-slate-800 font-medium italic text-[11px]">{rewriteSuggestion.suggested}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">No work experience entries.</p>
                )}
              </div>

              {/* 5. Education */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Education ({Array.isArray(resumeData.education) ? resumeData.education.length : 0})</span>
                </h3>

                {Array.isArray(resumeData.education) && resumeData.education.length > 0 ? (
                  resumeData.education.map((ed: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Degree</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={ed.degree || ''}
                          onChange={(e) => {
                            const newEd = [...resumeData.education];
                            newEd[i] = { ...newEd[i], degree: e.target.value };
                            setResumeData({ ...resumeData, education: newEd });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Institution</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={ed.institution || ''}
                          onChange={(e) => {
                            const newEd = [...resumeData.education];
                            newEd[i] = { ...newEd[i], institution: e.target.value };
                            setResumeData({ ...resumeData, education: newEd });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Year</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={ed.year || ''}
                          onChange={(e) => {
                            const newEd = [...resumeData.education];
                            newEd[i] = { ...newEd[i], year: e.target.value };
                            setResumeData({ ...resumeData, education: newEd });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No education entries.</p>
                )}
              </div>

              {/* 6. Projects */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Projects ({Array.isArray(resumeData.projects) ? resumeData.projects.length : 0})</span>
                </h3>

                {Array.isArray(resumeData.projects) && resumeData.projects.length > 0 ? (
                  resumeData.projects.map((pr: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Project Title</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={pr.title || pr.name || ''}
                          onChange={(e) => {
                            const newPr = [...resumeData.projects];
                            newPr[i] = { ...newPr[i], title: e.target.value };
                            setResumeData({ ...resumeData, projects: newPr });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Description</label>
                        <textarea
                          rows={2}
                          disabled={viewMode === 'original'}
                          value={pr.description || ''}
                          onChange={(e) => {
                            const newPr = [...resumeData.projects];
                            newPr[i] = { ...newPr[i], description: e.target.value };
                            setResumeData({ ...resumeData, projects: newPr });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No project entries.</p>
                )}
              </div>

              {/* 7. Certifications */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Certifications ({Array.isArray(resumeData.certifications) ? resumeData.certifications.length : 0})</span>
                </h3>

                {Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0 ? (
                  resumeData.certifications.map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Certification Name</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={c.name || (typeof c === 'string' ? c : '')}
                          onChange={(e) => {
                            const newC = [...resumeData.certifications];
                            newC[i] = typeof newC[i] === 'string' ? { name: e.target.value } : { ...newC[i], name: e.target.value };
                            setResumeData({ ...resumeData, certifications: newC });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Issuer</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={c.issuer || ''}
                          onChange={(e) => {
                            const newC = [...resumeData.certifications];
                            newC[i] = { ...newC[i], issuer: e.target.value };
                            setResumeData({ ...resumeData, certifications: newC });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Year</label>
                        <input
                          type="text"
                          disabled={viewMode === 'original'}
                          value={c.year || ''}
                          onChange={(e) => {
                            const newC = [...resumeData.certifications];
                            newC[i] = { ...newC[i], year: e.target.value };
                            setResumeData({ ...resumeData, certifications: newC });
                            setUnsavedChanges(true);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No certifications listed.</p>
                )}
              </div>
            </div>

            {/* Clean Live Resume Document Display */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm space-y-6 min-h-[500px] max-h-[85vh] overflow-y-auto">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">{resumeData.personal_info?.full_name || 'Candidate Name'}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {[
                        resumeData.personal_info?.email,
                        resumeData.personal_info?.phone,
                        resumeData.personal_info?.location,
                        resumeData.personal_info?.linkedin_url,
                        resumeData.personal_info?.github_url
                      ].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    viewMode === 'optimized' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {viewMode === 'optimized' ? 'Optimized Version' : 'Original Facts'}
                  </span>
                </div>
              </div>

              {resumeData.summary && (
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Professional Summary</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{resumeData.summary}</p>
                </div>
              )}

              {Array.isArray(resumeData.skills) && resumeData.skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Technical Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.skills.map((sk: string, i: number) => (
                      <span key={i} className="px-2.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-medium">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(resumeData.experience) && resumeData.experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Professional Experience</h3>
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
                    <div key={i} className="text-xs text-slate-700 font-medium mb-1">
                      <span className="font-bold text-slate-900">{ed.degree}</span> {ed.institution ? `- ${ed.institution}` : ''} {ed.year ? `(${ed.year})` : ''}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(resumeData.projects) && resumeData.projects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Projects</h3>
                  {resumeData.projects.map((pr: any, i: number) => (
                    <div key={i} className="mb-2 text-xs">
                      <span className="font-bold text-slate-900">{pr.title || pr.name}</span>
                      <p className="text-slate-600 mt-0.5">{pr.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Certifications</h3>
                  {resumeData.certifications.map((c: any, i: number) => (
                    <div key={i} className="text-xs text-slate-700 font-medium mb-1">
                      <span className="font-bold text-slate-900">{c.name || (typeof c === 'string' ? c : '')}</span> {c.issuer ? `- ${c.issuer}` : ''} {c.year ? `(${c.year})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
