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
              src="https://images.unsplash.com/photo-1633356088312-f5de4cedf0e8?auto=format&fit=crop&w=800&q=80"
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