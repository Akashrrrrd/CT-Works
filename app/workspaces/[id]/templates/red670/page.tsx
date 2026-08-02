import { RED670Calculator } from '@/components/templates/RED670Calculator';

export default function RED670Page() {
 return (
 <div className="container mx-auto py-8 px-4">
 <div className="max-w-7xl mx-auto">
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-gray-900">
 RED670 CT Adequacy Check
 </h1>
 <p className="text-gray-600 mt-2">
 132kV Cable Feeders - Line Differential & Distance Protection per Engineering standards
 </p>
 <div className="flex gap-2 mt-4">
 <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
 </span>
 <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
 132kV Cable Feeders
 </span>
 <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
 Line Differential
 </span>
 <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">
 Distance Protection
 </span>
 </div>
 </div>

 <RED670Calculator />
 </div>
 </div>
 );
}