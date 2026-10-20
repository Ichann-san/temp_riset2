import Image from "next/image";
import logo from "@/assets/logo.png";

/** Existing RSUD Haji artwork, kept intact; the surrounding link supplies its name. */
export function BrandLogo({ large = false }: { large?: boolean }) {
  return <Image className="brand-logo" data-large={large || undefined} src={logo} alt="RSUD Haji Provinsi Jawa Timur"
    width={large ? 112 : 44} height={large ? 112 : 44} sizes={large ? "112px" : "44px"} />;
}
