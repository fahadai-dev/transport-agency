// ============================================================
// POST /api/create-staff
// শুধু owner এই এন্ডপয়েন্ট কল করতে পারবে। Service role key ব্যবহার
// করে নতুন স্টাফ auth ইউজার বানায়, user_metadata-তে shop_id/role
// বসিয়ে দেয় — schema.sql-এর handle_new_user() ট্রিগার সেই মেটাডেটা
// দেখে সরাসরি profiles টেবিলে স্টাফ রো বসিয়ে দেবে (মালিকের একই
// শপে, নতুন শপ তৈরি হবে না)।
//
// দরকারি Vercel env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (service role key কখনোই ক্লায়েন্ট সাইড কোডে/config.js-এ বসাবে না)
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
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "লগইন করা নেই" });

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return res
        .status(401)
        .json({ error: "সেশনের মেয়াদ শেষ, আবার লগইন করো" });
    }

    const { data: ownerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", userData.user.id)
      .single();

    if (profileErr || !ownerProfile) {
      return res.status(403).json({ error: "প্রোফাইল পাওয়া যায়নি" });
    }
    if (ownerProfile.role !== "owner") {
      return res.status(403).json({ error: "শুধু মালিক স্টাফ যোগ করতে পারে" });
    }

    const { full_name, email, password } = req.body || {};
    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ error: "নাম, ইমেইল ও পাসওয়ার্ড — সব ঘর পূরণ করো" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ error: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" });
    }

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // অ্যাডমিন বানাচ্ছে, তাই ইমেইল ভেরিফিকেশনের দরকার নেই
        user_metadata: {
          shop_id: ownerProfile.shop_id,
          full_name,
          role: "staff",
        },
      });

    if (createErr) throw createErr;

    return res.status(200).json({ success: true, staff_id: created.user.id });
  } catch (err) {
    const msg = (err && err.message) || "";
    const friendly = msg.includes("already been registered")
      ? "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে"
      : msg || "স্টাফ তৈরি করা যায়নি";
    return res.status(400).json({ error: friendly });
  }
};
