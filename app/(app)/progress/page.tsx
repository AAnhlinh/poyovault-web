import type { Metadata } from "next";
import { MissionControlView } from "@/components/gamification/mission-control-view";

export const metadata: Metadata = {
  title: "Mission control",
};

export default function ProgressPage() {
  return <MissionControlView />;
}
