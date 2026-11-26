// demo-invoice.ts
// Run:  npx tsx demo-invoice.ts      (or: npx ts-node demo-invoice.ts)
// Writes demo-invoice.pdf and demo-invoice-detailed.pdf into this same folder.
import fs from "fs";
import path from "path";
import { generateInvoicePDF } from "./invoice.template";

type InvoiceProps = Parameters<typeof generateInvoicePDF>[0];

const settings: InvoiceProps["settings"] = {
  name: "Doctor",
  nameAccent: "Sheba",
  logo: "https://i.ibb.co.com/hFqGjh62/logo.png",   // URL or Buffer; omit to use the built-in mark
  tagline: "Your healthcare, made simpler.",
  thankYou: "Thank you for choosing DoctorSheba.",
  footer:
    "This is a computer-generated invoice and does not require a signature. " +
    "Please keep this invoice and your transaction ID for future reference.",
  supportEmail: "support@doctorsheba.com",
};

/** Same content as doctorsheba_invoice_template_v3.pdf: one consultation fee. */
export const demoSimple: InvoiceProps = {
  patient: {
    name: "Karim Ahmed",
    id: "PAT-000045",
    phone: "+880 1XXX-XXXXXX",
    email: "karim@example.com",
  },
  doctor: {
    name: "Dr. Nusrat Jahan",
    specialty: "Cardiologist",
    bmdcRegNo: "A-12345",
    qualification: "MBBS, MD (Cardiology)",
    designation: "Consultant",
    fee : 1000
  },
  appointment: {
    id: "APT-8F31A2",
    date: "25 Nov 2026",
    time: "10:30 AM – 11:00 AM",
    type: "Video consultation",
  },
  payment: {
    transactionId: "pi_3QxExample9AbCd",
    method: "Stripe",
    date: "22 Nov 2026",
    status : "UNPAID"
  }
};

/** Bengali names, several line items, discount and VAT, a bKash payment. */
export const demoDetailed: InvoiceProps = {
  ...demoSimple,
  patient: { ...demoSimple.patient, name: "করিম আহমেদ (Karim Ahmed)" },
  doctor: { 
    ...demoSimple.doctor, 
    name: "ডা. নুসরাত জাহান", 
    fee : 1200
},
  appointment: { 
    ...demoSimple.appointment, 
    type: "In-person visit" 
}
};

/** Generates the demo PDFs next to this file and returns their paths. */
export async function runDemo(): Promise<string[]> {
  const jobs: Array<[string, InvoiceProps]> = [
    ["demo-invoice-detailed.pdf", demoDetailed],
  ];
  console.log(jobs)
  const written: string[] = [];
  for (const [fileName, props] of jobs) {
    const pdf = await generateInvoicePDF(props);
    const outPath = path.join(__dirname, fileName);
    fs.writeFileSync(outPath, pdf);
    console.log(`Wrote ${outPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
    written.push(outPath);
  }
  return written;
}

runDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
