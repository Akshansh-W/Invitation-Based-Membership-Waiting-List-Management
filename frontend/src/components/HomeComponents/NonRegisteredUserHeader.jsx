export default function NonRegisteredUserHeader() {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-4 border-b border-green-100">
      <h1 className="text-xl font-bold text-green-800">
        Art ShowCase
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Guest
        </span>

        <a
          href="/admin/login"
          className="rounded-lg border border-green-700 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
        >
          Admin Login
        </a>

        <a
          href="/register"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Register
        </a>
      </div>
    </header>
  );
}