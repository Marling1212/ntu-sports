export default function Footer() {
  // Use a static year to avoid hydration mismatches
  // This is safe as the year rarely changes between SSR and hydration
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-ntu-green text-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-sm">
            © {currentYear} National Taiwan University Sports Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

