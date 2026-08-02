/**
 * CT/VT ADEQUACY CHECK - MAIN PAGE
 * Modern user-friendly interface for electrical engineers
 */

import { Metadata } from 'next';
import { AdequacyWizard } from '@/components/ct-vt-adequacy/AdequacyWizard';

export const metadata: Metadata = {
 title: 'CT/VT Adequacy Check - Automated Calculation System',
 description: 'Professional CT/VT adequacy analysis for electrical protection systems. Automated calculations from basic parameters.',
 keywords: 'CT adequacy, VT adequacy, current transformer, voltage transformer, electrical protection, IED, power system',
};

export default function CTVTAdequacyPage() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
 <div className="container mx-auto py-8 px-4">
 {/* Enhanced Header Section */}
 <div className="mb-10">
 <div className="text-center mb-6">
 <div className="inline-flex items-center gap-3 mb-4">
 <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
 <span className="text-white text-2xl">⚡</span>
 </div>
 <div className="text-left">
 <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
 CT/VT Adequacy Check
 </h1>
 <p className="text-sm text-muted-foreground font-medium">Professional Engineering Solutions</p>
 </div>
 </div>
 
 <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
 Automated analysis for current and voltage transformer adequacy in electrical protection systems. 
 Enter basic parameters and receive comprehensive calculations with detailed engineering reports.
 </p>
 </div>
 
 {/* Feature Highlights */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
 <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
 <span className="text-green-600 text-xl">🔄</span>
 </div>
 <div>
 <h3 className="font-semibold text-gray-800">Automated Calculations</h3>
 <p className="text-sm text-gray-600">Derives all parameters from basic inputs</p>
 </div>
 </div>
 </div>
 
 <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
 <span className="text-blue-600 text-xl">📊</span>
 </div>
 <div>
 <h3 className="font-semibold text-gray-800">Professional Reports</h3>
 <p className="text-sm text-gray-600">Detailed PDF documentation</p>
 </div>
 </div>
 </div>
 
 <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
 <span className="text-purple-600 text-xl">🎯</span>
 </div>
 <div>
 <h3 className="font-semibold text-gray-800">Multi-IED Support</h3>
 <p className="text-sm text-gray-600">Siemens, ABB, SEL, and more</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 
 {/* Main Wizard Container */}
 <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
 <AdequacyWizard />
 </div>
 </div>
 </div>
 );
}