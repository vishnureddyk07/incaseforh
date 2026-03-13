import React from 'react';
import { Clock, Phone, MapPin, FileText } from 'lucide-react';

export default function WhyPrepare() {
  const reasons = [
    {
      icon: <Clock className="h-8 w-8 text-orange-500" />,
      title: "Golden Hour",
      description: "The first hour after an accident is crucial. Quick access to medical info saves lives."
    },
    {
      icon: <Phone className="h-8 w-8 text-orange-500" />,
      title: "Emergency Contacts",
      description: "Instant access to family contacts when you can't communicate yourself."
    },
    {
      icon: <MapPin className="h-8 w-8 text-orange-500" />,
      title: "Location Sharing",
      description: "Help responders and family locate you quickly in emergency situations."
    },
    {
      icon: <FileText className="h-8 w-8 text-orange-500" />,
      title: "Medical History",
      description: "Critical medical information, allergies, and medications for proper treatment."
    }
  ];

  return (
    <div id="why-prepare" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Why Emergency Preparedness Matters</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            In emergency situations, every second counts. Having your critical information readily 
            accessible can make the difference between life and death.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, index) => (
            <div key={index} className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="flex justify-center">{reason.icon}</div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 text-center">{reason.title}</h3>
              <p className="mt-2 text-gray-600 text-center">{reason.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Road Safety Facts in India</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">1.5L+</div>
                <div className="text-sm opacity-90">Annual road deaths</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">69%</div>
                <div className="text-sm opacity-90">Two-wheeler victims</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">4 min</div>
                <div className="text-sm opacity-90">One death every</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}