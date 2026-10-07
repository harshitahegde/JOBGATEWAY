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
        {/* Provider Architecture Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-lg text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span>Service Providers & Status</span>
          </h2>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Job Search Provider</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded">Unconnected (Pending Live API)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Email Sender Provider</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded">Draft-Only / SMTP Safe</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>ATS & Resume Engine</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">FastAPI & TS Parity Active</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span>Data Ownership Guard</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">Enforced (req.user.userId)</span>
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
