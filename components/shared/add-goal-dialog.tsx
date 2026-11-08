"use client";

import { useEffect, useState } from "react";
import { useFinance } from "@/components/providers/finance-provider";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";

const COLORS = ["#5EEAD4", "#A78BFA", "#38BDF8", "#F59E0B", "#F472B6"];

export function AddGoalDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (message: string) => void;
}) {
  const { profile, createGoal } = useFinance();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTarget("");
    setSaved("");
    setTargetDate("");
    setPriority("medium");
    setError(null);
  }, [open]);

  function submit() {
    setError(null);
    const result = createGoal({
      name,
      target: Number(target),
      saved: saved ? Number(saved) : 0,
      targetDate: targetDate || undefined,
      priority,
      color: COLORS[profile.goals.length % COLORS.length],
      icon: "shield",
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onAdded?.(result.message);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a savings goal"
      description="Set the target now and add money whenever you like. Progress and Poyo's plan update immediately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Create goal</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="goal-name">
            What are you saving for?
          </label>
          <input
            id="goal-name"
            className="field"
            placeholder="New car, house deposit, sabbatical…"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="goal-target">
              Target amount
            </label>
            <input
              id="goal-target"
              className="field"
              inputMode="decimal"
              placeholder="0.00"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="goal-saved">
              Already saved (optional)
            </label>
            <input
              id="goal-saved"
              className="field"
              inputMode="decimal"
              placeholder="0.00"
              value={saved}
              onChange={(event) => setSaved(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="goal-date">
              Target date (optional)
            </label>
            <input
              id="goal-date"
              type="date"
              className="field"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="goal-priority">
              Priority
            </label>
            <select
              id="goal-priority"
              className="field"
              value={priority}
              onChange={(event) => setPriority(event.target.value as "high" | "medium" | "low")}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-white/25">
          The saved amount is a starting point only — it is not moved from a connected account.
        </p>

        {error ? <p className="text-[11px] text-coral">{error}</p> : null}
      </div>
    </Modal>
  );
}
