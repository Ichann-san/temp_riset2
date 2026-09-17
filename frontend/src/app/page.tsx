import Link from "next/link";
import { PrototypeNote } from "@/components/prototype";

const roles = [
  { href: "/patient", code: "PA", title: "Pasien", description: "Daftar, ikuti antrean, temukan ruangan, dan akses hasil MCU." },
  { href: "/staff", code: "PT", title: "Petugas", description: "Kelola worklist, check-in, antrean stasiun, dan input hasil." },
  { href: "/clinician", code: "TK", title: "Tenaga Kesehatan", description: "Tinjau hasil terintegrasi dan verifikasi kelengkapan MCU." },
  { href: "/management", code: "MN", title: "Manajemen", description: "Pantau waktu layanan, bottleneck, kapasitas, dan kepuasan." },
];

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[#f4f7f8] px-5 py-8 sm:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d6e1e4] pb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#0f766e] text-lg font-black text-white">I</span>
            <div><p className="text-xl font-bold tracking-[-0.04em] text-[#102a37]">ISLAH</p><p className="text-xs text-[#60747d]">RSUD Haji Provinsi Jawa Timur</p></div>
          </div>
          <PrototypeNote />
        </header>
        <section className="grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#102a37] sm:text-6xl">Satu perjalanan MCU, terlihat dari awal hingga hasil.</h1>
          <div className="lg:pb-2"><p className="max-w-xl text-base leading-7 text-[#526a74] sm:text-lg">Prototype layanan Medical Check Up terintegrasi untuk pasien, petugas, tenaga kesehatan, dan manajemen.</p><p className="mt-4 text-sm font-semibold text-[#087f73]">One Service, Selesai Hasil Hari Ini.</p></div>
        </section>
        <section aria-labelledby="role-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><h2 id="role-heading" className="text-lg font-bold text-[#102a37]">Pilih tampilan berdasarkan peran</h2><p className="text-xs text-[#687b83]">Navigasi tersedia untuk keperluan review UI</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((role) => <Link key={role.href} href={role.href} className="group surface flex min-h-44 flex-col justify-between p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#75bdb5] sm:p-6"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#e3f4f1] text-xs font-bold text-[#075f58]">{role.code}</span><span className="text-sm font-semibold text-[#087f73] group-hover:text-[#075f58]">Buka tampilan</span></div><div className="mt-7"><h3 className="text-xl font-bold tracking-[-0.025em] text-[#102a37]">{role.title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#5d707a]">{role.description}</p></div></Link>)}
          </div>
        </section>
      </div>
    </main>
  );
}
