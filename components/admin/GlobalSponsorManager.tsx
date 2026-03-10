"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";

export type SponsorTier = 'Gold' | 'Silver' | 'Bronze';

interface SponsorRow {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier: SponsorTier;
}

interface GlobalSponsorManagerProps {
  initialSponsors: SponsorRow[];
}

export default function GlobalSponsorManager({ initialSponsors = [] }: GlobalSponsorManagerProps) {
  const [sponsors, setSponsors] = useState<SponsorRow[]>(initialSponsors);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" as SponsorTier });

  const supabase = createClient();

  const openAddSponsor = () => {
    setEditingSponsorId(null);
    setSponsorForm({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" });
    setShowSponsorModal(true);
  };

  const openEditSponsor = (sponsor: SponsorRow) => {
    setEditingSponsorId(sponsor.id);
    setSponsorForm({
      name: sponsor.name,
      logoUrl: sponsor.logo_url || "",
      websiteUrl: sponsor.website_url || "",
      tier: sponsor.tier,
    });
    setShowSponsorModal(true);
  };

  const closeSponsorModal = () => {
    setShowSponsorModal(false);
    setEditingSponsorId(null);
    setSponsorForm({ name: "", logoUrl: "", websiteUrl: "", tier: "Bronze" });
  };

  const submitSponsorForm = () => {
    const name = sponsorForm.name.trim();
    if (!name) {
      toast.error("Please enter a sponsor name");
      return;
    }
    const tier = sponsorForm.tier as SponsorTier;
    if (editingSponsorId) {
      setSponsors(sponsors.map((s) =>
        s.id === editingSponsorId
          ? { ...s, name, logo_url: sponsorForm.logoUrl || null, website_url: sponsorForm.websiteUrl || null, tier }
          : s
      ));
      toast.success("Sponsor updated locally");
    } else {
      setSponsors([
        ...sponsors,
        {
          id: `temp-${Date.now()}`,
          name,
          logo_url: sponsorForm.logoUrl || null,
          website_url: sponsorForm.websiteUrl || null,
          tier,
        },
      ]);
      toast.success("Sponsor added locally");
    }
    closeSponsorModal();
  };

  const deleteSponsor = (id: string) => {
    if (!confirm("Are you sure you want to delete this global sponsor?")) return;
    setSponsors(sponsors.filter((s) => s.id !== id));
    toast.success("Sponsor removed locally");
  };

  const saveSponsors = async () => {
    try {
      // 1. Delete all global sponsors (where event_id is null)
      await supabase.from("sponsors").delete().is("event_id", null);

      // 2. Insert new global sponsors
      const toInsert = sponsors.map((s) => ({
        event_id: null,
        name: s.name,
        logo_url: s.logo_url || null,
        website_url: s.website_url || null,
        tier: s.tier,
      }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("sponsors").insert(toInsert);
        if (error) throw error;
      }

      toast.success("Global Website Sponsors saved!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Error saving sponsors: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-ntu-gray">
      <nav className="sticky top-0 z-50 bg-ntu-green text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-xl font-bold hover:opacity-80 transition-opacity">
            後台 Dashboard
          </Link>
          <LogoutButton />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Toaster position="top-right" />
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/dashboard" className="text-ntu-green hover:underline">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 border-l-2 border-gray-300 pl-4">Global Website Sponsors</h1>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600 max-w-2xl">
              These sponsors will be displayed securely on the root homepage of NTU Sports. They are independent of any specific tournament event.
            </p>
            <button
              onClick={openAddSponsor}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              ➕ Add Global Sponsor
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {sponsors.length === 0 ? (
              <p className="text-gray-500 italic p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">No global sponsors currently configured. Click &quot;Add Global Sponsor&quot; to begin.</p>
            ) : (
              sponsors.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="w-16 h-16 object-contain rounded bg-white p-1 border shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-medium border shadow-sm">
                      No logo
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg">{sponsor.name}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        sponsor.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                        sponsor.tier === 'Silver' ? 'bg-gray-200 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {sponsor.tier}
                      </span>
                      {sponsor.website_url && (
                        <> · <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Website ↗</a></>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditSponsor(sponsor)}
                      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm w-24"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSponsor(sponsor.id)}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium w-24"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={saveSponsors}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors"
            >
              💾 Save All Global Sponsors
            </button>
          </div>
        </div>
      </main>

      {/* Sponsor modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] flex flex-col transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSponsorId ? "Edit Global Sponsor" : "New Global Sponsor"}
              </h3>
              <button onClick={closeSponsorModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company / Sponsor Name *</label>
                <input
                  type="text"
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-ntu-green outline-none transition-all shadow-sm"
                  placeholder="e.g. Nike, Red Bull, NTU Alumni"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={sponsorForm.logoUrl}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, logoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-ntu-green outline-none transition-all shadow-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={sponsorForm.websiteUrl}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-ntu-green outline-none transition-all shadow-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sponsorship Tier</label>
                <select
                  value={sponsorForm.tier}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, tier: e.target.value as SponsorTier })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-ntu-green outline-none transition-all shadow-sm bg-white"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 flex-shrink-0 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={closeSponsorModal}
                className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitSponsorForm}
                className="flex-1 bg-ntu-green text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
              >
                {editingSponsorId ? "Save Changes" : "Add Sponsor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
