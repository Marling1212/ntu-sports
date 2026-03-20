"use client";

import { useEffect, useState } from "react";

export interface SponsorItem {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
}

interface EventSponsorBannerProps {
  sponsors: SponsorItem[];
  /** Label above the logos. Default: "Supported by" */
  label?: string;
}

export default function EventSponsorBanner({ sponsors, label = "Supported by" }: EventSponsorBannerProps) {
  if (!sponsors?.length) return null;

  return (
    <section className="mb-8" aria-label="Event sponsors">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center mb-4">
        {label}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {sponsors.map((sponsor) => (
          <SponsorLogo
            key={sponsor.id}
            sponsorName={sponsor.name}
            logoUrl={sponsor.logo_url}
            websiteUrl={sponsor.website_url}
          />
        ))}
      </div>
    </section>
  );
}

interface SponsorLogoProps {
  sponsorName: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

function SponsorLogo({ sponsorName, logoUrl, websiteUrl }: SponsorLogoProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = logoUrl && !imgError;

  // If the logo URL changes (e.g. after data refresh), retry loading.
  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);
  const content = (
    <div className="group flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 bg-white/50 min-w-[100px] md:min-w-[120px] min-h-[60px] md:min-h-[72px] transition-all duration-300 hover:border-ntu-green/40 hover:shadow-sm">
      {showImg ? (
        <img
          src={logoUrl}
          alt={sponsorName}
          className="max-h-12 md:max-h-16 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
          loading="eager"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-semibold text-gray-600 text-center">{sponsorName}</span>
      )}
    </div>
  );

  if (websiteUrl) {
    return (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ntu-green/50 rounded-lg"
      >
        {content}
      </a>
    );
  }

  return content;
}
