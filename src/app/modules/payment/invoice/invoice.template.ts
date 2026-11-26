// invoice-pdf-generator.ts
import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  email: string;
}

interface Doctor {
  name: string;
  specialty?: string;
  bmdcRegNo: string;
  qualification?: string;
  designation?: string;
  fee: number;
}

interface Appointment {
  id: string;
  date: string; 
  time: string; // "10:30 AM – 11:00 AM"
  type: string;
}

type Status =
  | "PAID"
  | "UNPAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REFUND_FAILED";
interface Payment {
  transactionId: string;
  method: string;
  date: string;
  status: Status;
}

interface CompanySettings {
  name: string; 
  nameAccent?: string; 
  logo?: string | Buffer; 
  tagline?: string;
  thankYou?: string;
  footer?: string; 
  supportEmail?: string;
}

interface PDFGeneratorProps {
  patient: Patient;
  doctor: Doctor;
  appointment: Appointment;
  payment: Payment;
  settings?: CompanySettings;
  colors?: Partial<typeof defaultColors>;
  fontDir?: string;
}

const defaultColors = {
  primary: "#1D4ED8",
  navy: "#1E3A8A",
  text: "#1F2937",
  muted: "#64748B",
  border: "#E2E8F0",
  panel: "#F8FAFC",
  tableHead: "#EFF6FF",
  accent: "#2698A5",
  white: "#FFFFFF",
};

const defaultSettings: CompanySettings = {
  name: "Doctor",
  nameAccent: "Sheba",
  logo: "https://i.ibb.co.com/hFqGjh62/logo.png", // URL or Buffer; omit to use the built-in mark
  tagline: "Your healthcare, made simpler.",
  thankYou: "Thank you for choosing DoctorSheba.",
  footer:
    "This is a computer-generated invoice and does not require a signature. " +
    "Please keep this invoice and your transaction ID for future reference.",
  supportEmail: "hello@doctorsheba.bd",
};

const statusStyles: Record<
  Status,
  { label: string; bg: string; border: string; text: string; cell: string }
> = {
  PAID: {
    label: "PAID",
    bg: "#ECFDF5",
    border: "#BBF7D0",
    text: "#166534",
    cell: "Successful",
  },
  UNPAID: {
    label: "UNPAID",
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#92400E",
    cell: "Unpaid",
  },
  FAILED: {
    label: "FAILED",
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#991B1B",
    cell: "Failed",
  },
  REFUND_PENDING: {
    label: "REFUND PENDING",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1E40AF",
    cell: "Refund pending",
  },
  REFUNDED: {
    label: "REFUNDED",
    bg: "#F1F5F9",
    border: "#CBD5E1",
    text: "#334155",
    cell: "Refunded",
  },
  REFUND_FAILED: {
    label: "REFUND FAILED",
    bg: "#FFF1F2",
    border: "#FECDD3",
    text: "#9F1239",
    cell: "Refund failed",
  },
};

const FONT_FILES = {
  Sans: "Inter-Regular.ttf",
  "Sans-Bold": "Inter-SemiBold.ttf",
  Display: "Manrope-Bold.ttf",
  Fallback: "HindSiliguri-Regular.ttf",
  "Fallback-Bold": "HindSiliguri-Bold.ttf",
};

type Face = "sans" | "sansBold" | "display";

const FACES: Record<Face, [string, string]> = {
  sans: ["Sans", "Fallback"],
  sansBold: ["Sans-Bold", "Fallback-Bold"],
  display: ["Display", "Fallback-Bold"],
};

const BENGALI = /[\u0980-\u09FF\u200C\u200D]/;

export async function generateInvoicePDF({
  patient,
  doctor,
  appointment,
  payment,
  settings = defaultSettings,
  colors: colorOverrides,
  fontDir = path.join(
    typeof __dirname !== "undefined" ? __dirname : process.cwd(),
    "fonts",
  ),
}: PDFGeneratorProps): Promise<Buffer> {
  let logoBuffer: Buffer | undefined;

  if (typeof settings?.logo === "string" && settings.logo) {
    try {
      const response = await fetch(settings.logo);
      logoBuffer = Buffer.from(await response.arrayBuffer());
    } catch (err) {
      console.error("Failed to fetch logo", err);
    }
  } else if (Buffer.isBuffer(settings?.logo)) {
    logoBuffer = settings?.logo;
  }

  return new Promise((resolve, reject) => {
    try {
      // margin 0: every position below is set by hand
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Invoice ${appointment.id} – ${settings?.name}${settings?.nameAccent || ""}`,
          Author: `${settings?.name}${settings?.nameAccent || ""}`,
        },
      });

      Object.entries(FONT_FILES).forEach(([name, file]) =>
        doc.registerFont(name, path.join(fontDir, file)),
      );

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const colors = { ...defaultColors, ...colorOverrides };
      const style = statusStyles[payment.status];

      const issuedDate = format(new Date(), "dd MMM yyyy");

      // ============ TOTALS (integer minor units, no float drift) ============
      const money = (amount: number) =>
        `৳ ${amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      // ============ PAGE SETTINGS ============
      const marginX = 51;
      const pageWidth = doc.page.width;
      const pageRight = pageWidth - marginX; // 544.28
      const contentWidth = pageRight - marginX;
      const marginTop = 51;
      const pageBottomLimit = doc.page.height - 51;

      let y = 0;

      const ensureSpace = (neededHeight: number): boolean => {
        if (y + neededHeight > pageBottomLimit) {
          doc.addPage();
          y = marginTop;
          return true;
        }
        return false;
      };

      // ============ SMALL HELPERS ============
      // Split text into runs: Bengali characters (and ৳) use the fallback font,
      // everything else uses the main font.
      const splitRuns = (str: string) => {
        const chars = Array.from(str);
        const runs: { text: string; bn: boolean }[] = [];
        chars.forEach((ch, i) => {
          let bn = BENGALI.test(ch);
          if (!bn && /\s/.test(ch)) {
            // a space stays inside a Bengali run only between two Bengali characters
            const next = chars.slice(i + 1).find((c) => !/\s/.test(c));
            bn =
              i > 0 &&
              BENGALI.test(chars[i - 1]) &&
              !!next &&
              BENGALI.test(next);
          }
          const last = runs[runs.length - 1];
          if (last && last.bn === bn) last.text += ch;
          else runs.push({ text: ch, bn });
        });
        return runs;
      };

      const fontOf = (face: Face, bn: boolean) => FACES[face][bn ? 1 : 0];

      const widthOf = (str: string, size: number, face: Face = "sans") =>
        splitRuns(str).reduce(
          (w, r) =>
            w +
            doc.font(fontOf(face, r.bn)).fontSize(size).widthOfString(r.text),
          0,
        );

      // `top` is the visual top of the text. All runs share one baseline, because
      // PDFKit positions by line box and each font has a different ascender.
      const txt = (
        str: string,
        x: number,
        top: number,
        o: {
          size?: number;
          face?: Face;
          color?: string;
          width?: number;
          align?: "left" | "center" | "right";
        } = {},
      ) => {
        const size = o.size ?? 9;
        const face = o.face ?? "sans";
        let text = str;

        // shorten with "…" if it does not fit the given width
        if (o.width && widthOf(text, size, face) > o.width) {
          const Seg = (Intl as any).Segmenter;
          const g: string[] = Seg
            ? Array.from(
                new Seg(undefined, { granularity: "grapheme" }).segment(text),
                (x: any) => x.segment,
              )
            : Array.from(text);
          while (g.length && widthOf(g.join("") + "…", size, face) > o.width)
            g.pop();
          text = g.join("") + "…";
        }

        let cx = x;
        if (o.width && o.align === "right")
          cx = x + o.width - widthOf(text, size, face);
        else if (o.width && o.align === "center")
          cx = x + (o.width - widthOf(text, size, face)) / 2;

        const baseline = top + 0.793 * size;
        doc.fillColor(o.color ?? colors.text);
        splitRuns(text).forEach((r) => {
          doc.font(fontOf(face, r.bn)).fontSize(size);
          const ascender = ((doc as any)._font.ascender / 1000) * size;
          doc.text(r.text, cx, baseline - ascender, { lineBreak: false });
          cx += doc.widthOfString(r.text);
        });
      };

      const wrap = (str: string, width: number, size: number): string[] => {
        const lines: string[] = [];
        let line = "";
        for (const word of str.split(/\s+/).filter(Boolean)) {
          const next = line ? `${line} ${word}` : word;
          if (widthOf(next, size) <= width || !line) line = next;
          else {
            lines.push(line);
            line = word;
          }
        }
        if (line) lines.push(line);
        return lines;
      };

      const line = (
        x1: number,
        x2: number,
        yy: number,
        color: string,
        w: number,
      ) =>
        doc
          .moveTo(x1, yy)
          .lineTo(x2, yy)
          .strokeColor(color)
          .lineWidth(w)
          .stroke();

      const vline = (
        x: number,
        y1: number,
        y2: number,
        color: string,
        w: number,
      ) =>
        doc
          .moveTo(x, y1)
          .lineTo(x, y2)
          .strokeColor(color)
          .lineWidth(w)
          .stroke();

      // ============ HEADER SECTION ============
      // Logo - left
      const logoX = marginX;
      const logoY = 63;

      if (logoBuffer) {
        doc.image(logoBuffer, logoX, logoY, { fit: [32, 32] });
      } else {
        // built-in stethoscope mark
        doc.roundedRect(logoX, logoY, 32, 32, 8).fill(colors.primary);
        doc.circle(logoX + 9, logoY + 8, 2).fill(colors.white);
        doc.circle(logoX + 23, logoY + 8, 2).fill(colors.white);
        doc
          .moveTo(logoX + 9, logoY + 10)
          .lineTo(logoX + 9, logoY + 16)
          .bezierCurveTo(
            logoX + 9,
            logoY + 21.5,
            logoX + 12.5,
            logoY + 24,
            logoX + 16,
            logoY + 24,
          )
          .bezierCurveTo(
            logoX + 19.5,
            logoY + 24,
            logoX + 23,
            logoY + 21.5,
            logoX + 23,
            logoY + 16,
          )
          .lineTo(logoX + 23, logoY + 10)
          .moveTo(logoX + 16, logoY + 24)
          .lineTo(logoX + 16, logoY + 25.5)
          .lineWidth(2)
          .lineCap("round")
          .lineJoin("round")
          .strokeColor(colors.white)
          .stroke();
        doc.circle(logoX + 16, logoY + 27.6, 2.4).fill(colors.white);
      }

      // Company name + tagline - right of logo
      const infoX = 92;
      const nameWidth = widthOf(settings?.name || "", 17, "display");
      txt(settings?.name || "", infoX, 67, { size: 17, face: "display" });
      if (settings?.nameAccent) {
        txt(settings.nameAccent, infoX + nameWidth + 4, 67, {
          size: 17,
          face: "display",
          color: colors.primary,
        });
      }
      if (settings?.tagline) {
        txt(settings.tagline, infoX, 86, { size: 7.2, color: colors.muted });
      }

      // INVOICE title + number - right side
      txt("INVOICE", marginX, 72, {
        size: 18,
        face: "display",
        color: colors.navy,
        width: contentWidth,
        align: "right",
      });
      // ============ DIVIDER ============
      line(marginX, pageRight, 107.6, colors.primary, 1.4);

      // ============ STATUS + DATES ============
      const badgeText = style.label;
      const badgeHeight = 22.7;
      const badgeWidth = Math.max(62.4, widthOf(badgeText, 9, "sansBold") + 28);
      const badgeY = 124.4;

      doc
        .roundedRect(marginX, badgeY, badgeWidth, badgeHeight, 4)
        .lineWidth(0.6)
        .fillAndStroke(style.bg, style.border);
      txt(badgeText, marginX, badgeY + (badgeHeight - 9) / 2 + 0.7, {
        size: 9,
        face: "sansBold",
        color: style.text,
        width: badgeWidth,
        align: "center",
      });

      // "Issued: <bold date>" right aligned
      const rightLabel = (label: string, value: string, top: number) => {
        const vW = widthOf(value, 9, "sansBold");
        const lW = widthOf(`${label} `, 9);
        txt(`${label} `, pageRight - vW - lW, top, { size: 9 });
        txt(value, pageRight - vW, top, { size: 9, face: "sansBold" });
      };
      rightLabel("Issued:", issuedDate, badgeY + 0.6);
      if (payment.date)
        rightLabel("Payment date:", payment.date, badgeY + 13.6);

      // ============ BILLED TO / CONSULTATION WITH ============
      y = 168.6;

      type InfoLine = { text: string; muted?: boolean };
      const keep = (xs: Array<InfoLine | "" | undefined | false>) =>
        xs.filter(Boolean) as InfoLine[];

      const colWidth = contentWidth / 2;
      const panelPad = 9;
      const columns = [
        {
          x: marginX,
          label: "BILLED TO",
          name: patient.name,
          lines: keep([
            patient.id && {
              text: `Patient ID: ${patient.id}`,
              muted: true,
            },
            patient.phone && { text: `Phone: ${patient.phone}` },
            patient.email && { text: `Email: ${patient.email}` },
          ]),
        },
        {
          x: marginX + colWidth,
          label: "CONSULTATION WITH",
          name: doctor.name,
          lines: keep([
            (doctor.specialty || doctor.bmdcRegNo) && {
              text: [
                doctor.specialty,
                doctor.bmdcRegNo && `BMDC Reg. No. ${doctor.bmdcRegNo}`,
              ]
                .filter(Boolean)
                .join(" · "),
              muted: true,
            },
            doctor.qualification && {
              text: `Qualification: ${doctor.qualification}`,
            },
            doctor.designation && {
              text: `Designation: ${doctor.designation}`,
            },
          ]),
        },
      ];

      // panel grows if a column has more lines than the default
      let panelBottom = y + 81.3;
      columns.forEach((c) => {
        let yy = y + 24.4 + 13;
        c.lines.forEach((l) => (yy += l.muted ? 11 : 13));
        panelBottom = Math.max(panelBottom, yy + 6.9);
      });
      const panelHeight = panelBottom - y;

      doc.rect(marginX, y, contentWidth, panelHeight).fill(colors.panel);
      doc
        .rect(marginX, y, contentWidth, panelHeight)
        .lineWidth(0.55)
        .strokeColor(colors.border)
        .stroke();
      vline(marginX + colWidth, y, y + panelHeight, colors.border, 0.55);

      columns.forEach((c) => {
        const x = c.x + panelPad;
        const w = colWidth - panelPad * 2;
        txt(c.label, x, y + 10.4, {
          size: 7.2,
          face: "sansBold",
          color: colors.muted,
        });
        txt(c.name, x, y + 24.4, {
          size: 10,
          face: "display",
          color: colors.navy,
          width: w,
        });
        let lineY = y + 24.4 + 13;
        c.lines.forEach((l) => {
          txt(l.text, x, lineY, {
            size: l.muted ? 8 : 9,
            color: l.muted ? colors.muted : colors.text,
            width: w,
          });
          lineY += l.muted ? 11 : 13;
        });
      });

      y += panelHeight;

      // ============ TABLE HELPER (label row + value row) ============
      const drawTable = (
        cols: {
          label: string;
          width: number;
          value: string;
          bold?: boolean;
          color?: string;
        }[],
        rowH: number,
      ) => {
        const headH = 23;
        const pad = 7;
        const h = headH + rowH;

        doc.rect(marginX, y, contentWidth, headH).fill(colors.tableHead);
        doc
          .rect(marginX, y, contentWidth, h)
          .lineWidth(0.55)
          .strokeColor(colors.border)
          .stroke();
        line(marginX, pageRight, y + headH, colors.border, 0.4);

        let x = marginX;
        cols.forEach((c, i) => {
          if (i > 0) vline(x, y, y + h, colors.border, 0.4);
          txt(c.label, x + pad, y + (headH - 7.2) / 2 + 0.7, {
            size: 7.2,
            face: "sansBold",
            color: colors.muted,
            width: c.width - pad * 2,
          });
          txt(c.value, x + pad, y + headH + (rowH - 9) / 2 + 0.7, {
            size: 9,
            face: c.bold ? "sansBold" : "sans",
            color: c.color ?? colors.text,
            width: c.width - pad * 2,
          });
          x += c.width;
        });
        y += h;
      };

      const heading = (title: string, gapAfter: number) => {
        txt(title, 57, y, { size: 10, face: "display", color: colors.navy });
        y += gapAfter;
      };

      // ============ APPOINTMENT DETAILS ============
      y += 22;
      ensureSpace(16.4 + 49);
      heading("APPOINTMENT DETAILS", 16.4);
      drawTable(
        [
          {
            label: "APPOINTMENT ID",
            width: 121.9,
            value: appointment.id,
            bold: true,
          },
          { label: "DATE", width: 107.7, value: appointment.date, bold: true },
          { label: "TIME", width: 136.1, value: appointment.time, bold: true },
          {
            label: "TYPE",
            width: contentWidth - 121.9 - 107.7 - 136.1,
            value: appointment.type,
            bold: true,
          },
        ],
        26,
      );

      // ============ PAYMENT DETAILS ============
      y += 22;
      ensureSpace(16.9 + 50);
      heading("PAYMENT DETAILS", 16.9);
      drawTable(
        [
          {
            label: "TRANSACTION ID",
            width: 167.3,
            value: payment.transactionId || "—",
            bold: true,
          },
          {
            label: "PAYMENT METHOD",
            width: 107.7,
            value: payment.method || "—",
          },
          { label: "PAYMENT DATE", width: 121.9, value: payment.date || "—" },
          {
            label: "STATUS",
            width: contentWidth - 167.3 - 107.7 - 121.9,
            value: payment.status || style.cell,
            bold: true,
            color: payment.status === "PAID" ? colors.text : style.text,
          },
        ],
        27,
      );

      // ============ PAYMENT SUMMARY ============
      y += 22;
      ensureSpace(16.4 + 34);
      heading("PAYMENT SUMMARY", 16.4);
      line(marginX, pageRight, y, colors.border, 0.8);

      const amountRight = (
        str: string,
        top: number,
        size: number,
        face: Face,
        color: string,
      ) =>
        txt(str, marginX, top, {
          size,
          face,
          color,
          width: contentWidth - 8,
          align: "right",
        });

      const rowHeight = 36;
      ensureSpace(rowHeight);

      const nameTop = y + 7;
      txt("Specialist consultation", 58, nameTop, { size: 9, width: 300 });

      txt(`${doctor.designation}`, 58, y + 20, {
        size: 7.5,
        color: colors.muted,
        width: 300,
      });

      amountRight(money(doctor.fee), nameTop, 9, "sansBold", colors.text);

      y += rowHeight;
      line(marginX, pageRight, y, colors.border, 0.55);
      y += 38;
      line(marginX, pageRight, y, colors.border, 0.8);

      // ============ FOOTER ============
      const footerLines = settings?.footer
        ? wrap(settings.footer, 481.3, 8)
        : [];
      ensureSpace(24.3 + 17 + footerLines.length * 11 + 40);

      if (settings?.thankYou) {
        txt(settings.thankYou, 57, y + 11.3, { size: 9, face: "sansBold" });
      }

      let footerY = y + 28.3;
      footerLines.forEach((l) => {
        txt(l, 57, footerY, { size: 8, color: colors.muted });
        footerY += 11;
      });

      if (settings?.supportEmail) {
        line(215.8, 379.4, footerY + 9, colors.accent, 1);
        txt(settings.supportEmail, marginX, footerY + 17, {
          size: 8,
          color: colors.muted,
          width: contentWidth,
          align: "center",
        });
      }

      // ============ FINALIZE ============
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
