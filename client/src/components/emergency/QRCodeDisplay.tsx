import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  qrValue: string;
  onDownload: () => void;
}

export default function QRCodeDisplay({ qrValue, onDownload }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-lg">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <QRCodeSVG
          value={qrValue}
          size={220}
          level="H"
          includeMargin={true}
          className="qr-code-svg"
        />
      </div>
      
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <Smartphone className="h-5 w-5 text-orange-500 mr-2" />
          <span className="font-semibold text-gray-900">How to use:</span>
        </div>
        <p className="text-sm text-gray-600 mb-4 max-w-sm">
          Scan this QR code with any smartphone camera to instantly access your emergency 
          information. Keep this code accessible for emergency responders and family members.
        </p>
      </div>

      <div className="space-y-3 w-full max-w-xs">
        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full hover:bg-orange-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </button>
        
        <div className="text-xs text-gray-500 text-center">
          Save to your phone's photo gallery or print and keep in your wallet
        </div>
      </div>
    </div>
  );
}