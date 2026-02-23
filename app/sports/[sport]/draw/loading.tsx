import BracketSkeleton from "@/components/BracketSkeleton";
import SeasonPlaySkeleton from "@/components/SeasonPlaySkeleton";

export default function DrawLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <SeasonPlaySkeleton />
      <BracketSkeleton />
    </div>
  );
}
