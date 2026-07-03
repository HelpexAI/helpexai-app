import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReportRecord = {
  id: string;
  title: string;
  content: string | null;
  template_slug: string | null;
  generated_at: string | null;
  created_at: string;
  current_version_id: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function filenameSafe(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanPdfText(value: string) {
  return value
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("•", "-")
    .replaceAll("→", "->")
    .replaceAll("₹", "Rs.")
    .replaceAll("₨", "Rs.")
    .replaceAll("€", "EUR ")
    .replaceAll("₹", "INR ")
    .replaceAll("₨", "Rs. ")
    // Preserve WinAnsi/Latin-1 names and currencies instead of deleting them.
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?")
    .trimEnd();
}

function stripMarkdownInline(value: string) {
  return cleanPdfText(value)
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function wrapText({
  text,
  font,
  fontSize,
  maxWidth,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);

      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let chunk = "";

        for (const char of word) {
          const testChunk = `${chunk}${char}`;

          if (font.widthOfTextAtSize(testChunk, fontSize) <= maxWidth) {
            chunk = testChunk;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        }

        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines.length ? lines : [""];
}

function parseTableRow(line: string) {
  return stripMarkdownInline(line)
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function addPage(pdfDoc: PDFDocument) {
  return pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function drawFooter({
  page,
  regularFont,
  pageNumber,
  showBranding,
}: {
  page: PDFPage;
  regularFont: PDFFont;
  pageNumber: number;
  showBranding: boolean;
}) {
  const gray = rgb(0.45, 0.45, 0.5);
  const border = rgb(0.86, 0.86, 0.88);

  page.drawLine({
    start: { x: MARGIN_X, y: 46 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 46 },
    thickness: 0.8,
    color: border,
  });

  if (showBranding) {
    page.drawText("Prepared by HelpexAI", {
      x: MARGIN_X,
      y: 28,
      size: 8,
      font: regularFont,
      color: gray,
    });
  }

  page.drawText(`Page ${pageNumber}`, {
    x: PAGE_WIDTH - MARGIN_X - 40,
    y: 28,
    size: 8,
    font: regularFont,
    color: gray,
  });
}

function createWriter({
  pdfDoc,
  regularFont,
  boldFont,
  showBranding,
}: {
  pdfDoc: PDFDocument;
  regularFont: PDFFont;
  boldFont: PDFFont;
  showBranding: boolean;
}) {
  const black = rgb(0.09, 0.09, 0.11);
  const gray = rgb(0.38, 0.38, 0.42);
  const primary = rgb(0.04, 0.45, 0.34);
  const border = rgb(0.86, 0.86, 0.88);
  const lightBg = rgb(0.96, 0.97, 0.97);

  let pageNumber = 1;
  let page = addPage(pdfDoc);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function ensureSpace(height: number) {
    if (y - height >= MARGIN_BOTTOM) return;

    drawFooter({ page, regularFont, pageNumber, showBranding });

    pageNumber += 1;
    page = addPage(pdfDoc);
    y = PAGE_HEIGHT - MARGIN_TOP;
  }

  function writeText({
    text,
    font = regularFont,
    size = 10.5,
    color = black,
    lineHeight = 16,
    gapAfter = 8,
    indent = 0,
  }: {
    text: string;
    font?: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
    gapAfter?: number;
    indent?: number;
  }) {
    const clean = stripMarkdownInline(text);
    const lines = wrapText({
      text: clean,
      font,
      fontSize: size,
      maxWidth: CONTENT_WIDTH - indent,
    });

    ensureSpace(lines.length * lineHeight + gapAfter);

    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN_X + indent,
        y,
        size,
        font,
        color,
      });

      y -= lineHeight;
    }

    y -= gapAfter;
  }

  function writeHeading(text: string, level: 1 | 2 | 3) {
    const size = level === 1 ? 22 : level === 2 ? 16 : 13;
    const lineHeight = level === 1 ? 28 : level === 2 ? 22 : 18;
    const gapBefore = level === 1 ? 6 : 14;
    const gapAfter = level === 1 ? 12 : 8;

    ensureSpace(lineHeight + gapBefore + gapAfter);

    y -= gapBefore;

    page.drawText(stripMarkdownInline(text), {
      x: MARGIN_X,
      y,
      size,
      font: boldFont,
      color: level === 1 ? primary : black,
    });

    y -= lineHeight;

    if (level === 1) {
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: PAGE_WIDTH - MARGIN_X, y },
        thickness: 1,
        color: border,
      });

      y -= 10;
    } else {
      y -= gapAfter;
    }
  }

  function writeBullet(text: string) {
    const clean = stripMarkdownInline(text);
    const lines = wrapText({
      text: clean,
      font: regularFont,
      fontSize: 10.5,
      maxWidth: CONTENT_WIDTH - 22,
    });

    ensureSpace(lines.length * 16 + 5);

    page.drawText("•", {
      x: MARGIN_X + 4,
      y,
      size: 11,
      font: boldFont,
      color: primary,
    });

    for (const [index, line] of lines.entries()) {
      page.drawText(line, {
        x: MARGIN_X + 22,
        y: y - index * 16,
        size: 10.5,
        font: regularFont,
        color: black,
      });
    }

    y -= lines.length * 16 + 5;
  }

  function writeNumbered(text: string, number: string) {
    const clean = stripMarkdownInline(text);
    const prefix = `${number}.`;

    const lines = wrapText({
      text: clean,
      font: regularFont,
      fontSize: 10.5,
      maxWidth: CONTENT_WIDTH - 28,
    });

    ensureSpace(lines.length * 16 + 5);

    page.drawText(prefix, {
      x: MARGIN_X + 2,
      y,
      size: 10.5,
      font: boldFont,
      color: primary,
    });

    for (const [index, line] of lines.entries()) {
      page.drawText(line, {
        x: MARGIN_X + 28,
        y: y - index * 16,
        size: 10.5,
        font: regularFont,
        color: black,
      });
    }

    y -= lines.length * 16 + 5;
  }

  function writeQuote(text: string) {
    const clean = stripMarkdownInline(text);
    const lines = wrapText({
      text: clean,
      font: regularFont,
      fontSize: 10,
      maxWidth: CONTENT_WIDTH - 24,
    });

    const height = lines.length * 15 + 14;
    ensureSpace(height + 8);

    page.drawRectangle({
      x: MARGIN_X,
      y: y - height + 10,
      width: CONTENT_WIDTH,
      height,
      color: lightBg,
      borderColor: border,
      borderWidth: 0.8,
    });

    page.drawLine({
      start: { x: MARGIN_X + 8, y: y + 2 },
      end: { x: MARGIN_X + 8, y: y - height + 14 },
      thickness: 2,
      color: primary,
    });

    let quoteY = y - 5;

    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN_X + 20,
        y: quoteY,
        size: 10,
        font: regularFont,
        color: gray,
      });

      quoteY -= 15;
    }

    y -= height + 8;
  }

  function writeTableRow(line: string) {
    const cells = parseTableRow(line);
    if (!cells.length) return;

    const columnCount = cells.length;
    const columnWidth = CONTENT_WIDTH / columnCount;
    const cellPaddingX = 8;
    const cellPaddingY = 8;
    const bodyFontSize = 9;
    const bodyLineHeight = 12;
    const cellLines = cells.map((cell) =>
      wrapText({
        text: cell,
        font: regularFont,
        fontSize: bodyFontSize,
        maxWidth: columnWidth - cellPaddingX * 2,
      }),
    );
    const rowHeight =
      Math.max(
        ...cellLines.map((lines) => lines.length * bodyLineHeight),
        bodyLineHeight,
      ) + cellPaddingY * 2;

    ensureSpace(rowHeight + 4);

    const rowTop = y;
    const rowBottom = y - rowHeight;

    for (let column = 0; column < columnCount; column += 1) {
      const x = MARGIN_X + column * columnWidth;
      const isHeader = rowTop === y && column === 0 && /^(category|institution|role|field|duration|skills|relevance)$/i.test(cells[0] ?? "");
      page.drawRectangle({
        x,
        y: rowBottom,
        width: columnWidth,
        height: rowHeight,
        borderColor: border,
        borderWidth: 0.8,
        color: isHeader ? lightBg : undefined,
      });

      const lines = cellLines[column];
      let textY = rowTop - cellPaddingY - 8;
      for (const textLine of lines) {
        page.drawText(textLine, {
          x: x + cellPaddingX,
          y: textY,
          size: bodyFontSize,
          font: isHeader ? boldFont : regularFont,
          color: isHeader ? black : gray,
        });
        textY -= bodyLineHeight;
      }
    }

    y -= rowHeight + 4;
  }

  function writeTable(lines: string[]) {
    const rows = lines.map(parseTableRow).filter((row) => row.length > 0);
    if (!rows.length) return;

    const tableWidth = CONTENT_WIDTH;
    const columnCount = Math.max(...rows.map((row) => row.length));
    const columnWidth = tableWidth / columnCount;
    const cellPaddingX = 8;
    const cellPaddingY = 8;
    const fontSize = 9;
    const lineHeight = 12;

    const rowHeights = rows.map((row) => {
      const wrapped = row.map((cell) =>
        wrapText({
          text: cell,
          font: regularFont,
          fontSize,
          maxWidth: columnWidth - cellPaddingX * 2,
        }),
      );
      return (
        Math.max(...wrapped.map((cellLines) => cellLines.length * lineHeight), lineHeight) +
        cellPaddingY * 2
      );
    });

    const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0);
    ensureSpace(totalHeight + 6);

    let currentTop = y;

    rows.forEach((row, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];
      const isHeaderRow = rowIndex === 0;
      const wrapped = row.map((cell) =>
        wrapText({
          text: cell,
          font: regularFont,
          fontSize,
          maxWidth: columnWidth - cellPaddingX * 2,
        }),
      );

      for (let column = 0; column < columnCount; column += 1) {
        const x = MARGIN_X + column * columnWidth;
        page.drawRectangle({
          x,
          y: currentTop - rowHeight,
          width: columnWidth,
          height: rowHeight,
          borderColor: border,
          borderWidth: 0.8,
          color: isHeaderRow ? lightBg : undefined,
        });

        const linesForCell = wrapped[column] ?? [""];
        let textY = currentTop - cellPaddingY - 8;
        for (const textLine of linesForCell) {
          page.drawText(textLine, {
            x: x + cellPaddingX,
            y: textY,
            size: fontSize,
            font: isHeaderRow ? boldFont : regularFont,
            color: isHeaderRow ? black : gray,
          });
          textY -= lineHeight;
        }
      }

      currentTop -= rowHeight;
    });

    y = currentTop - 6;
  }

  function finish() {
    drawFooter({ page, regularFont, pageNumber, showBranding });
  }

  return {
    page: () => page,
    y: () => y,
    setY: (value: number) => {
      y = value;
    },
    ensureSpace,
    writeText,
    writeHeading,
    writeBullet,
    writeNumbered,
    writeQuote,
    writeTableRow,
    writeTable,
    finish,
    colors: {
      black,
      gray,
      primary,
      border,
      lightBg,
    },
  };
}

async function createReportPdf(report: ReportRecord, showBranding: boolean) {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const writer = createWriter({
    pdfDoc,
    regularFont,
    boldFont,
    showBranding,
  });

  const page = writer.page();
  const { black, gray, primary, border, lightBg } = writer.colors;

  if (showBranding) {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 120,
      width: PAGE_WIDTH,
      height: 120,
      color: lightBg,
    });

    page.drawText("HelpexAI", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 58,
      size: 24,
      font: boldFont,
      color: primary,
    });

    page.drawText("Business Knowledge Workspace", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 78,
      size: 9,
      font: regularFont,
      color: gray,
    });

    page.drawText("Report", {
      x: PAGE_WIDTH - MARGIN_X - 130,
      y: PAGE_HEIGHT - 58,
      size: 16,
      font: boldFont,
      color: black,
    });

    page.drawText(formatDate(report.generated_at ?? report.created_at), {
      x: PAGE_WIDTH - MARGIN_X - 130,
      y: PAGE_HEIGHT - 78,
      size: 9,
      font: regularFont,
      color: gray,
    });

    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 120 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 120 },
      thickness: 1,
      color: border,
    });

    writer.setY(PAGE_HEIGHT - 155);
  } else {
    writer.setY(PAGE_HEIGHT - MARGIN_TOP);
  }

  //   writer.writeHeading(report.title, 1);

  //   writer.writeText({
  //     text: `Template: ${normalizeTemplateName(report.template_slug)}`,
  //     size: 9.5,
  //     color: gray,
  //     lineHeight: 14,
  //     gapAfter: 18,
  //   });

  const content = cleanPdfText(report.content ?? "");

  const lines = content.split(/\r?\n/);
  let tableBuffer: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      writer.setY(writer.y() - 6);
      continue;
    }

    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line)) {
      continue;
    }

    if (line.startsWith("|") && line.includes("|")) {
      tableBuffer.push(line);
      continue;
    }

    if (tableBuffer.length) {
      writer.writeTable(tableBuffer);
      tableBuffer = [];
    }

    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s*(.+)$/);

    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      writer.writeHeading(headingMatch[2], level);
      continue;
    }

    if (line.startsWith(">")) {
      writer.writeQuote(line.replace(/^\s{0,3}>\s?/, ""));
      continue;
    }

    const bulletMatch = line.match(/^\s{0,3}[-*+]\s+(.+)$/);

    if (bulletMatch) {
      writer.writeBullet(bulletMatch[1]);
      continue;
    }

    const numberedMatch = line.match(/^\s{0,3}(\d+)\.\s+(.+)$/);

    if (numberedMatch) {
      writer.writeNumbered(numberedMatch[2], numberedMatch[1]);
      continue;
    }

    writer.writeText({
      text: line,
      size: 10.5,
      lineHeight: 16,
      gapAfter: 8,
    });
  }

  if (tableBuffer.length) {
    writer.writeTable(tableBuffer);
  }

  writer.finish();

  return pdfDoc.save();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error } = await context.service
    .from("reports")
    .select(
      [
        "id",
        "title",
        "content",
        "template_slug",
        "generated_at",
        "created_at",
        "current_version_id",
      ].join(", "),
    )
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const typedReport = report as unknown as ReportRecord;

  if (typedReport.current_version_id) {
    const { data: version } = await context.service
      .from("report_versions")
      .select("title, content_markdown")
      .eq("id", typedReport.current_version_id)
      .eq("report_id", typedReport.id)
      .maybeSingle();
    if (version) {
      typedReport.title = version.title;
      typedReport.content = version.content_markdown;
    }
  }

  if (!typedReport.content?.trim()) {
    return NextResponse.json(
      { error: "This report does not have downloadable content." },
      { status: 400 },
    );
  }

  const pdfBytes = await createReportPdf(typedReport, context.plan === "free");

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="helpexai-report-${
        filenameSafe(typedReport.title) || typedReport.id
      }.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
