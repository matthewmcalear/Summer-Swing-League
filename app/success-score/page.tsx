import Link from 'next/link';

export default function ScoreSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <h2 className="text-2xl font-bold mt-4 mb-2">Score Submitted!</h2>
        <p className="text-gray-600 mb-6">Thanks for submitting your round.</p>
        <Link href="/" className="block w-full py-2 px-4 rounded-md text-white bg-green-600 hover:bg-green-700">Return Home</Link>
      </div>
    </div>
  );
} 