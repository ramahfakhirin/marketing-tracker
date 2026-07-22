import express from "express";
import path from "path";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const SALT_ROUNDS = 10;

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  username: string;
  password: string;
}

interface SchoolRow {
  no: number;
  nama_sekolah: string;
  original_name: string | null;
  provinsi: string | null;
  kota: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  pic_marketing: string;
  marketing_lapangan: string | null;
  status: string;
  kontak_pic1: string;
  kontak_pic2: string;
  kontak_pic3: string;
  kontak_pic4: string;
  tanggal_kontak_awal: string;
  jenis_layanan: string;
  catatan_awal: string;
  tanggal_follow_up_terakhir: string;
  kemungkinan_closing: string;
  updates: string;
}

interface CustomDbRow {
  provinsi: string;
  kota: string;
  name: string;
  instagram_handle: string;
  tiktok_handle: string;
}

const SchoolSchema = z.object({
  no: z.number().optional(),
  namaSekolah: z.string().min(1, "Nama sekolah wajib diisi"),
  originalName: z.string().optional().nullable(),
  provinsi: z.string().optional().nullable(),
  kota: z.string().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  tiktokHandle: z.string().optional().nullable(),
  picMarketing: z.string().optional().default(""),
  marketingLapangan: z.string().optional().nullable(),
  status: z.enum(["BARU", "DIHUBUNGI", "FOLLOW UP", "CLOSING", "CLOSED", "GAGAL"]),
  kontakPic1: z.string().optional().default(""),
  kontakPic2: z.string().optional().default(""),
  kontakPic3: z.string().optional().default(""),
  kontakPic4: z.string().optional().default(""),
  tanggalKontakAwal: z.string().optional().default(""),
  jenisLayanan: z.string().optional().default(""),
  catatanAwal: z.string().optional().default(""),
  tanggalFollowUpTerakhir: z.string().optional().default(""),
  kemungkinanClosing: z.string().optional().default(""),
  updates: z.array(z.string()).optional().default([]),
});

const TeamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  role: z.enum(["SUPERADMIN", "MANAGER", "AE", "MARKETING_LAPANGAN"]),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().optional(),
});

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; name: string; role: string; username: string };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const dbUrl = process.env.DATABASE_URL;
  let pool: pg.Pool | null = null;
  let usePostgres = false;

  const initialTeamMembers = [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' },
    { id: 'manager-1', name: 'Manager Utama', role: 'MANAGER', username: 'manager', password: 'manager123' },
    { id: 'ae-1', name: 'Ramadhan', role: 'AE', username: 'ramadhan', password: 'ramadhan123' },
    { id: 'ae-2', name: 'Citra', role: 'AE', username: 'citra', password: 'citra123' },
    { id: 'ae-3', name: 'Ahmad', role: 'AE', username: 'ahmad', password: 'ahmad123' },
    { id: 'ae-4', name: 'Nabila', role: 'AE', username: 'nabila', password: 'nabila123' },
    { id: 'ae-5', name: 'Udin', role: 'AE', username: 'udin', password: 'udin123' },
    { id: 'ae-6', name: 'Zeindy', role: 'AE', username: 'zeindy', password: 'zeindy123' },
    { id: 'ml-1', name: 'Budi Santoso', role: 'MARKETING_LAPANGAN', username: 'budi', password: 'budi123' },
    { id: 'ml-2', name: 'Dewi Lestari', role: 'MARKETING_LAPANGAN', username: 'dewi', password: 'dewi123' },
    { id: 'ml-3', name: 'Eko Prasetyo', role: 'MARKETING_LAPANGAN', username: 'eko', password: 'eko123' },
    { id: 'ml-4', name: 'Siti Aminah', role: 'MARKETING_LAPANGAN', username: 'siti', password: 'siti123' },
  ];

  let inMemorySchools: any[] = [];
  let inMemoryTeam: TeamMemberRow[] = [];
  let inMemoryCustomDb: Record<string, Record<string, any[]>> = {};

  if (dbUrl) {
    console.log("Database connection string detected. Attempting to connect to PostgreSQL...");
    pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    });

    try {
      const client = await pool.connect();
      console.log("Successfully connected to PostgreSQL!");
      usePostgres = true;
      client.release();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS team (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS schools (
          no SERIAL PRIMARY KEY,
          nama_sekolah VARCHAR(255) NOT NULL,
          original_name VARCHAR(255),
          provinsi VARCHAR(100),
          kota VARCHAR(100),
          instagram_handle VARCHAR(100),
          tiktok_handle VARCHAR(100),
          pic_marketing VARCHAR(100),
          marketing_lapangan VARCHAR(100),
          status VARCHAR(50) NOT NULL,
          kontak_pic1 VARCHAR(255),
          kontak_pic2 VARCHAR(255),
          kontak_pic3 VARCHAR(255),
          kontak_pic4 VARCHAR(255),
          tanggal_kontak_awal VARCHAR(100),
          jenis_layanan VARCHAR(255),
          catatan_awal TEXT,
          tanggal_follow_up_terakhir VARCHAR(100),
          kemungkinan_closing VARCHAR(50),
          updates TEXT DEFAULT '[]'
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS custom_database (
          id SERIAL PRIMARY KEY,
          provinsi VARCHAR(100) NOT NULL,
          kota VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          instagram_handle VARCHAR(100),
          tiktok_handle VARCHAR(100)
        );
      `);

      const teamCountResult = await pool.query("SELECT COUNT(*) FROM team;");
      const teamCount = parseInt(teamCountResult.rows[0].count, 10);
      if (teamCount === 0) {
        console.log("Seeding initial team members into PostgreSQL...");
        for (const m of initialTeamMembers) {
          const hashed = await bcrypt.hash(m.password, SALT_ROUNDS);
          await pool.query(
            "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;",
            [m.id, m.name, m.role, m.username, hashed]
          );
        }
      }

      console.log("Database tables initialized successfully!");
    } catch (err) {
      console.error("Failed to connect or migrate PostgreSQL. Falling back to in-memory mode.");
      usePostgres = false;
    }
  } else {
    console.log("No DATABASE_URL environment variable provided. Running in in-memory fallback mode.");
    (async () => {
      inMemoryTeam = [];
      for (const m of initialTeamMembers) {
        const hashed = await bcrypt.hash(m.password, SALT_ROUNDS);
        inMemoryTeam.push({ ...m, password: hashed });
      }
    })();
  }

  // Health Check API (sanitized)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Login
  app.post("/api/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const cleanUsername = username.toLowerCase().trim();

    if (usePostgres && pool) {
      try {
        const result = await pool.query(
          "SELECT id, name, role, username, password FROM team WHERE LOWER(username) = $1;",
          [cleanUsername]
        );
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const valid = await bcrypt.compare(password, user.password);
          if (valid) {
            const token = jwt.sign(
              { id: user.id, name: user.name, role: user.role, username: user.username },
              JWT_SECRET,
              { expiresIn: "24h" }
            );
            return res.json({
              token,
              user: { id: user.id, name: user.name, role: user.role, username: user.username },
            });
          }
        }
        return res.status(401).json({ error: "Username atau password salah!" });
      } catch (err) {
        console.error("Login error");
        return res.status(500).json({ error: "Gagal memproses login" });
      }
    } else {
      const user = inMemoryTeam.find((u) => u.username.toLowerCase() === cleanUsername);
      if (user) {
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
          const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: "24h" }
          );
          return res.json({
            token,
            user: { id: user.id, name: user.name, role: user.role, username: user.username },
          });
        }
      }
      return res.status(401).json({ error: "Username atau password salah!" });
    }
  });

  // --- All routes below require auth ---
  app.use("/api", authMiddleware);

  // GET current user from token
  app.get("/api/team/me", (req, res) => {
    const user = (req as any).user;
    res.json({ id: user.id, name: user.name, role: user.role, username: user.username });
  });

  // GET all schools
  app.get("/api/schools", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM schools ORDER BY no DESC;");
        const formatted = result.rows.map((row: SchoolRow) => ({
          no: row.no,
          namaSekolah: row.nama_sekolah,
          originalName: row.original_name,
          provinsi: row.provinsi,
          kota: row.kota,
          instagramHandle: row.instagram_handle,
          tiktokHandle: row.tiktok_handle,
          picMarketing: row.pic_marketing,
          marketingLapangan: row.marketing_lapangan,
          status: row.status,
          kontakPic1: row.kontak_pic1 || "",
          kontakPic2: row.kontak_pic2 || "",
          kontakPic3: row.kontak_pic3 || "",
          kontakPic4: row.kontak_pic4 || "",
          tanggalKontakAwal: row.tanggal_kontak_awal || "",
          jenisLayanan: row.jenis_layanan || "",
          catatanAwal: row.catatan_awal || "",
          tanggalFollowUpTerakhir: row.tanggal_follow_up_terakhir || "",
          kemungkinanClosing: row.kemungkinan_closing || "",
          updates: JSON.parse(row.updates || "[]"),
        }));
        return res.json(formatted);
      } catch (err) {
        console.error("Failed to query schools");
        return res.status(500).json({ error: "Gagal memuat data sekolah" });
      }
    } else {
      return res.json(inMemorySchools);
    }
  });

  // SAVE or UPDATE a school
  app.post("/api/schools", async (req, res) => {
    const parsed = SchoolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Data sekolah tidak valid", details: parsed.error.errors });
    }

    const school = parsed.data;

    if (usePostgres && pool) {
      try {
        const existsResult = await pool.query("SELECT no FROM schools WHERE no = $1;", [school.no ?? -1]);
        const exists = existsResult.rows.length > 0;

        const updatesJson = JSON.stringify(school.updates || []);

        if (exists) {
          await pool.query(
            `UPDATE schools SET 
              nama_sekolah = $1, original_name = $2, provinsi = $3, kota = $4,
              instagram_handle = $5, tiktok_handle = $6, pic_marketing = $7, marketing_lapangan = $8,
              status = $9, kontak_pic1 = $10, kontak_pic2 = $11, kontak_pic3 = $12, kontak_pic4 = $13,
              tanggal_kontak_awal = $14, jenis_layanan = $15, catatan_awal = $16, tanggal_follow_up_terakhir = $17,
              kemungkinan_closing = $18, updates = $19
             WHERE no = $20;`,
            [
              school.namaSekolah, school.originalName || null, school.provinsi || null, school.kota || null,
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || "", school.marketingLapangan || null,
              school.status, school.kontakPic1 || "", school.kontakPic2 || "", school.kontakPic3 || "", school.kontakPic4 || "",
              school.tanggalKontakAwal || "", school.jenisLayanan || "", school.catatanAwal || "", school.tanggalFollowUpTerakhir || "",
              school.kemungkinanClosing || "", updatesJson, school.no
            ]
          );
          return res.json(school);
        } else {
          const insertResult = await pool.query(
            `INSERT INTO schools (
              nama_sekolah, original_name, provinsi, kota, instagram_handle, tiktok_handle,
              pic_marketing, marketing_lapangan, status, kontak_pic1, kontak_pic2, kontak_pic3, kontak_pic4,
              tanggal_kontak_awal, jenis_layanan, catatan_awal, tanggal_follow_up_terakhir, kemungkinan_closing, updates
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING no;`,
            [
              school.namaSekolah, school.originalName || null, school.provinsi || null, school.kota || null,
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || "", school.marketingLapangan || null,
              school.status, school.kontakPic1 || "", school.kontakPic2 || "", school.kontakPic3 || "", school.kontakPic4 || "",
              school.tanggalKontakAwal || "", school.jenisLayanan || "", school.catatanAwal || "", school.tanggalFollowUpTerakhir || "",
              school.kemungkinanClosing || "", updatesJson
            ]
          );
          const newNo = insertResult.rows[0].no;
          return res.json({ ...school, no: newNo });
        }
      } catch (err) {
        console.error("Failed to save school");
        return res.status(500).json({ error: "Gagal menyimpan data sekolah" });
      }
    } else {
      const idx = inMemorySchools.findIndex((s: any) => s.no === school.no);
      if (idx !== -1) {
        inMemorySchools[idx] = school;
      } else {
        const maxNo = inMemorySchools.reduce((max: number, s: any) => s.no > max ? s.no : max, 0);
        school.no = maxNo + 1;
        inMemorySchools.unshift(school);
      }
      return res.json(school);
    }
  });

  // DELETE a school
  app.delete("/api/schools/:no", async (req, res) => {
    const schoolNo = parseInt(req.params.no, 10);
    if (isNaN(schoolNo)) {
      return res.status(400).json({ error: "Nomor sekolah tidak valid" });
    }

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM schools WHERE no = $1;", [schoolNo]);
        return res.json({ success: true, message: "Sekolah berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete school");
        return res.status(500).json({ error: "Gagal menghapus sekolah" });
      }
    } else {
      inMemorySchools = inMemorySchools.filter((s: any) => s.no !== schoolNo);
      return res.json({ success: true, message: "Sekolah berhasil dihapus" });
    }
  });

  // GET all team members (no passwords)
  app.get("/api/team", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT id, name, role, username FROM team ORDER BY name ASC;");
        return res.json(result.rows);
      } catch (err) {
        console.error("Failed to fetch team members");
        return res.status(500).json({ error: "Gagal memuat anggota tim" });
      }
    } else {
      const sanitized = inMemoryTeam.map(({ password: _, ...rest }) => rest);
      return res.json(sanitized);
    }
  });

  // ADD or UPDATE a team member
  app.post("/api/team", async (req, res) => {
    const userInfo = (req as any).user;
    if (!userInfo || userInfo.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Hanya SUPERADMIN yang dapat mengelola anggota tim" });
    }

    const parsed = TeamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Data anggota tidak valid", details: parsed.error.errors });
    }

    const member = parsed.data;
    const cleanUsername = member.username.toLowerCase().trim();
    const pass = member.password || "password123";

    if (usePostgres && pool) {
      try {
        const existsResult = await pool.query("SELECT id FROM team WHERE id = $1;", [member.id || ""]);
        const exists = existsResult.rows.length > 0;

        if (exists) {
          await pool.query(
            "UPDATE team SET name = $1, role = $2, username = $3 WHERE id = $4;",
            [member.name, member.role, cleanUsername, member.id]
          );
        } else {
          const hashed = await bcrypt.hash(pass, SALT_ROUNDS);
          const newId = member.id || `${member.role.toLowerCase()}-${Date.now()}`;
          await pool.query(
            "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5);",
            [newId, member.name, member.role, cleanUsername, hashed]
          );
        }
        return res.json({ id: member.id, name: member.name, role: member.role, username: cleanUsername });
      } catch (err) {
        console.error("Failed to save team member");
        return res.status(500).json({ error: "Gagal menyimpan anggota tim" });
      }
    } else {
      const idx = inMemoryTeam.findIndex((t: any) => t.id === member.id);
      if (idx !== -1) {
        inMemoryTeam[idx] = { ...inMemoryTeam[idx], name: member.name, role: member.role, username: cleanUsername };
      } else {
        const hashed = await bcrypt.hash(pass, SALT_ROUNDS);
        const newId = member.id || `${member.role.toLowerCase()}-${Date.now()}`;
        inMemoryTeam.push({ id: newId, name: member.name, role: member.role, username: cleanUsername, password: hashed });
      }
      const { password: _, ...sanitized } = inMemoryTeam.find((t: any) => t.id === member.id)!;
      return res.json(sanitized);
    }
  });

  // DELETE a team member
  app.delete("/api/team/:id", async (req, res) => {
    const userInfo = (req as any).user;
    if (!userInfo || userInfo.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Hanya SUPERADMIN yang dapat menghapus anggota tim" });
    }

    const memberId = req.params.id;
    if (!memberId) {
      return res.status(400).json({ error: "ID anggota tidak valid" });
    }

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM team WHERE id = $1;", [memberId]);
        return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete team member");
        return res.status(500).json({ error: "Gagal menghapus anggota tim" });
      }
    } else {
      inMemoryTeam = inMemoryTeam.filter((t: any) => t.id !== memberId);
      return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
    }
  });

  // GET Custom Database
  app.get("/api/custom-db", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM custom_database;");
        const structured: Record<string, Record<string, any[]>> = {};
        result.rows.forEach((row: CustomDbRow) => {
          const prov = row.provinsi.toUpperCase().trim();
          const city = row.kota.toUpperCase().trim();
          if (!structured[prov]) structured[prov] = {};
          if (!structured[prov][city]) structured[prov][city] = [];
          structured[prov][city].push({
            name: row.name,
            instagramHandle: row.instagram_handle || "",
            tiktokHandle: row.tiktok_handle || "",
          });
        });
        return res.json(structured);
      } catch (err) {
        console.error("Failed to load custom database");
        return res.status(500).json({ error: "Gagal memuat database survei" });
      }
    } else {
      return res.json(inMemoryCustomDb);
    }
  });

  // BULK SAVE Custom Database (upsert pattern — no blind DELETE)
  app.post("/api/custom-db-bulk", async (req, res) => {
    const customDb = req.body;
    if (usePostgres && pool) {
      try {
        await pool.query("BEGIN;");
        await pool.query("DELETE FROM custom_database;");
        for (const prov of Object.keys(customDb)) {
          for (const city of Object.keys(customDb[prov])) {
            for (const sch of customDb[prov][city]) {
              await pool.query(
                "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
                [prov.toUpperCase().trim(), city.toUpperCase().trim(), sch.name, sch.instagramHandle || sch.instagram || "", sch.tiktokHandle || sch.tiktok || ""]
              );
            }
          }
        }
        await pool.query("COMMIT;");
        return res.json({ success: true });
      } catch (err) {
        if (pool) await pool.query("ROLLBACK;");
        console.error("Bulk custom-db sync failed");
        return res.status(500).json({ error: "Gagal sinkronisasi database survei" });
      }
    } else {
      inMemoryCustomDb = customDb;
      return res.json({ success: true });
    }
  });

  // ADD Custom Database Entry
  app.post("/api/custom-db", async (req, res) => {
    const { provinsi, kota, school } = req.body;
    if (!provinsi || !kota || !school || !school.name) {
      return res.status(400).json({ error: "Data survei tidak lengkap" });
    }

    const provUpper = provinsi.toUpperCase().trim();
    const cityUpper = kota.toUpperCase().trim();

    if (usePostgres && pool) {
      try {
        await pool.query(
          "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
          [provUpper, cityUpper, school.name, school.instagramHandle || "", school.tiktokHandle || ""]
        );
        return res.json({ success: true });
      } catch (err) {
        console.error("Failed to add custom database entry");
        return res.status(500).json({ error: "Gagal menyimpan data survei" });
      }
    } else {
      if (!inMemoryCustomDb[provUpper]) inMemoryCustomDb[provUpper] = {};
      if (!inMemoryCustomDb[provUpper][cityUpper]) inMemoryCustomDb[provUpper][cityUpper] = [];
      inMemoryCustomDb[provUpper][cityUpper].push(school);
      return res.json({ success: true });
    }
  });

  // Mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  app.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
});
