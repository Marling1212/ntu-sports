import { AdminUiScaleProvider } from "@/components/admin/AdminUiScaleProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ntu-gray">
      <AdminUiScaleProvider>{children}</AdminUiScaleProvider>
    </div>
  );
}

