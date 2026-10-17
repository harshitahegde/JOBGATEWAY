"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Video as VideoIcon, 
  Camera, 
  Square, 
  Play, 
  Pause,
  RefreshCw, 
  Upload, 
  CheckCircle, 
  Sparkles, 
  Trash2, 
  Paperclip, 
  AlertCircle, 
  Clock, 
  FileVideo, 
  ShieldCheck, 
  Share2, 
  Copy, 
  Check,
  X,
  HardDrive,
  Info
} from 'lucide-react';
import { api, getMediaUrl } from '@/lib/api';

type RecordingState = 'idle' | 'recording' | 'paused' | 'preview';

export default function VideoIntroPage() {
  // Recorder State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Video Form
  const [videoTitle, setVideoTitle] = useState('60s Software Engineer Pitch');
  const [videoDescription, setVideoDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // File Upload State
  const [uploadMode, setUploadMode] = useState<'record' | 'upload'>('record');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Library State
  const [videos, setVideos] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Delete Confirmation Modal
  const [videoToDelete, setVideoToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Attach to Resume Modal
  const [videoToAttach, setVideoToAttach] = useState<any | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [attachmentNotes, setAttachmentNotes] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attachSuccessMsg, setAttachSuccessMsg] = useState('');

  // Copy share URL state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchVideos();
    fetchResumes();

    return () => {
      stopCameraAndTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Update preview srcObject when stream changes
  useEffect(() => {
    if (videoPreviewRef.current && mediaStream && recordingState !== 'preview') {
      videoPreviewRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, recordingState]);

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await api.get('/videos');
      setVideos(res.data.videos || []);
      setStorageInfo(res.data.storageStatus || null);
    } catch (err: any) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      const list = res.data.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        setSelectedResumeId(String(list[0].id));
      }
    } catch (err) {
      console.warn('Failed to fetch resumes for attachment:', err);
    }
  };

  const stopCameraAndTracks = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      setMediaStream(null);
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam recording is not supported in this browser. Please use Chrome, Edge, or Firefox.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      setMediaStream(stream);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera and microphone permission was denied. Please grant permission in your browser URL bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera or microphone hardware found on your device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Your camera or microphone is already in use by another application.');
      } else {
        setCameraError(`Unable to access camera: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Recording Controls
  const startRecording = () => {
    if (!mediaStream) return;
    setCameraError(null);
    recordedChunksRef.current = [];
    setVideoBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setElapsedSeconds(0);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    }

    try {
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setVideoBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);
        setRecordingState('preview');
        stopCameraAndTracks();
      };

      recorder.start(500); // 500ms slices for robust chunk collection
      setRecordingState('recording');

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setCameraError(`Failed to initialize recorder: ${err.message}`);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setRecordingState('paused');
      } catch (err: any) {
        setCameraError(`Failed to pause recording: ${err.message}`);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setRecordingState('recording');
        timerIntervalRef.current = setInterval(() => {
          setElapsedSeconds(prev => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (err: any) {
        setCameraError(`Failed to resume recording: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err: any) {
        setCameraError(`Failed to stop recording: ${err.message}`);
      }
    }
  };

  const discardRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setVideoBlob(null);
    setElapsedSeconds(0);
    setRecordingState('idle');
    stopCameraAndTracks();
  };

  // Save Confirmed Recording
  const handleSaveRecording = async () => {
    if (!videoBlob) return;
    setUploading(true);
    setSaveSuccessMsg('');
    setCameraError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoBlob, 'webcam_intro.webm');
      formData.append('title', videoTitle.trim() || 'My Video Introduction');
      formData.append('description', videoDescription.trim());
      formData.append('durationSeconds', String(elapsedSeconds));

      const res = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSaveSuccessMsg('Video saved successfully to your library!');
      discardRecording();
      fetchVideos();
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      setCameraError(err.response?.data?.error || err.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Manual File Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert('File size exceeds the 50MB limit.');
        return;
      }
      setFileToUpload(file);
      if (!videoTitle || videoTitle === '60s Software Engineer Pitch') {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadFile = async () => {
    if (!fileToUpload) return;
    setUploading(true);
    setSaveSuccessMsg('');
    setCameraError(null);

    try {
      const formData = new FormData();
      formData.append('video', fileToUpload);
      formData.append('title', videoTitle.trim() || fileToUpload.name);
      formData.append('description', videoDescription.trim());

      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSaveSuccessMsg('Video file uploaded successfully to your library!');
      setFileToUpload(null);
      setVideoTitle('60s Software Engineer Pitch');
      setVideoDescription('');
      fetchVideos();
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      setCameraError(err.response?.data?.error || err.message || 'Failed to upload video file.');
    } finally {
      setUploading(false);
    }
  };

  // Delete Video with Confirmation
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/videos/${videoToDelete.id}`);
      setVideoToDelete(null);
      fetchVideos();
    } catch (err: any) {
      alert('Failed to delete video: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  };

  // Attach Video to Resume
  const handleAttachToResume = async () => {
    if (!videoToAttach || !selectedResumeId) return;
    setAttaching(true);
    setAttachSuccessMsg('');

    try {
      await api.post(`/videos/${videoToAttach.id}/attach`, {
        resumeId: selectedResumeId,
        resumeVersionId: selectedVersionId || undefined,
        notes: attachmentNotes.trim() || undefined
      });

      setAttachSuccessMsg('Video successfully attached as supplemental material!');
      fetchVideos();
      setTimeout(() => {
        setVideoToAttach(null);
        setAttachSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      alert('Failed to attach video: ' + (err.response?.data?.error || err.message));
    } finally {
      setAttaching(false);
    }
  };

  // Detach Video from Resume
  const handleDetach = async (attachmentId: number) => {
    if (!confirm('Remove this video attachment from the resume? (The original video will NOT be deleted).')) {
      return;
    }
    try {
      await api.delete(`/videos/attachments/${attachmentId}`);
      fetchVideos();
    } catch (err: any) {
      alert('Failed to remove attachment: ' + (err.response?.data?.error || err.message));
    }
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Interactive Video Studio & Supplemental Media</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Video Self-Introduction Studio & Library</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record, manage, and attach 60-second video elevator pitches to your resumes and recruiter communications.
        </p>
      </div>

      {/* Global Success / Error Messages */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {cameraError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Studio Card (Record or Upload) */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl text-white space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setUploadMode('record'); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                uploadMode === 'record'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              WebCam Studio
            </button>
            <button
              onClick={() => { setUploadMode('upload'); stopCameraAndTracks(); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                uploadMode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Upload Video File
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            {recordingState === 'recording' && (
              <span className="flex items-center space-x-1.5 text-rose-400 font-bold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Recording... {formatSeconds(elapsedSeconds)} / 01:00</span>
              </span>
            )}
            {recordingState === 'paused' && (
              <span className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Paused (media capture halted) — {formatSeconds(elapsedSeconds)}</span>
              </span>
            )}
            {recordingState === 'idle' && (
              <span>Max Duration: 60s • 50MB Limit</span>
            )}
          </div>
        </div>

        {uploadMode === 'record' ? (
          <div>
            {/* Camera / Preview Viewport */}
            <div className="relative aspect-video max-h-[420px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              {recordingState === 'preview' && previewUrl ? (
                <video src={previewUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!cameraActive ? 'hidden' : ''}`}
                />
              )}

              {!cameraActive && recordingState !== 'preview' && (
                <div className="text-center space-y-3 p-6">
                  <VideoIcon className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">Click below to activate your browser webcam and microphone</p>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow transition"
                  >
                    Activate Camera & Microphone
                  </button>
                </div>
              )}
            </div>

            {/* Recording Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <div className="flex items-center space-x-3">
                {cameraActive && recordingState === 'idle' && (
                  <>
                    <button
                      onClick={startRecording}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                      <span>Start Recording</span>
                    </button>
                    <button
                      onClick={stopCameraAndTracks}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition"
                    >
                      Turn Off Camera
                    </button>
                  </>
                )}

                {recordingState === 'recording' && (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop & Finalize</span>
                    </button>
                  </>
                )}

                {recordingState === 'paused' && (
                  <>
                    <button
                      onClick={resumeRecording}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Recording</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Finalize</span>
                    </button>
                  </>
                )}

                {recordingState === 'preview' && (
                  <button
                    onClick={() => { discardRecording(); startCamera(); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center space-x-2 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake / Discard</span>
                  </button>
                )}
              </div>

              {/* Title & Explicit Confirm Save */}
              {recordingState === 'preview' && videoBlob && (
                <div className="flex-1 max-w-md space-y-2">
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter pitch title..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Short description (optional)..."
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      onClick={handleSaveRecording}
                      disabled={uploading}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploading ? 'Saving to Library...' : 'Confirm & Save to Library'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* File Upload Mode */
          <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl space-y-4 text-center">
            <FileVideo className="w-12 h-12 text-slate-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-slate-200">Upload a pre-recorded self-introduction video</p>
              <p className="text-xs text-slate-400 mt-1">Supported formats: WebM, MP4, MOV, MKV, OGG (Max: 50MB)</p>
            </div>
            <input
              type="file"
              accept="video/webm,video/mp4,video/quicktime,video/x-matroska,video/ogg"
              onChange={handleFileSelect}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
            {fileToUpload && (
              <div className="max-w-md mx-auto space-y-2 text-left pt-4">
                <label className="text-xs text-slate-400">Video Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
                <label className="text-xs text-slate-400">Description (Optional)</label>
                <input
                  type="text"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button
                  onClick={handleUploadFile}
                  disabled={uploading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition mt-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Uploading File...' : 'Upload to Video Library'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Video Library */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Saved Video Self-Introductions</h2>
            <p className="text-xs text-slate-500">
              Your saved video elevator pitches. You can preview, attach to resumes, or delete anytime.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Storage: {storageInfo?.isCloudPersistent ? 'Cloud (S3/Cloudinary)' : 'Local Disk'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
              {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
            </span>
          </div>
        </div>

        {loadingVideos ? (
          <div className="py-12 text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs text-slate-500">Loading your video library...</p>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((v) => {
              const fullVideoUrl = getMediaUrl(v.filePath);
              const share = v.shareDetails;

              return (
                <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 transition">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{v.title}</h4>
                      {v.description && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{v.description}</p>
                      )}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                        {v.durationSeconds > 0 && <span>• {v.durationSeconds}s</span>}
                        {v.fileSize > 0 && <span>• {(v.fileSize / (1024 * 1024)).toFixed(1)}MB</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => setVideoToDelete(v)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Video Player */}
                  <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video
                      src={fullVideoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Attachment & Sharing Status */}
                  <div className="space-y-2 text-xs pt-1">
                    {/* Attached status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {v.attachments && v.attachments.length > 0
                            ? `Attached to ${v.attachments.length} ${v.attachments.length === 1 ? 'resume material' : 'resume materials'}`
                            : 'Not attached to any resume yet'}
                        </span>
                      </span>

                      <button
                        onClick={() => {
                          setVideoToAttach(v);
                          setAttachSuccessMsg('');
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition"
                      >
                        Attach to Resume
                      </button>
                    </div>

                    {/* Attached list if any */}
                    {v.attachments && v.attachments.length > 0 && (
                      <div className="bg-white border border-slate-200/80 rounded-lg p-2 space-y-1">
                        {v.attachments.map((att: any) => (
                          <div key={att.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 truncate max-w-[240px]">
                              📎 {att.resume?.title || 'Resume'} {att.resumeVersion ? `(${att.resumeVersion.versionName})` : ''}
                            </span>
                            <button
                              onClick={() => handleDetach(att.id)}
                              className="text-rose-500 hover:underline text-[10px] ml-2"
                            >
                              Detach
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Share Status Banner */}
                    <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                      share?.isShareable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      <div className="flex items-center space-x-1.5 flex-1 pr-2">
                        {share?.isShareable ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="text-[11px] leading-tight">
                          {share?.isShareable
                            ? 'Public Share URL ready for recruiter outreach'
                            : 'Stored locally. Configure cloud storage (AWS S3) for external sharing.'}
                        </span>
                      </div>

                      {share?.isShareable && share.shareUrl && (
                        <button
                          onClick={() => copyShareLink(share.shareUrl)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1 flex-shrink-0 transition"
                        >
                          {copiedUrl === share.shareUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUrl === share.shareUrl ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <VideoIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700">No Saved Videos Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Use the WebCam Studio above to record your 60-second pitch, or upload an existing video file to start attaching videos to your job applications.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Delete Saved Video?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{videoToDelete.title}"</span>?
              This will remove the underlying video file and detach it from any linked resumes. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setVideoToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteVideo}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach to Resume Modal */}
      {videoToAttach && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Paperclip className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Attach Video to Resume Material</h3>
              </div>
              <button onClick={() => setVideoToAttach(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {attachSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{attachSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                  Attaching: <span className="font-bold text-slate-900">{videoToAttach.title}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Target Resume</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.originalFilename})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Optional Note for Reviewer</label>
                  <input
                    type="text"
                    value={attachmentNotes}
                    onChange={(e) => setAttachmentNotes(e.target.value)}
                    placeholder="e.g. 60-second self pitch highlighting system architecture"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 flex items-start space-x-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Note: Videos are stored persistently as supplemental application media attachments. The platform does not claim that a binary video is embedded inside a static PDF/DOCX file.
                  </span>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setVideoToAttach(null)}
                    disabled={attaching}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAttachToResume}
                    disabled={attaching}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    {attaching ? 'Attaching...' : 'Confirm Attachment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
