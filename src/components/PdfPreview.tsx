"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AgeKey, RatioBox } from "@/lib/pdf";
import { getTemplateUrlForAge, setRatioPositionsForAge } from "@/lib/pdf";

type Props = {
  age: AgeKey;
  texts: string[];
};

const DEFAULT_RATIO_BOXES: RatioBox[] = [
  { rx: 0.08, ryTop: 0.36, rw: 0.18, rh: 0.32 },
  { rx: 0.30, ryTop: 0.36, rw: 0.18, rh: 0.32 },
  { rx: 0.52, ryTop: 0.36, rw: 0.18, rh: 0.32 },
  { rx: 0.74, ryTop: 0.36, rw: 0.18, rh: 0.32 },
];

export default function PdfPreview({ age, texts }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [boxes, setBoxes] = useState<RatioBox[]>(DEFAULT_RATIO_BOXES);
  const [calib, setCalib] = useState(false);

  const templateUrl = useMemo(() => getTemplateUrlForAge(age), [age]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pdfjsLib = (await import("pdfjs-dist")) as typeof import("pdfjs-dist");
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      }
      const loadingTask = pdfjsLib.getDocument(templateUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const scale = 1.5;
      const vp = page.getViewport({ scale });
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      setViewportSize({ w: vp.width, h: vp.height });
      const renderContext = { canvasContext: ctx, viewport: vp };
      await page.render(renderContext).promise;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [templateUrl]);

  useEffect(() => {
    setRatioPositionsForAge(age, boxes);
  }, [age, boxes]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium text-gray-800">Aperçu PDF</h2>
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
          onClick={() => setCalib((v) => !v)}
        >
          {calib ? "Masquer calibration" : "Afficher calibration"}
        </button>
      </div>
      <div ref={containerRef} className="relative inline-block">
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
        {viewportSize && (
          <div className="absolute inset-0 pointer-events-none">
            {boxes.map((b, i) => {
              const left = `${b.rx * viewportSize.w}px`;
              const top = `${b.ryTop * viewportSize.h}px`;
              const width = `${b.rw * viewportSize.w}px`;
              const height = `${b.rh * viewportSize.h}px`;
              return (
                <div
                  key={i}
                  className="absolute overflow-hidden"
                  style={{ left, top, width, height }}
                >
                  <div className="text-[12px] leading-[1.2] text-gray-900 whitespace-pre-wrap">
                    {texts[i] || ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {calib && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {boxes.map((b, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="text-sm font-medium mb-2">Zone {i + 1}</div>
              <div className="grid grid-cols-4 gap-2 items-center text-sm">
                <label className="text-gray-600">rx</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={b.rx}
                  onChange={(e) =>
                    setBoxes((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], rx: Number(e.target.value) };
                      return next;
                    })
                  }
                  className="col-span-3 border rounded px-2 py-1"
                />
                <label className="text-gray-600">ryTop</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={b.ryTop}
                  onChange={(e) =>
                    setBoxes((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], ryTop: Number(e.target.value) };
                      return next;
                    })
                  }
                  className="col-span-3 border rounded px-2 py-1"
                />
                <label className="text-gray-600">rw</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={b.rw}
                  onChange={(e) =>
                    setBoxes((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], rw: Number(e.target.value) };
                      return next;
                    })
                  }
                  className="col-span-3 border rounded px-2 py-1"
                />
                <label className="text-gray-600">rh</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={b.rh}
                  onChange={(e) =>
                    setBoxes((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], rh: Number(e.target.value) };
                      return next;
                    })
                  }
                  className="col-span-3 border rounded px-2 py-1"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
