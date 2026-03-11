"use client";

import { useState } from "react";

export interface GlobalSponsorItem {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier: 'Gold' | 'Silver' | 'Bronze';
}

interface GlobalSponsorBannerProps {
  sponsors: GlobalSponsorItem[];
}

export default function GlobalSponsorBanner({ sponsors }: GlobalSponsorBannerProps) {
  if (!sponsors?.length) return null;

  // Separate sponsors by tier for layout hierarchy
  const goldSponsors = sponsors.filter(s => s.tier === 'Gold');
  const silverSponsors = sponsors.filter(s => s.tier === 'Silver');
  const bronzeSponsors = sponsors.filter(s => s.tier === 'Bronze');

  return (
    <div className="py-12 mt-12 mb-8 border-t border-gray-100" aria-label="Global Website Sponsors">
      <div className="text-center mb-8">
        <h2 className="text-sm sm:text-2xl font-bold text-gray-400 sm:text-gray-500 uppercase tracking-widest">
          Proudly Supported By
        </h2>
      </div>

      <div className="flex flex-col gap-12 items-center justify-center max-w-5xl mx-auto px-4">
        {/* Gold Tier - Largest Displays */}
        {goldSponsors.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 w-full">
            {goldSponsors.map(sponsor => (
              <SponsorLogo key={sponsor.id} sponsor={sponsor} size="large" />
            ))}
          </div>
        )}

        {/* Silver Tier - Medium Displays */}
        {silverSponsors.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 w-full">
            {silverSponsors.map(sponsor => (
              <SponsorLogo key={sponsor.id} sponsor={sponsor} size="medium" />
            ))}
          </div>
        )}

        {/* Bronze Tier - Small Displays */}
        {bronzeSponsors.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 w-full opacity-80 hover:opacity-100 transition-opacity">
            {bronzeSponsors.map(sponsor => (
              <SponsorLogo key={sponsor.id} sponsor={sponsor} size="small" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SponsorLogo({ sponsor, size }: { sponsor: GlobalSponsorItem, size: 'large' | 'medium' | 'small' }) {
  const dimensions = {
    large: "max-h-24 md:max-h-32 min-h-24 md:min-h-32 min-w-[200px]",
    medium: "max-h-16 md:max-h-20 min-h-16 md:min-h-20 min-w-[150px]",
    small: "max-h-12 md:max-h-14 min-h-12 md:min-h-14 min-w-[100px]",
  };

  const imgSizes = {
    large: "max-h-20 md:max-h-28 w-auto max-w-[180px] md:max-w-[240px]",
    medium: "max-h-14 md:max-h-18 w-auto max-w-[140px] md:max-w-[180px]",
    small: "max-h-10 md:max-h-12 w-auto max-w-[100px] md:max-w-[120px]",
  };

  const textSizes = {
    large: "text-2xl",
    medium: "text-xl",
    small: "text-base",
  };

  const [imgError, setImgError] = useState(false);
  const showImg = sponsor.logo_url && !imgError;
  const content = (
    <div className={`group flex flex-col items-center justify-center p-4 rounded-xl border border-transparent bg-white/30 transition-all duration-500 hover:bg-white/80 hover:shadow-lg hover:-translate-y-1 ${dimensions[size]}`}>
      {showImg ? (
        <img
          src={sponsor.logo_url || ""}
          alt={sponsor.name}
          className={`object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-sm ${imgSizes[size]}`}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={`font-bold text-gray-400 group-hover:text-ntu-green transition-colors ${textSizes[size]}`}>
          {sponsor.name}
        </span>
      )}
    </div>
  );

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none focus-visible:ring-4 focus-visible:ring-ntu-green/30 rounded-xl"
        title={`Visit ${sponsor.name}`}
      >
        {content}
      </a>
    );
  }

  return content;
}
