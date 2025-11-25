import Link from "next/link";

export default function Footer() {
  // Use a static year to avoid hydration mismatches
  // This is safe as the year rarely changes between SSR and hydration
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-ntu-green to-green-700 text-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-6">
          <div className="animate-fadeIn">
            <h3 className="text-base sm:text-lg font-bold mb-3">關於 NTU Sports</h3>
            <p className="text-xs sm:text-sm text-green-100 leading-relaxed">
              台大運動賽事管理平台，提供即時賽程、戰績、籤表與公告服務
            </p>
          </div>
          <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-base sm:text-lg font-bold mb-3">快速連結</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/" className="text-green-100 hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>→</span> 首頁
                </Link>
              </li>
              <li>
                <span className="text-green-100">支援多種運動：網球、籃球、足球、排球等</span>
              </li>
            </ul>
          </div>
          <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-base sm:text-lg font-bold mb-3">功能特色</h3>
            <ul className="space-y-1 text-xs sm:text-sm text-green-100">
              <li className="flex items-center gap-2">
                <span>✓</span> <span>即時賽程更新</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>完整戰績統計</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>自動化公告系統</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>多運動支援</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-600 pt-4 sm:pt-6 text-center">
          <p className="text-xs sm:text-sm text-green-100">
            © {currentYear} 台灣大學運動賽事管理平台. All rights reserved.
          </p>
          <p className="text-xs text-green-200 mt-2">
            Made with ❤️ for NTU Sports Community
          </p>
        </div>
      </div>
    </footer>
  );
}

