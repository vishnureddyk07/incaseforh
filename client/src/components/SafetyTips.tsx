import React from 'react';
import { Shield as Helmet, Eye, Wrench, Clock, Shield, AlertCircle } from 'lucide-react';

export default function SafetyTips() {
  const tips = [
    {
      icon: <Helmet className="h-6 w-6 text-primary-500" />,
      title: "Always Wear a Helmet",
      description: "ISI marked helmets reduce head injury risk by 70%"
    },
    {
      icon: <Eye className="h-6 w-6 text-primary-500" />,
      title: "Stay Visible",
      description: "Use headlights during day, wear bright colors"
    },
    {
      icon: <Wrench className="h-6 w-6 text-primary-500" />,
      title: "Regular Maintenance",
      description: "Check brakes, tires, and lights regularly"
    },
    {
      icon: <Clock className="h-6 w-6 text-primary-500" />,
      title: "Avoid Rush Hours",
      description: "Plan your journey to avoid heavy traffic"
    },
    {
      icon: <Shield className="h-6 w-6 text-primary-500" />,
      title: "Defensive Riding",
      description: "Anticipate other drivers' actions"
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-primary-500" />,
      title: "No Phone Usage",
      description: "Never use mobile while riding"
    }
  ];

  return (
    <div id="safety-tips" className="section bg-neutral-50">
      <div className="container-fluid">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block mb-4">
            <span className="badge-primary">🛡️ Safety First</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Essential Safety Tips
          </h2>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Prevention is better than cure. Follow these essential safety tips to reduce 
            your risk of accidents while riding.
          </p>
        </div>

        {/* Tips Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="card-elevated p-8 group hover:border-primary-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-3 bg-primary-100 rounded-lg w-fit mb-4 group-hover:bg-primary-200 transition-colors">
                {tip.icon}
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">{tip.title}</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">{tip.description}</p>
            </div>
          ))}
        </div>
        
        {/* Emergency Preparedness Alert */}
        <div className="alert-warning p-8 rounded-xl">
          <div className="flex gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg h-fit">
              <AlertCircle className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-900 mb-2">Emergency Preparedness</h3>
              <p className="text-yellow-800 leading-relaxed">
                Always carry your emergency QR code, keep your phone charged, and inform someone 
                about your travel plans. In case of an accident, stay calm and call <span className="font-bold">108</span> for 
                emergency services.
              </p>
              <div className="flex gap-3 mt-4">
                <a href="#emergency-info" className="btn-secondary-sm flex items-center gap-2">
                  Create QR Now →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}