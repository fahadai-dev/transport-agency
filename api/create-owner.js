// ============================================================
// POST /api/create-owner
// এইটা ADMIN-ONLY টুল — শুধু তুমি (ফাহাদ) নতুন ক্লায়েন্টের জন্য
// দোকান + owner অ্যাকাউন্ট বানানোর সময় এটা কল করবে।
// admin_code মিলিয়ে দেখা হয় সার্ভারে রাখা ADMIN_SECRET_CODE
// env var-এর সাথে — এই কোড কখনো ব্রাউজার/ক্লায়েন্ট সাইড কোডে
// থাকে না, তাই কেউ পেজ সোর্স দেখেও কোডটা বের করতে পারবে না।
//
// দরকারি Vercel env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ADMIN_SECRET_CODE (তুমি নিজে যেকোনো গোপন স্ট্রিং বসাবে)
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { admin_code, shop_name, full_name, email, password, logo_url } =
      req.body || {};

    if (!process.env.ADMIN_SECRET_CODE) {
      return res
        .status(500)
        .json({ error: "সার্ভারে ADMIN_SECRET_CODE সেট করা নেই" });
    }
    if (!admin_code || admin_code !== process.env.ADMIN_SECRET_CODE) {
      return res.status(403).json({ error: "আডমিন কোড ভুল" });
    }

    if (!shop_name || !full_name || !email || !password) {
      return res
        .status(400)
        .json({
          error:
            "দোকানের নাম, মালিকের নাম, ইমেইল ও পাসওয়ার্ড — সব ঘর পূরণ করো",
        });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ error: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" });
    }

    // shop_id মেটাডেটায় নেই বলে schema.sql-এর trigger নতুন shop + owner
    // profile দুটোই বানাবে (create-staff.js-এর উল্টো — ওখানে shop_id
    // পাঠানো হয় বলে trigger বিদ্যমান শপেই স্টাফ যোগ করে)
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          shop_name,
          full_name,
          logo_url: logo_url || null,
        },
      });

    if (createErr) throw createErr;

    return res.status(200).json({ success: true, owner_id: created.user.id });
  } catch (err) {
    const msg = (err && err.message) || "";
    const friendly = msg.includes("already been registered")
      ? "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে"
      : msg || "দোকান তৈরি করা যায়নি";
    return res.status(400).json({ error: friendly });
  }
};
