"use client";
import React, { useState } from "react";
import { generateFilledPdf, downloadPdfBytes, AgeKey } from "@/lib/pdf";

const AGE_GROUPS: { label: string; value: AgeKey }[] = [
  { label: "18-25 ans", value: "18-25" },
  { label: "45-50 ans", value: "45-50" },
  { label: "60-65 ans", value: "60-65" },
  { label: "70-75 ans", value: "70-75" },
];

export default function Home() {
  const [fields, setFields] = useState<string[]>(["", "", "", ""]);
  const [age, setAge] = useState<AgeKey | "">("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleField = (i: number, v: string) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? v.slice(0, 280) : f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fields.some((f) => !f.trim()) || !age) {
      setError(
        "Veuillez remplir tous les champs et choisir une tranche d'âge."
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const bytes = await generateFilledPdf(age as AgeKey, fields);
      downloadPdfBytes(`formulaire-${age}.pdf`, bytes);
    } catch (err) {
      console.error(err);
      setError(
        "Erreur lors de la génération du PDF. Vérifiez les modèles dans /public/pdfs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <form className="bg-white shadow-xl rounded-xl p-8 w-full max-w-xl space-y-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-semibold text-gray-900">Générateur Plan Personnalisé de Prévention</h1>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-gray-700">Tranche d&apos;âge</span>
          <div className="grid grid-cols-2 gap-3">
            {AGE_GROUPS.map((g) => (
              <label
                key={g.value}
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all ${
                  age === g.value ? "bg-blue-50 border-blue-400" : "bg-white border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="age"
                  value={g.value}
                  checked={age === g.value}
                  onChange={() => setAge(g.value)}
                  className="accent-blue-600"
                />
                <span className="text-gray-800">{g.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {[
            "Mes priorités en santé",
            "Freins rencontrés",
            "Conseils, modalités pratiques",
            "Ressources et intervenants",
          ].map((q, i) => {
            const id = `q-${i}`;
            return (
              <div key={id} className="flex flex-col gap-2">
                <label htmlFor={id} className="text-sm font-medium text-gray-800">
                  {q}
                </label>
                <textarea
                  id={id}
                  value={fields[i]}
                  onChange={(e) => handleField(i, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-500 bg-white"
                  rows={4}
                  maxLength={280}
                  required
                />
                <div className="text-xs text-gray-500 text-right">{fields[i]?.length || 0}/280</div>
              </div>
            );
          })}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "Génération..." : "Générer le PDF"}
        </button>
      </form>
    </main>
  );
}
