import { Siemens7SJ85Calculator } from '@/components/templates/Siemens7SJ85Calculator';

export default function Siemens7SJ85Page() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            SIEMENS 7SJ85 CT/VT Adequacy Check
          </h1>
          <p className="text-gray-600 mt-2">
            Complete CT/VT adequacy calculation for 132/33kV substation per Hitachi standards
          </p>
          <div className="flex gap-2 mt-4">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Document: N-19957 2-DF4W
            </span>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Al Dhafra Area
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Hitachi Standards
            </span>
          </div>
        </div>

        <Siemens7SJ85Calculator />
      </div>
    </div>
  );
}