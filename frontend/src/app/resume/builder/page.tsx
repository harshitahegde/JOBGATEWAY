"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Sparkles, Download, CheckCircle, AlertTriangle, 
  ShieldCheck, Layers, Lightbulb, Edit3, HelpCircle, 
  Info, Check, X, FileSearch, Zap, Save, RefreshCw, Plus, Trash2, Clock, Briefcase, GraduationCap, Award, FolderGit2, ExternalLink
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

  const [activeTab, setActiveTab] = useState<'analysis' | 'optimizer' | 'editor' | 'preview'>('analysis');
  
  // Quality Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // ATS Job Match State
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetJobDesc, setTargetJobDesc] = useState('');
  const [atsResult, setAtsResult] = useState<any>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  // Improvements State
  const [improvements, setImprovements] = useState<any[]>([]);
  const [appliedImprovementIds, setAppliedImprovementIds] = useState<string[]>([]);
  const [dismissedImprovementIds, setDismissedImprovementIds] = useState<string[]>([]);

  // Version metadata for saving
  const [versionNameInput, setVersionNameInput] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View mode: 'version' vs 'original'
  const [viewMode, setViewMode] = useState<'version' | 'original'>('version');

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
          runQualityAnalysis(primary.id, primary.parsedContent);
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

  const runQualityAnalysis = async (resumeId: number, contentObj: any, jobDesc: string = "") => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/resumes/${resumeId}/analyze`, {
        targetJobDescription: jobDesc
      });
      const analysis = res.data.analysis;
      setAnalysisResult(analysis);
      if (analysis?.improvements) {
        setImprovements(analysis.improvements);
      }
      if (analysis?.job_match) {
        setAtsResult(analysis.job_match);
      }
    } catch (err: any) {
      console.warn('Fallback to analyze-raw:', err);
      try {
        const res = await api.post('/resumes/analyze-raw', {
          resumeData: contentObj,
          targetJobDescription: jobDesc
        });
        const analysis = res.data.analysis;
        setAnalysisResult(analysis);
        if (analysis?.improvements) {
          setImprovements(analysis.improvements);
        }
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
      setViewMode('version');
      setUnsavedChanges(false);
      setAppliedImprovementIds([]);
      setDismissedImprovementIds([]);
      if (found.parsedContent) {
        setOriginalData(found.parsedContent);
        setResumeData(found.parsedContent);
        runQualityAnalysis(found.id, found.parsedContent, targetJobDesc);
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
        runQualityAnalysis(selectedResume.id, originalData, targetJobDesc);
      }
      setUnsavedChanges(false);
      return;
    }

    const versionNum = parseInt(vId, 10);
    try {
      const res = await api.get(`/resumes/versions/${versionNum}`);
      const v = res.data.version;
      setSelectedVersion(v);
      setViewMode('version');
      setResumeData(v.content);
      setVersionNameInput(v.versionName || '');
      setTargetJobTitle(v.targetJobTitle || '');
      setTargetCompany(v.targetCompany || '');
      setUnsavedChanges(false);
      setMessage(`Loaded saved version: "${v.versionName}"`);
      runQualityAnalysis(selectedResume.id, v.content, targetJobDesc);
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
        setViewMode('version');
        if (newResume.parsedContent) {
          setOriginalData(newResume.parsedContent);
          setResumeData(newResume.parsedContent);
          runQualityAnalysis(newResume.id, newResume.parsedContent, targetJobDesc);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleCalculateAts = async () => {
    if (!targetJobDesc.trim()) {
      setErrorMsg('Please enter a target job description to calculate ATS match.');
      return;
    }
    setAtsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/ats/analyze', {
        resumeId: selectedResume?.id || null,
        resumeText: JSON.stringify(resumeData),
        jobTitle: targetJobTitle || 'Target Role',
        company: targetCompany || 'Company',
        jobDescription: targetJobDesc
      });
      setAtsResult(res.data);
      runQualityAnalysis(selectedResume?.id, resumeData, targetJobDesc);
      setMessage('Calculated job-specific ATS match score based on target requirements.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'ATS calculation failed.');
    } finally {
      setAtsLoading(false);
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
      const nameToSave = versionNameInput.trim() || `Tailored Version (${new Date().toLocaleDateString()})`;
      
      if (selectedVersion?.id && viewMode === 'version') {
        const res = await api.put(`/resumes/versions/${selectedVersion.id}`, {
          versionName: nameToSave,
          targetJobTitle: targetJobTitle || null,
          targetCompany: targetCompany || null,
          content: resumeData
        });
        setSelectedVersion(res.data.version);
        setMessage(`Version "${nameToSave}" updated successfully!`);
      } else {
        const res = await api.post(`/resumes/${selectedResume.id}/versions`, {
          versionName: nameToSave,
          targetJobTitle: targetJobTitle || null,
          targetCompany: targetCompany || null,
          content: resumeData
        });
        setSelectedVersion(res.data.version);
        setViewMode('version');
        setMessage(`New editable version "${nameToSave}" saved without modifying original upload!`);
      }

      setUnsavedChanges(false);
      fetchVersionsForResume(selectedResume.id);
      // Recalculate scores on saved content
      runQualityAnalysis(selectedResume.id, resumeData, targetJobDesc);
    } catch (err: any) {
      setErrorMsg('Save failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingVersion(false);
    }
  };

  // Accept a concrete improvement suggestion
  const handleAcceptImprovement = (imp: any) => {
    if (imp.section === 'experience' && imp.expIndex !== undefined && imp.suggestedRevision) {
      const exps = Array.isArray(resumeData.experience) ? [...resumeData.experience] : [];
      if (exps[imp.expIndex]) {
        const existingDesc = String(exps[imp.expIndex].description || '');
        const lines = existingDesc.split('\n');
        if (imp.bulletIndex !== undefined && lines[imp.bulletIndex] !== undefined) {
          lines[imp.bulletIndex] = imp.suggestedRevision;
          exps[imp.expIndex] = { ...exps[imp.expIndex], description: lines.join('\n') };
        } else {
          exps[imp.expIndex] = { ...exps[imp.expIndex], description: imp.suggestedRevision };
        }
        setResumeData({ ...resumeData, experience: exps });
        setUnsavedChanges(true);
      }
    } else if (imp.section === 'skills' && imp.suggestedRevision) {
      const currentSkills = Array.isArray(resumeData.skills) ? [...resumeData.skills] : [];
      if (!currentSkills.some(s => s.toLowerCase() === imp.suggestedRevision.toLowerCase())) {
        currentSkills.push(imp.suggestedRevision);
        setResumeData({ ...resumeData, skills: currentSkills });
        setUnsavedChanges(true);
      }
    } else if (imp.section === 'summary' && imp.suggestedRevision) {
      setResumeData({ ...resumeData, summary: imp.suggestedRevision });
      setUnsavedChanges(true);
    }

    setAppliedImprovementIds([...appliedImprovementIds, imp.id]);
    setMessage(`Applied improvement for ${imp.fieldOrBullet}! Remember to save your version.`);
  };

  const handleDismissImprovement = (id: string) => {
    setDismissedImprovementIds([...dismissedImprovementIds, id]);
  };

  // Trigger Native Clean Print / PDF export
  const handlePrint = () => {
    window.print();
  };

  const audit = analysisResult?.quality_audit;
  const facts = analysisResult?.extracted_facts || originalData;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* SCREEN UI CONTAINER: Hidden during @media print */}
      <div className="resume-screen-ui space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Evidence-Based Resume Optimization & Workflow</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resume Audit & Improvement Studio</h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit actual resume content, review evidence-based recommendations, edit sections directly, save versions, and print clean PDFs.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-sm flex items-center space-x-2 transition">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Parsing...' : 'Upload PDF/DOCX'}</span>
              <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center space-x-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Action Messages */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start space-x-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Source & Version Management Header */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* 1. Resume Source */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Uploaded Resume Source</span>
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

            {/* 2. Version Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Active Version / Mode</span>
              </label>
              <select
                value={viewMode === 'original' ? 'original' : (selectedVersion?.id ? String(selectedVersion.id) : 'original')}
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="original">Original Upload (Read-Only Baseline)</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    ⭐ {v.versionName} ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                viewMode === 'version' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {viewMode === 'version' ? 'Active Editable Version' : 'Original Baseline (Read-Only)'}
              </span>
              {unsavedChanges && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] animate-pulse">
                  Unsaved Edits
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => runQualityAnalysis(selectedResume?.id, resumeData, targetJobDesc)}
                disabled={analyzing}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${analyzing ? 'animate-spin' : ''}`} />
                <span>{analyzing ? 'Auditing...' : 'Re-Evaluate Scores'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-slate-200 flex items-center space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Quality Audit & Extracted Facts</span>
          </button>

          <button
            onClick={() => setActiveTab('optimizer')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'optimizer' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>2. Job Description & ATS Match</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'editor' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>3. In-App Resume Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'preview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. Clean PDF Preview</span>
          </button>
        </div>

        {/* TAB 1: QUALITY AUDIT & EXTRACTED FACTS */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Score Banner Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Document Health & Integrity</span>
                <h2 className="text-xl font-bold text-slate-900">Resume Quality Score</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Evaluated strictly on verified extracted facts. Evaluates contact clarity, section completeness, metric presence, and active phrasing. Does not predict or guarantee employer ATS outcomes.
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-indigo-600">{audit?.overall_quality_score ?? 0}%</div>
                  <div className="text-xs font-semibold text-slate-500">Quality Score</div>
                </div>
                <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                  (audit?.overall_quality_score || 0) >= 75 ? 'bg-emerald-500' : (audit?.overall_quality_score || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}>
                  {(audit?.overall_quality_score || 0) >= 75 ? 'HIGH' : (audit?.overall_quality_score || 0) >= 50 ? 'FAIR' : 'NEEDS IMP.'}
                </div>
              </div>
            </div>

            {/* Rubric Breakdown Grid */}
            {audit?.rubric_breakdown && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Contact Info & Links</span>
                    <span className="text-indigo-600">{audit.rubric_breakdown.contact_info.score} / {audit.rubric_breakdown.contact_info.max_score} pts</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(audit.rubric_breakdown.contact_info.score / audit.rubric_breakdown.contact_info.max_score) * 100}%` }}></div>
                  </div>
                  {audit.rubric_breakdown.contact_info.deductions.length > 0 && (
                    <p className="text-[11px] text-amber-700">{audit.rubric_breakdown.contact_info.deductions.join('. ')}</p>
                  )}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Core Section Completeness</span>
                    <span className="text-indigo-600">{audit.rubric_breakdown.core_sections.score} / {audit.rubric_breakdown.core_sections.max_score} pts</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(audit.rubric_breakdown.core_sections.score / audit.rubric_breakdown.core_sections.max_score) * 100}%` }}></div>
                  </div>
                  {audit.rubric_breakdown.core_sections.deductions.length > 0 && (
                    <p className="text-[11px] text-amber-700">{audit.rubric_breakdown.core_sections.deductions.join('. ')}</p>
                  )}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Content Depth & Metrics</span>
                    <span className="text-indigo-600">{audit.rubric_breakdown.content_depth_and_metrics.score} / {audit.rubric_breakdown.content_depth_and_metrics.max_score} pts</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(audit.rubric_breakdown.content_depth_and_metrics.score / audit.rubric_breakdown.content_depth_and_metrics.max_score) * 100}%` }}></div>
                  </div>
                  {audit.rubric_breakdown.content_depth_and_metrics.deductions.length > 0 && (
                    <p className="text-[11px] text-amber-700">{audit.rubric_breakdown.content_depth_and_metrics.deductions.join('. ')}</p>
                  )}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Action Verbs & Style</span>
                    <span className="text-indigo-600">{audit.rubric_breakdown.action_verbs.score} / {audit.rubric_breakdown.action_verbs.max_score} pts</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(audit.rubric_breakdown.action_verbs.score / audit.rubric_breakdown.action_verbs.max_score) * 100}%` }}></div>
                  </div>
                  {audit.rubric_breakdown.action_verbs.deductions.length > 0 && (
                    <p className="text-[11px] text-amber-700">{audit.rubric_breakdown.action_verbs.deductions.join('. ')}</p>
                  )}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Summary & Projects</span>
                    <span className="text-indigo-600">{audit.rubric_breakdown.additional_sections.score} / {audit.rubric_breakdown.additional_sections.max_score} pts</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(audit.rubric_breakdown.additional_sections.score / audit.rubric_breakdown.additional_sections.max_score) * 100}%` }}></div>
                  </div>
                  {audit.rubric_breakdown.additional_sections.deductions.length > 0 && (
                    <p className="text-[11px] text-amber-700">{audit.rubric_breakdown.additional_sections.deductions.join('. ')}</p>
                  )}
                </div>

                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-indigo-700">Audit Status</span>
                  <p className="text-xs font-bold text-slate-800">{audit.word_count_status}</p>
                  <span className="text-[11px] text-slate-500">Zero default points awarded. All points grounded in verified resume text.</span>
                </div>
              </div>
            )}

            {/* Extracted Facts Baseline */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Extracted Facts Baseline</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded">
                  Original Uploaded Facts
                </span>
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Candidate Name</span>
                  <span className={facts?.personal_info?.full_name ? 'font-semibold text-slate-800' : 'text-amber-600 font-semibold'}>
                    {facts?.personal_info?.full_name || 'Not detected in resume'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Email</span>
                  <span className={facts?.personal_info?.email ? 'font-semibold text-slate-800' : 'text-amber-600 font-semibold'}>
                    {facts?.personal_info?.email || 'Not detected in resume'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Phone</span>
                  <span className={facts?.personal_info?.phone ? 'font-semibold text-slate-800' : 'text-amber-600 font-semibold'}>
                    {facts?.personal_info?.phone || 'Not detected in resume'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-800">{facts?.personal_info?.location || 'Not detected'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">LinkedIn</span>
                  <span className={facts?.personal_info?.linkedin_url ? 'font-semibold text-indigo-700' : 'text-slate-400'}>
                    {facts?.personal_info?.linkedin_url || 'Not detected'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">GitHub</span>
                  <span className={facts?.personal_info?.github_url ? 'font-semibold text-indigo-700' : 'text-slate-400'}>
                    {facts?.personal_info?.github_url || 'Not detected'}
                  </span>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                  Skills Extracted ({facts?.skills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {facts?.skills && facts.skills.length > 0 ? (
                    facts.skills.map((s: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">No skills detected in extracted text.</span>
                  )}
                </div>
              </div>

              {/* Experience Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                  Experience Entries Extracted ({facts?.experience?.length || 0})
                </h4>
                {facts?.experience && facts.experience.length > 0 ? (
                  <div className="space-y-2">
                    {facts.experience.map((e: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{e.role} {e.company ? `@ ${e.company}` : ''}</span>
                          <span className="text-slate-500 font-medium">{e.duration}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{e.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">No experience entries detected in extracted text.</p>
                )}
              </div>
            </div>

            {/* Concrete Actionable Recommendations Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Actionable Improvement Recommendations</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Review, accept, or edit suggestions. No fabricated information.
                </span>
              </div>

              <div className="space-y-4">
                {improvements.filter(imp => !dismissedImprovementIds.includes(imp.id)).length > 0 ? (
                  improvements
                    .filter(imp => !dismissedImprovementIds.includes(imp.id))
                    .map((imp) => {
                      const isApplied = appliedImprovementIds.includes(imp.id);
                      return (
                        <div key={imp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px] uppercase">
                                {imp.section}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{imp.fieldOrBullet}</span>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                imp.isOptional ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {imp.isOptional ? 'Optional' : 'Important'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {imp.suggestedRevision && (
                                <button
                                  onClick={() => handleAcceptImprovement(imp)}
                                  disabled={isApplied}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition ${
                                    isApplied 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isApplied ? 'Applied ✓' : 'Accept Suggestion'}</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDismissImprovement(imp.id)}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5">
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Problem: </strong>{imp.problem}
                            </p>
                            {imp.existingText && imp.existingText !== '(Not in resume)' && imp.existingText !== '(Not provided)' && (
                              <div className="p-2 bg-white rounded border border-slate-200 text-slate-600 font-mono text-[11px]">
                                Current: &ldquo;{imp.existingText}&rdquo;
                              </div>
                            )}
                            {imp.suggestedRevision && (
                              <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900 font-medium text-[11px]">
                                Suggested: &ldquo;{imp.suggestedRevision}&rdquo;
                              </div>
                            )}
                            <p className="text-slate-500 italic text-[11px]">
                              <strong>Why it helps: </strong>{imp.whyItHelps}
                            </p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-slate-500">No pending improvement suggestions for this resume.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TARGET JOB ROLE & ATS MATCH */}
        {activeTab === 'optimizer' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-5 h-5" />
                <span>Job-Specific ATS Match Scoring</span>
              </div>
              <p className="text-xs text-indigo-200">
                Paste a target job description to evaluate your resume against explicit job requirements. Strict boundaries (e.g. Java != JavaScript) and transparent component weights (35% Required, 15% Preferred, 20% Keywords, 15% Exp/Edu, 15% Completeness) are applied.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={targetJobTitle}
                    onChange={(e) => setTargetJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Company (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe, Google, Acme Corp"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Description *</label>
                <textarea
                  rows={5}
                  placeholder="Paste complete target job description here..."
                  value={targetJobDesc}
                  onChange={(e) => setTargetJobDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-indigo-400"
                />
              </div>

              <button
                onClick={handleCalculateAts}
                disabled={atsLoading}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl text-sm shadow-md flex items-center space-x-2 transition"
              >
                {atsLoading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Calculate Job-Specific ATS Match</span>
                  </>
                )}
              </button>
            </div>

            {/* ATS Match Score Results */}
            {atsResult && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Target Job Alignment</span>
                    <h3 className="text-xl font-bold text-slate-900">{targetJobTitle || 'Target Role'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Calculated using JobGateway 5-component weighted ATS model.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-4xl font-extrabold text-indigo-600">{atsResult.ats_score ?? atsResult.atsScore}%</div>
                      <div className="text-xs font-semibold text-slate-500">ATS Match Score</div>
                    </div>
                  </div>
                </div>

                {/* ATS Breakdown Cards */}
                {atsResult.breakdown && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Required Skills (35%)</span>
                        <span className="text-indigo-600">{atsResult.breakdown.required_skills?.score} / 35.0 pts</span>
                      </div>
                      <p className="text-slate-600">{atsResult.breakdown.required_skills?.details}</p>
                      {atsResult.breakdown.required_skills?.missing?.length > 0 && (
                        <div className="pt-1">
                          <span className="text-amber-800 font-bold text-[10px] uppercase">Missing Required Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {atsResult.breakdown.required_skills.missing.map((s: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
                                ✗ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Preferred Skills (15%)</span>
                        <span className="text-indigo-600">{atsResult.breakdown.preferred_skills?.score} / 15.0 pts</span>
                      </div>
                      <p className="text-slate-600">{atsResult.breakdown.preferred_skills?.details}</p>
                      {atsResult.breakdown.preferred_skills?.matched?.length > 0 && (
                        <div className="pt-1">
                          <span className="text-emerald-800 font-bold text-[10px] uppercase">Matched Preferred Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {atsResult.breakdown.preferred_skills.matched.map((s: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Domain Keywords & TF-IDF (20%)</span>
                        <span className="text-indigo-600">{atsResult.breakdown.keywords?.score} / 20.0 pts</span>
                      </div>
                      <p className="text-slate-600">{atsResult.breakdown.keywords?.details}</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Experience & Education (15%)</span>
                        <span className="text-indigo-600">{atsResult.breakdown.experience_and_education?.score} / 15.0 pts</span>
                      </div>
                      <p className="text-slate-600">{atsResult.breakdown.experience_and_education?.experience_status}</p>
                      <p className="text-slate-600">{atsResult.breakdown.experience_and_education?.education_status}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IN-APP RESUME CONTENT EDITOR */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Version Save Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={versionNameInput}
                  onChange={(e) => {
                    setVersionNameInput(e.target.value);
                    setUnsavedChanges(true);
                  }}
                  placeholder="Version Name (e.g. Tailored for Lead Backend Engineer)"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:w-80"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                {unsavedChanges && (
                  <span className="text-xs text-amber-600 font-semibold animate-pulse">Unsaved Edits</span>
                )}
                <button
                  onClick={handleSaveVersion}
                  disabled={savingVersion}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingVersion ? 'Saving...' : (selectedVersion?.id && viewMode === 'version' ? 'Save Changes' : 'Save as New Version')}</span>
                </button>
              </div>
            </div>

            {/* Comprehensive Editor Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* 1. Contact Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Contact Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Full Name</label>
                    <input
                      type="text"
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Email Address</label>
                    <input
                      type="email"
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Phone Number</label>
                    <input
                      type="text"
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">LinkedIn Profile URL</label>
                    <input
                      type="text"
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">GitHub / Portfolio URL</label>
                    <input
                      type="text"
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
                <label className="block text-xs font-bold text-slate-800 uppercase">Professional Summary</label>
                <textarea
                  rows={3}
                  value={resumeData.summary || ''}
                  onChange={(e) => {
                    setResumeData({ ...resumeData, summary: e.target.value });
                    setUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 3. Technical Skills */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase">
                  Technical Skills (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : ''}
                  onChange={(e) => {
                    setResumeData({
                      ...resumeData,
                      skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                    });
                    setUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 4. Work Experience */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Work Experience ({Array.isArray(resumeData.experience) ? resumeData.experience.length : 0})</span>
                  </h3>
                  <button
                    onClick={() => {
                      const newExps = [...(resumeData.experience || [])];
                      newExps.unshift({ role: '', company: '', duration: '', description: '' });
                      setResumeData({ ...resumeData, experience: newExps });
                      setUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Role</span>
                  </button>
                </div>

                {Array.isArray(resumeData.experience) && resumeData.experience.map((exp: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                    <button
                      onClick={() => {
                        const newExps = resumeData.experience.filter((_: any, idx: number) => idx !== i);
                        setResumeData({ ...resumeData, experience: newExps });
                        setUnsavedChanges(true);
                      }}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                      title="Remove Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Role Title</label>
                        <input
                          type="text"
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
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Duration (e.g. 2021 - Present)</label>
                        <input
                          type="text"
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
                      <label className="block text-[10px] font-bold uppercase text-slate-400">
                        Bullet Points / Responsibilities
                      </label>
                      <textarea
                        rows={3}
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
                  </div>
                ))}
              </div>

              {/* 5. Education */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Education ({Array.isArray(resumeData.education) ? resumeData.education.length : 0})</span>
                  </h3>
                  <button
                    onClick={() => {
                      const newEd = [...(resumeData.education || [])];
                      newEd.push({ degree: '', institution: '', year: '' });
                      setResumeData({ ...resumeData, education: newEd });
                      setUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Degree</span>
                  </button>
                </div>

                {Array.isArray(resumeData.education) && resumeData.education.map((ed: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs relative">
                    <button
                      onClick={() => {
                        const newEd = resumeData.education.filter((_: any, idx: number) => idx !== i);
                        setResumeData({ ...resumeData, education: newEd });
                        setUnsavedChanges(true);
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Degree</label>
                      <input
                        type="text"
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
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Graduation Year</label>
                      <input
                        type="text"
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
                ))}
              </div>

              {/* 6. Projects */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Projects ({Array.isArray(resumeData.projects) ? resumeData.projects.length : 0})</span>
                  </h3>
                  <button
                    onClick={() => {
                      const newPr = [...(resumeData.projects || [])];
                      newPr.push({ title: '', description: '' });
                      setResumeData({ ...resumeData, projects: newPr });
                      setUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                </div>

                {Array.isArray(resumeData.projects) && resumeData.projects.map((pr: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs relative">
                    <button
                      onClick={() => {
                        const newPr = resumeData.projects.filter((_: any, idx: number) => idx !== i);
                        setResumeData({ ...resumeData, projects: newPr });
                        setUnsavedChanges(true);
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Project Title</label>
                      <input
                        type="text"
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
                ))}
              </div>

              {/* 7. Certifications */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Certifications ({Array.isArray(resumeData.certifications) ? resumeData.certifications.length : 0})</span>
                  </h3>
                  <button
                    onClick={() => {
                      const newC = [...(resumeData.certifications || [])];
                      newC.push({ name: '', issuer: '', year: '' });
                      setResumeData({ ...resumeData, certifications: newC });
                      setUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Certification</span>
                  </button>
                </div>

                {Array.isArray(resumeData.certifications) && resumeData.certifications.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs relative">
                    <button
                      onClick={() => {
                        const newC = resumeData.certifications.filter((_: any, idx: number) => idx !== i);
                        setResumeData({ ...resumeData, certifications: newC });
                        setUnsavedChanges(true);
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Name</label>
                      <input
                        type="text"
                        value={typeof c === 'string' ? c : (c.name || '')}
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
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLEAN LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-700">Currently Rendering:</span>
                <span className="text-xs font-bold text-indigo-600 ml-2">
                  {viewMode === 'version' ? (selectedVersion?.versionName || 'Active Edited Version') : 'Original Upload Baseline'}
                </span>
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CLEAN PRINTABLE RESUME CONTAINER (Visible on Screen in Preview Tab & Always in @media print) */}
      <div className={`resume-printable-document bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto ${activeTab === 'preview' ? 'block' : 'hidden print:block'}`}>
        {/* Candidate Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
            {resumeData.personal_info?.full_name || 'Candidate Name'}
          </h1>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {[
              resumeData.personal_info?.email,
              resumeData.personal_info?.phone,
              resumeData.personal_info?.location,
              resumeData.personal_info?.linkedin_url,
              resumeData.personal_info?.github_url
            ].filter(Boolean).map((item, idx) => (
              <span key={idx} className="flex items-center space-x-1">
                <span>{item}</span>
                {idx < 4 && <span className="text-slate-300 ml-2">|</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Summary */}
        {resumeData.summary && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Professional Summary
            </h2>
            <p className="text-xs text-slate-800 leading-relaxed">{resumeData.summary}</p>
          </div>
        )}

        {/* Technical Skills */}
        {Array.isArray(resumeData.skills) && resumeData.skills.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Technical Proficiencies
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.skills.map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded text-[11px] font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {Array.isArray(resumeData.experience) && resumeData.experience.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Work Experience
            </h2>
            <div className="space-y-3">
              {resumeData.experience.map((exp: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-900">
                    <span>{exp.role} {exp.company ? `@ ${exp.company}` : ''}</span>
                    <span className="text-slate-500 font-medium">{exp.duration}</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-2 border-l border-slate-200">
                    {exp.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {Array.isArray(resumeData.education) && resumeData.education.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Education & Credentials
            </h2>
            <div className="space-y-1.5">
              {resumeData.education.map((ed: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs text-slate-800">
                  <span className="font-semibold">{ed.degree} {ed.institution ? `- ${ed.institution}` : ''}</span>
                  <span className="text-slate-500">{ed.year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {Array.isArray(resumeData.projects) && resumeData.projects.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Key Projects
            </h2>
            <div className="space-y-2">
              {resumeData.projects.map((pr: any, idx: number) => (
                <div key={idx} className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-900">{pr.title || pr.name}</span>
                  <p className="text-slate-700">{pr.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Certifications & Honors
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-800">
              {resumeData.certifications.map((c: any, idx: number) => (
                <span key={idx} className="font-medium">
                  • {typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.year || ''}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {Array.isArray(resumeData.achievements) && resumeData.achievements.length > 0 && (
          <div className="print-section-item mb-4">
            <h2 className="text-xs font-bold text-indigo-900 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">
              Achievements
            </h2>
            <div className="space-y-1 text-xs text-slate-800">
              {resumeData.achievements.map((ach: any, idx: number) => (
                <div key={idx} className="font-medium">
                  • {typeof ach === 'string' ? ach : (ach.title || JSON.stringify(ach))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
