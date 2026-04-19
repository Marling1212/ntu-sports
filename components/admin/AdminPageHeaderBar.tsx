"use client";

import Link from "next/link";
import AdminFontSizeControl from "@/components/admin/AdminFontSizeControl";

/** Simple header row for admin pages without AdminNavbar (feedback, etc.). */
export default function AdminPageHeaderBar({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold text-ntu-green">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <AdminFontSizeControl variant="light" />
        <Link href={backHref} className="text-ntu-green font-medium hover:underline whitespace-nowrap">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
