import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");

const INITIAL_DEBTORS = [
  {
    id: 'D001',
    dboName: 'Sunrise Dairy Ltd',
    premiseName: 'Sunrise Main Depot',
    permitNo: 'KDB/MB/0001/0001234/2024',
    location: 'Thika Road, Ruiru',
    county: 'Kiambu',
    arrearsBreakdown: [{ id: '1', month: 'January 2024', amount: 150000 }],
    totalArrears: 150000,
    totalArrearsWords: 'One Hundred and Fifty Thousand Shillings',
    arrearsPeriod: 'Jan 2024',
    debitNoteNo: 'DN/2024/552',
    tel: '0712345678',
    installments: [{ no: 1, period: 'Jan 2024', dueDate: '', amount: 150000 }]
  }
];

const ensureFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
};

ensureFile(AGREEMENTS_FILE, []);
ensureFile(DEBTORS_FILE, INITIAL_DEBTORS);
ensureFile(STAFF_FILE, { officialSignature: "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/agreements", (req, res) => {
    const data = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
    res.json(JSON.parse(data));
  });

  app.post("/api/agreements", (req, res) => {
    const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
    const newAgreement = req.body;
    const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
    if (index !== -1) agreements[index] = newAgreement;
    else agreements.push(newAgreement);
    fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
    res.json({ success: true });
  });

  app.patch("/api/agreements/:id", (req, res) => {
    const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
    const { id } = req.params;
    const index = agreements.findIndex((a: any) => a.id === id);
    if (index !== -1) {
      agreements[index] = { ...agreements[index], ...req.body };
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/agreements/:id", (req, res) => {
    const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
    const { id } = req.params;
    const filtered = agreements.filter((a: any) => a.id !== id);
    fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true });
  });

  app.post("/api/agreements/sync", (req, res) => {
    fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  app.get("/api/debtors", (req, res) => {
    const data = fs.readFileSync(DEBTORS_FILE, "utf-8");
    res.json(JSON.parse(data));
  });

  app.post("/api/debtors", (req, res) => {
    fs.writeFileSync(DEBTORS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  app.get("/api/staff", (req, res) => {
    const data = fs.readFileSync(STAFF_FILE, "utf-8");
    res.json(JSON.parse(data));
  });

  app.post("/api/staff", (req, res) => {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
