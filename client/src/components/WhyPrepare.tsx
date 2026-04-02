import React from 'react';
import { Clock, Phone, MapPin, FileText } from 'lucide-react';

export default function WhyPrepare() {
   const reasons = [
     {
       icon: <Clock className="h-8 w-8 text-primary-500" />,
       title: "Golden Hour",
       description: "The first hour after an accident is crucial. Quick access to medical info saves lives."
     },
     {
       icon: <Phone className="h-8 w-8 text-primary-500" />,
       title: "Emergency Contacts",
       description: "Instant access to family contacts when you can't communicate yourself."
     },
     {
       icon: <MapPin className="h-8 w-8 text-primary-500" />,
       title: "Location Sharing",
       description: "Help responders and family locate you quickly in emergency situations."
     },
     {
       icon: <FileText className="h-8 w-8 text-primary-500" />,
       title: "Medical History",
       description: "Critical medical information, allergies, and medications for proper treatment."
     }
   ];

   return (
     <div id="why-prepare" className="section bg-white">
       <div className="container-fluid">
         {/* Header */}
         <div className="text-center mb-16 animate-fade-in">
           <div className="inline-block mb-4">
             <span className="badge-primary">⚡ Critical Need</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
             Why Emergency Preparedness Matters
           </h2>
           <p className="text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            In emergency situations, every second counts. Having your critical information readily 
            accessible can make the difference between life and death.
          </p>
        </div>

         {/* Reasons Grid */}
         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {reasons.map((reason, index) => (
             <div
               key={index}
               className="card-elevated p-8 flex flex-col items-center text-center group"
               style={{ animationDelay: `${index * 50}ms` }}
             >
               <div className="p-4 bg-primary-100 rounded-lg mb-4 group-hover:bg-primary-200 transition-colors">
                 {reason.icon}
               </div>
               <h3 className="text-lg font-bold text-neutral-900 mb-2">{reason.title}</h3>
               <p className="text-neutral-600 text-sm leading-relaxed">{reason.description}</p>
            </div>
          ))}
        </div>
         
         {/* Road Safety Facts */}
         <div className="gradient-primary-dark rounded-2xl p-12 text-white">
          <div className="text-center">
             <h3 className="text-3xl md:text-4xl font-bold mb-6">Road Safety Facts in India</h3>
            <div className="grid md:grid-cols-3 gap-6">
               <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                 <div className="text-4xl font-bold mb-2">1.5L+</div>
                 <div className="text-sm opacity-90 font-medium">Annual road deaths</div>
              </div>
               <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                 <div className="text-4xl font-bold mb-2">69%</div>
                 <div className="text-sm opacity-90 font-medium">Two-wheeler victims</div>
              </div>
               <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                 <div className="text-4xl font-bold mb-2">4 min</div>
                 <div className="text-sm opacity-90 font-medium">One death every</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}