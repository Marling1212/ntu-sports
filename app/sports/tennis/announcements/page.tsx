import { getTennisEvent, getTennisAnnouncements } from "@/lib/utils/getTennisEvent";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";

export default async function TennisAnnouncementsPage() {
  const event = await getTennisEvent();
  const announcements = event ? await getTennisAnnouncements(event.id) : [];

  return (
    <>
      <TennisNavbarClient />
      <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">Tennis Announcements</h1>
        <p className="text-lg text-gray-600">
          Important announcements and updates
        </p>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <p className="text-lg text-gray-500">No announcements yet.</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold text-ntu-green mb-3">
                {announcement.title}
              </h2>
              <div className="text-gray-700 mb-4 leading-relaxed">
                <MarkdownText content={announcement.content} />
              </div>
              <p className="text-sm text-gray-500">
                Posted: {new Date(announcement.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}

