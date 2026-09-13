"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Video as VideoIcon, Camera, Square, Play, RefreshCw, Upload, CheckCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

export default function VideoIntroPage() {
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [videoTitle, setVideoTitle] = useState('60s Software Engineer Pitch');
  const [uploading, setUploading] = useState(false);
  const [uploadedVideos, setUploadedVideos] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    fetchUploadedVideos();
  }, []);

  const fetchUploadedVideos = async () => {
    try {
      const res = await api.get('/videos');
      setUploadedVideos(res.data.videos || []);
    } catch (err) {
      console.error('Failed to fetch videos', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert('Camera access error: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  const startRecording = () => {
    if (!mediaStream) return;
    setRecordedChunks([]);
    setVideoBlob(null);
    setVideoUrl(null);

    const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!videoBlob) {
      alert('No recorded video available to upload');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('video', videoBlob, 'intro_video.webm');
      formData.append('title', videoTitle);

      const res = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Video self-introduction uploaded successfully!');
      fetchUploadedVideos();
      stopCamera();
    } catch (err: any) {
      alert('Upload error: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          <span>HTML5 MediaRecorder WebCam Module</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Video Self-Introduction Studio</h1>
        <p className="text-sm text-slate-500 mt-1">Record a concise 60-second video pitch to attach to your recruiter outreach</p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Recorder Container */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl text-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="font-bold text-lg flex items-center space-x-2">
            <Camera className="w-5 h-5 text-rose-500" />
            <span>WebCam Recorder</span>
          </h2>
          <span className="text-xs text-slate-400">Max Duration: 60s</span>
        </div>

        {/* Video Canvas */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
          ) : (
            <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}

          {!mediaStream && !videoUrl && (
            <div className="text-center space-y-3 p-6">
              <VideoIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">Click below to activate your browser webcam & microphone</p>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow transition"
              >
                Enable Camera
              </button>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center space-x-3">
            {mediaStream && !recording && !videoUrl && (
              <button
                onClick={startRecording}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-ping"></div>
                <span>Start Recording</span>
              </button>
            )}

            {recording && (
              <button
                onClick={stopRecording}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 transition"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording</span>
              </button>
            )}

            {videoUrl && (
              <button
                onClick={() => { setVideoUrl(null); startCamera(); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center space-x-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-record</span>
              </button>
            )}
          </div>

          {videoBlob && (
            <div className="flex items-center space-x-3 flex-1 justify-end">
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Saving...' : 'Save & Attach'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Videos List */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-slate-900">Saved Video Self-Introductions</h3>
        {uploadedVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploadedVideos.map((v) => (
              <div key={v.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-slate-900">{v.title}</h4>
                <p className="text-xs text-slate-500">Recorded on {new Date(v.createdAt).toLocaleDateString()}</p>
                <video src={`http://localhost:5000${v.filePath}`} controls className="w-full rounded-lg mt-2 max-h-48 bg-black" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">No recorded videos stored yet.</p>
        )}
      </div>
    </div>
  );
}
