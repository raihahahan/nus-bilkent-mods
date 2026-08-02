import Planner from "@/components/Planner";
import { availableAdapters } from "@/adapters";

export default function Home() {
  return <Planner adapters={availableAdapters} />;
}
