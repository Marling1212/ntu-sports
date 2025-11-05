import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-ntu-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity">
            NTU Sports
          </Link>
          <div className="flex gap-6">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              Home
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

