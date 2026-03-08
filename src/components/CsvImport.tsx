import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Check, X } from "lucide-react";

interface CsvImportProps {
  onComplete: () => void;
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

// Expected CSV column order: Last Name, First Name, Street Address, City, Party Affiliation, Notes
const EXPECTED_COLUMNS = ["Last Name", "First Name", "Street Address", "City", "Party Affiliation", "Notes"];

export default function CsvImport({ onComplete }: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "confirm" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
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
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      if (h.length === 0) { toast.error("Empty file"); return; }
      setHeaders(h);
      setRows(r);
      setPreview(r.slice(0, 3));
      setStep("confirm");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error("Not logged in"); return; }

    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({
        user_id: user.id,
        last_name: (row[0] || "").trim(),
        first_name: (row[1] || "").trim(),
        street_address: (row[2] || "").trim(),
        city: (row[3] || "").trim(),
        party: (row[4] || "").trim(),
        notes: (row[5] || "").trim(),
      })).filter((v) => v.last_name || v.first_name);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Voter CSV"}
            {step === "confirm" && "Review Import"}
            {step === "importing" && "Importing..."}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns in this order:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPECTED_COLUMNS.map((col) => (
                <span key={col} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">{col}</span>
              ))}
            </div>
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

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{rows.length}</span> rows with <span className="font-semibold text-foreground">{headers.length}</span> columns.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Column headers from your file:</p>
              <div className="flex flex-wrap gap-2">
                {headers.map((h, i) => (
                  <span key={i} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">{h}</span>
                ))}
              </div>
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preview (first {preview.length} rows):</p>
                <div className="max-h-40 overflow-auto rounded-lg border border-border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        {EXPECTED_COLUMNS.map((col) => (
                          <th key={col} className="p-1.5 text-left font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {EXPECTED_COLUMNS.map((_, ci) => (
                            <td key={ci} className="p-1.5 max-w-[120px] truncate">{row[ci] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <X className="mr-2 h-4 w-4" />Cancel
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
