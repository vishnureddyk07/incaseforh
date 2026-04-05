import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Timer, Building2 } from 'lucide-react';

const steps = [
  {
    title: 'Fill vital details',
    description: 'Name, date of birth, phone, and alternates so responders can reach family fast.',
  },
  {
    title: 'Generate your QR',
    description: 'We create a scannable QR that links to your emergency profile.',
  },
  {
    title: 'Stick it on your helmet',
    description: 'Print or receive the sticker so anyone can scan within seconds.',
  },
];

export default function Hero() {
  return (
    <div id="home" className="gradient-primary">
      <div className="container-fluid section">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary-500" />
              </div>
              <span className="text-primary-600 font-semibold text-sm">Emergency-ready in minutes</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight mb-6">
              Be found.
              <br />
              Be treated fast.
              <span className="block text-primary-500 mt-2">Your QR could save a life.</span>
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-neutral-600 max-w-2xl mb-8 leading-relaxed">
              Create your emergency profile once and keep two linked stickers ready. Responders can view
              your critical data and reach family in seconds when time matters most.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-10">
              <span className="badge-primary">⚡ 3-minute setup</span>
              <span className="badge-primary">📱 Works offline</span>
              <span className="badge-primary">👥 Shareable profile</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#emergency-info"
                className="btn-primary-lg justify-center sm:justify-start"
              >
                <Shield className="mr-2 h-5 w-5" />
                Generate My QR
              </a>
              <a
                href="#corporate"
                className="btn-secondary-lg justify-center sm:justify-start"
              >
                <Building2 className="mr-2 h-5 w-5" />
                For Hospitals & Companies
              </a>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div className="space-y-4 animate-slide-up">
            {/* Main Info Card */}
            <div className="card-elevated p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Timer className="h-5 w-5 text-primary-500" />
                  </div>
                  <p className="font-semibold text-neutral-900">3 Simple Steps</p>
                </div>
                <span className="badge-success text-xs">Quick</span>
              </div>

              <div className="space-y-5">
                {steps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-lg bg-primary-100 flex-shrink-0 flex items-center justify-center text-primary-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-neutral-900 text-sm">{step.title}</p>
                      <p className="text-neutral-600 text-sm mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Golden Hour Card */}
              <div className="gradient-primary-dark rounded-xl text-white p-6 shadow-lg">
                <div className="text-xs font-semibold opacity-80 mb-2">Golden Hour</div>
                <div className="text-3xl font-bold mb-1">60 min</div>
                <div className="text-xs opacity-80">First minutes critical</div>
              </div>

              {/* Success Card */}
              <div className="card-elevated p-6 flex items-center justify-center text-center">
                <div>
                  <CheckCircle className="h-8 w-8 text-success-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-600">Works anywhere</p>
                  <p className="font-semibold text-neutral-900 text-sm">Your sticker goes live</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}