import LoadingSpinner from "@/components/LoadingSpinner";

export default function AnnouncementsLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" text="載入公告中..." />
      </div>
    </div>
  );
}
