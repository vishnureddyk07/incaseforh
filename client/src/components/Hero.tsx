import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Timer } from 'lucide-react';

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
    <div id="home" className="pt-16 bg-gradient-to-b from-orange-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-7 w-7 text-orange-500 mr-3" />
              <span className="text-orange-600 font-semibold text-base">Emergency-ready in minutes</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Be found. Be treated fast.
              <span className="text-orange-500"> Your QR could save a life.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl">
              Create an emergency QR once, stick it on your helmet or bike, and give first responders
              instant access to your medical info and family contacts when every second counts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-white border border-orange-100 text-orange-700 text-sm font-semibold">
                3-minute setup
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-orange-100 text-orange-700 text-sm font-semibold">
                Works offline after print
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-orange-100 text-orange-700 text-sm font-semibold">
                Shareable with family
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#emergency-info"
                className="bg-orange-500 text-white px-8 py-3 rounded-full hover:bg-orange-600 transition-colors flex items-center shadow-md"
              >
                <Shield className="mr-2 h-5 w-5" />
                Create Emergency QR
              </a>
              <a
                href="#safety-tips"
                className="border-2 border-orange-500 text-orange-500 px-8 py-3 rounded-full hover:bg-orange-50 transition-colors"
              >
                View Safety Tips
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-orange-500" />
                  <p className="text-sm font-semibold text-gray-700">3 steps to be ready</p>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">Takes ~2 min</span>
              </div>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 items-start">
                    <div className="h-9 w-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
                <p className="text-sm opacity-90">Golden hour</p>
                <p className="text-2xl font-bold">First 60 minutes</p>
                <p className="text-sm opacity-90 mt-1">Faster info = faster care</p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-700">Works when scanned</p>
                  <p className="text-sm font-semibold text-gray-900">Anywhere your sticker goes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}