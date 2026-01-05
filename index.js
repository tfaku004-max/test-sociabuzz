const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ==========================
// ENVIRONMENT VARIABLES
// ==========================
const SECRET_KEY = process.env.SECRET_KEY || "MDMDx2210"; // untuk Roblox
const SOCIABUZZ_TOKEN = process.env.SOCIABUZZ_TOKEN; // dari dashboard Sociabuzz
const ROBLOX_API = process.env.ROBLOX_API; // opsional
const PORT = process.env.PORT || 3000;

// Debug: pastikan environment variable terbaca
console.log("✅ SECRET_KEY:", SECRET_KEY);
console.log("✅ SOCIABUZZ_TOKEN:", SOCIABUZZ_TOKEN);
console.log("✅ ROBLOX_API:", ROBLOX_API);

// ==========================
// STORAGE SEMENTARA
// ==========================
let donations = [];
let sentToRoblox = new Set();

// ==========================
// WEBHOOK SOCIABUZZ
// ==========================
app.post("/api/webhook/sociabuzz", async (req, res) => {
  try {
    // Ambil token dari header atau body
    let incomingToken =
      req.headers["x-webhook-token"] ||
      req.headers["authorization"] ||
      req.body?.token;

    // Jika pakai format "Bearer <token>", strip "Bearer "
    if (incomingToken?.startsWith("Bearer ")) {
      incomingToken = incomingToken.slice(7).trim();
    }

    // Debug: cek token masuk
    console.log("🔑 Incoming token:", incomingToken);

    if (!SOCIABUZZ_TOKEN) {
      console.error("⚠️ SOCIABUZZ_TOKEN undefined!");
      return res.status(500).json({ ok: false, error: "Server misconfiguration" });
    }

    if (incomingToken !== SOCIABUZZ_TOKEN) {
      console.log("❌ Token mismatch! Incoming:", incomingToken, "Expected:", SOCIABUZZ_TOKEN);
      return res.status(401).json({ ok: false, error: "Invalid webhook token" });
    }

    // 📦 PAYLOAD AMAN
    const payload = req.body?.data || req.body || {};
    console.log("📥 Webhook Sociabuzz masuk:", payload);

    const amount = Number(payload.amount || payload.total || 0);
    if (amount <= 0) {
      return res.json({ ok: false, reason: "Invalid amount" });
    }

    const donation = {
      id: payload.id || (Date.now().toString() + Math.floor(Math.random() * 1000)),
      donor: payload.supporter_name || payload.name || "Anonymous",
      amount,
      message: payload.message || "",
      platform: "sociabuzz",
      matchedUsername: payload.supporter_name || payload.name || "Anonymous",
      ts: Date.now()
    };

    donations.push(donation);

    // 🎮 KIRIM KE ROBLOX
    if (!sentToRoblox.has(donation.id) && ROBLOX_API) {
      try {
        await axios.post(`${ROBLOX_API}/${SECRET_KEY}`, {
          donor: donation.donor,
          amount: donation.amount,
          message: donation.message,
          matchedUsername: donation.matchedUsername,
          platform: donation.platform
        });
        sentToRoblox.add(donation.id);
        console.log("✅ Donation dikirim ke Roblox:", donation);
      } catch (err) {
        console.error("❌ Gagal kirim ke Roblox:", err.message);
      }
    }

    res.json({ ok: true });

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ==========================
// FETCH DONASI UNTUK ROBLOX
// ==========================
app.get("/api/donations/:secret", (req, res) => {
  if (req.params.secret !== SECRET_KEY) {
    return res.status(403).json({ ok: false, error: "Invalid secret key" });
  }

  const since = Number(req.query.since || 0);
  const result = donations.filter(d => d.ts > since);

  res.json({ ok: true, donations: result.slice(0, 50) });
});

// ==========================
// REGISTER PLAYER (ROBLOX)
// ==========================
app.post("/api/register/:secret", (req, res) => {
  if (req.params.secret !== SECRET_KEY) {
    return res.status(403).json({ ok: false, error: "Invalid secret key" });
  }

  console.log("Register donation:", req.body);
  res.json({ ok: true });
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`✅ Donation API (Sociabuzz) running on port ${PORT}`);
});
