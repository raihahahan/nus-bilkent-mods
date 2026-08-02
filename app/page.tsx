import Planner from "@/components/Planner";
import { activeAdapter } from "@/adapters/active";

export default function Home() {
  return <Planner partner={activeAdapter.config} mappings={activeAdapter.mappings} offerings={activeAdapter.offerings} />;
}
