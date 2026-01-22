import LoadingSpinner from "@/components/LoadingSpinner";
import SkeletonLoader from "@/components/SkeletonLoader";

export default function SportLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <SkeletonLoader variant="text" lines={2} className="max-w-md mx-auto" />
      </div>
      <div className="flex justify-center">
        <LoadingSpinner size="lg" text="載入賽事資料中..." />
      </div>
    </div>
  );
}
