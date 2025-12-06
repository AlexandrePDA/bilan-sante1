import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'

export type AgeKey = '18-25' | '45-50' | '60-65' | '70-75'

export type Box = { x: number; y: number; width: number; height: number }
export type RatioBox = { rx: number; ryTop: number; rw: number; rh: number }

const templateByAge: Record<AgeKey, string> = {
  '18-25': '/pdfs/18-25.pdf',
  '45-50': '/pdfs/45-50.pdf',
  '60-65': '/pdfs/60-65.pdf',
  '70-75': '/pdfs/70-75.pdf',
}

const positionsByAge: Partial<Record<AgeKey, Box[]>> = {}
const ratioPositionsByAge: Partial<Record<AgeKey, RatioBox[]>> = {}

export function setRatioPositionsForAge(age: AgeKey, boxes: RatioBox[]) {
  ratioPositionsByAge[age] = boxes
}

export function getTemplateUrlForAge(age: AgeKey) {
  return templateByAge[age]
}

function computeBoxes(pageWidth: number, pageHeight: number): Box[] {
  const x = pageWidth * 0.15
  const width = pageWidth * 0.7
  const height = pageHeight * 0.12
  const ys = [0.76, 0.58, 0.40, 0.22].map((r) => pageHeight * r)
  return ys.map((y) => ({ x, y, width, height }))
}

function getBoxesForAge(age: AgeKey, pageWidth: number, pageHeight: number): Box[] {
  const r = ratioPositionsByAge[age]
  if (r && r.length >= 4) {
    return r.map(({ rx, ryTop, rw, rh }) => ({
      x: rx * pageWidth,
      y: pageHeight - (ryTop + rh) * pageHeight,
      width: rw * pageWidth,
      height: rh * pageHeight,
    }))
  }
  const preset = positionsByAge[age]
  if (preset && preset.length >= 4) return preset
  return computeBoxes(pageWidth, pageHeight)
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.replace(/\r/g, '').split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    const w = font.widthOfTextAtSize(test, fontSize)
    if (w <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      const token = word
      if (font.widthOfTextAtSize(token, fontSize) > maxWidth) {
        let cur = ''
        for (const ch of token) {
          const t2 = cur + ch
          if (font.widthOfTextAtSize(t2, fontSize) <= maxWidth) {
            cur = t2
          } else {
            if (cur) lines.push(cur)
            cur = ch
          }
        }
        line = cur
      } else {
        line = token
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawTextInBox(
  page: PDFPage,
  text: string,
  box: Box,
  font: PDFFont,
  initialFontSize: number,
  color: ReturnType<typeof rgb>,
  lineHeightMultiplier: number
) {
  const padding = 4
  let fontSize = initialFontSize
  const maxWidth = box.width - padding * 2
  const maxHeight = box.height - padding * 2
  let lines = wrapText(text, font, fontSize, maxWidth)
  let lineHeight = fontSize * lineHeightMultiplier
  while (lines.length * lineHeight > maxHeight && fontSize > 6) {
    fontSize -= 0.5
    lines = wrapText(text, font, fontSize, maxWidth)
    lineHeight = fontSize * lineHeightMultiplier
  }
  const startY = box.y + box.height - padding - fontSize
  let y = startY
  for (const line of lines) {
    page.drawText(line, { x: box.x + padding, y, size: fontSize, font, color })
    y -= lineHeight
    if (y < box.y + padding) break
  }
}

export async function generateFilledPdf(age: AgeKey, texts: string[]) {
  const url = templateByAge[age]
  const res = await fetch(url)
  if (!res.ok) throw new Error('PDF template introuvable')
  const existingPdfBytes = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page = pdfDoc.getPages()[0]
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const color = rgb(0, 0, 0)
  const boxes = getBoxesForAge(age, width, height)
  for (let i = 0; i < Math.min(boxes.length, texts.length); i++) {
    drawTextInBox(page, texts[i] || '', boxes[i], font, 12, color, 1.2)
  }
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export function downloadPdfBytes(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
