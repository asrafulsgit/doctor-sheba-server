import fs from "fs";
import path from "path";
import { generatePrescriptionPDF } from "./prescription.template";

type PrescriptionProps = Parameters<typeof generatePrescriptionPDF>[0];

/** Same content as doctorsheba_online_prescription_demo.pdf */
export const demoPrescription: PrescriptionProps = {
  patient: {
    name: "Md. Sample Patient",
    id: "DS-P-000128",
    age: "32 Years",
    gender: "Male",
  },
  prescription: {
    id : "PT-P-000128",
    createdAt: "01 November 2026",
    followUpDate: "06 November 2026",
    medications: [
      {
        name: "Paracetamol 500 mg",
        dosage: "1 tablet",
        frequency: "Up to 3 times daily, if fever",
        duration: "3 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
      {
        name: "Cetirizine 10 mg",
        dosage: "1 tablet",
        frequency: "Once daily at night",
        duration: "5 days",
      },
    ], 
    diagnosis: "Acute upper respiratory tract infection (demo diagnosis)",
    instructions:
      "Drink adequate fluids and take sufficient rest. Monitor your symptoms. Seek medical attention if symptoms worsen.",
  },
  doctor: {
    name: "Dr. Farhana Rahman",
    qualification: "MBBS, FCPS (Medicine)",
    designation: "Consultant Physician",
    bmdcRegNo: "A-123456",
  }
};

/** Generates the demo PDF next to this file and returns its path. */
export async function runDemo(): Promise<string> {
  const pdf = await generatePrescriptionPDF(demoPrescription);
  const outPath = path.join(__dirname, "demo-prescription.pdf");
  fs.writeFileSync(outPath, pdf);
  console.log(`Wrote ${outPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
  return outPath;
}

runDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
