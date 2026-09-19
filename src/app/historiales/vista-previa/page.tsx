import { notFound } from "next/navigation";
import MedicalPreview from "@/components/medical/MedicalPreview";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MedicalPreview />;
}
