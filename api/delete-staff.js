// ============================================================
// POST /api/delete-staff
// শুধু owner, আর শুধু নিজের শপের স্টাফকে ডিলিট করতে পারবে।
// auth.users থেকে ডিলিট হলে schema.sql-এর
// "on delete cascade" থাকায় profiles রো-ও অটোমেটিক মুছে যায়।
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

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", userData.user.id)
      .single();

    if (!ownerProfile || ownerProfile.role !== "owner") {
      return res
        .status(403)
        .json({ error: "শুধু মালিক স্টাফ ডিলিট করতে পারে" });
    }

    const { staff_id } = req.body || {};
    if (!staff_id) return res.status(400).json({ error: "staff_id দরকার" });
    if (staff_id === userData.user.id) {
      return res.status(400).json({ error: "নিজেকে ডিলিট করা যাবে না" });
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", staff_id)
      .single();

    if (!targetProfile || targetProfile.shop_id !== ownerProfile.shop_id) {
      return res.status(403).json({ error: "এই স্টাফ তোমার দোকানের নয়" });
    }
    if (targetProfile.role === "owner") {
      return res
        .status(403)
        .json({ error: "মালিকের অ্যাকাউন্ট ডিলিট করা যাবে না" });
    }

    const { error: deleteErr } =
      await supabaseAdmin.auth.admin.deleteUser(staff_id);
    if (deleteErr) throw deleteErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    return res
      .status(400)
      .json({ error: (err && err.message) || "স্টাফ ডিলিট করা যায়নি" });
  }
};
