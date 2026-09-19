import { redirect } from "next/navigation";
import { requireMedical } from "@/lib/medical/server";
import MedicalWorkspace from "@/components/medical/MedicalWorkspace";

export default async function Page() {
  let name: string;
  try { name = (await requireMedical()).name; }
  catch { redirect("/historiales/ingresar"); }
  return <MedicalWorkspace doctor={name} />;
}
