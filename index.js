const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ==========================
// ENVIRONMENT VARIABLES
// ==========================
const SECRET_KEY = process.env.SECRET_KEY || "MDMDx2210"; // untuk Roblox
const ROBLOX_API = process.env.ROBLOX_API; // endpoint Roblox HTTP
const PORT = process.env.PORT || 3000;

// Debug
console.log("✅ SECRET_KEY:", SECRET_KEY);
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
    console.log("📥 Webhook masuk:", new Date().toISOString());
    console.log("Body:", req.body);

    const payload = req.body || {};
    const amount = Number(payload.amount_settled || payload.price || 0);
    if (amount <= 0) return res.json({ ok: false, reason: "Invalid amount" });

    const donation = {
      id: payload.id || (Date.now().toString() + Math.floor(Math.random() * 1000)),
      donor: payload.supporter || "Anonymous",
      amount,
      message: payload.message || "",
      platform: "sociabuzz",
      matchedUsername: payload.supporter || "Anonymous",
      ts: Date.now()
    };

    donations.push(donation);

    // Kirim ke Roblox
    if (!sentToRoblox.has(donation.id) && ROBLOX_API) {
      try {
        const resp = await axios.post(`${ROBLOX_API}/${SECRET_KEY}`, donation, {
          headers: { "Content-Type": "application/json" }
        });
        sentToRoblox.add(donation.id);
        console.log("✅ Donation dikirim ke Roblox:", resp.data);
      } catch (err) {
        console.error("❌ Gagal kirim ke Roblox:", err.response?.data || err.message);
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
  console.log("Register player:", req.body);
  res.json({ ok: true });
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`✅ Donation API running on port ${PORT}`);
});
