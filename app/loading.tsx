import LoadingSpinner from "@/components/LoadingSpinner";
import SkeletonLoader from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="載入頁面中..." />
      </div>
    </div>
  );
}
