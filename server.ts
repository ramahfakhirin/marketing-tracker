import express from "express";
import path from "path";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";

const SALT_ROUNDS = 10;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  app.use(helmet());
  app.use(express.json());

  // Database configuration
  const dbUrl = process.env.DATABASE_URL;
  let pool: pg.Pool | null = null;
  let usePostgres = false;

  // Initial team members seed (Super Admin only) - password hashed before use
  const initialTeamMembers = [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' },
  ];

  // Fallback in-memory data storage (used only if DATABASE_URL is not set / unreachable)
  let inMemorySchools: any[] = [];
  let inMemoryTeam: any[] = await Promise.all(
    initialTeamMembers.map(async (m) => ({ ...m, password: await bcrypt.hash(m.password, SALT_ROUNDS) }))
  );
  let inMemoryCustomDb: Record<string, Record<string, any[]>> = {};

  // Initialize PostgreSQL (if DATABASE_URL is set)
  if (dbUrl) {
    console.log("Database connection string detected. Attempting to connect to PostgreSQL...");
    pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
    });

    try {
      const client = await pool.connect();
      console.log("Successfully connected to PostgreSQL!");
      usePostgres = true;
      client.release();

      // Run tables schema migrations
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
      const teamCount = parseInt(teamCountResult.rows[0].count);
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
    } catch (err) {
      console.error("Failed to connect to PostgreSQL. Falling back to in-memory storage.", err);
      usePostgres = false;
    }
  }

  // --- AUTH HELPERS ---

  type AuthUser = { id: string; name: string; role: string; username: string };

  function issueToken(user: AuthUser): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  }

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Autentikasi diperlukan" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      (req as any).user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Sesi tidak valid atau sudah kedaluwarsa" });
    }
  }

  function requireRole(...roles: string[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user as AuthUser | undefined;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: "Anda tidak memiliki hak akses untuk aksi ini" });
      }
      next();
    };
  }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit." }
  });

  // --- API ROUTES ---

  // Health Check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: usePostgres ? "postgresql" : "in-memory-fallback"
    });
  });

  // Authentication Endpoint
  app.post("/api/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = username.toLowerCase().trim();

    try {
      let row: any = null;
      if (usePostgres && pool) {
        const result = await pool.query(
          "SELECT id, name, role, username, password FROM team WHERE LOWER(username) = $1;",
          [cleanUsername]
        );
        row = result.rows[0] || null;
      } else {
        row = inMemoryTeam.find(u => u.username.toLowerCase() === cleanUsername) || null;
      }

      if (!row || !(await bcrypt.compare(password, row.password))) {
        return res.status(401).json({ error: "Username atau password salah!" });
      }

      const authUser: AuthUser = { id: row.id, name: row.name, role: row.role, username: row.username };
      const token = issueToken(authUser);
      return res.json({ token, user: authUser });
    } catch (err) {
      console.error("Login error", err);
      return res.status(500).json({ error: "Gagal memproses login" });
    }
  });

  // GET all team members (password never included)
  app.get("/api/team", requireAuth, async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT id, name, role, username FROM team ORDER BY name ASC;");
        return res.json(result.rows);
      } catch (err) {
        console.error("Failed to fetch team members", err);
        return res.status(500).json({ error: "Failed to load team members" });
      }
    } else {
      return res.json(inMemoryTeam.map(({ password, ...rest }) => rest));
    }
  });

  // ADD or UPDATE a team member (SUPERADMIN only)
  app.post("/api/team", requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
    const member = req.body;
    if (!member.name || !member.role || !member.username) {
      return res.status(400).json({ error: "Nama, role, dan username wajib diisi" });
    }

    const cleanUsername = member.username.toLowerCase().trim();
    const plainPassword = member.password || 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const memberObj = {
      id: member.id || `${member.role.toLowerCase()}-${Date.now()}`,
      name: member.name,
      role: member.role,
      username: cleanUsername,
    };

    if (usePostgres && pool) {
      try {
        const existsResult = await pool.query("SELECT id FROM team WHERE id = $1;", [memberObj.id]);
        const exists = existsResult.rows.length > 0;

        if (exists) {
          if (member.password) {
            await pool.query(
              "UPDATE team SET name = $1, role = $2, username = $3, password = $4 WHERE id = $5;",
              [memberObj.name, memberObj.role, memberObj.username, hashedPassword, memberObj.id]
            );
          } else {
            await pool.query(
              "UPDATE team SET name = $1, role = $2, username = $3 WHERE id = $4;",
              [memberObj.name, memberObj.role, memberObj.username, memberObj.id]
            );
          }
        } else {
          await pool.query(
            "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5);",
            [memberObj.id, memberObj.name, memberObj.role, memberObj.username, hashedPassword]
          );
        }
        return res.json(memberObj);
      } catch (err) {
        console.error("Failed to save team member in Postgres", err);
        return res.status(500).json({ error: "Failed to save team member" });
      }
    } else {
      const idx = inMemoryTeam.findIndex(t => t.id === memberObj.id);
      const stored = { ...memberObj, password: hashedPassword };
      if (idx !== -1) {
        inMemoryTeam[idx] = member.password ? stored : { ...stored, password: inMemoryTeam[idx].password };
      } else {
        inMemoryTeam.push(stored);
      }
      return res.json(memberObj);
    }
  });

  // DELETE a team member (SUPERADMIN only)
  app.delete("/api/team/:id", requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
    const memberId = req.params.id;
    if (!memberId) {
      return res.status(400).json({ error: "ID anggota tidak valid" });
    }

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM team WHERE id = $1;", [memberId]);
        return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete team member in Postgres", err);
        return res.status(500).json({ error: "Gagal menghapus anggota tim" });
      }
    } else {
      inMemoryTeam = inMemoryTeam.filter(t => t.id !== memberId);
      return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
    }
  });

  // RESET team members (Keep superadmin only) (SUPERADMIN only)
  app.post("/api/team/reset", requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
    const hashedDefault = await bcrypt.hash('admin123', SALT_ROUNDS);
    const superAdminObj = { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin' };

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM team WHERE id != 'admin-1' AND LOWER(username) != 'superadmin';");
        await pool.query(
          "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, username=$4;",
          [superAdminObj.id, superAdminObj.name, superAdminObj.role, superAdminObj.username, hashedDefault]
        );
        return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
      } catch (err) {
        console.error("Failed to reset team in Postgres", err);
        return res.status(500).json({ error: "Gagal me-reset database tim" });
      }
    } else {
      inMemoryTeam = [{ ...superAdminObj, password: hashedDefault }];
      return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
    }
  });

  // GET all schools
  app.get("/api/schools", requireAuth, async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM schools ORDER BY no DESC;");
        const formatted = result.rows.map(row => ({
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
          kontakPic1: row.kontak_pic1 || '',
          kontakPic2: row.kontak_pic2 || '',
          kontakPic3: row.kontak_pic3 || '',
          kontakPic4: row.kontak_pic4 || '',
          tanggalKontakAwal: row.tanggal_kontak_awal || '',
          jenisLayanan: row.jenis_layanan || '',
          catatanAwal: row.catatan_awal || '',
          tanggalFollowUpTerakhir: row.tanggal_follow_up_terakhir || '',
          kemungkinanClosing: row.kemungkinan_closing || '',
          updates: JSON.parse(row.updates || '[]')
        }));
        return res.json(formatted);
      } catch (err) {
        console.error("Failed to query schools", err);
        return res.status(500).json({ error: "Failed to load schools" });
      }
    } else {
      return res.json(inMemorySchools);
    }
  });

  // SAVE or UPDATE a school
  app.post("/api/schools", requireAuth, async (req, res) => {
    const school = req.body;
    if (!school.namaSekolah) {
      return res.status(400).json({ error: "Nama sekolah wajib diisi" });
    }

    if (usePostgres && pool) {
      try {
        const existsResult = await pool.query("SELECT no FROM schools WHERE no = $1;", [school.no]);
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
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || '', school.marketingLapangan || null,
              school.status, school.kontakPic1 || '', school.kontakPic2 || '', school.kontakPic3 || '', school.kontakPic4 || '',
              school.tanggalKontakAwal || '', school.jenisLayanan || '', school.catatanAwal || '', school.tanggalFollowUpTerakhir || '',
              school.kemungkinanClosing || '', updatesJson, school.no
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
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || '', school.marketingLapangan || null,
              school.status, school.kontakPic1 || '', school.kontakPic2 || '', school.kontakPic3 || '', school.kontakPic4 || '',
              school.tanggalKontakAwal || '', school.jenisLayanan || '', school.catatanAwal || '', school.tanggalFollowUpTerakhir || '',
              school.kemungkinanClosing || '', updatesJson
            ]
          );
          const newNo = insertResult.rows[0].no;
          return res.json({ ...school, no: newNo });
        }
      } catch (err) {
        console.error("Failed to save school in Postgres", err);
        return res.status(500).json({ error: "Failed to save school" });
      }
    } else {
      const idx = inMemorySchools.findIndex(s => s.no === school.no);
      if (idx !== -1) {
        inMemorySchools[idx] = school;
      } else {
        const maxNo = inMemorySchools.reduce((max, s) => s.no > max ? s.no : max, 0);
        school.no = maxNo + 1;
        inMemorySchools.unshift(school);
      }
      return res.json(school);
    }
  });

  // BULK REPLACE all schools (used by CSV import and full database reset)
  app.post("/api/schools/bulk-replace", requireAuth, async (req, res) => {
    const incoming: any[] = Array.isArray(req.body) ? req.body : [];

    if (usePostgres && pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        await client.query("DELETE FROM schools;");
        for (const school of incoming) {
          await client.query(
            `INSERT INTO schools (
              nama_sekolah, original_name, provinsi, kota, instagram_handle, tiktok_handle,
              pic_marketing, marketing_lapangan, status, kontak_pic1, kontak_pic2, kontak_pic3, kontak_pic4,
              tanggal_kontak_awal, jenis_layanan, catatan_awal, tanggal_follow_up_terakhir, kemungkinan_closing, updates
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
            [
              school.namaSekolah, school.originalName || null, school.provinsi || null, school.kota || null,
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || '', school.marketingLapangan || null,
              school.status, school.kontakPic1 || '', school.kontakPic2 || '', school.kontakPic3 || '', school.kontakPic4 || '',
              school.tanggalKontakAwal || '', school.jenisLayanan || '', school.catatanAwal || '', school.tanggalFollowUpTerakhir || '',
              school.kemungkinanClosing || '', JSON.stringify(school.updates || [])
            ]
          );
        }
        await client.query("COMMIT;");
        return res.json({ success: true, count: incoming.length });
      } catch (err) {
        await client.query("ROLLBACK;");
        console.error("Bulk school replace failed", err);
        return res.status(500).json({ error: "Gagal mengganti seluruh data sekolah" });
      } finally {
        client.release();
      }
    } else {
      inMemorySchools = incoming;
      return res.json({ success: true, count: incoming.length });
    }
  });

  // DELETE a school (SUPERADMIN, MANAGER, AE only)
  app.delete("/api/schools/:no", requireAuth, requireRole('SUPERADMIN', 'MANAGER', 'AE'), async (req, res) => {
    const schoolNo = parseInt(req.params.no);
    if (isNaN(schoolNo)) {
      return res.status(400).json({ error: "Nomor sekolah tidak valid" });
    }

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM schools WHERE no = $1;", [schoolNo]);
        return res.json({ success: true, message: "Sekolah berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete school in Postgres", err);
        return res.status(500).json({ error: "Gagal menghapus sekolah" });
      }
    } else {
      inMemorySchools = inMemorySchools.filter(s => s.no !== schoolNo);
      return res.json({ success: true, message: "Sekolah berhasil dihapus" });
    }
  });

  // GET Custom Database
  app.get("/api/custom-db", requireAuth, async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM custom_database;");
        const structured: Record<string, Record<string, any[]>> = {};
        result.rows.forEach(row => {
          const prov = row.provinsi.toUpperCase().trim();
          const city = row.kota.toUpperCase().trim();

          if (!structured[prov]) structured[prov] = {};
          if (!structured[prov][city]) structured[prov][city] = [];

          structured[prov][city].push({
            name: row.name,
            instagramHandle: row.instagram_handle || "",
            tiktokHandle: row.tiktok_handle || ""
          });
        });
        return res.json(structured);
      } catch (err) {
        console.error("Failed to load custom database", err);
        return res.status(500).json({ error: "Gagal memuat database survei custom" });
      }
    } else {
      return res.json(inMemoryCustomDb);
    }
  });

  // BULK SAVE Custom Database
  app.post("/api/custom-db-bulk", requireAuth, async (req, res) => {
    const customDb = req.body;
    if (usePostgres && pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        await client.query("DELETE FROM custom_database;");
        for (const prov of Object.keys(customDb)) {
          for (const city of Object.keys(customDb[prov])) {
            for (const sch of customDb[prov][city]) {
              await client.query(
                "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
                [prov.toUpperCase().trim(), city.toUpperCase().trim(), sch.name, sch.instagramHandle || sch.instagram || "", sch.tiktokHandle || sch.tiktok || ""]
              );
            }
          }
        }
        await client.query("COMMIT;");
        return res.json({ success: true });
      } catch (err) {
        await client.query("ROLLBACK;");
        console.error("Bulk custom-db sync failed", err);
        return res.status(500).json({ error: "Gagal mensinkronisasikan database survei" });
      } finally {
        client.release();
      }
    } else {
      inMemoryCustomDb = customDb;
      return res.json({ success: true });
    }
  });

  // ADD Custom Database Entry
  app.post("/api/custom-db", requireAuth, async (req, res) => {
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
        console.error("Failed to add custom database entry", err);
        return res.status(500).json({ error: "Gagal menyimpan data survei" });
      }
    } else {
      if (!inMemoryCustomDb[provUpper]) inMemoryCustomDb[provUpper] = {};
      if (!inMemoryCustomDb[provUpper][cityUpper]) inMemoryCustomDb[provUpper][cityUpper] = [];
      inMemoryCustomDb[provUpper][cityUpper].push(school);
      return res.json({ success: true });
    }
  });

  // --- MOUNT VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server startup error:", err);
});
