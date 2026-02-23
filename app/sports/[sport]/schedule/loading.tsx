import SeasonPlaySkeleton from "@/components/SeasonPlaySkeleton";

export default function ScheduleLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SeasonPlaySkeleton />
    </div>
  );
}
