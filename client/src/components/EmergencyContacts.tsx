import React from 'react';
import { Phone, Clock } from 'lucide-react';

export default function EmergencyContacts() {
  const contacts = [
    {
      name: "Emergency Services",
      number: "108",
      description: "Medical emergency, ambulance service",
      available: "24/7"
    },
    {
      name: "Police",
      number: "100",
      description: "Police emergency, accident reporting",
      available: "24/7"
    },
    {
      name: "Fire Department",
      number: "101",
      description: "Fire emergency, rescue operations",
      available: "24/7"
    },
    {
      name: "Traffic Police",
      number: "103",
      description: "Traffic violations, road accidents",
      available: "24/7"
    },
    {
      name: "Women Helpline",
      number: "1091",
      description: "Women safety and emergency",
      available: "24/7"
    },
    {
      name: "Child Helpline",
      number: "1098",
      description: "Child safety and emergency",
      available: "24/7"
    }
  ];

  return (
    <div id="emergency-contacts" className="section bg-neutral-50">
      <div className="container-fluid">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block mb-4">
            <span className="badge-danger">Emergency Hotline</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">Emergency Contact Numbers</h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            Keep these important emergency numbers handy. In case of an accident, 
            call the appropriate number immediately.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact, index) => (
            <div key={index} className="card-elevated p-6 hover:border-primary-200 transition-colors">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">{contact.number}</div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">{contact.name}</h3>
                <p className="text-neutral-600 mb-3">{contact.description}</p>
                <div className="flex items-center justify-center text-sm text-success-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {contact.available}
                </div>
              </div>
              <div className="mt-4 text-center">
                <a
                  href={`tel:${contact.number}`}
                  className="btn-primary-md inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call Now
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 alert-warning p-6 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Reminder</h3>
            <p className="text-yellow-800">
              Save these numbers in your phone contacts. In emergency situations, 
              you might not have internet access to look them up. Stay prepared, stay safe!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}