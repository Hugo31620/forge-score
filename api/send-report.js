// Fonction serveur Vercel — envoie le rapport PDF au prospect via Brevo.
// La clé API reste secrète côté serveur (variable d'environnement Vercel).
//
// Variables d'environnement à définir dans Vercel :
//   BREVO_API_KEY   = ta clé API Brevo
//   SENDER_EMAIL    = l'email expéditeur vérifié dans Brevo (ex. contact@forge-ia.fr)
//   SENDER_NAME     = "Forge-IA"  (optionnel)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, entreprise, nom, pdfBase64 } = req.body || {};
  if (!email || !pdfBase64) {
    return res.status(400).json({ error: "Champs manquants (email ou pdf)" });
  }

  const SENDER_EMAIL = process.env.SENDER_EMAIL;
  const SENDER_NAME = process.env.SENDER_NAME || "Forge-IA";
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    return res.status(500).json({ error: "Configuration serveur incomplète" });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0D1117;line-height:1.6;">
      <p>Bonjour ${nom ? nom.split(" ")[0] : ""},</p>
      <p>Merci d'avoir réalisé votre <strong>Forge Score</strong>.</p>
      <p>Vous trouverez en pièce jointe votre rapport de diagnostic data
      personnalisé pour <strong>${entreprise || "votre entreprise"}</strong>.</p>
      <p>Si vous souhaitez en discuter, je vous propose un échange gratuit de
      30 minutes pour transformer ces premiers constats en plan d'action concret.
      Répondez simplement à cet email.</p>
      <p>Bien cordialement,<br>
      Hugo Mintegui<br>
      <strong>Forge-IA</strong> — On forge vos données en performance industrielle<br>
      contact@forge-ia.fr · forge-ia.fr</p>
    </div>`;

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        subject: "Votre rapport Forge Score",
        htmlContent: html,
        attachment: [
          {
            content: pdfBase64,
            name: `Forge_Score_${(entreprise || "rapport").replace(/\s+/g, "_")}.pdf`,
          },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: "Brevo: " + txt });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
