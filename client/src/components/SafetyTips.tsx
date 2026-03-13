import React from 'react';
import { Shield as Helmet, Eye, Wrench, Clock, Shield, AlertCircle } from 'lucide-react';

export default function SafetyTips() {
  const tips = [
    {
      icon: <Helmet className="h-6 w-6 text-orange-500" />,
      title: "Always Wear a Helmet",
      description: "ISI marked helmets reduce head injury risk by 70%"
    },
    {
      icon: <Eye className="h-6 w-6 text-orange-500" />,
      title: "Stay Visible",
      description: "Use headlights during day, wear bright colors"
    },
    {
      icon: <Wrench className="h-6 w-6 text-orange-500" />,
      title: "Regular Maintenance",
      description: "Check brakes, tires, and lights regularly"
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-500" />,
      title: "Avoid Rush Hours",
      description: "Plan your journey to avoid heavy traffic"
    },
    {
      icon: <Shield className="h-6 w-6 text-orange-500" />,
      title: "Defensive Riding",
      description: "Anticipate other drivers' actions"
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-orange-500" />,
      title: "No Phone Usage",
      description: "Never use mobile while riding"
    }
  ];

  return (
    <div id="safety-tips" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Essential Safety Tips</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Prevention is better than cure. Follow these essential safety tips to reduce 
            your risk of accidents while riding.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                {tip.icon}
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{tip.title}</h3>
              </div>
              <p className="text-gray-600">{tip.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-yellow-800">Emergency Preparedness</h3>
              <p className="mt-2 text-yellow-700">
                Always carry your emergency QR code, keep your phone charged, and inform someone 
                about your travel plans. In case of an accident, stay calm and call 108 for 
                emergency services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}