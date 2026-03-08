import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Check, X } from "lucide-react";

interface CsvImportProps {
  onComplete: () => void;
}

interface FieldMapping {
  columnIndices: number[];
  separator: string;
}

interface AiMapping {
  name: FieldMapping | null;
  address: FieldMapping | null;
  party: FieldMapping | null;
  notes: FieldMapping | null;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

function applyMapping(row: string[], field: FieldMapping | null): string {
  if (!field || field.columnIndices.length === 0) return "";
  return field.columnIndices
    .map((i) => (row[i] || "").trim())
    .filter(Boolean)
    .join(field.separator || " ");
}

export default function CsvImport({ onComplete }: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "analyzing" | "confirm" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<AiMapping | null>(null);
  const [preview, setPreview] = useState<{ name: string; address: string; party: string; notes: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      if (h.length === 0) { toast.error("Empty file"); return; }
      setHeaders(h);
      setRows(r);
      setStep("analyzing");

      try {
        const sampleRows = r.slice(0, 5);
        const { data, error } = await supabase.functions.invoke("csv-mapper", {
          body: { headers: h, sampleRows },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const aiMapping: AiMapping = data.mapping;
        setMapping(aiMapping);

        // Generate preview from first 3 rows
        const previewRows = r.slice(0, 3).map((row) => ({
          name: applyMapping(row, aiMapping.name),
          address: applyMapping(row, aiMapping.address),
          party: applyMapping(row, aiMapping.party),
          notes: applyMapping(row, aiMapping.notes),
        }));
        setPreview(previewRows);
        setStep("confirm");
      } catch (err: any) {
        console.error("AI mapping error:", err);
        toast.error("Failed to analyze CSV: " + (err.message || "Unknown error"));
        setStep("upload");
      }
    };
    reader.readAsText(file);
  };

  const describeMapping = (field: FieldMapping | null): string => {
    if (!field || field.columnIndices.length === 0) return "— Not mapped —";
    return field.columnIndices.map((i) => headers[i] || `Col ${i}`).join(` "${field.separator}" `);
  };

  const handleImport = async () => {
    if (!mapping?.name || mapping.name.columnIndices.length === 0) {
      toast.error("No name column mapped");
      return;
    }

    setStep("importing");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error("Not logged in"); return; }

    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({
        user_id: user.id,
        name: applyMapping(row, mapping.name),
        address: applyMapping(row, mapping.address),
        party: applyMapping(row, mapping.party),
        notes: applyMapping(row, mapping.notes),
        sentiment: "neutral",
      })).filter((v) => v.name.trim());

      if (batch.length > 0) {
        const { error } = await supabase.from("voters").insert(batch);
        if (error) {
          toast.error(`Import error: ${error.message}`);
          break;
        }
        imported += batch.length;
      }
      setProgress(Math.round(((i + batchSize) / rows.length) * 100));
    }

    toast.success(`Imported ${imported} voters`);
    setOpen(false);
    reset();
    onComplete();
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setPreview([]);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Voter CSV"}
            {step === "analyzing" && "Analyzing Your CSV..."}
            {step === "confirm" && "Review AI Mapping"}
            {step === "importing" && "Importing..."}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file. AI will automatically figure out how to map your columns.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-10 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground">Supports .csv and .txt files</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is analyzing your {rows.length} rows and {headers.length} columns...</p>
          </div>
        )}

        {step === "confirm" && mapping && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{rows.length}</span> rows. Here's how AI mapped your columns:
            </p>

            <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
              {(["name", "address", "party", "notes"] as const).map((field) => (
                <div key={field} className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{field}</span>
                  <span className="text-muted-foreground text-xs max-w-[280px] truncate text-right">
                    {describeMapping(mapping[field])}
                  </span>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preview (first {preview.length} rows):</p>
                <div className="max-h-40 overflow-auto rounded-lg border border-border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="p-1.5 text-left font-medium">Name</th>
                        <th className="p-1.5 text-left font-medium">Address</th>
                        <th className="p-1.5 text-left font-medium">Party</th>
                        <th className="p-1.5 text-left font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-1.5 max-w-[120px] truncate">{row.name || "—"}</td>
                          <td className="p-1.5 max-w-[120px] truncate">{row.address || "—"}</td>
                          <td className="p-1.5">{row.party || "—"}</td>
                          <td className="p-1.5 max-w-[100px] truncate">{row.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <X className="mr-2 h-4 w-4" />Try Again
              </Button>
              <Button variant="gold" className="flex-1" onClick={handleImport}>
                <Check className="mr-2 h-4 w-4" />Import {rows.length} Voters
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-4">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
