// prescription-pdf-generator.ts
import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns/format";

interface Patient {
  id?: string;
  name: string;
  age?: string;
  gender?: string;
  phone?: string;
  email?: string;
}

interface Doctor {
  name: string;
  qualification?: string;
  designation?: string;
  specialty?: string;
  bmdcRegNo?: string;
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

interface CompanySettings {
  name: string;
  nameAccent?: string;
  logo?: string | Buffer;
  tagline?: string;
  thankYou?: string;
  footer?: string;
  supportEmail?: string;
  documentLabel?: string;
}

interface Prescription {
  id: string;
  createdAt: string | Date;
  medications: Medication[];
  diagnosis?: string;
  instructions?: string;
  followUpDate?: string | Date;
}

interface PDFGeneratorProps {
  patient: Patient;
  doctor: Doctor;
  prescription: Prescription;
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

// Same fonts as the invoice: Manrope = display, Inter = body.
// Hind Siliguri is only a fallback for the ৳ sign and Bengali letters.
const FONT_FILES = {
  Sans: "Inter-Regular.ttf",
  "Sans-Bold": "Inter-SemiBold.ttf",
  Display: "Manrope-Bold.ttf",
  Fallback: "HindSiliguri-Regular.ttf",
  "Fallback-Bold": "HindSiliguri-Bold.ttf",
};

type Face = "sans" | "sansBold" | "display";

// [main font, fallback font] for each face
const FACES: Record<Face, [string, string]> = {
  sans: ["Sans", "Fallback"],
  sansBold: ["Sans-Bold", "Fallback-Bold"],
  display: ["Display", "Fallback-Bold"],
};

const BENGALI = /[\u0980-\u09FF\u200C\u200D]/; // Bengali block, includes ৳ (U+09F3)

const loadImage = async (
  src?: string | Buffer,
): Promise<Buffer | undefined> => {
  if (!src) return undefined;
  if (Buffer.isBuffer(src)) return src;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.error("Failed to fetch image", err);
    return undefined;
  }
};

const defaultSettings: CompanySettings = {
  name: "Doctor",
  nameAccent: "Sheba",
  logo: "https://i.ibb.co.com/hFqGjh62/logo.png", // URL or Buffer; omit to use the built-in mark
  tagline: "Your healthcare, made simpler.",
  thankYou: "Thank you for choosing DoctorSheba.",
  footer:
    "This is a computer-generated prescription and does not require a signature. " +
    "Please keep this prescription for future reference.",
  supportEmail: "hello@doctorsheba.bd",
};

export async function generatePrescriptionPDF({
  patient,
  doctor,
  prescription,
  settings = defaultSettings,
  colors: colorOverrides,
  fontDir = path.join(
    typeof __dirname !== "undefined" ? __dirname : process.cwd(),
    "../../fonts",
  ),
}: PDFGeneratorProps): Promise<Buffer> {
  const [logoBuffer] = await Promise.all([loadImage(settings.logo)]);

  return new Promise((resolve, reject) => {
    try {
      // margin 0: every position below is set by hand
      const brandName = `${settings.name}${settings.nameAccent || ""}`;
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Prescription ${prescription.id} – ${brandName}`,
          Author: brandName,
          Subject: "Online prescription",
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

      // ============ PAGE SETTINGS ============
      const marginX = 51;
      const pageWidth = doc.page.width;
      const pageRight = pageWidth - marginX; // 544.28
      const contentWidth = pageRight - marginX;
      const marginTop = 51;
      const pageBottomLimit = doc.page.height - 52; // leaves room for the page strip

      const sectionGap = 22; // same rhythm as the invoice
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

      const wrap = (
        str: string,
        width: number,
        size: number,
        face: Face = "sans",
      ): string[] => {
        const lines: string[] = [];
        let current = "";
        for (const word of str.split(/\s+/).filter(Boolean)) {
          const next = current ? `${current} ${word}` : word;
          if (widthOf(next, size, face) <= width || !current) current = next;
          else {
            lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [""];
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
      const nameWidth = widthOf(settings.name, 17, "display");
      txt(settings.name, infoX, 67, { size: 17, face: "display" });
      if (settings.nameAccent) {
        txt(settings.nameAccent, infoX + nameWidth + 4, 67, {
          size: 17,
          face: "display",
          color: colors.primary,
        });
      }
      if (settings.tagline) {
        txt(settings.tagline, infoX, 86, { size: 7.2, color: colors.muted });
      }

      // Title - right side
      txt("PRESCRIPTION", marginX, 72, {
        size: 18,
        face: "display",
        color: colors.navy,
        width: contentWidth,
        align: "right",
      });

      // ============ DIVIDER ============
      line(marginX, pageRight, 107.6, colors.primary, 1.4);

      // ============ BADGE + DATES ============
      const badge = "E-PRESCRIPTION";
      const badgeHeight = 22.7;
      const badgeWidth = Math.max(62.4, widthOf(badge, 9, "sansBold") + 28);
      const badgeY = 124.4;

      doc
        .roundedRect(marginX, badgeY, badgeWidth, badgeHeight, 4)
        .lineWidth(0.6)
        .fillAndStroke("#EFF6FF", "#BFDBFE");
      txt(badge, marginX, badgeY + (badgeHeight - 9) / 2 + 0.7, {
        size: 9,
        face: "sansBold",
        color: "#1E40AF",
        width: badgeWidth,
        align: "center",
      });

      // "Label: <bold value>" right aligned
      const rightLabel = (label: string, value: string, top: number) => {
        const vW = widthOf(value, 9, "sansBold");
        const lW = widthOf(`${label} `, 9);
        txt(`${label} `, pageRight - vW - lW, top, { size: 9 });
        txt(value, pageRight - vW, top, { size: 9, face: "sansBold" });
      };
      rightLabel(
        "Prescription date:",
        format(prescription.createdAt, "dd MMM yyyy"),
        badgeY + 0.6,
      );
      if (prescription.followUpDate)
        rightLabel(
          "Follow-up date:",
          format(prescription.followUpDate, "dd MMM yyyy"),
          badgeY + 13.6,
        );

      // ============ PATIENT / PRESCRIBED BY ============
      y = 168.6;

      type InfoLine = { text: string; muted?: boolean };
      const keep = (xs: Array<InfoLine | "" | undefined | false>) =>
        xs.filter(Boolean) as InfoLine[];

      const ageGender = [patient.age, patient.gender]
        .filter(Boolean)
        .join(" / ");
      const colWidth = contentWidth / 2;
      const panelPad = 9;
      const columns = [
        {
          x: marginX,
          label: "PATIENT",
          name: patient.name,
          lines: keep([
            patient.id && {
              text: `Patient ID: ${patient.id}`,
              muted: true,
            },
            ageGender && { text: `Age / Gender: ${ageGender}` },
            patient.phone && { text: `Phone: ${patient.phone}` },
            patient.email && { text: `Email: ${patient.email}` },
          ]),
        },
        {
          x: marginX + colWidth,
          label: "PRESCRIBED BY",
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

      // ============ SECTION HELPERS ============
      const heading = (title: string, gapAfter: number, x = 57) => {
        txt(title, x, y, { size: 10, face: "display", color: colors.navy });
        y += gapAfter;
      };

      // label row + value row, same look as the invoice tables
      const drawTable = (
        cols: { label: string; width: number; value: string; bold?: boolean }[],
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
            width: c.width - pad * 2,
          });
          x += c.width;
        });
        y += h;
      };

      // bordered text box (diagnosis / instructions); several items get 1. 2. 3. markers
      const textPanelHeight = (items: string[], width: number) => {
        const numbered = items.length > 1;
        const textW = width - 22 - (numbered ? 14 : 0);
        const lines = items.reduce((n, it) => n + wrap(it, textW, 9).length, 0);
        return lines * 13 + (items.length - 1) * 3 + 22;
      };

      const drawTextPanel = (items: string[], x: number, width: number) => {
        const numbered = items.length > 1;
        const h = textPanelHeight(items, width);
        doc.rect(x, y, width, h).fill(colors.panel);
        doc
          .rect(x, y, width, h)
          .lineWidth(0.55)
          .strokeColor(colors.border)
          .stroke();

        let ty = y + 11;
        items.forEach((item, i) => {
          if (numbered)
            txt(`${i + 1}.`, x + 11, ty, { size: 9, color: colors.muted });
          wrap(item, width - 22 - (numbered ? 14 : 0), 9).forEach((l) => {
            txt(l, x + 11 + (numbered ? 14 : 0), ty, { size: 9 });
            ty += 13;
          });
          ty += 3;
        });
        return h;
      };

      // ============ PRESCRIPTION DETAILS ============
      y += sectionGap;
      ensureSpace(16.4 + 49);
      heading("PRESCRIPTION DETAILS", 16.4);
      drawTable(
        [
          {
            label: "PRESCRIPTION ID",
            width: 150,
            value: prescription.id,
            bold: true,
          },
          { label: "APPOINTMENT", width: 170, value: "Online consultaion" },
          {
            label: "CONSULTATION TYPE",
            width: contentWidth - 150 - 170,
            value: "Online appointment",
          },
        ],
        26,
      );

      // ============ DIAGNOSIS ============
      const diagnosis = prescription.diagnosis?.trim();

      if (diagnosis) {
        const diagnosisHeight = textPanelHeight([diagnosis], contentWidth);

        y += sectionGap;
        ensureSpace(16.4 + diagnosisHeight);

        heading("DIAGNOSIS", 16.4);

        drawTextPanel([diagnosis], marginX, contentWidth);

        y += diagnosisHeight;
      }

      // ============ PRESCRIBED MEDICATIONS ============
      y += sectionGap;
      ensureSpace(16.4 + 23 + 36);
      txt("Rx", 57, y, { size: 10, face: "display", color: colors.primary });
      txt("PRESCRIBED MEDICATIONS", 57 + widthOf("Rx", 10, "display") + 6, y, {
        size: 10,
        face: "display",
        color: colors.navy,
      });
      y += 16.4;

      const medCols = [
        { label: "#", width: 28 },
        { label: "MEDICINE", width: 150 },
        { label: "DOSAGE", width: 82 },
        { label: "FREQUENCY", width: 150 },
        { label: "DURATION", width: contentWidth - 28 - 150 - 82 - 150 },
      ];
      const cellPad = 7;
      const headH = 23;
      let tableTop = y;

      const drawMedHeader = () => {
        tableTop = y;
        doc.rect(marginX, y, contentWidth, headH).fill(colors.tableHead);
        let x = marginX;
        medCols.forEach((c) => {
          txt(c.label, x + cellPad, y + (headH - 7.2) / 2 + 0.7, {
            size: 7.2,
            face: "sansBold",
            color: colors.muted,
            width: c.width - cellPad * 2,
          });
          x += c.width;
        });
        line(marginX, pageRight, y + headH, colors.border, 0.4);
        y += headH;
      };

      // outer border + column dividers for the part of the table on this page
      const closeMedTable = () => {
        doc
          .rect(marginX, tableTop, contentWidth, y - tableTop)
          .lineWidth(0.55)
          .strokeColor(colors.border)
          .stroke();
        let x = marginX;
        medCols.slice(0, -1).forEach((c) => {
          x += c.width;
          vline(x, tableTop, y, colors.border, 0.4);
        });
      };

      drawMedHeader();

      prescription.medications.forEach((med, index) => {
        const cells: { lines: string[]; face: Face; color?: string }[] = [
          { lines: [String(index + 1)], face: "sans", color: colors.muted },
          {
            lines: wrap(
              med.name,
              medCols[1].width - cellPad * 2,
              9,
              "sansBold",
            ),
            face: "sansBold",
          },
          {
            lines: wrap(med.dosage || "—", medCols[2].width - cellPad * 2, 9),
            face: "sans",
          },
          {
            lines: wrap(
              med.frequency || "—",
              medCols[3].width - cellPad * 2,
              9,
            ),
            face: "sans",
          },
          {
            lines: wrap(med.duration || "—", medCols[4].width - cellPad * 2, 9),
            face: "sans",
          },
        ];

        const mainLines = Math.max(...cells.map((c) => c.lines.length));
        const blockHeight = (mainLines - 1) * 12 + 9;
        const rowH = Math.max(34, blockHeight + 20);

        if (y + rowH > pageBottomLimit) {
          closeMedTable();
          doc.addPage();
          y = marginTop;
          drawMedHeader();
        }

        const top = y + (rowH - blockHeight) / 2 + 0.7;
        let x = marginX;
        cells.forEach((c, i) => {
          c.lines.forEach((l, li) => {
            txt(l, x + cellPad, top + li * 12, {
              size: 9,
              face: c.face,
              color: c.color,
              width: medCols[i].width - cellPad * 2,
            });
          });
          x += medCols[i].width;
        });

        y += rowH;
        line(marginX, pageRight, y, colors.border, 0.4);
      });

      closeMedTable();

      // ============ DOCTOR'S INSTRUCTIONS ============
      const instruction = prescription.instructions?.trim();

      const instructionItems = instruction ? [instruction] : [];

      const instructionsHeight = instructionItems.length
        ? textPanelHeight(instructionItems, contentWidth)
        : 0;

      // ============ FOOTER ============
      const footerLines = settings.footer
        ? wrap(settings.footer, 481.3, 8)
        : [];

      const hasFooter = !!(
        settings.thankYou ||
        footerLines.length ||
        settings.supportEmail
      );

      const footerHeight = hasFooter
        ? 11.3 +
          (settings.thankYou ? 17 : 0) +
          footerLines.length * 11 +
          (settings.supportEmail
            ? (settings.thankYou || footerLines.length ? 0 : 6) + 9 + 17 + 8
            : 0)
        : 0;

      // Calculate closing section height
      const tailHeight =
        (instructionItems.length ? 16.4 + instructionsHeight : 0) +
        (hasFooter ? 14 + footerHeight : 0);

      y += sectionGap;
      ensureSpace(Math.min(tailHeight, pageBottomLimit - marginTop));

      // ============ INSTRUCTIONS ============
      if (instructionItems.length) {
        heading("DOCTOR'S INSTRUCTIONS", 16.4);

        drawTextPanel(instructionItems, marginX, contentWidth);

        y += instructionsHeight;
      }

      // ============ FOOTER ============
      if (hasFooter) {
        y += 14;
        ensureSpace(footerHeight);

        line(marginX, pageRight, y, colors.border, 0.6);

        let footerY = y + 11.3;

        if (settings.thankYou) {
          txt(settings.thankYou, 57, footerY, {
            size: 9,
            face: "sansBold",
          });

          footerY += 17;
        }

        footerLines.forEach((l) => {
          txt(l, 57, footerY, {
            size: 8,
            color: colors.muted,
          });

          footerY += 11;
        });

        if (settings.supportEmail) {
          footerY += settings.thankYou || footerLines.length ? 0 : 6;

          line(215.8, 379.4, footerY + 9, colors.accent, 1);

          txt(settings.supportEmail, marginX, footerY + 17, {
            size: 8,
            color: colors.muted,
            width: contentWidth,
            align: "center",
          });
        }
      }

      // ============ PAGE STRIP (every page) ============
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const stripY = doc.page.height - 46;
        line(marginX, pageRight, stripY, colors.border, 0.6);
        txt(
          `${brandName} • ${settings.documentLabel || "Online prescription"}`,
          marginX,
          stripY + 9,
          {
            size: 7.5,
            color: colors.muted,
          },
        );
        txt(`Page ${i + 1} of ${range.count}`, marginX, stripY + 9, {
          size: 7.5,
          color: colors.muted,
          width: contentWidth,
          align: "right",
        });
      }

      // ============ FINALIZE ============
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
