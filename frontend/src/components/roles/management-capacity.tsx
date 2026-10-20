// /management/capacity — Kuota layanan (read-only). The backend Capacity panel (review token, numbers exactly as the
// API returns them) is unchanged and only wrapped in the main block.
import { Capacity } from "@/components/capacity";
import { Block } from "@/components/frame";

export function ManagementCapacity() {
  return <Block id="main" energy={4} protect="fluid" className="ws-capacity">
    <Capacity />
  </Block>;
}
