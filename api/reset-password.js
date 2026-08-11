// ============================================================
// POST /api/reset-password
// শুধু owner, আর শুধু নিজের শপের স্টাফের পাসওয়ার্ড রিসেট করতে পারবে।
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
        .json({ error: "শুধু মালিক পাসওয়ার্ড রিসেট করতে পারে" });
    }

    const { staff_id, new_password } = req.body || {};
    if (!staff_id || !new_password || String(new_password).length < 6) {
      return res
        .status(400)
        .json({ error: "সঠিক তথ্য দাও (পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার)" });
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
        .json({ error: "মালিকের পাসওয়ার্ড এখান থেকে বদলানো যায় না" });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      staff_id,
      {
        password: new_password,
      },
    );
    if (updateErr) throw updateErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    return res
      .status(400)
      .json({ error: (err && err.message) || "পাসওয়ার্ড রিসেট করা যায়নি" });
  }
};
