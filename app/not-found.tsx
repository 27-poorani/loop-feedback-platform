import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}