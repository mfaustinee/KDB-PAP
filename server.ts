import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
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

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const ensureFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf-8') === '[]' || fs.readFileSync(file, 'utf-8') === '') {
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
    console.log("GET /api/agreements");
    try {
      const data = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading agreements:", error);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post("/api/agreements", (req, res) => {
    console.log("POST /api/agreements", req.body?.id);
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const newAgreement = req.body;
      
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) {
        agreements[index] = newAgreement;
      } else {
        agreements.push(newAgreement);
      }
      
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving agreement:", error);
      res.status(500).json({ error: "Failed to save agreement" });
    }
  });

  app.patch("/api/agreements/:id", (req, res) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      const updates = req.body;
      
      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...updates };
        fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Agreement not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update agreement" });
    }
  });

  app.delete("/api/agreements/:id", (req, res) => {
    try {
      let agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      
      agreements = agreements.filter((a: any) => a.id !== id);
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete agreement" });
    }
  });

  app.get("/api/debtors", (req, res) => {
    console.log("GET /api/debtors");
    try {
      const data = fs.readFileSync(DEBTORS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading debtors:", error);
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

  app.post("/api/debtors", (req, res) => {
    const count = Array.isArray(req.body) ? req.body.length : 'not an array';
    console.log(`POST /api/debtors - Count: ${count}`);
    if (Array.isArray(req.body)) {
      console.log("Debtor IDs:", req.body.map(d => d.id).join(", "));
    }
    try {
      fs.writeFileSync(DEBTORS_FILE, JSON.stringify(req.body, null, 2));
      console.log("Successfully wrote to debtors.json");
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving debtors:", error);
      res.status(500).json({ error: "Failed to save debtors" });
    }
  });

  app.get("/api/staff", (req, res) => {
    try {
      const data = fs.readFileSync(STAFF_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read staff config" });
    }
  });

  app.post("/api/staff", (req, res) => {
    try {
      fs.writeFileSync(STAFF_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save staff config" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
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
