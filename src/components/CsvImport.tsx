import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";

interface CsvImportProps {
  onComplete: () => void;
}

interface ColumnMapping {
  name: string;
  address: string;
  phone: string;
  email: string;
  party: string;
  [key: string]: string;
}

const voterFields = [
  { key: "name", label: "Name", required: true },
  { key: "address", label: "Address", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "party", label: "Party", required: false },
];

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

function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { name: "", address: "", phone: "", email: "", party: "" };
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const patterns: Record<string, string[]> = {
    name: ["name", "fullname", "votername", "firstname", "last", "voter"],
    address: ["address", "addr", "street", "residence", "residenceaddress", "mailingaddress", "location"],
    phone: ["phone", "tel", "telephone", "phonenumber", "cell", "mobile"],
    email: ["email", "emailaddress", "mail"],
    party: ["party", "partyaffiliation", "politicalparty", "affiliation", "partyname"],
  };

  for (const [field, keys] of Object.entries(patterns)) {
    const idx = lower.findIndex((h) => keys.some((k) => h.includes(k)));
    if (idx >= 0) mapping[field] = headers[idx];
  }

  return mapping;
}

export default function CsvImport({ onComplete }: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: "", address: "", phone: "", email: "", party: "" });
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setMapping(autoMap(h));
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!mapping.name) {
      toast.error("Please map at least the Name column");
      return;
    }

    setStep("importing");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error("Not logged in"); return; }

    const headerIdx = (col: string) => headers.indexOf(col);
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({
        user_id: user.id,
        name: mapping.name ? (row[headerIdx(mapping.name)] || "") : "",
        address: mapping.address ? (row[headerIdx(mapping.address)] || "") : "",
        phone: mapping.phone ? (row[headerIdx(mapping.phone)] || "") : "",
        email: mapping.email ? (row[headerIdx(mapping.email)] || "") : "",
        party: mapping.party ? (row[headerIdx(mapping.party)] || "") : "",
        sentiment: "neutral",
        tags: "",
        notes: "",
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
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setProgress(0);
    onComplete();
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Voter CSV"}
            {step === "map" && "Map Columns"}
            {step === "importing" && "Importing..."}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file from the Board of Elections. The first row should contain column headers.
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

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{rows.length}</span> rows and{" "}
              <span className="font-semibold text-foreground">{headers.length}</span> columns.
              Map your CSV columns to voter fields:
            </p>
            <div className="space-y-3">
              {voterFields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-20 text-right text-sm shrink-0">
                    {f.label}{f.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] || "__none__"}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Skip" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Skip —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Back</Button>
              <Button variant="gold" className="flex-1" onClick={handleImport}>
                Import {rows.length} Voters
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
