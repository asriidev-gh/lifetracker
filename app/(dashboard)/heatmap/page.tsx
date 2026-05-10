import { redirect } from "next/navigation";

export default function HeatmapPage() {
  redirect("/dashboard?insights=1");
}
