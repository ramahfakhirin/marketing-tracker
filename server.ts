import express from "express";
import path from "path";
import pg from "pg";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch 
} from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Database configuration
  const dbUrl = process.env.DATABASE_URL;
  let pool: pg.Pool | null = null;
  let usePostgres = false;
  let useFirestore = false;
  let firestoreDb: any = null;

  // Initial team members seed (Super Admin only)
  const initialTeamMembers = [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' },
  ];

  // Fallback in-memory data storage
  let inMemorySchools: any[] = [];
  let inMemoryTeam: any[] = [...initialTeamMembers];
  let inMemoryCustomDb: Record<string, Record<string, any[]>> = {};

  const defaultAcademicYears = [
    {
      id: 'ay-2027-2028',
      yearName: '2027/2028',
      title: 'Tahun Ajaran 2027/2028',
      startDate: '1 Jul 2027',
      endDate: '30 Jun 2028',
      status: 'MENDATANG',
      note: '"Periode Persiapan Mendatang"'
    },
    {
      id: 'ay-2026-2027',
      yearName: '2026/2027',
      title: 'Tahun Ajaran 2026/2027',
      startDate: '1 Jul 2026',
      endDate: '30 Jun 2027',
      status: 'AKTIF',
      note: '"Periode Berjalan Utama (Aktif)"'
    },
    {
      id: 'ay-2025-2026',
      yearName: '2025/2026',
      title: 'Tahun Ajaran 2025/2026',
      startDate: '1 Jul 2025',
      endDate: '30 Jun 2026',
      status: 'ARSIP',
      note: '"Periode Arsip Tahun Lalu"'
    },
    {
      id: 'ay-2024-2025',
      yearName: '2024/2025',
      title: 'Tahun Ajaran 2024/2025',
      startDate: '1 Jul 2024',
      endDate: '30 Jun 2025',
      status: 'ARSIP',
      note: '"Periode Arsip Lampau"'
    }
  ];

  let inMemoryAcademicYears: any[] = [...defaultAcademicYears];

  // Utility to recursively sanitize objects for Firestore (removes undefined values)
  function sanitizeForFirestore(val: any): any {
    if (val === undefined) return "";
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map(sanitizeForFirestore);
    }
    if (typeof val === 'object' && val !== null) {
      const clean: Record<string, any> = {};
      for (const key of Object.keys(val)) {
        const fieldVal = val[key];
        if (fieldVal !== undefined) {
          clean[key] = sanitizeForFirestore(fieldVal);
        } else {
          clean[key] = "";
        }
      }
      return clean;
    }
    return val;
  }

  // 1. Initialize Firebase Firestore
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const firebaseApp = initializeApp(firebaseConfig);
      const dbId = firebaseConfig.firestoreDatabaseId || undefined;
      firestoreDb = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
      useFirestore = true;
      console.log("Successfully connected to Firebase Firestore! Database ID:", dbId);

      // Clean up previous seed members gracefully
      try {
        const teamSnap = await getDocs(collection(firestoreDb, 'team'));
        if (teamSnap.empty) {
          console.log("Seeding initial Super Admin into Firestore...");
          await setDoc(doc(firestoreDb, 'team', initialTeamMembers[0].id), initialTeamMembers[0]);
        }
      } catch (e) {
        console.warn("Firestore seed read/write skipped due to quota or connectivity:", e);
      }
    }
  } catch (err) {
    console.warn("Could not initialize Firebase Firestore:", err);
    useFirestore = false;
  }

  // 2. Initialize PostgreSQL (if DATABASE_URL is set)
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
          password VARCHAR(100) NOT NULL
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
          await pool.query(
            "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;",
            [m.id, m.name, m.role, m.username, m.password]
          );
        }
      }
    } catch (err) {
      console.error("Failed to connect to PostgreSQL. Falling back to Firestore or in-memory.", err);
      usePostgres = false;
    }
  }

  // --- API ROUTES ---

  // Health Check API
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      database: usePostgres ? "postgresql" : useFirestore ? "firebase-firestore" : "in-memory-fallback",
      vps: "cloud-run"
    });
  });

  // Authentication Endpoint
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = username.toLowerCase().trim();

    if (usePostgres && pool) {
      try {
        const result = await pool.query(
          "SELECT id, name, role, username, password FROM team WHERE LOWER(username) = $1 AND password = $2;",
          [cleanUsername, password]
        );
        if (result.rows.length > 0) {
          return res.json(result.rows[0]);
        } else {
          return res.status(401).json({ error: "Username atau password salah!" });
        }
      } catch (err) {
        console.error("Login error in Postgres", err);
        return res.status(500).json({ error: "Gagal memproses login" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'team'));
        let foundUser: any = null;
        snap.forEach(d => {
          const data = d.data();
          if (data.username && data.username.toLowerCase().trim() === cleanUsername && data.password === password) {
            foundUser = data;
          }
        });
        if (foundUser) {
          return res.json(foundUser);
        } else {
          return res.status(401).json({ error: "Username atau password salah!" });
        }
      } catch (err) {
        console.error("Login error in Firestore, falling back to in-memory", err);
        const user = inMemoryTeam.find(
          u => u.username.toLowerCase() === cleanUsername && u.password === password
        );
        if (user) {
          return res.json(user);
        } else {
          return res.status(401).json({ error: "Username atau password salah!" });
        }
      }
    } else {
      const user = inMemoryTeam.find(
        u => u.username.toLowerCase() === cleanUsername && u.password === password
      );
      if (user) {
        return res.json(user);
      } else {
        return res.status(401).json({ error: "Username atau password salah!" });
      }
    }
  });

  // GET all team members
  app.get("/api/team", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT id, name, role, username, password FROM team ORDER BY name ASC;");
        return res.json(result.rows);
      } catch (err) {
        console.error("Failed to fetch team members", err);
        return res.status(500).json({ error: "Failed to load team members" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'team'));
        const teamList: any[] = [];
        snap.forEach(d => {
          teamList.push(d.data());
        });
        teamList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return res.json(teamList);
      } catch (err) {
        console.error("Failed to fetch team from Firestore, using in-memory", err);
        return res.json(inMemoryTeam);
      }
    } else {
      return res.json(inMemoryTeam);
    }
  });

  // ADD or UPDATE a team member
  app.post("/api/team", async (req, res) => {
    const member = req.body;
    if (!member.name || !member.role || !member.username) {
      return res.status(400).json({ error: "Nama, role, dan username wajib diisi" });
    }

    const cleanUsername = member.username.toLowerCase().trim();
    const pass = member.password || 'password123';
    const memberObj = {
      id: member.id || `${member.role.toLowerCase()}-${Date.now()}`,
      name: member.name,
      role: member.role,
      username: cleanUsername,
      password: pass
    };

    if (usePostgres && pool) {
      try {
        const existsResult = await pool.query("SELECT id FROM team WHERE id = $1;", [memberObj.id]);
        const exists = existsResult.rows.length > 0;

        if (exists) {
          await pool.query(
            "UPDATE team SET name = $1, role = $2, username = $3, password = $4 WHERE id = $5;",
            [memberObj.name, memberObj.role, memberObj.username, memberObj.password, memberObj.id]
          );
        } else {
          await pool.query(
            "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5);",
            [memberObj.id, memberObj.name, memberObj.role, memberObj.username, memberObj.password]
          );
        }
        return res.json(memberObj);
      } catch (err) {
        console.error("Failed to save team member in Postgres", err);
        return res.status(500).json({ error: "Failed to save team member" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'team', memberObj.id), memberObj);
        return res.json(memberObj);
      } catch (err) {
        console.error("Failed to save team member in Firestore, using in-memory", err);
        const idx = inMemoryTeam.findIndex(t => t.id === memberObj.id);
        if (idx !== -1) {
          inMemoryTeam[idx] = memberObj;
        } else {
          inMemoryTeam.push(memberObj);
        }
        return res.json(memberObj);
      }
    } else {
      const idx = inMemoryTeam.findIndex(t => t.id === memberObj.id);
      if (idx !== -1) {
        inMemoryTeam[idx] = memberObj;
      } else {
        inMemoryTeam.push(memberObj);
      }
      return res.json(memberObj);
    }
  });

  // DELETE a team member
  app.delete("/api/team/:id", async (req, res) => {
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
    } else if (useFirestore && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'team', memberId));
        return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete team member in Firestore, using in-memory", err);
        inMemoryTeam = inMemoryTeam.filter(t => t.id !== memberId);
        return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
      }
    } else {
      inMemoryTeam = inMemoryTeam.filter(t => t.id !== memberId);
      return res.json({ success: true, message: "Anggota tim berhasil dihapus" });
    }
  });

  // RESET team members (Keep superadmin only)
  app.post("/api/team/reset", async (req, res) => {
    const superAdminObj = { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' };

    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM team WHERE id != 'admin-1' AND LOWER(username) != 'superadmin';");
        await pool.query(
          "INSERT INTO team (id, name, role, username, password) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, username=$4, password=$5;",
          [superAdminObj.id, superAdminObj.name, superAdminObj.role, superAdminObj.username, superAdminObj.password]
        );
        return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
      } catch (err) {
        console.error("Failed to reset team in Postgres", err);
        return res.status(500).json({ error: "Gagal me-reset database tim" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const teamSnap = await getDocs(collection(firestoreDb, 'team'));
        for (const docSnap of teamSnap.docs) {
          const data = docSnap.data();
          if (docSnap.id !== 'admin-1' && data.username !== 'superadmin') {
            await deleteDoc(doc(firestoreDb, 'team', docSnap.id));
          }
        }
        await setDoc(doc(firestoreDb, 'team', 'admin-1'), superAdminObj);
        return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
      } catch (err) {
        console.error("Failed to reset team in Firestore, using in-memory", err);
        inMemoryTeam = [superAdminObj];
        return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
      }
    } else {
      inMemoryTeam = [superAdminObj];
      return res.json({ success: true, message: "Database tim berhasil di-reset. Tersisa Super Admin.", team: [superAdminObj] });
    }
  });

  // GET all schools
  app.get("/api/schools", async (req, res) => {
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
        if (formatted.length > 0) {
          inMemorySchools = formatted;
        }
        return res.json(formatted.length > 0 ? formatted : inMemorySchools);
      } catch (err) {
        console.error("Failed to query schools", err);
        return res.json(inMemorySchools);
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'schools'));
        const schoolsList: any[] = [];
        snap.forEach(d => {
          schoolsList.push(d.data());
        });
        schoolsList.sort((a, b) => (b.no || 0) - (a.no || 0));
        if (schoolsList.length > 0) {
          inMemorySchools = schoolsList;
        }
        return res.json(schoolsList.length > 0 ? schoolsList : inMemorySchools);
      } catch (err) {
        console.error("Failed to fetch schools from Firestore, using in-memory", err);
        return res.json(inMemorySchools);
      }
    } else {
      return res.json(inMemorySchools);
    }
  });

  // SAVE or UPDATE a school
  app.post("/api/schools", async (req, res) => {
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
    } else if (useFirestore && firestoreDb) {
      try {
        if (!school.no) {
          const snap = await getDocs(collection(firestoreDb, 'schools'));
          let maxNo = 0;
          snap.forEach(d => {
            const data = d.data();
            if (data.no && typeof data.no === 'number' && data.no > maxNo) maxNo = data.no;
          });
          school.no = maxNo + 1;
        }

        // Clean object to strip undefined values that cause setDoc errors
        const cleanSchool = sanitizeForFirestore(school);

        await setDoc(doc(firestoreDb, 'schools', String(cleanSchool.no)), cleanSchool);

        // Keep in-memory cache updated
        const idx = inMemorySchools.findIndex(s => s.no === cleanSchool.no);
        if (idx !== -1) {
          inMemorySchools[idx] = cleanSchool;
        } else {
          inMemorySchools.unshift(cleanSchool);
        }

        return res.json(cleanSchool);
      } catch (err) {
        console.error("Failed to save school in Firestore, using in-memory", err);
        const idx = inMemorySchools.findIndex(s => s.no === school.no);
        if (idx !== -1) {
          inMemorySchools[idx] = school;
        } else {
          const maxNo = inMemorySchools.reduce((max, s) => (s.no > max ? s.no : max), 0);
          school.no = school.no || maxNo + 1;
          inMemorySchools.unshift(school);
        }
        return res.json(school);
      }
    } else {
      const idx = inMemorySchools.findIndex(s => s.no === school.no);
      if (idx !== -1) {
        inMemorySchools[idx] = school;
      } else {
        const maxNo = inMemorySchools.reduce((max, s) => (s.no > max ? s.no : max), 0);
        school.no = maxNo + 1;
        inMemorySchools.unshift(school);
      }
      return res.json(school);
    }
  });

  // DELETE a school
  app.delete("/api/schools/:no", async (req, res) => {
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
    } else if (useFirestore && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'schools', String(schoolNo)));
        return res.json({ success: true, message: "Sekolah berhasil dihapus" });
      } catch (err) {
        console.error("Failed to delete school in Firestore, using in-memory", err);
        inMemorySchools = inMemorySchools.filter(s => s.no !== schoolNo);
        return res.json({ success: true, message: "Sekolah berhasil dihapus" });
      }
    } else {
      inMemorySchools = inMemorySchools.filter(s => s.no !== schoolNo);
      return res.json({ success: true, message: "Sekolah berhasil dihapus" });
    }
  });

  // RESET ALL SCHOOLS
  app.post("/api/schools/reset", async (req, res) => {
    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM schools;");
        return res.json({ success: true, message: "Semua data prospek sekolah telah berhasil di-reset" });
      } catch (err) {
        console.error("Failed to reset schools in Postgres", err);
        return res.status(500).json({ error: "Gagal me-reset data sekolah" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'schools'));
        await Promise.all(snap.docs.map(docSnap => deleteDoc(docSnap.ref)));
      } catch (err) {
        console.error("Failed to reset schools in Firestore, clearing in-memory", err);
      }
      inMemorySchools = [];
      return res.json({ success: true, message: "Semua data prospek sekolah telah berhasil di-reset" });
    } else {
      inMemorySchools = [];
      return res.json({ success: true, message: "Semua data prospek sekolah telah berhasil di-reset" });
    }
  });

  // BULK SAVE SCHOOLS (e.g. from CSV import)
  app.post("/api/schools/bulk", async (req, res) => {
    const schoolsList = req.body;
    if (!Array.isArray(schoolsList)) {
      return res.status(400).json({ error: "Data harus berupa array sekolah" });
    }

    // Normalize IDs to ensure each school has a distinct 'no'
    const usedNos = new Set<number>();
    const normalizedSchools = schoolsList.map((sch: any, idx: number) => {
      const parsedNo = typeof sch.no === 'number' ? sch.no : parseInt(String(sch.no), 10);
      let itemNo = (!isNaN(parsedNo) && parsedNo > 0) ? parsedNo : (idx + 1);
      while (usedNos.has(itemNo)) {
        itemNo++;
      }
      usedNos.add(itemNo);
      return {
        no: itemNo,
        namaSekolah: sch.namaSekolah || sch.nama_sekolah || '',
        originalName: sch.originalName || sch.original_name || '',
        provinsi: sch.provinsi || '',
        kota: sch.kota || '',
        instagramHandle: sch.instagramHandle || sch.instagram_handle || '',
        tiktokHandle: sch.tiktokHandle || sch.tiktok_handle || '',
        picMarketing: sch.picMarketing || sch.pic_marketing || '',
        marketingLapangan: sch.marketingLapangan || sch.marketing_lapangan || '',
        status: sch.status || 'BARU',
        kontakPic1: sch.kontakPic1 || sch.kontak_pic1 || '',
        kontakPic2: sch.kontakPic2 || sch.kontak_pic2 || '',
        kontakPic3: sch.kontakPic3 || sch.kontak_pic3 || '',
        kontakPic4: sch.kontakPic4 || sch.kontak_pic4 || '',
        tanggalKontakAwal: sch.tanggalKontakAwal || sch.tanggal_kontak_awal || '',
        jenisLayanan: sch.jenisLayanan || sch.jenis_layanan || '',
        catatanAwal: sch.catatanAwal || sch.catatan_awal || '',
        tanggalFollowUpTerakhir: sch.tanggalFollowUpTerakhir || sch.tanggal_follow_up_terakhir || '',
        kemungkinanClosing: sch.kemungkinanClosing || sch.kemungkinan_closing || '',
        updates: Array.isArray(sch.updates) ? sch.updates : []
      };
    });

    inMemorySchools = normalizedSchools;

    if (usePostgres && pool) {
      try {
        await pool.query("BEGIN;");
        await pool.query("DELETE FROM schools;");
        for (const school of normalizedSchools) {
          const updatesJson = JSON.stringify(school.updates || []);
          await pool.query(
            `INSERT INTO schools (
              no, nama_sekolah, original_name, provinsi, kota, instagram_handle, tiktok_handle,
              pic_marketing, marketing_lapangan, status, kontak_pic1, kontak_pic2, kontak_pic3, kontak_pic4,
              tanggal_kontak_awal, jenis_layanan, catatan_awal, tanggal_follow_up_terakhir, kemungkinan_closing, updates
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
            [
              school.no, school.namaSekolah, school.originalName || null, school.provinsi || null, school.kota || null,
              school.instagramHandle || null, school.tiktokHandle || null, school.picMarketing || '', school.marketingLapangan || null,
              school.status || 'BARU', school.kontakPic1 || '', school.kontakPic2 || '', school.kontakPic3 || '', school.kontakPic4 || '',
              school.tanggalKontakAwal || '', school.jenisLayanan || '', school.catatanAwal || '', school.tanggalFollowUpTerakhir || '',
              school.kemungkinanClosing || '', updatesJson
            ]
          );
        }
        await pool.query("COMMIT;");
        return res.json({ success: true, count: normalizedSchools.length });
      } catch (err) {
        if (pool) await pool.query("ROLLBACK;");
        console.error("Bulk schools sync failed in Postgres", err);
        return res.status(500).json({ error: "Gagal mensinkronisasikan data sekolah ke database" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'schools'));
        if (!snap.empty) {
          let delBatch = writeBatch(firestoreDb);
          let delCount = 0;
          for (const d of snap.docs) {
            delBatch.delete(d.ref);
            delCount++;
            if (delCount >= 400) {
              await delBatch.commit();
              delBatch = writeBatch(firestoreDb);
              delCount = 0;
            }
          }
          if (delCount > 0) {
            await delBatch.commit();
          }
        }

        let writeB = writeBatch(firestoreDb);
        let writeCount = 0;

        for (const school of normalizedSchools) {
          const cleanSchool = sanitizeForFirestore(school);
          const schoolRef = doc(firestoreDb, 'schools', String(cleanSchool.no));
          writeB.set(schoolRef, cleanSchool);
          writeCount++;
          if (writeCount >= 400) {
            await writeB.commit();
            writeB = writeBatch(firestoreDb);
            writeCount = 0;
          }
        }
        if (writeCount > 0) {
          await writeB.commit();
        }

        return res.json({ success: true, count: normalizedSchools.length });
      } catch (err: any) {
        console.error("Bulk schools sync failed in Firestore", err);
        return res.status(500).json({ error: "Gagal menyimpan ke Firestore: " + (err?.message || "Internal server error") });
      }
    } else {
      return res.json({ success: true, count: normalizedSchools.length });
    }
  });

  // RESET CUSTOM SURVEYED DATABASE
  app.post("/api/custom-db/reset", async (req, res) => {
    inMemoryCustomDb = {};
    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM custom_database;");
        return res.json({ success: true, message: "Custom surveyed database telah berhasil di-reset" });
      } catch (err) {
        console.error("Failed to reset custom db in Postgres", err);
        return res.status(500).json({ error: "Gagal me-reset database survei" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'custom_database'));
        let batch = writeBatch(firestoreDb);
        let opCount = 0;
        for (const d of snap.docs) {
          batch.delete(d.ref);
          opCount++;
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(firestoreDb);
            opCount = 0;
          }
        }
        if (opCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error("Failed to reset custom db in Firestore, clearing in-memory", err);
      }
      return res.json({ success: true, message: "Custom surveyed database telah berhasil di-reset" });
    } else {
      return res.json({ success: true, message: "Custom surveyed database telah berhasil di-reset" });
    }
  });

  // GET Custom Database
  app.get("/api/custom-db", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM custom_database;");
        const structured: Record<string, Record<string, any[]>> = {};
        result.rows.forEach(row => {
          const prov = row.provinsi.toUpperCase().trim();
          const city = row.kota.toUpperCase().trim();
          
          if (!structured[prov]) structured[prov] = {};
          if (!structured[prov][city]) structured[prov][city] = [];
          
          if (row.name && row.name.trim()) {
            structured[prov][city].push({
              name: row.name,
              instagramHandle: row.instagram_handle || "",
              tiktokHandle: row.tiktok_handle || ""
            });
          }
        });
        if (Object.keys(structured).length > 0) {
          inMemoryCustomDb = structured;
        }
        return res.json(Object.keys(structured).length > 0 ? structured : inMemoryCustomDb);
      } catch (err) {
        console.error("Failed to load custom database", err);
        return res.json(inMemoryCustomDb);
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'custom_database'));
        const structured: Record<string, Record<string, any[]>> = {};
        snap.forEach(d => {
          const row = d.data();
          const prov = (row.provinsi || '').toUpperCase().trim();
          const city = (row.kota || '').toUpperCase().trim();
          if (prov && city) {
            if (!structured[prov]) structured[prov] = {};
            if (!structured[prov][city]) structured[prov][city] = [];
            if (row.name && row.name.trim()) {
              structured[prov][city].push({
                name: row.name,
                instagramHandle: row.instagramHandle || row.instagram_handle || "",
                tiktokHandle: row.tiktokHandle || row.tiktok_handle || ""
              });
            }
          }
        });
        if (Object.keys(structured).length > 0) {
          inMemoryCustomDb = structured;
        }
        return res.json(Object.keys(structured).length > 0 ? structured : inMemoryCustomDb);
      } catch (err) {
        console.error("Failed to load custom db from Firestore, using in-memory", err);
        return res.json(inMemoryCustomDb);
      }
    } else {
      return res.json(inMemoryCustomDb);
    }
  });

  // BULK SAVE Custom Database
  app.post("/api/custom-db-bulk", async (req, res) => {
    const customDb = req.body || {};
    inMemoryCustomDb = customDb;

    if (usePostgres && pool) {
      try {
        await pool.query("BEGIN;");
        await pool.query("DELETE FROM custom_database;");
        for (const prov of Object.keys(customDb)) {
          for (const city of Object.keys(customDb[prov] || {})) {
            const schList = customDb[prov][city] || [];
            if (schList.length === 0) {
              await pool.query(
                "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
                [prov.toUpperCase().trim(), city.toUpperCase().trim(), "", "", ""]
              );
            } else {
              for (const sch of schList) {
                await pool.query(
                  "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
                  [prov.toUpperCase().trim(), city.toUpperCase().trim(), sch.name || "", sch.instagramHandle || sch.instagram || "", sch.tiktokHandle || sch.tiktok || ""]
                );
              }
            }
          }
        }
        await pool.query("COMMIT;");
        return res.json({ success: true });
      } catch (err) {
        if (pool) await pool.query("ROLLBACK;");
        console.error("Bulk custom-db sync failed", err);
        return res.status(500).json({ error: "Gagal mensinkronisasikan database survei" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'custom_database'));
        if (!snap.empty) {
          let delBatch = writeBatch(firestoreDb);
          let delCount = 0;
          for (const d of snap.docs) {
            delBatch.delete(d.ref);
            delCount++;
            if (delCount >= 400) {
              await delBatch.commit();
              delBatch = writeBatch(firestoreDb);
              delCount = 0;
            }
          }
          if (delCount > 0) {
            await delBatch.commit();
          }
        }

        let writeB = writeBatch(firestoreDb);
        let writeCount = 0;
        let counter = 0;

        for (const prov of Object.keys(customDb)) {
          for (const city of Object.keys(customDb[prov] || {})) {
            const schList = customDb[prov][city] || [];
            if (schList.length === 0) {
              counter++;
              const docRef = doc(firestoreDb, 'custom_database', `custom_${counter}`);
              writeB.set(docRef, sanitizeForFirestore({
                provinsi: prov.toUpperCase().trim(),
                kota: city.toUpperCase().trim(),
                name: "",
                instagramHandle: "",
                tiktokHandle: ""
              }));
              writeCount++;
            } else {
              for (const sch of schList) {
                counter++;
                const docRef = doc(firestoreDb, 'custom_database', `custom_${counter}`);
                writeB.set(docRef, sanitizeForFirestore({
                  provinsi: prov.toUpperCase().trim(),
                  kota: city.toUpperCase().trim(),
                  name: sch.name || "",
                  instagramHandle: sch.instagramHandle || sch.instagram || "",
                  tiktokHandle: sch.tiktokHandle || sch.tiktok || ""
                }));
                writeCount++;
              }
            }
            if (writeCount >= 400) {
              await writeB.commit();
              writeB = writeBatch(firestoreDb);
              writeCount = 0;
            }
          }
        }
        if (writeCount > 0) {
          await writeB.commit();
        }

        return res.json({ success: true });
      } catch (err: any) {
        console.error("Bulk custom-db sync failed in Firestore", err);
        return res.status(500).json({ error: "Gagal menyimpan database custom ke Firestore: " + (err?.message || "Internal server error") });
      }
    } else {
      return res.json({ success: true });
    }
  });

  // ADD Custom Database Entry
  app.post("/api/custom-db", async (req, res) => {
    const { provinsi, kota, school } = req.body;
    if (!provinsi || !kota) {
      return res.status(400).json({ error: "Data provinsi dan kota wajib diisi" });
    }

    const provUpper = provinsi.toUpperCase().trim();
    const cityUpper = kota.toUpperCase().trim();
    const schObj = school || { name: "", instagramHandle: "", tiktokHandle: "" };

    if (usePostgres && pool) {
      try {
        await pool.query(
          "INSERT INTO custom_database (provinsi, kota, name, instagram_handle, tiktok_handle) VALUES ($1, $2, $3, $4, $5);",
          [provUpper, cityUpper, schObj.name || "", schObj.instagramHandle || "", schObj.tiktokHandle || ""]
        );
        return res.json({ success: true });
      } catch (err) {
        console.error("Failed to add custom database entry", err);
        return res.status(500).json({ error: "Gagal menyimpan data survei" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const docId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(firestoreDb, 'custom_database', docId), {
          provinsi: provUpper,
          kota: cityUpper,
          name: schObj.name || "",
          instagramHandle: schObj.instagramHandle || "",
          tiktokHandle: schObj.tiktokHandle || ""
        });
        return res.json({ success: true });
      } catch (err) {
        console.error("Failed to add custom database entry in Firestore, using in-memory", err);
        if (!inMemoryCustomDb[provUpper]) inMemoryCustomDb[provUpper] = {};
        if (!inMemoryCustomDb[provUpper][cityUpper]) inMemoryCustomDb[provUpper][cityUpper] = [];
        if (schObj.name) {
          inMemoryCustomDb[provUpper][cityUpper].push(schObj);
        }
        return res.json({ success: true });
      }
    } else {
      if (!inMemoryCustomDb[provUpper]) inMemoryCustomDb[provUpper] = {};
      if (!inMemoryCustomDb[provUpper][cityUpper]) inMemoryCustomDb[provUpper][cityUpper] = [];
      if (schObj.name) {
        inMemoryCustomDb[provUpper][cityUpper].push(schObj);
      }
      return res.json({ success: true });
    }
  });

  // GET Academic Years
  app.get("/api/academic-years", async (req, res) => {
    if (usePostgres && pool) {
      try {
        const result = await pool.query("SELECT * FROM academic_years;");
        if (result.rows.length === 0) {
          // seed default
          for (const ay of defaultAcademicYears) {
            await pool.query(
              "INSERT INTO academic_years (id, year_name, title, start_date, end_date, status, note) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;",
              [ay.id, ay.yearName, ay.title, ay.startDate, ay.endDate, ay.status, ay.note]
            );
          }
          return res.json(defaultAcademicYears);
        }
        const formatted = result.rows.map(r => ({
          id: r.id,
          yearName: r.year_name,
          title: r.title,
          startDate: r.start_date,
          endDate: r.end_date,
          status: r.status,
          note: r.note
        }));
        return res.json(formatted);
      } catch (err) {
        console.error("Failed to load academic years from Postgres", err);
        return res.json(inMemoryAcademicYears);
      }
    } else if (useFirestore && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'academic_years'));
        if (snap.empty) {
          // Seed initial default academic years into Firestore
          for (const ay of defaultAcademicYears) {
            await setDoc(doc(firestoreDb, 'academic_years', ay.id), ay);
          }
          return res.json(defaultAcademicYears);
        }
        const list: any[] = [];
        snap.forEach(d => list.push(d.data()));
        return res.json(list);
      } catch (err) {
        console.error("Failed to load academic years from Firestore, using in-memory", err);
        return res.json(inMemoryAcademicYears);
      }
    } else {
      return res.json(inMemoryAcademicYears);
    }
  });

  // SAVE or UPDATE Academic Year
  app.post("/api/academic-years", async (req, res) => {
    const ay = req.body;
    if (!ay.yearName) {
      return res.status(400).json({ error: "Nama periode wajib diisi" });
    }

    const ayObj = {
      id: ay.id || `ay-${ay.yearName.replace(/\//g, '-')}`,
      yearName: ay.yearName,
      title: ay.title || `Tahun Ajaran ${ay.yearName}`,
      startDate: ay.startDate || '',
      endDate: ay.endDate || '',
      status: ay.status || 'MENDATANG',
      note: ay.note || ''
    };

    if (usePostgres && pool) {
      try {
        if (ayObj.status === 'AKTIF') {
          await pool.query("UPDATE academic_years SET status = 'ARSIP' WHERE status = 'AKTIF';");
        }
        await pool.query(
          `INSERT INTO academic_years (id, year_name, title, start_date, end_date, status, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             year_name = $2, title = $3, start_date = $4, end_date = $5, status = $6, note = $7;`,
          [ayObj.id, ayObj.yearName, ayObj.title, ayObj.startDate, ayObj.endDate, ayObj.status, ayObj.note]
        );
        return res.json(ayObj);
      } catch (err) {
        console.error("Failed to save academic year in Postgres", err);
        return res.status(500).json({ error: "Gagal menyimpan periode academic year" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        if (ayObj.status === 'AKTIF') {
          const snap = await getDocs(collection(firestoreDb, 'academic_years'));
          for (const d of snap.docs) {
            if (d.data().status === 'AKTIF' && d.id !== ayObj.id) {
              await setDoc(doc(firestoreDb, 'academic_years', d.id), { ...d.data(), status: 'ARSIP' });
            }
          }
        }
        await setDoc(doc(firestoreDb, 'academic_years', ayObj.id), sanitizeForFirestore(ayObj));
        
        const idx = inMemoryAcademicYears.findIndex(a => a.id === ayObj.id);
        if (idx !== -1) inMemoryAcademicYears[idx] = ayObj;
        else inMemoryAcademicYears.push(ayObj);

        return res.json(ayObj);
      } catch (err) {
        console.error("Failed to save academic year in Firestore", err);
        const idx = inMemoryAcademicYears.findIndex(a => a.id === ayObj.id);
        if (idx !== -1) inMemoryAcademicYears[idx] = ayObj;
        else inMemoryAcademicYears.push(ayObj);
        return res.json(ayObj);
      }
    } else {
      if (ayObj.status === 'AKTIF') {
        inMemoryAcademicYears = inMemoryAcademicYears.map(a => a.id !== ayObj.id ? { ...a, status: 'ARSIP' } : a);
      }
      const idx = inMemoryAcademicYears.findIndex(a => a.id === ayObj.id);
      if (idx !== -1) inMemoryAcademicYears[idx] = ayObj;
      else inMemoryAcademicYears.push(ayObj);
      return res.json(ayObj);
    }
  });

  // DELETE Academic Year
  app.delete("/api/academic-years/:id", async (req, res) => {
    const ayId = req.params.id;
    if (usePostgres && pool) {
      try {
        await pool.query("DELETE FROM academic_years WHERE id = $1;", [ayId]);
        return res.json({ success: true });
      } catch (err) {
        console.error("Failed to delete academic year in Postgres", err);
        return res.status(500).json({ error: "Gagal menghapus periode" });
      }
    } else if (useFirestore && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'academic_years', ayId));
        inMemoryAcademicYears = inMemoryAcademicYears.filter(a => a.id !== ayId);
        return res.json({ success: true });
      } catch (err) {
        console.error("Failed to delete academic year in Firestore", err);
        inMemoryAcademicYears = inMemoryAcademicYears.filter(a => a.id !== ayId);
        return res.json({ success: true });
      }
    } else {
      inMemoryAcademicYears = inMemoryAcademicYears.filter(a => a.id !== ayId);
      return res.json({ success: true });
    }
  });

  // --- MOUNT PUBLIC AND VITE MIDDLEWARE ---
  app.use(express.static(path.join(process.cwd(), 'public')));

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
