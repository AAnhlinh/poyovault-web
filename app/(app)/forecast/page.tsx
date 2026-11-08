import type { Metadata } from "next";
import { ForecastView } from "@/components/forecast/forecast-view";

export const metadata: Metadata = {
  title: "Financial forecast",
};

export default function ForecastPage() {
  return <ForecastView />;
}
