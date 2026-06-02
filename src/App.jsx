import React, { useState, useEffect, useRef } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Mail,
  TrendingUp, Database, ShieldCheck, BarChart3, Zap, Compass,
} from "lucide-react";

/* ============================================================
   FORGE SCORE v2 — Diagnostic de maturité data
   Forge-IA · Hugo Mintegui
   ============================================================ */

// ---- CONFIG ----
// Remplace XXXXXXXX par ton identifiant Formspree (formspree.io)
const FORMSPREE_URL = "https://formspree.io/f/xgoqbnnv";

// Envoi unique vers Formspree. `email` est le champ que Formspree utilise
// pour l'autoréponse au client ; les autres champs te parviennent par mail.
async function submitToFormspree(setup, result, extra = {}) {
  const payload = {
    email: setup.email,            // déclenche l'autoréponse client + recontact
    _replyto: setup.email,
    _subject: `Forge Score — ${setup.ent} · ${result.global}/100 (${result.grade})`,
    entreprise: setup.ent,
    contact: setup.nom,
    secteur: result.sector.label,
    taille: setup.size,
    score: result.global,
    note: result.grade,
    niveau: result.niveau,
    levier_1: result.quickWins[0]?.label,
    levier_2: result.quickWins[1]?.label,
    levier_3: result.quickWins[2]?.label,
    ...extra,
  };
  const res = await fetch(FORMSPREE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Formspree " + res.status);
  return res;
}

// ---- PALETTE · Concept Blueprint (bleu de Prusse + or) ----
// Conventions de nommage conservées (cyan/orange/borderCyan) pour ne pas
// casser les références existantes ; les valeurs portent la nouvelle DA.
const C = {
  bg: "#0A1A2F", bg2: "#0D2138", bg3: "#102942",
  cyan: "#7FB3D5",            // bleu-acier — annotations, tracés secondaires
  orange: "#E8B04B",          // or — accent principal / CTA
  text: "#EDE7D8",            // papier
  muted: "#9FB0C2", dim: "#5A6E84",
  border: "rgba(127,179,213,0.16)", borderCyan: "rgba(232,176,75,0.32)",
};

// ---- AXES ----
const AXES = {
  collecte: "Collecte & Stockage",
  qualite: "Qualité & Fiabilité",
  exploitation: "Exploitation & Analyse",
  automatisation: "Automatisation",
  strategie: "Stratégie & Culture Data",
};
const AXE_ORDER = ["collecte", "qualite", "exploitation", "automatisation", "strategie"];
const AXE_ICON = {
  collecte: Database, qualite: ShieldCheck, exploitation: BarChart3,
  automatisation: Zap, strategie: Compass,
};

// ---- QUESTIONS (langage accessible + "Je ne sais pas") ----
const Q = (id, axe, text, opts) => ({ id, axe, text, options: opts });
const JNS = ["Je ne sais pas", 1];
const QUESTIONS = [
  Q("Q1", "collecte", "Où sont stockées les informations importantes de votre entreprise ?", [
    ["Sur papier, dans des cahiers ou des classeurs", 0],
    ["Dans des fichiers Excel ou Google Sheets", 1],
    ["Dans un logiciel de gestion (caisse, compta, planning…)", 2],
    ["Dans un logiciel central qui regroupe la plupart des infos", 3],
    ["Tout est dans un système unique, connecté et à jour", 4], JNS]),
  Q("Q2", "collecte", "Vos informations (ventes, stocks, clients…) sont-elles mises à jour régulièrement ?", [
    ["Pas vraiment, on met à jour quand on y pense", 0],
    ["Une fois par semaine ou par mois, à la main", 1],
    ["Tous les jours, mais à la main", 2],
    ["Tous les jours, une partie se fait automatiquement", 3],
    ["Tout se met à jour en temps réel, sans intervention", 4], JNS]),
  Q("Q3", "collecte", "Vos différentes sources d'information se parlent-elles entre elles ?", [
    ["Non, chacun a ses propres fichiers ou cahiers", 0],
    ["On regroupe parfois les infos à la main", 1],
    ["On fait des récapitulatifs réguliers", 2],
    ["La plupart de nos outils sont connectés", 3],
    ["Tout est relié, on croise n'importe quelle info", 4], JNS]),
  Q("Q4", "collecte", "Quelle part de vos informations est sur ordinateur (plutôt que papier ou oral) ?", [
    ["Presque rien, surtout du papier ou de l'oral", 0],
    ["Moins d'un tiers", 1], ["À peu près la moitié", 2],
    ["La majorité", 3], ["Presque tout est numérique", 4], JNS]),
  Q("Q5", "qualite", "Quand quelqu'un saisit une information, y a-t-il une vérification ?", [
    ["Non, on saisit et on espère que c'est juste", 0],
    ["On vérifie de temps en temps", 1],
    ["Quelqu'un relit ou vérifie régulièrement", 2],
    ["Le logiciel signale automatiquement les erreurs évidentes", 3],
    ["Contrôles automatiques + vérifications régulières", 4], JNS]),
  Q("Q6", "qualite", "Quand vous regardez un chiffre, vous y faites confiance ?", [
    ["Non, je revérifie toujours moi-même", 0],
    ["Je m'en méfie, je recoupe souvent", 1],
    ["Ça dépend d'où vient le chiffre", 2],
    ["Oui, globalement", 3],
    ["Totalement, nos chiffres sont notre boussole", 4], JNS]),
  Q("Q7", "qualite", "Trouvez-vous des erreurs ou infos contradictoires dans vos fichiers ?", [
    ["Oui, c'est un problème permanent", 0], ["Oui, régulièrement", 1],
    ["Parfois, mais on gère", 2], ["Rarement", 3],
    ["Non, nos fichiers sont fiables et bien tenus", 4], JNS]),
  Q("Q8", "qualite", "Si votre ordinateur plantait demain, pourriez-vous récupérer vos données ?", [
    ["Non, on perdrait beaucoup", 0], ["En partie, avec du travail", 1],
    ["Oui, mais ça prendrait du temps", 2], ["Oui, assez vite grâce à des copies", 3],
    ["Oui, tout est sauvegardé automatiquement", 4], JNS]),
  Q("Q9", "exploitation", "Regardez-vous vos chiffres pour prendre une décision ?", [
    ["Non, on décide surtout au ressenti", 0],
    ["Rarement, une fois par an ou en cas de problème", 1],
    ["Oui, tous les mois environ", 2], ["Oui, chaque semaine", 3],
    ["Oui, tous les jours, c'est la base du pilotage", 4], JNS]),
  Q("Q10", "exploitation", "Avez-vous un tableau de bord visuel qui montre la santé de votre activité ?", [
    ["Non, juste des chiffres bruts", 0],
    ["Quelques graphiques faits à la main", 1],
    ["Un tableau Excel mis à jour régulièrement", 2],
    ["Un outil qui se met à jour tout seul", 3],
    ["Plusieurs tableaux de bord en temps réel", 4], JNS]),
  Q("Q11", "exploitation", "Qui sait lire et utiliser les chiffres pour décider ?", [
    ["Personne vraiment", 0], ["Une seule personne, c'est fragile", 1],
    ["Deux ou trois personnes clés", 2], ["Plusieurs personnes dans l'équipe", 3],
    ["Tout le monde est à l'aise avec les chiffres", 4], JNS]),
  Q("Q12", "exploitation", "Vos choix importants s'appuient-ils sur des chiffres concrets ?", [
    ["Non, surtout à l'instinct", 0], ["Rarement, surtout la compta", 1],
    ["Parfois, quand on a les chiffres", 2], ["Souvent, pour les décisions importantes", 3],
    ["Toujours, aucune décision importante sans données", 4], JNS]),
  Q("Q13", "automatisation", "Combien de temps passé à recopier/ressaisir des infos à la main ?", [
    ["Beaucoup, une grosse part du travail", 0], ["Pas mal, plusieurs heures/semaine", 1],
    ["Un peu, quelques heures/semaine", 2], ["Très peu, presque tout est auto", 3],
    ["Aucun, tout circule sans intervention", 4], JNS]),
  Q("Q14", "automatisation", "Vos récapitulatifs réguliers se font-ils tout seuls ?", [
    ["Non, il faut tout refaire à chaque fois", 0],
    ["On a des modèles Excel à remplir", 1], ["C'est en partie automatisé", 2],
    ["La plupart se génèrent automatiquement", 3],
    ["Tout est automatique, on reçoit les rapports", 4], JNS]),
  Q("Q15", "automatisation", "Êtes-vous alerté automatiquement quand quelque chose ne va pas ?", [
    ["Non, on s'en rend compte trop tard", 0],
    ["Parfois, mais c'est quelqu'un qui prévient", 1],
    ["Quelques alertes sur les points critiques", 2],
    ["Oui, sur la plupart des problèmes importants", 3],
    ["Oui, le système détecte les anomalies en amont", 4], JNS]),
  Q("Q16", "automatisation", "Une info saisie quelque part se retrouve-t-elle automatiquement ailleurs ?", [
    ["Non, il faut tout ressaisir partout", 0],
    ["On fait des copier-coller ou exports", 1],
    ["Quelques outils sont connectés", 2],
    ["La plupart se synchronisent automatiquement", 3],
    ["Tout est connecté, une seule saisie suffit", 4], JNS]),
  Q("Q17", "strategie", "Quelqu'un gère-t-il vos données et outils numériques ?", [
    ["Non, personne", 0], ["Pas vraiment, chacun se débrouille", 1],
    ["Oui, en plus de son travail habituel", 2],
    ["Oui, une personne clairement identifiée", 3],
    ["Oui, une vraie mission avec un plan d'action", 4], JNS]),
  Q("Q18", "strategie", "Avez-vous un budget pour améliorer vos outils numériques ?", [
    ["Non, pas de budget pour ça", 0], ["Pas vraiment, au cas par cas", 1],
    ["Un petit budget, pas prioritaire", 2], ["Oui, un budget prévu chaque année", 3],
    ["Oui, un budget dédié sur plusieurs années", 4], JNS]),
  Q("Q19", "strategie", "Comment votre direction voit-elle le numérique et les données ?", [
    ["Pas d'intérêt, ou de la méfiance", 0], ["Curieuse mais sans agir", 1],
    ["Intéressée, on y réfléchit", 2], ["Engagée, des projets en cours", 3],
    ["C'est un axe stratégique clair", 4], JNS]),
  Q("Q20", "strategie", "Vos équipes sont-elles formées aux outils numériques ?", [
    ["Non, aucune formation", 0], ["Chacun apprend sur le tas", 1],
    ["Quelques formations ponctuelles", 2],
    ["Des formations régulières pour les postes clés", 3],
    ["Tout le monde est formé et entretenu", 4], JNS]),
];

// ---- SECTEURS ----
const SECTORS = {
  aeronautique: { label: "Aéronautique / Défense", w: { collecte: 1.0, qualite: 1.4, exploitation: 1.0, automatisation: 0.8, strategie: 0.8 }, bench: { moy: 58, top: 72, bot: 44 } },
  mecanique: { label: "Mécanique industrielle", w: { collecte: 1.1, qualite: 1.0, exploitation: 1.0, automatisation: 1.3, strategie: 0.6 }, bench: { moy: 48, top: 65, bot: 33 } },
  agroalimentaire: { label: "Agroalimentaire", w: { collecte: 1.2, qualite: 1.4, exploitation: 0.8, automatisation: 1.0, strategie: 0.6 }, bench: { moy: 45, top: 62, bot: 30 } },
  btp: { label: "Construction / BTP", w: { collecte: 1.4, qualite: 1.0, exploitation: 1.0, automatisation: 0.9, strategie: 0.7 }, bench: { moy: 38, top: 55, bot: 24 } },
  logistique: { label: "Logistique / Transport", w: { collecte: 1.0, qualite: 0.9, exploitation: 1.2, automatisation: 1.4, strategie: 0.5 }, bench: { moy: 52, top: 70, bot: 37 } },
  commerce: { label: "Commerce / Artisanat / Services", w: { collecte: 1.0, qualite: 0.8, exploitation: 1.3, automatisation: 1.2, strategie: 0.7 }, bench: { moy: 32, top: 48, bot: 18 } },
  autre: { label: "Autre activité", w: { collecte: 1, qualite: 1, exploitation: 1, automatisation: 1, strategie: 1 }, bench: { moy: 46, top: 63, bot: 30 } },
};
const SIZES = {
  micro: "1 à 9 personnes", tpe: "10 à 49 personnes",
  pme: "50 à 249 personnes", eti: "250 personnes ou plus",
};

const RECO = {
  collecte: { t: "Centraliser et numériser vos informations clés", o: "Diagnostic Data Express + Automatisation" },
  qualite: { t: "Fiabiliser vos chiffres critiques", o: "Diagnostic Data Express + Tableau de Bord" },
  exploitation: { t: "Rendre vos données visibles et actionnables", o: "Tableau de Bord Industriel" },
  automatisation: { t: "Supprimer les tâches répétitives chronophages", o: "Automatisation Process" },
  strategie: { t: "Structurer votre pilotage par la donnée", o: "Workshop IA + Diagnostic Data Express" },
};

// ---- SCORING ----
function computeScore(answers, sectorKey) {
  const s = SECTORS[sectorKey] || SECTORS.autre;
  const raw = {};
  AXE_ORDER.forEach((a) => { raw[a] = []; });
  QUESTIONS.forEach((q) => { if (answers[q.id] != null) raw[q.axe].push(answers[q.id]); });
  const axisScores = {};
  AXE_ORDER.forEach((a) => {
    const v = raw[a];
    axisScores[a] = v.length ? Math.round((v.reduce((x, y) => x + y, 0) / (4 * v.length)) * 100) : 0;
  });
  const tw = Object.values(s.w).reduce((x, y) => x + y, 0);
  const global = Math.round(AXE_ORDER.reduce((acc, a) => acc + axisScores[a] * s.w[a], 0) / tw);
  const grade = global >= 80 ? "A" : global >= 65 ? "B" : global >= 50 ? "C" : global >= 35 ? "D" : "E";
  const niveau = global >= 66 ? "Avancé" : global >= 36 ? "Intermédiaire" : "Débutant";
  const sorted = [...AXE_ORDER].sort((a, b) => axisScores[a] - axisScores[b]);
  const quickWins = sorted.slice(0, 3).map((a) => ({ axe: a, label: AXES[a], score: axisScores[a], reco: RECO[a] }));
  return { global, grade, niveau, axisScores, quickWins, sector: s };
}

// ---- FONTS + KEYFRAMES ----
function useBrandStyles() {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(l);
    const st = document.createElement("style");
    st.textContent = `
      @keyframes fgFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes fgSlideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
      @keyframes fgPulse{0%,100%{opacity:.5}50%{opacity:1}}
      @keyframes fgGridMove{from{background-position:0 0,0 0,0 0,0 0}to{background-position:28px 28px,28px 28px,140px 140px,140px 140px}}
      @keyframes fgGlow{0%,100%{opacity:.4}50%{opacity:.7}}
      @keyframes fgSpin{to{transform:rotate(360deg)}}
      .fg-fade{animation:fgFadeUp .6s cubic-bezier(.2,.7,.2,1) both}
      .fg-slide{animation:fgSlideIn .45s cubic-bezier(.2,.7,.2,1) both}
      .fg-opt{transition:all .18s cubic-bezier(.2,.7,.2,1)}
      .fg-opt:hover{transform:translateX(4px)}
      *::-webkit-scrollbar{width:8px}*::-webkit-scrollbar-thumb{background:${C.dim};border-radius:4px}
    `;
    document.head.appendChild(st);
    return () => { l.remove(); st.remove(); };
  }, []);
}

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const syne = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'IBM Plex Sans', sans-serif" };

// ---- GRID BACKGROUND (plan d'ingénieur) ----
function GridBg() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage:
        `linear-gradient(${C.cyan}24 1px,transparent 1px),` +
        `linear-gradient(90deg,${C.cyan}24 1px,transparent 1px),` +
        `linear-gradient(${C.cyan}40 1px,transparent 1px),` +
        `linear-gradient(90deg,${C.cyan}40 1px,transparent 1px)`,
      backgroundSize: "28px 28px,28px 28px,140px 140px,140px 140px",
      animation: "fgGridMove 30s linear infinite",
      maskImage: "radial-gradient(ellipse 100% 90% at 50% 35%,#000 30%,transparent 85%)",
      WebkitMaskImage: "radial-gradient(ellipse 100% 90% at 50% 35%,#000 30%,transparent 85%)",
      opacity: 0.7,
    }} />
  );
}

// ---- DATA FIELD (réseau neuronal animé sur les marges) ----
// Canvas plein écran derrière le contenu. Les nœuds sont densifiés sur les
// bords gauche/droite (densité atténuée au centre) pour remplir le vide
// sans gêner la lecture. + ligne de scan verticale + colonnes hex discrètes.
function DataField() {
  const ref = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let w, h, nodes = [], hexCols = [], raf, t = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    // densité latérale : 0 au centre, 1 sur les bords
    const sideWeight = (x) => {
      const c = w / 2;
      const d = Math.abs(x - c) / c;            // 0 centre → 1 bord
      return Math.pow(d, 1.6);                   // concentre vers les bords
    };

    const HEX = "0123456789ABCDEF";
    const randHex = (n) => Array.from({ length: n }, () => HEX[(Math.random() * 16) | 0]).join("");

    function build() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const count = Math.round(Math.min(120, (w * h) / 14000));
      nodes = [];
      let placed = 0, guard = 0;
      while (placed < count && guard < count * 30) {
        guard++;
        const x = Math.random() * w, y = Math.random() * h;
        if (Math.random() > sideWeight(x) * 0.9 + 0.08) continue; // rejette le centre
        nodes.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.4 + 0.6,
          pulse: Math.random() * Math.PI * 2,
        });
        placed++;
      }

      // colonnes hexadécimales sur les marges extrêmes
      const colN = Math.max(2, Math.round(w / 360));
      hexCols = [];
      for (let i = 0; i < colN; i++) {
        const left = i < colN / 2;
        const x = left ? 24 + Math.random() * 90 : w - 120 + Math.random() * 90;
        hexCols.push({
          x,
          y: Math.random() * h,
          speed: 0.25 + Math.random() * 0.4,
          rows: Array.from({ length: 14 + ((Math.random() * 10) | 0) }, () => randHex(2)),
          step: 0,
        });
      }
    }

    function frame() {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      // colonnes hex (très discrètes)
      ctx.font = "10px 'IBM Plex Mono', monospace";
      hexCols.forEach((col) => {
        col.y += col.speed;
        if (col.y > h + 20) col.y = -col.rows.length * 16;
        if (t % 26 === 0) col.rows[(Math.random() * col.rows.length) | 0] = randHex(2);
        col.rows.forEach((r, i) => {
          const yy = col.y + i * 16;
          if (yy < -16 || yy > h + 16) return;
          const head = i === col.rows.length - 1;
          ctx.fillStyle = head ? "rgba(232,176,75,0.30)" : `rgba(127,179,213,${0.05 + (i / col.rows.length) * 0.07})`;
          ctx.fillText(r, col.x, yy);
        });
      });

      // mise à jour + liens
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        // répulsion souris
        const dx = n.x - mouse.current.x, dy = n.y - mouse.current.y;
        const dm = Math.hypot(dx, dy);
        if (dm < 130 && dm > 0.1) { n.x += (dx / dm) * 0.7; n.y += (dy / dm) * 0.7; }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 116) {
            const o = (1 - d / 116) * 0.18;
            ctx.strokeStyle = `rgba(127,179,213,${o})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // nœuds
      for (const n of nodes) {
        n.pulse += 0.03;
        const near = Math.hypot(n.x - mouse.current.x, n.y - mouse.current.y) < 130;
        const glow = 0.45 + Math.sin(n.pulse) * 0.2;
        ctx.fillStyle = near ? "rgba(232,176,75,0.85)" : `rgba(127,179,213,${glow})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (near ? 1 : 0), 0, Math.PI * 2); ctx.fill();
      }

      // ligne de scan verticale lente
      const scanY = (t * 0.4) % (h + 200) - 100;
      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
      grad.addColorStop(0, "rgba(232,176,75,0)");
      grad.addColorStop(0.5, "rgba(232,176,75,0.05)");
      grad.addColorStop(1, "rgba(232,176,75,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 60, w, 120);

      raf = requestAnimationFrame(frame);
    }

    build();
    frame();
    const onResize = () => build();
    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden="true" style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0, opacity: 0.9,
    }} />
  );
}

function Tag({ children }) {
  return <div style={{ ...mono, fontSize: 11, color: C.orange, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ color: C.orange }}>⌖</span>{children}
  </div>;
}

// ============================================================
//  ÉCRAN 1 — INTRO
// ============================================================
function Intro({ onStart }) {
  return (
    <div className="fg-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "8vh 24px", position: "relative", zIndex: 1 }}>
      <Tag>Diagnostic de maturité data · 4 minutes</Tag>
      <h1 style={{ ...syne, fontWeight: 800, fontSize: "clamp(40px,7vw,72px)", lineHeight: 1.02, letterSpacing: "-0.02em", color: C.text, margin: "0 0 24px" }}>
        Vos données valent-elles<br />quelque chose ?<br />
        <span style={{ color: C.cyan }}>On vous le dit.</span>
      </h1>
      <p style={{ ...body, fontSize: 18, color: C.muted, lineHeight: 1.7, maxWidth: 540, marginBottom: 40 }}>
        En 20 questions simples, Forge Score évalue la maturité numérique de votre entreprise,
        vous situe face à votre secteur, et génère une analyse personnalisée écrite pour votre situation.
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 56 }}>
        <button onClick={onStart} style={{
          ...mono, fontSize: 14, padding: "16px 34px", background: C.orange, color: "#fff",
          border: "none", borderRadius: 4, cursor: "pointer", letterSpacing: "0.03em", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 10,
        }}>Démarrer mon diagnostic <ArrowRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        {AXE_ORDER.map((a, i) => {
          const Icon = AXE_ICON[a];
          return (
            <div key={a} style={{ background: C.bg2, padding: "20px 14px", textAlign: "center" }}>
              <Icon size={18} color={C.cyan} style={{ marginBottom: 10 }} />
              <div style={{ ...mono, fontSize: 9, color: C.dim, marginBottom: 6 }}>{String(i + 1).padStart(2, "0")} / 05</div>
              <div style={{ ...syne, fontWeight: 600, fontSize: 11, color: C.text, lineHeight: 1.3 }}>{AXES[a]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
//  ÉCRAN 2 — SETUP
// ============================================================
function Setup({ onSubmit, onBack }) {
  const [ent, setEnt] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("autre");
  const [size, setSize] = useState("micro");
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = ent.trim() && nom.trim() && emailOk;
  const inputStyle = {
    width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4,
    padding: "13px 15px", color: C.text, ...body, fontSize: 14, outline: "none", marginBottom: 18,
  };
  const labelStyle = { ...mono, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 };
  return (
    <div className="fg-fade" style={{ maxWidth: 560, margin: "0 auto", padding: "8vh 24px", position: "relative", zIndex: 1 }}>
      <Tag>Avant de commencer</Tag>
      <h2 style={{ ...syne, fontWeight: 700, fontSize: 32, color: C.text, margin: "0 0 32px" }}>Parlez-nous de vous</h2>
      <label style={labelStyle}>Nom de votre entreprise</label>
      <input style={inputStyle} value={ent} onChange={(e) => setEnt(e.target.value)} placeholder="Ex. Boulangerie Martin" />
      <label style={labelStyle}>Votre prénom et nom</label>
      <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Julie Martin" />
      <label style={labelStyle}>Votre email professionnel</label>
      <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex. julie@boulangerie-martin.fr" />
      <label style={labelStyle}>Votre secteur</label>
      <select style={inputStyle} value={sector} onChange={(e) => setSector(e.target.value)}>
        {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k} style={{ background: C.bg3 }}>{v.label}</option>)}
      </select>
      <label style={labelStyle}>Taille de l'entreprise</label>
      <select style={inputStyle} value={size} onChange={(e) => setSize(e.target.value)}>
        {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k} style={{ background: C.bg3 }}>{v}</option>)}
      </select>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={onBack} style={{ ...mono, fontSize: 13, padding: "13px 22px", background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer" }}>
          <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Retour
        </button>
        <button onClick={() => ready && onSubmit({ ent: ent.trim(), nom: nom.trim(), email: email.trim(), sector, size })}
          style={{ ...mono, flex: 1, fontSize: 14, padding: "13px 22px", background: ready ? C.orange : C.bg3, color: ready ? "#fff" : C.dim, border: "none", borderRadius: 4, cursor: ready ? "pointer" : "not-allowed", fontWeight: 500 }}>
          Commencer le diagnostic →
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  ÉCRAN 3 — QUIZ (animé, auto-advance, positionnement live)
// ============================================================
function Quiz({ onComplete, onBack, setup }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [picked, setPicked] = useState(null);
  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;
  const progress = (idx) / total;

  // positionnement live (moyenne courante des réponses)
  const answered = Object.values(answers);
  const liveAvg = answered.length ? Math.round((answered.reduce((a, b) => a + b, 0) / (answered.length * 4)) * 100) : null;

  useEffect(() => { setPicked(answers[q.id] ?? null); }, [idx]);

  const choose = (score) => {
    setPicked(score);
    const next = { ...answers, [q.id]: score };
    setAnswers(next);
    setTimeout(() => {
      if (idx === total - 1) onComplete(next);
      else setIdx(idx + 1);
    }, 280);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "5vh 24px 8vh", position: "relative", zIndex: 1 }}>
      {/* progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
        <button onClick={() => idx === 0 ? onBack() : setIdx(idx - 1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, height: 3, background: C.bg3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: C.orange, borderRadius: 2, transition: "width .4s cubic-bezier(.2,.7,.2,1)" }} />
        </div>
        <div style={{ ...mono, fontSize: 12, color: C.muted, minWidth: 52, textAlign: "right" }}>{idx + 1} / {total}</div>
      </div>

      <div key={idx} className="fg-slide">
        <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          {React.createElement(AXE_ICON[q.axe], { size: 13 })}
          Axe {AXE_ORDER.indexOf(q.axe) + 1}/5 · {AXES[q.axe]}
        </div>
        <h2 style={{ ...syne, fontWeight: 700, fontSize: "clamp(22px,3.5vw,30px)", color: C.text, lineHeight: 1.2, marginBottom: 32 }}>{q.text}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map(([label, score], i) => {
            const isJNS = label === "Je ne sais pas";
            const sel = picked === score && (answers[q.id] === score);
            return (
              <button key={i} className="fg-opt" onClick={() => choose(score)} style={{
                ...body, textAlign: "left", padding: "16px 18px", borderRadius: 6, cursor: "pointer",
                background: sel ? "rgba(232,176,75,0.10)" : C.bg2,
                border: `1px solid ${sel ? C.borderCyan : C.border}`,
                color: isJNS ? C.muted : C.text, fontSize: 15, fontStyle: isJNS ? "italic" : "normal",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${sel ? C.orange : C.dim}`, display: "flex", alignItems: "center", justifyContent: "center",
                  background: sel ? C.orange : "transparent",
                }}>{sel && <Check size={13} color={C.bg} strokeWidth={3} />}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* positionnement live */}
      {liveAvg !== null && (
        <div style={{ marginTop: 36, padding: "14px 18px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 14 }}>
          <TrendingUp size={16} color={C.cyan} />
          <div style={{ flex: 1 }}>
            <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>TENDANCE EN DIRECT</div>
            <div style={{ height: 5, background: C.bg3, borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${liveAvg}%`, background: `linear-gradient(90deg,${C.cyan},${C.orange})`, borderRadius: 3, transition: "width .5s" }} />
              <div style={{ position: "absolute", top: -1, left: `${setup.sector ? SECTORS[setup.sector].bench.moy : 46}%`, width: 1, height: 7, background: C.muted }} />
            </div>
          </div>
          <div style={{ ...syne, fontWeight: 700, fontSize: 18, color: C.cyan }}>{liveAvg}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  ÉCRAN 4 — RÉSULTATS (dashboard + IA)
// ============================================================
function CountUp({ target, duration = 1400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val}</>;
}

// ---- MOTEUR D'ANALYSE PERSONNALISÉE (local, gratuit, instantané) ----
const SECTOR_OBS = {
  aeronautique: "Dans l'aéronautique, la traçabilité et la fiabilité de vos données ne sont pas optionnelles : vos donneurs d'ordre les exigent.",
  mecanique: "En mécanique industrielle, chaque heure machine et chaque intervention de maintenance est une donnée qui peut vous faire gagner du temps et de l'argent.",
  agroalimentaire: "En agroalimentaire, la traçabilité de vos lots et le suivi de la qualité sont au cœur de votre métier et de vos obligations.",
  btp: "Dans le BTP, l'enjeu numéro un est souvent de faire remonter les informations du terrain et des chantiers de façon fiable.",
  logistique: "En logistique, tout se joue sur le temps réel et la fluidité : plus vos données circulent vite, plus vos délais tiennent.",
  commerce: "Dans le commerce et les services, bien connaître ses clients et ses habitudes de vente fait souvent toute la différence.",
  autre: "Quel que soit votre métier, vos données sont une matière première que vous produisez déjà tous les jours.",
};
const LEVEL_INTRO = {
  Débutant: "vous êtes au début du chemin — et c'est précisément là que les progrès sont les plus rapides et les plus rentables",
  Intermédiaire: "vous avez déjà des bases solides, mais plusieurs leviers importants restent inexploités",
  Avancé: "vous faites partie des entreprises les plus avancées de votre secteur, ce qui est un vrai atout concurrentiel",
};
const STRENGTH = {
  collecte: "vos informations sont déjà bien rangées et accessibles",
  qualite: "vous pouvez vous fier à vos chiffres, ce qui est une fondation précieuse",
  exploitation: "vous savez déjà transformer vos données en décisions",
  automatisation: "vous avez déjà automatisé une partie de votre travail répétitif",
  strategie: "le numérique est déjà pris au sérieux chez vous",
};
const WEAKNESS = {
  collecte: "vos informations sont encore dispersées, ce qui vous prive d'une vue d'ensemble rapide et fiable",
  qualite: "vous ne pouvez pas toujours faire confiance à vos chiffres, ce qui rend chaque décision plus risquée",
  exploitation: "vous produisez des données mais elles ne servent pas encore vraiment à piloter votre activité",
  automatisation: "vos équipes perdent du temps sur des tâches répétitives qui pourraient tourner toutes seules",
  strategie: "le numérique avance encore au coup par coup, sans cap ni budget clair",
};
const FIRST_STEP = {
  collecte: "centraliser une première source d'information critique",
  qualite: "fiabiliser les deux ou trois chiffres sur lesquels vous prenez vos décisions",
  exploitation: "mettre en place un tableau de bord simple avec vos indicateurs clés",
  automatisation: "automatiser la tâche manuelle qui vous coûte le plus de temps chaque semaine",
  strategie: "désigner un référent et fixer un cap clair sur le sujet",
};

function generateAnalysis(setup, result) {
  const strongest = [...AXE_ORDER].sort((a, b) => result.axisScores[b] - result.axisScores[a])[0];
  const weakest = result.quickWins[0].axe;
  const secondWeak = result.quickWins[1].axe;

  const p1 = `${SECTOR_OBS[setup.sector]} Au vu de vos réponses, ${LEVEL_INTRO[result.niveau]}.`;

  const p2 = result.axisScores[strongest] >= 50
    ? `Bonne nouvelle : ${STRENGTH[strongest]}. En revanche, ${WEAKNESS[weakest]}. C'est aujourd'hui votre frein principal — et donc votre plus grosse marge de progression.`
    : `Le point à travailler en priorité : ${WEAKNESS[weakest]}. Juste derrière, ${WEAKNESS[secondWeak]}. Ce sont les deux sujets qui, réglés, changeraient le plus votre quotidien.`;

  const p3 = `Concrètement, la première étape serait de ${FIRST_STEP[weakest]}. Rien d'insurmontable : un petit pas bien choisi vaut mieux qu'un grand projet qui n'aboutit jamais. Si vous voulez, on peut en discuter ensemble pour voir ce qui aurait le plus d'impact chez vous.`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}

function AIAnalysis({ setup, result }) {
  const text = generateAnalysis(setup, result);
  return (
    <div style={{ background: "linear-gradient(135deg,#0D2138,rgba(232,176,75,0.05))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "28px 26px", marginBottom: 22 }}>
      <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={14} /> Votre analyse personnalisée
      </div>
      <div className="fg-fade" style={{ ...body, color: C.text, fontSize: 15.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{text}</div>
    </div>
  );
}

function Results({ setup, result, onRestart }) {
  const radarData = AXE_ORDER.map((a) => ({ axe: AXES[a].split(" ")[0], score: result.axisScores[a] }));
  const bench = result.sector.bench;
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const gradeColor = result.global >= 66 ? C.orange : result.global >= 36 ? "#C9A24B" : C.cyan;

  const resendRecap = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await submitToFormspree(setup, result, { source: "demande_rapport", rapport_demande: "oui" });
      setSent(true);
    } catch (e) {
      setSent(true); // on confirme quand même au prospect
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fg-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "5vh 24px 8vh", position: "relative", zIndex: 1 }}>
      <Tag>Votre Forge Score — {setup.ent}</Tag>

      {/* SCORE HERO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <div style={{ background: "linear-gradient(135deg,#0D2138,rgba(232,176,75,0.05))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "30px 24px", textAlign: "center" }}>
          <div style={{ ...mono, fontSize: 10, color: C.cyan, letterSpacing: "0.15em", marginBottom: 6 }}>SCORE GLOBAL</div>
          <div style={{ ...syne, fontWeight: 800, fontSize: 84, lineHeight: 1, color: gradeColor }}><CountUp target={result.global} /></div>
          <div style={{ ...mono, fontSize: 11, color: C.muted }}>/ 100</div>
          <div style={{ ...syne, fontWeight: 700, fontSize: 22, color: C.text, marginTop: 10 }}>Note <span style={{ color: gradeColor }}>{result.grade}</span></div>
          <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: "0.08em", marginTop: 6 }}>NIVEAU : {result.niveau.toUpperCase()}</div>
        </div>
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ ...mono, fontSize: 10, color: C.cyan, letterSpacing: "0.15em", marginBottom: 14 }}>VOS 5 AXES</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="rgba(127,179,213,0.16)" />
              <PolarAngleAxis dataKey="axe" tick={{ fill: C.muted, fontSize: 9, fontFamily: "IBM Plex Mono" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke={C.orange} fill={C.orange} fillOpacity={0.16} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IA */}
      <AIAnalysis setup={setup} result={result} />

      {/* BENCHMARK */}
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 26px", marginBottom: 22 }}>
        <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Comparaison sectorielle</div>
        <div style={{ ...body, fontSize: 14, color: C.muted, marginBottom: 24 }}>Votre position dans le secteur {result.sector.label}</div>
        <div style={{ position: "relative", height: 44, marginBottom: 8 }}>
          <div style={{ position: "absolute", top: 18, left: 0, right: 0, height: 6, background: C.bg3, borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 18, left: 0, width: `${bench.bot}%`, height: 6, background: "rgba(232,176,75,0.18)", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 18, left: `${bench.top}%`, right: 0, height: 6, background: "rgba(127,179,213,0.16)", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 12, left: `${bench.moy}%`, transform: "translateX(-50%)", width: 1, height: 18, background: C.muted }} />
          <div style={{ position: "absolute", top: -4, left: `${bench.moy}%`, transform: "translateX(-50%)", ...mono, fontSize: 9, color: C.muted, whiteSpace: "nowrap" }}>moy {bench.moy}</div>
          <div style={{ position: "absolute", top: 11, left: `${result.global}%`, transform: "translateX(-50%)", width: 20, height: 20, borderRadius: "50%", background: C.orange, border: `3px solid ${C.bg}`, boxShadow: `0 0 0 1px ${C.orange}` }} />
          <div style={{ position: "absolute", top: 34, left: `${result.global}%`, transform: "translateX(-50%)", ...mono, fontSize: 11, color: C.orange, fontWeight: 500, whiteSpace: "nowrap" }}>vous · {result.global}</div>
        </div>
      </div>

      {/* QUICK WINS */}
      <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>// 3 leviers prioritaires</div>
      {result.quickWins.map((qw, i) => (
        <div key={i} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...mono, fontSize: 10, color: C.cyan, letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")} · {qw.label.toUpperCase()}</span>
            <span style={{ ...mono, fontSize: 12, color: C.orange }}>{qw.score} / 100</span>
          </div>
          <div style={{ ...syne, fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 12 }}>{qw.reco.t}</div>
          <div style={{ background: "rgba(232,176,75,0.10)", borderLeft: `2px solid ${C.orange}`, borderRadius: 2, padding: "8px 14px", ...body, fontSize: 13, color: C.text }}>
            <strong>→ Offre adaptée :</strong> {qw.reco.o}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg,#0D2138,rgba(232,176,75,0.05))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "32px 26px", textAlign: "center", marginTop: 22 }}>
        <div style={{ ...syne, fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 10 }}>Recevez votre récap par email</div>
        <div style={{ ...body, fontSize: 14, color: C.muted, marginBottom: 22, maxWidth: 440, marginInline: "auto" }}>
          On envoie votre score et vos 3 leviers prioritaires à <strong style={{ color: C.text }}>{setup.email}</strong>, avec une proposition de 30 min d'échange gratuit pour transformer ce diagnostic en plan d'action.
        </div>
        <button onClick={resendRecap} disabled={sending || sent}
          style={{ ...mono, fontSize: 13, padding: "14px 28px", background: sent ? "#1D9E75" : C.orange, color: sent ? "#fff" : "#1a1206", border: "none", borderRadius: 4, cursor: sent ? "default" : "pointer", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8, opacity: sending ? 0.7 : 1 }}>
          {sent ? <><Check size={15} /> Récap envoyé</> : <><Mail size={15} /> {sending ? "Envoi…" : "M'envoyer mon récap"}</>}
        </button>
        {sent && <div style={{ ...body, fontSize: 13, color: C.orange, marginTop: 14 }}>C'est parti ! Vérifiez votre boîte mail. Hugo vous recontacte sous 24h.</div>}
      </div>

      <button onClick={onRestart} style={{ ...mono, fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", marginTop: 28, display: "block", marginInline: "auto" }}>
        ↻ Refaire un diagnostic
      </button>
    </div>
  );
}

// ============================================================
//  APP
// ============================================================
export default function App() {
  useBrandStyles();
  const [step, setStep] = useState("intro");
  const [setup, setSetup] = useState(null);
  const [result, setResult] = useState(null);

  const finish = (answers) => {
    const r = computeScore(answers, setup.sector);
    setResult(r);
    setStep("results");
    // Notification automatique : dès la fin du questionnaire, tu reçois le
    // récap par mail, et l'autoréponse Formspree part vers le client.
    submitToFormspree(setup, r, { source: "fin_questionnaire" }).catch(() => {});
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden", ...body }}>
      <GridBg />
      <DataField />
      {/* glow ambré diffus */}
      <div style={{ position: "fixed", top: "10%", right: "-8%", width: 520, height: 520, background: "radial-gradient(circle,rgba(232,176,75,0.06),transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "fgGlow 8s ease-in-out infinite" }} />

      {/* header */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: `1px solid ${C.borderCyan}`, background: "rgba(10,26,47,0.78)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <svg viewBox="0 0 120 120" width="34" height="34" style={{ display: "block" }}>
            <circle cx="60" cy="60" r="57" fill="none" stroke={C.orange} strokeWidth="1.5" />
            <circle cx="60" cy="60" r="46" fill="none" stroke={C.cyan} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.5" />
            <g transform="translate(-3.5,1.5)">
              <rect x="28" y="30" width="14" height="64" fill={C.text} />
              <rect x="28" y="30" width="38" height="14" fill={C.text} />
              <rect x="28" y="56" width="28" height="13" fill={C.text} />
              <polygon points="82,23 85.8,34.2 97,38 85.8,41.8 82,53 78.2,41.8 67,38 78.2,34.2" fill={C.orange} />
            </g>
          </svg>
          <div style={{ ...syne, fontWeight: 600, fontSize: 21, color: C.text }}>Forge<span style={{ color: C.orange }}>-IA</span></div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: "0.14em" }}>FORGE SCORE · RÉF. FIA—2026</div>
      </div>

      {step === "intro" && <Intro onStart={() => setStep("setup")} />}
      {step === "setup" && <Setup onSubmit={(s) => { setSetup(s); setStep("quiz"); }} onBack={() => setStep("intro")} />}
      {step === "quiz" && <Quiz setup={setup} onComplete={finish} onBack={() => setStep("setup")} />}
      {step === "results" && <Results setup={setup} result={result} onRestart={() => { setStep("intro"); setSetup(null); setResult(null); }} />}
    </div>
  );
}
