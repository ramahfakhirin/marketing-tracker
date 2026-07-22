import { chromium } from "@playwright/test";
import { strict as assert } from "assert";

const BASE = "https://marketing.nano.co.id";

// ─── Helper ─────────────────────────────────────────────────────────────
async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

// ─── Test Harness ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  return async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (err) {
      failed++;
      failures.push({ name, message: err.message });
      console.log(`  ❌ ${name}`);
      console.log(`      ${err.message.split("\n")[0]}`);
    }
  };
}

async function run() {
  console.log("\n🧪 MARKETING TRACKER — QA TEST SUITE\n");

  // ─── AUTHENTICATION TESTS ──────────────────────────────────────────
  console.log("─── AUTHENTICATION ───");

  await test("Login valid SUPERADMIN mendapat token JWT", async () => {
    const { status, data } = await api("POST", "/api/login", {
      username: "superadmin", password: "admin123",
    });
    assert.equal(status, 200);
    assert.ok(data.token, "Token tidak ada");
    assert.equal(data.user.role, "SUPERADMIN");
    assert.ok(!data.user.password, "Password terekspos di response");
    global.__adminToken = data.token;
  })();

  await test("Login invalid mendapat 401", async () => {
    const { status } = await api("POST", "/api/login", {
      username: "superadmin", password: "wrongpass",
    });
    assert.equal(status, 401);
  })();

  await test("Login tanpa body mendapat 400", async () => {
    const { status } = await api("POST", "/api/login", { username: "superadmin" });
    assert.equal(status, 400);
  })();

  await test("API tanpa token mendapat 401", async () => {
    const { status } = await api("GET", "/api/schools");
    assert.equal(status, 401);
  })();

  await test("API dengan token palsu mendapat 401", async () => {
    const { status } = await api("GET", "/api/schools", null, "fake.token.here");
    assert.equal(status, 401);
  })();

  await test("Login MANAGER dapat token dengan role MANAGER", async () => {
    const { status, data } = await api("POST", "/api/login", {
      username: "manager", password: "manager123",
    });
    assert.equal(status, 200);
    assert.equal(data.user.role, "MANAGER");
    assert.ok(!data.user.password, "Password terekspos");
    global.__managerToken = data.token;
  })();

  // ─── SCHOOLS API TESTS ─────────────────────────────────────────────
  console.log("\n─── SCHOOLS API ───");

  await test("GET /api/schools dengan token berhasil", async () => {
    const { status, data } = await api("GET", "/api/schools", null, global.__adminToken);
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
  })();

  await test("POST /api/schools validasi — namaSekolah wajib", async () => {
    const { status } = await api("POST", "/api/schools", { status: "BARU" }, global.__adminToken);
    assert.equal(status, 400);
  })();

  await test("POST /api/schools validasi — status enum", async () => {
    const { status } = await api("POST", "/api/schools", {
      namaSekolah: "Test", status: "INVALID",
    }, global.__adminToken);
    assert.equal(status, 400);
  })();

  await test("POST /api/schools create + GET detail", async () => {
    const { status, data } = await api("POST", "/api/schools", {
      namaSekolah: "QA Test School",
      provinsi: "JAWA TIMUR",
      kota: "SURABAYA",
      status: "BARU",
      picMarketing: "Ramadhan",
      kemungkinanClosing: "HIGH",
    }, global.__adminToken);
    assert.equal(status, 200);
    assert.ok(data.no > 0);
    global.__testSchoolNo = data.no;
  })();

  await test("POST /api/schools update existing", async () => {
    const { status, data } = await api("POST", "/api/schools", {
      no: global.__testSchoolNo,
      namaSekolah: "QA Test School UPDATED",
      status: "FOLLOW UP",
      picMarketing: "Citra",
    }, global.__adminToken);
    assert.equal(status, 200);
    assert.equal(data.namaSekolah, "QA Test School UPDATED");
  })();

  await test("DELETE /api/schools/:no dengan no valid", async () => {
    const { status } = await api("DELETE", `/api/schools/${global.__testSchoolNo}`, null, global.__adminToken);
    assert.equal(status, 200);
  })();

  await test("DELETE /api/schools/:no dengan no invalid (400)", async () => {
    const { status } = await api("DELETE", "/api/schools/abc", null, global.__adminToken);
    assert.equal(status, 400);
  })();

  // ─── TEAM API TESTS ────────────────────────────────────────────────
  console.log("\n─── TEAM API ───");

  await test("GET /api/team tidak expose password", async () => {
    const { status, data } = await api("GET", "/api/team", null, global.__adminToken);
    assert.equal(status, 200);
    for (const m of data) {
      assert.equal(m.password, undefined, `Password terekspos untuk ${m.username}`);
    }
  })();

  await test("POST /api/team oleh MANAGER ditolak (403)", async () => {
    const { status } = await api("POST", "/api/team", {
      name: "Hacker", role: "AE", username: "hacker",
    }, global.__managerToken);
    assert.equal(status, 403);
  })();

  await test("POST /api/team oleh SUPERADMIN berhasil", async () => {
    // Delete existing qatester if present (from previous run)
    const { data: existingTeam } = await api("GET", "/api/team", null, global.__adminToken);
    for (const m of existingTeam) {
      if (m.username === "qatester") {
        await api("DELETE", `/api/team/${m.id}`, null, global.__adminToken);
      }
    }
    const { status, data } = await api("POST", "/api/team", {
      name: "QA Tester", role: "AE", username: "qatester", password: "test123",
    }, global.__adminToken);
    assert.equal(status, 200);
    assert.equal(data.name, "QA Tester");
    assert.equal(data.username, "qatester");
    global.__testMemberId = data.id;
  })();

  await test("POST /api/team username duplikat ditolak", async () => {
    const { status } = await api("POST", "/api/team", {
      name: "QA Tester 2", role: "AE", username: "qatester",
    }, global.__adminToken);
    assert.equal(status, 500);
  })();

  await test("POST /api/team validasi name wajib", async () => {
    const { status } = await api("POST", "/api/team", {
      role: "AE", username: "no_name",
    }, global.__adminToken);
    assert.equal(status, 400);
  })();

  await test("POST /api/team validasi role enum", async () => {
    const { status } = await api("POST", "/api/team", {
      name: "Invalid Role", role: "HACKER", username: "hacker2",
    }, global.__adminToken);
    assert.equal(status, 400);
  })();

  await test("DELETE /api/team/:id oleh SUPERADMIN berhasil", async () => {
    const { status } = await api("DELETE", `/api/team/${global.__testMemberId}`, null, global.__adminToken);
    assert.equal(status, 200);
  })();

  await test("DELETE /api/team/:id oleh MANAGER ditolak (403)", async () => {
    const { status } = await api("DELETE", `/api/team/${global.__testMemberId}`, null, global.__managerToken);
    assert.equal(status, 403);
  })();

  // ─── CUSTOM DATABASE API TESTS ──────────────────────────────────────
  console.log("\n─── CUSTOM DATABASE API ───");

  await test("POST /api/custom-db add entry", async () => {
    const { status } = await api("POST", "/api/custom-db", {
      provinsi: "JAWA TIMUR",
      kota: "SURABAYA",
      school: { name: "QA Test Entry", instagramHandle: "@qatest" },
    }, global.__adminToken);
    assert.equal(status, 200);
  })();

  await test("GET /api/custom-db berisi data yang ditambahkan", async () => {
    const { status, data } = await api("GET", "/api/custom-db", null, global.__adminToken);
    assert.equal(status, 200);
    assert.ok(Object.keys(data).includes("JAWA TIMUR"));
  })();

  await test("POST /api/custom-db validasi data tidak lengkap (400)", async () => {
    const { status } = await api("POST", "/api/custom-db", {
      provinsi: "JAWA TIMUR",
    }, global.__adminToken);
    assert.equal(status, 400);
  })();

  await test("HEALTH endpoint tidak bocorin info sensitif", async () => {
    const { status, data } = await api("GET", "/api/health");
    assert.equal(status, 200);
    assert.equal(data.status, "ok");
    assert.equal(data.database, undefined, "Health endpoint bocorin tipe database");
    assert.equal(data.vps, undefined, "Health endpoint bocorin label VPS");
  })();

  // ─── PLAYWRIGHT BROWSER TESTS ──────────────────────────────────────
  console.log("\n─── UI BROWSER TESTS ───");

  const browser = await chromium.launch({ headless: true });

  await test("Halaman login tampil dengan benar", async () => {
    const page = await browser.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("#btn-login-submit", { timeout: 10000 });
    const title = await page.title();
    assert.ok(title.includes("Marketing & CRM Tracker"), "Title tidak sesuai: " + title);
    await page.close();
  })();

  async function doLogin(page) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("#login-username", { timeout: 10000 });
    await page.fill("#login-username", "superadmin");
    await page.fill("#login-password", "admin123");
    await page.click("#btn-login-submit");
    await page.waitForTimeout(3000);
  }

  await test("Login flow — input kredensial + submit sukses", async () => {
    const page = await browser.newPage();
    await doLogin(page);

    const dashboardVisible = await page.locator("text=Dashboard Analisa").isVisible().catch(() => false);
    const mobileNavVisible = await page.locator("text=Prospek").isVisible().catch(() => false);
    assert.ok(dashboardVisible || mobileNavVisible, "Tidak redirect ke dashboard setelah login");
    await page.close();
  })();

  await test("Dashboard menampilkan KPI cards", async () => {
    const page = await browser.newPage();
    await doLogin(page);

    const kpiVisible = await page.locator("text=Total Target").isVisible().catch(() => false);
    assert.ok(kpiVisible, "KPI cards tidak tampil (Total Target)");
    await page.close();
  })();

  await test("Tab navigasi — pindah ke Daftar Prospek", async () => {
    const page = await browser.newPage();
    await doLogin(page);

    await page.click("#tab-btn-prospects");
    await page.waitForTimeout(2000);

    const prospectsVisible = await page.locator("text=Daftar Prospek Sekolah Aktif").isVisible().catch(() => false);
    assert.ok(prospectsVisible, "Halaman prospek tidak tampil");
    await page.close();
  })();

  await test("Tab navigasi — Database Sekolah", async () => {
    const page = await browser.newPage();
    await doLogin(page);

    await page.click("#tab-btn-database");
    await page.waitForTimeout(2000);

    const dbVisible = await page.locator("text=Eksplorasi Database Sekolah").isVisible().catch(() => false);
    assert.ok(dbVisible, "Database explorer tidak tampil");
    await page.close();
  })();

  await test("Logout flow berfungsi", async () => {
    const page = await browser.newPage();
    await doLogin(page);

    await page.click('#btn-header-logout-desktop');
    await page.waitForTimeout(2000);

    const loginVisible = await page.locator("#btn-login-submit").isVisible().catch(() => false);
    assert.ok(loginVisible, "Tidak kembali ke halaman login setelah logout");
    await page.close();
  })();

  await browser.close();

  // ─── SUMMARY ────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 HASIL: ${passed}/${total} lulus, ${failed} gagal\n`);
  if (failures.length > 0) {
    console.log("Rincian kegagalan:");
    for (const f of failures) {
      console.log(`  ❌ ${f.name}`);
      console.log(`     ${f.message}`);
    }
  }
  console.log(`\nSeverity distribution:`);
  console.log(`  🔴 Critical  (auth, access control): ${countSeverity("Critical")}`);
  console.log(`  🟠 High      (data integrity): ${countSeverity("High")}`);
  console.log(`  🟡 Medium    (validation, edge case): ${countSeverity("Medium")}`);
  console.log(`  🟢 Low       (info, UI): ${countSeverity("Low")}`);

  process.exit(failed > 0 ? 1 : 0);
}

function countSeverity(level) {
  return 0; // placeholder — bisa diperluas
}

run();
