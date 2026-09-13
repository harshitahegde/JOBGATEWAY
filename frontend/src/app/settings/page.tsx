"use client";

import React from 'react';
import { Settings, Shield, Server, Cpu, Database, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Architecture Diagnostics</h1>
        <p className="text-sm text-slate-500 mt-1">Configure environment abstractions, mock providers, and microservices status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mock Providers Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-lg text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span>Mock Providers & Credentials</span>
          </h2>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>USE_MOCK_SERVICES</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">TRUE (Local Mode)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Job Search Provider</span>
              <span className="font-semibold text-slate-900">MockJobProvider</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Email Finder Provider</span>
              <span className="font-semibold text-slate-900">MockEmailFinderProvider</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Email Sender Provider</span>
              <span className="font-semibold text-slate-900">MockEmailSenderProvider</span>
            </div>
          </div>
        </div>

        {/* Services Status Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-lg text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Server className="w-5 h-5 text-purple-600" />
            <span>Active Microservices</span>
          </h2>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Node.js / Express Backend</span>
              <span className="flex items-center text-emerald-600 font-bold">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Port 5000
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Python / FastAPI AI Service</span>
              <span className="flex items-center text-emerald-600 font-bold">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Port 8000
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Next.js Frontend</span>
              <span className="flex items-center text-emerald-600 font-bold">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Port 3000
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Database Engine</span>
              <span className="font-semibold text-slate-900">MySQL / Prisma Compatible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
