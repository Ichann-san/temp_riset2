// Patient identity fields of the wireframe "Form Pendaftaran" (frame 3) + Pekerjaan, reused by Daftar ulang
// ("Ubah"). Labels, placeholders and hints are shared with patient registration
// (lib/identity-meta.ts); messages are the PRD texts.
import { Field, SelectField } from "@/components/frame";
import { site } from "@/content";
import { identityHints, identityLabels, identityPlaceholders } from "@/lib/identity-meta";

export type IdentityValues = { name: string; nik: string; birthDate: string; addressKtp: string; addressHome: string; phone: string; gender: string; occupation: string };
export type IdentityKey = keyof IdentityValues;
export const emptyIdentityValues: IdentityValues = { name: "", nik: "", birthDate: "", addressKtp: "", addressHome: "", phone: "", gender: "", occupation: "" };

const fields = (["name", "nik", "birthDate", "addressKtp", "addressHome", "phone", "gender", "occupation"] as IdentityKey[])
  .map((key) => [key, identityLabels[key]] as const);

export type IdentityCheck = { message: string; invalid: IdentityKey[] } | null;

/** "Mohon isi semua kolom!" when something is empty, "Data tidak valid!" when NIK or phone has the wrong shape. */
export function checkIdentity(values: IdentityValues): IdentityCheck {
  const empty = fields.map(([key]) => key).filter((key) => !values[key].trim());
  if (empty.length) return { message: site.messages.required, invalid: empty };
  const invalid: IdentityKey[] = [];
  if (!/^\d{16}$/.test(values.nik.trim())) invalid.push("nik");
  // Synthetic records use placeholder phones such as 08xx-xxxx-0001, so "x" is accepted for now.
  if (!/^\+?[\dx\- ]{10,16}$/i.test(values.phone.trim())) invalid.push("phone");
  return invalid.length ? { message: site.messages.invalid, invalid } : null;
}

export function IdentityFields({ idPrefix, values, invalid, onChange }: {
  idPrefix: string; values: IdentityValues; invalid: IdentityKey[]; onChange: (key: IdentityKey, value: string) => void;
}) {
  return <>{fields.map(([key, label]) => {
    const bad = invalid.includes(key);
    const common = { id: `${idPrefix}-${key}`, name: key, className: "field", "aria-invalid": bad || undefined, value: values[key] };
    return <Field key={key} label={label} hint={bad ? undefined : identityHints[key]} error={bad && key === "nik" ? site.messages.nikLength : undefined}>
      {key === "gender"
        ? <SelectField {...common} onChange={(event) => onChange(key, event.target.value)}>
          <option value="">{site.messages.chooseGender}</option><option>Perempuan</option><option>Laki-laki</option></SelectField>
        : <input {...common} type={key === "birthDate" ? "date" : key === "phone" ? "tel" : "text"}
          inputMode={key === "nik" ? "numeric" : undefined} placeholder={identityPlaceholders[key]} autoComplete="off" onChange={(event) => onChange(key, event.target.value)} />}
    </Field>;
  })}</>;
}
