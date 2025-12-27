import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Hero() {
  return (
    <div id="home" className="pt-16 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center mb-6">
              <AlertTriangle className="h-8 w-8 text-orange-500 mr-3" />
              <span className="text-orange-600 font-semibold text-lg">Emergency Preparedness</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Bike Accidents in India:
              <span className="text-orange-500"> Be Prepared, Stay Safe</span>
            </h1>
            <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="text-red-800">
                <p className="font-semibold text-lg">Alarming Statistics:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Over 1.5 lakh people die in road accidents annually in India</li>
                  <li>• 69% of road accident victims are two-wheeler riders</li>
                  <li>• Every 4 minutes, someone dies in a road accident</li>
                  <li>• 70% of accidents happen due to human error</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-lg text-gray-600">
              Create your emergency information QR code to help first responders and family members 
              access critical information when every second counts.
            </p>
            <div className="mt-8 flex space-x-4">
              <a 
                href="#emergency-info"
                className="bg-orange-500 text-white px-8 py-3 rounded-full hover:bg-orange-600 transition-colors flex items-center"
              >
                <Shield className="mr-2 h-5 w-5" />
                Create Emergency QR
              </a>
              <a 
                href="#safety-tips"
                className="border-2 border-orange-500 text-orange-500 px-8 py-3 rounded-full hover:bg-orange-50 transition-colors"
              >
                Safety Tips
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src="data:image/jpeg;base64,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"
              alt="Emergency QR Code - Emergency Information"
              className="rounded-lg shadow-xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Be Prepared</p>
                  <p className="text-sm text-gray-600">Emergency info ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}