"use client";

import { useState, useTransition } from "react";
import {
  addMemberToTeam,
  removeMemberFromTeam,
} from "@/app/actions/team-members";

type ActiveTeam = {
  teamMemberId: number;
  teamId: number;
  teamName: string;
  seasonName: string | null;
  joinedAt: string;
};

type AvailableTeam = {
  id: number;
  name: string;
  seasonName: string | null;
};

type Props = {
  memberId: number;
  activeTeams: ActiveTeam[];
  availableTeams: AvailableTeam[];
};

export function MemberTeamsSection({
  memberId,
  activeTeams,
  availableTeams,
}: Props) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const teamId = Number(selectedTeamId);
    if (!Number.isFinite(teamId) || teamId === 0) return;
    startTransition(async () => {
      await addMemberToTeam(teamId, memberId);
      setSelectedTeamId("");
    });
  };

  const handleRemove = (teamMemberId: number, teamId: number) => {
    startTransition(async () => {
      await removeMemberFromTeam(teamMemberId, teamId);
    });
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-medium">Teams</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {activeTeams.length === 0
            ? "Dit lid zit niet in een team."
            : activeTeams.length === 1
              ? "1 actief team."
              : `${activeTeams.length} actieve teams.`}
        </p>
      </header>

      {activeTeams.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {activeTeams.map((t) => (
            <li
              key={t.teamMemberId}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {t.teamName}
                </div>
                <div className="text-xs text-slate-500">
                  {t.seasonName ?? "-"} · Lid sinds{" "}
                  {new Date(t.joinedAt).toLocaleDateString("nl-BE")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(t.teamMemberId, t.teamId)}
                disabled={isPending}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Verwijder
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableTeams.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="add-team"
                className="block text-xs font-medium text-slate-700"
              >
                Toevoegen aan team
              </label>
              <select
                id="add-team"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={isPending}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="">-- Kies een team --</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.seasonName ? ` (${t.seasonName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !selectedTeamId}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Voeg toe
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
