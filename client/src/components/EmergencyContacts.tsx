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
    <div id="emergency-contacts" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Emergency Contact Numbers</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Keep these important emergency numbers handy. In case of an accident, 
            call the appropriate number immediately.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 mb-2">{contact.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{contact.name}</h3>
                <p className="text-gray-600 mb-3">{contact.description}</p>
                <div className="flex items-center justify-center text-sm text-green-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {contact.available}
                </div>
              </div>
              <div className="mt-4 text-center">
                <a
                  href={`tel:${contact.number}`}
                  className="inline-flex items-center bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Important Reminder</h3>
            <p className="text-red-700">
              Save these numbers in your phone contacts. In emergency situations, 
              you might not have internet access to look them up. Stay prepared, stay safe!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}