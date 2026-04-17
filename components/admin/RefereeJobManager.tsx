"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";

interface RefereeJob {
  id: string;
  event_id: string;
  name: string;
  display_order: number;
  default_wage: number;
  is_active?: boolean;
}

interface RefereeJobManagerProps {
  eventId: string;
  initialJobs: RefereeJob[];
}

export default function RefereeJobManager({ eventId, initialJobs }: RefereeJobManagerProps) {
  const { t } = useI18n();
  const supabase = createClient();
  const [jobs, setJobs] = useState<RefereeJob[]>(initialJobs);
  const [newName, setNewName] = useState("");
  const [newWage, setNewWage] = useState("0");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingWage, setEditingWage] = useState("0");

  const orderedJobs = useMemo(
    () => [...jobs].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
    [jobs]
  );

  const addJob = async () => {
    const name = newName.trim();
    if (!name) return toast.error(t("referee.jobs.toastNameRequired"));
    const wage = Number(newWage);
    if (!Number.isFinite(wage) || wage < 0) return toast.error(t("referee.jobs.toastSalaryInvalid"));

    setSaving(true);
    const nextOrder = (orderedJobs[orderedJobs.length - 1]?.display_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("event_referee_jobs")
      .insert({
        event_id: eventId,
        name,
        display_order: nextOrder,
        default_wage: wage,
      })
      .select("id, event_id, name, display_order, default_wage, is_active")
      .single();
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message || t("referee.jobs.toastAddFail"));
      return;
    }

    setJobs((prev) => [...prev, data]);
    setNewName("");
    setNewWage("0");
    toast.success(t("referee.jobs.toastAddOk"));
  };

  const startEdit = (job: RefereeJob) => {
    setEditingId(job.id);
    setEditingName(job.name);
    setEditingWage(String(job.default_wage ?? 0));
  };

  const saveEdit = async (jobId: string) => {
    const name = editingName.trim();
    if (!name) return toast.error(t("referee.jobs.toastNameRequired"));
    const wage = Number(editingWage);
    if (!Number.isFinite(wage) || wage < 0) return toast.error(t("referee.jobs.toastSalaryInvalid"));

    setSaving(true);
    const { data, error } = await supabase
      .from("event_referee_jobs")
      .update({ name, default_wage: wage })
      .eq("id", jobId)
      .eq("event_id", eventId)
      .select("id, event_id, name, display_order, default_wage, is_active")
      .single();
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message || t("referee.jobs.toastUpdateFail"));
      return;
    }

    setJobs((prev) => prev.map((j) => (j.id === jobId ? data : j)));
    setEditingId(null);
    setEditingName("");
    setEditingWage("0");
    toast.success(t("referee.jobs.toastUpdateOk"));
  };

  const removeJob = async (job: RefereeJob) => {
    setSaving(true);
    const { error } = await supabase
      .from("event_referee_jobs")
      .delete()
      .eq("id", job.id)
      .eq("event_id", eventId);
    setSaving(false);

    if (error) {
      toast.error(error.message || t("referee.jobs.toastRemoveFail"));
      return;
    }

    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    toast.success(t("referee.jobs.toastRemoveOk"));
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <Toaster position="top-right" />
      <h2 className="text-xl font-semibold text-ntu-green">{t("referee.jobs.title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("referee.jobs.intro")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("referee.jobs.placeholderJobName")}
          className="min-w-[280px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
        />
        <input
          type="number"
          min={0}
          step="1"
          value={newWage}
          onChange={(e) => setNewWage(e.target.value)}
          placeholder={t("referee.jobs.placeholderDefaultSalary")}
          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
        />
        <button
          type="button"
          onClick={addJob}
          disabled={saving}
          className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {t("referee.jobs.addJob")}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {orderedJobs.length === 0 ? (
          <p className="text-sm text-gray-600">{t("referee.jobs.emptyHint")}</p>
        ) : (
          orderedJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              {editingId === job.id ? (
                <div className="flex min-w-[260px] flex-1 gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={editingWage}
                    onChange={(e) => setEditingWage(e.target.value)}
                    className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-800">{job.name}</span>
                  <span className="text-xs text-gray-600">
                    {t("referee.jobs.defaultSalaryLabel")} {t("referee.admin.currency")}{" "}
                    {Number(job.default_wage ?? 0).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === job.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveEdit(job.id)}
                      disabled={saving}
                      className="rounded-md bg-ntu-green px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {t("referee.jobs.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                        setEditingWage("0");
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      {t("referee.jobs.cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(job)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {t("referee.jobs.edit")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeJob(job)}
                  disabled={saving}
                  className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {t("referee.jobs.remove")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
