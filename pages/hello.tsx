import React from 'react';

export default function HelloPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Hello</h1>
      <p className="mt-4 text-gray-400">The API route has been moved to <code>/api/hello</code>. Visit <a className="text-yellow-400 underline" href="/api/hello">/api/hello</a> for the JSON response.</p>
    </div>
  );
}
