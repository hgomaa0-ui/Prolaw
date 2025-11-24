"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-start justify-center pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat bg-gray-900/80"
      style={{ backgroundImage: "url('/prolaw-bg.jpg')" }}
    >
      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm rounded-lg p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to ProLaw
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Manage your legal clients and cases efficiently
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <div>
            <Link
              href="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </Link>
          </div>
          <div>
            <Link
              href="/register"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}