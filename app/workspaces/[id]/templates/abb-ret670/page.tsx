import { ABBRET670Calculator } from '@/components/templates/ABBRET670Calculator';

export default function ABBRET670Page() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ABB RET670 CT Adequacy Check
          </h1>
          <p className="text-gray-600 mt-2">
            Multi-Function Transformer Protection CT adequacy calculation per Hitachi standards
          </p>
          <div className="flex gap-2 mt-4">
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Document: N-19957 2-DF4W
            </span>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              132kV/33kV Transformer
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              100MVA Rating
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Differential Protection
            </span>
          </div>
        </div>

        <ABBRET670Calculator />
      </div>
    </div>
  );
}