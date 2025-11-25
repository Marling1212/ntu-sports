import Link from "next/link";

export default function Footer() {
  // Use a static year to avoid hydration mismatches
  // This is safe as the year rarely changes between SSR and hydration
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-ntu-green text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          <div>
            <h3 className="text-lg font-bold mb-3">關於 NTU Sports</h3>
            <p className="text-sm text-green-100">
              台大運動賽事管理平台，提供即時賽程、戰績、籤表與公告服務
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-3">快速連結</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-green-100 hover:text-white transition-colors">
                  首頁
                </Link>
              </li>
              <li>
                <span className="text-green-100">支援多種運動：網球、籃球、足球、排球等</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-3">功能特色</h3>
            <ul className="space-y-1 text-sm text-green-100">
              <li>✓ 即時賽程更新</li>
              <li>✓ 完整戰績統計</li>
              <li>✓ 自動化公告系統</li>
              <li>✓ 多運動支援</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-700 pt-6 text-center">
          <p className="text-sm text-green-100">
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

