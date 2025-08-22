export default function Success() {
  return (
    <div className="min-h-screen grid place-items-center p-10">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">🛳️ CrewFlow is connected!</h1>
        <p className="mt-2 opacity-80">Your harbor is now linked. You can create products right away.</p>
        <a href="/dashboard" className="inline-block mt-6 rounded-xl px-4 py-2 bg-teal-600 text-white">Return to Dashboard</a>
      </div>
    </div>
  )
}
