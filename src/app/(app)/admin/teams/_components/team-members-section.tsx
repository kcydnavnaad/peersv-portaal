"use client";

import { useState, useTransition } from "react";
import {
  addMemberToTeam,
  removeMemberFromTeam,
} from "@/app/actions/team-members";

type ActiveMember = {
  teamMemberId: number;
  memberId: number;
  firstName: string;
  lastName: string;
  joinedAt: string; // YYYY-MM-DD
};

type AvailableMember = {
  id: number;
  firstName: string;
  lastName: string;
};

type Props = {
  teamId: number;
  activeMembers: ActiveMember[];
  availableMembers: AvailableMember[];
};

export function TeamMembersSection({
  teamId,
  activeMembers,
  availableMembers,
}: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const memberId = Number(selectedMemberId);
    if (!Number.isFinite(memberId) || memberId === 0) return;
    startTransition(async () => {
      await addMemberToTeam(teamId, memberId);
      setSelectedMemberId("");
    });
  };

  const handleRemove = (teamMemberId: number) => {
    startTransition(async () => {
      await removeMemberFromTeam(teamMemberId, teamId);
    });
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-medium">Leden</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {activeMembers.length} actieve {activeMembers.length === 1 ? "lid" : "leden"} in dit team.
        </p>
      </header>

      {activeMembers.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          Nog geen leden in dit team.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activeMembers.map((m) => (
            <li
              key={m.teamMemberId}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {m.firstName} {m.lastName}
                </div>
                <div className="text-xs text-slate-500">
                  Lid sinds {new Date(m.joinedAt).toLocaleDateString("nl-BE")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(m.teamMemberId)}
                disabled={isPending}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Verwijder
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableMembers.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="add-member"
                className="block text-xs font-medium text-slate-700"
              >
                Lid toevoegen
              </label>
              <select
                id="add-member"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={isPending}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="">-- Kies een lid --</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !selectedMemberId}
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
