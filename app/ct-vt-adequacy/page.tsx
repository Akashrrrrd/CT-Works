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
    <div className="container mx-auto py-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">⚡ CT/VT Adequacy Check</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-3xl mx-auto">
          Professional-grade automated analysis for current and voltage transformer adequacy. 
          Enter basic system parameters and get instant results with detailed calculations.
        </p>
      </div>
      
      <AdequacyWizard />
    </div>
  );
}