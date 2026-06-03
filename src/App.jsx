import React, { useState, useEffect, useRef } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Mail,
  TrendingUp, Database, ShieldCheck, BarChart3, Zap, Compass,
} from "lucide-react";
import { jsPDF } from "jspdf";

/* ============================================================
   FORGE SCORE v2 — Diagnostic de maturité data
   Forge-IA · Hugo Mintegui
   ============================================================ */

// ---- CONFIG ----
// Remplace XXXXXXXX par ton identifiant Formspree (formspree.io)
const FORMSPREE_URL = "https://formspree.io/f/XXXXXXXX";

// ---- PALETTE ----
const C = {
  bg: "#07090F", bg2: "#0D1117", bg3: "#111820",
  cyan: "#00D4FF", orange: "#FF6B1A",
  text: "#E8EDF5", muted: "#7A8BA0", dim: "#3A4558",
  border: "rgba(255,255,255,0.08)", borderCyan: "rgba(0,212,255,0.25)",
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
  // ----- AXE 1 : COLLECTE & STOCKAGE -----
  Q("Q1", "collecte", "Où sont rangées les informations importantes de votre entreprise (vos clients, vos ventes, vos stocks) ?", [
    ["Surtout sur papier : cahiers, classeurs, post-it", 0],
    ["Dans des fichiers Excel ou Google Sheets", 1],
    ["Dans un logiciel (caisse, compta, prise de RDV, planning…)", 2],
    ["Dans un logiciel principal qui regroupe presque tout", 3],
    ["Tout est au même endroit, à jour et connecté", 4], JNS]),
  Q("Q2", "collecte", "À quelle fréquence mettez-vous ces informations à jour (par exemple votre stock ou votre liste de clients) ?", [
    ["Rarement, quand on y pense", 0],
    ["Une fois par semaine ou par mois, à la main", 1],
    ["Tous les jours, mais à la main", 2],
    ["Tous les jours, et une partie se fait toute seule", 3],
    ["En continu, automatiquement, sans y penser", 4], JNS]),
  Q("Q3", "collecte", "Vos différents outils s'échangent-ils les informations (par exemple : votre caisse qui parle à votre comptabilité) ?", [
    ["Non, chaque outil ou cahier est de son côté", 0],
    ["On recopie les infos d'un endroit à l'autre à la main", 1],
    ["On rassemble les infos de temps en temps", 2],
    ["La plupart de nos outils sont reliés entre eux", 3],
    ["Tout communique, l'info circule toute seule", 4], JNS]),
  Q("Q4", "collecte", "Quelle part de vos informations est sur ordinateur, plutôt que sur papier ou dans la tête des gens ?",  [
    ["Presque rien, surtout du papier et de l'oral", 0],
    ["Moins d'un tiers", 1], ["À peu près la moitié", 2],
    ["La plus grande partie", 3], ["Presque tout est sur ordinateur", 4], JNS]),

  // ----- AXE 2 : QUALITÉ & FIABILITÉ -----
  Q("Q5", "qualite", "Quand une information est saisie (un prix, une commande, un client), est-elle vérifiée pour éviter les erreurs ?", [
    ["Non, on saisit et on espère que c'est juste", 0],
    ["On vérifie de temps en temps, au hasard", 1],
    ["Quelqu'un relit ou contrôle régulièrement", 2],
    ["Le logiciel repère tout seul les erreurs évidentes", 3],
    ["Vérifications automatiques + contrôles réguliers", 4], JNS]),
  Q("Q6", "qualite", "Avez-vous confiance dans vos chiffres (chiffre d'affaires, stock restant, marges) ?", [
    ["Non, je revérifie presque toujours moi-même", 0],
    ["Je m'en méfie, je recoupe souvent", 1],
    ["Ça dépend d'où vient le chiffre", 2],
    ["Oui, globalement je m'y fie", 3],
    ["Totalement, mes chiffres sont fiables", 4], JNS]),
  Q("Q7", "qualite", "Tombez-vous parfois sur des erreurs, des doublons ou des infos qui se contredisent dans vos fichiers ?", [
    ["Oui, tout le temps, c'est un vrai problème", 0], ["Oui, assez souvent", 1],
    ["Parfois, mais ça reste gérable", 2], ["Rarement", 3],
    ["Quasiment jamais, mes fichiers sont propres", 4], JNS]),
  Q("Q8", "qualite", "Si votre ordinateur ou votre téléphone tombait en panne demain, retrouveriez-vous vos informations importantes ?", [
    ["Non, on perdrait énormément", 0], ["En partie, mais ce serait galère", 1],
    ["Oui, mais ça prendrait du temps", 2], ["Oui, assez vite, on a des copies", 3],
    ["Oui, tout est sauvegardé automatiquement, aucun risque", 4], JNS]),

  // ----- AXE 3 : EXPLOITATION & ANALYSE -----
  Q("Q9", "exploitation", "Utilisez-vous vos chiffres pour décider (par exemple : quoi commander, quand faire une promo, qui embaucher) ?", [
    ["Non, je décide surtout au feeling", 0],
    ["Rarement, une fois par an ou quand il y a un souci", 1],
    ["Oui, environ une fois par mois", 2], ["Oui, chaque semaine", 3],
    ["Oui, tous les jours, c'est ma boussole", 4], JNS]),
  Q("Q10", "exploitation", "Avez-vous une vue d'ensemble claire de votre activité (un tableau ou des graphiques qui montrent comment ça va) ?", [
    ["Non, juste des chiffres en vrac", 0],
    ["Quelques calculs ou graphiques faits à la main", 1],
    ["Un tableau Excel que je mets à jour", 2],
    ["Un outil qui m'affiche tout ça automatiquement", 3],
    ["Plusieurs tableaux clairs, à jour en temps réel", 4], JNS]),
  Q("Q11", "exploitation", "Dans votre entreprise, qui sait lire et se servir des chiffres ?", [
    ["Personne, honnêtement", 0], ["Une seule personne — si elle part, c'est un problème", 1],
    ["Deux ou trois personnes importantes", 2], ["Plusieurs personnes dans l'équipe", 3],
    ["Tout le monde est à l'aise avec ça", 4], JNS]),
  Q("Q12", "exploitation", "Vos décisions importantes reposent-elles sur des chiffres concrets ou plutôt sur le ressenti ?", [
    ["Surtout sur le ressenti et l'expérience", 0], ["Rarement des chiffres, surtout la compta", 1],
    ["Parfois, quand j'ai les chiffres sous la main", 2], ["Souvent, pour les décisions qui comptent", 3],
    ["Toujours, jamais de grande décision sans chiffres", 4], JNS]),

  // ----- AXE 4 : AUTOMATISATION -----
  Q("Q13", "automatisation", "Combien de temps passez-vous à recopier des informations à la main (ressaisir une commande, reporter des chiffres d'un endroit à un autre) ?", [
    ["Énormément, c'est une grosse part du travail", 0], ["Pas mal, plusieurs heures par semaine", 1],
    ["Un peu, quelques heures par semaine", 2], ["Très peu, presque tout se fait tout seul", 3],
    ["Quasi rien, l'info circule sans recopie", 4], JNS]),
  Q("Q14", "automatisation", "Vos récapitulatifs reviennent-ils tout seuls, ou faut-il les refaire à chaque fois (bilan de la semaine, du mois) ?", [
    ["Il faut tout refaire à la main à chaque fois", 0],
    ["J'ai des modèles Excel que je remplis", 1], ["C'est en partie automatique", 2],
    ["La plupart se font tout seuls", 3],
    ["Tout arrive automatiquement, je n'ai rien à faire", 4], JNS]),
  Q("Q15", "automatisation", "Êtes-vous prévenu automatiquement quand quelque chose cloche (stock bientôt vide, facture impayée, retard) ?", [
    ["Non, je m'en rends compte quand c'est trop tard", 0],
    ["Parfois, mais c'est quelqu'un qui me prévient, pas un système", 1],
    ["Oui, sur quelques points vraiment importants", 2],
    ["Oui, sur la plupart des problèmes qui comptent", 3],
    ["Oui, le système repère les soucis avant même qu'ils arrivent", 4], JNS]),
  Q("Q16", "automatisation", "Quand vous notez une information une fois, se retrouve-t-elle automatiquement partout où vous en avez besoin ?", [
    ["Non, il faut la ressaisir à chaque endroit", 0],
    ["Je fais des copier-coller ou des exports", 1],
    ["Quelques outils sont reliés", 2],
    ["La plupart se synchronisent tout seuls", 3],
    ["Une seule saisie suffit, tout se met à jour partout", 4], JNS]),

  // ----- AXE 5 : STRATÉGIE & CULTURE -----
  Q("Q17", "strategie", "Y a-t-il quelqu'un qui s'occupe de vos outils numériques et de vos données ?", [
    ["Non, personne", 0], ["Pas vraiment, chacun se débrouille", 1],
    ["Oui, quelqu'un s'en occupe en plus de son travail", 2],
    ["Oui, une personne clairement identifiée pour ça", 3],
    ["Oui, c'est une vraie mission, avec un plan", 4], JNS]),
  Q("Q18", "strategie", "Mettez-vous de l'argent de côté pour améliorer vos outils numériques ?", [
    ["Non, aucun budget pour ça", 0], ["Pas vraiment, je dépense au cas par cas", 1],
    ["Un petit budget, mais ce n'est pas prioritaire", 2], ["Oui, un budget prévu chaque année", 3],
    ["Oui, un budget sérieux pensé sur plusieurs années", 4], JNS]),
  Q("Q19", "strategie", "Comment voyez-vous le numérique pour votre entreprise ?", [
    ["Ça ne m'intéresse pas, ou ça me méfie", 0], ["Curieux, mais je n'ai pas encore agi", 1],
    ["Intéressé, j'y réfléchis", 2], ["Convaincu, j'ai des projets en cours", 3],
    ["C'est un axe stratégique clair pour moi", 4], JNS]),
  Q("Q20", "strategie", "Vous et vos équipes, êtes-vous à l'aise avec vos outils numériques ?", [
    ["Non, pas du tout, aucune formation", 0], ["Chacun apprend tout seul sur le tas", 1],
    ["Il y a eu quelques formations de temps en temps", 2],
    ["Des formations régulières pour les postes importants", 3],
    ["Tout le monde est formé et monte en compétence régulièrement", 4], JNS]),
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
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(l);
    const st = document.createElement("style");
    st.textContent = `
      @keyframes fgFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes fgSlideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
      @keyframes fgPulse{0%,100%{opacity:.5}50%{opacity:1}}
      @keyframes fgGridMove{from{background-position:0 0}to{background-position:60px 60px}}
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
const syne = { fontFamily: "'Syne', sans-serif" };
const body = { fontFamily: "'DM Sans', sans-serif" };

// ---- GRID BACKGROUND ----
function GridBg() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage: `linear-gradient(${C.cyan}0a 1px,transparent 1px),linear-gradient(90deg,${C.cyan}0a 1px,transparent 1px)`,
      backgroundSize: "60px 60px", animation: "fgGridMove 20s linear infinite", opacity: 0.5,
    }} />
  );
}

function Tag({ children }) {
  return <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
    <span style={{ color: C.dim }}>// </span>{children}
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
  const [sector, setSector] = useState("autre");
  const [size, setSize] = useState("micro");
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
        <button onClick={() => ent.trim() && nom.trim() && onSubmit({ ent: ent.trim(), nom: nom.trim(), sector, size })}
          style={{ ...mono, flex: 1, fontSize: 14, padding: "13px 22px", background: ent.trim() && nom.trim() ? C.orange : C.bg3, color: ent.trim() && nom.trim() ? "#fff" : C.dim, border: "none", borderRadius: 4, cursor: ent.trim() && nom.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>
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
          <div style={{ height: "100%", width: `${progress * 100}%`, background: C.cyan, borderRadius: 2, transition: "width .4s cubic-bezier(.2,.7,.2,1)" }} />
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
                background: sel ? "rgba(0,212,255,0.08)" : C.bg2,
                border: `1px solid ${sel ? C.borderCyan : C.border}`,
                color: isJNS ? C.muted : C.text, fontSize: 15, fontStyle: isJNS ? "italic" : "normal",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${sel ? C.cyan : C.dim}`, display: "flex", alignItems: "center", justifyContent: "center",
                  background: sel ? C.cyan : "transparent",
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
              <div style={{ height: "100%", width: `${liveAvg}%`, background: `linear-gradient(90deg,${C.orange},${C.cyan})`, borderRadius: 3, transition: "width .5s" }} />
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

// ---- GÉNÉRATION PDF COURT (1-2 pages, client-side, gratuit) ----
const SIZE_LABEL = { micro: "1 à 9 personnes", tpe: "10 à 49 personnes", pme: "50 à 249 personnes", eti: "250 personnes ou plus" };

function generatePdf(setup, result) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = 595, M = 48;
  const cyan = [0, 212, 255], ink = [13, 17, 23], muted = [110, 122, 140], orange = [197, 80, 0];

  // Bandeau sombre
  doc.setFillColor(7, 9, 15); doc.rect(0, 0, W, 110, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("Forge", M, 52);
  const fw = doc.getTextWidth("Forge");
  doc.setTextColor(cyan[0], cyan[1], cyan[2]); doc.text("-IA", M + fw, 52);
  doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(170, 180, 196);
  doc.text("FORGE SCORE  -  RAPPORT DE DIAGNOSTIC", M, 74);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("fr-FR"), W - M, 74, { align: "right" });

  let y = 150;
  // Entreprise
  doc.setTextColor(muted[0], muted[1], muted[2]); doc.setFont("courier", "normal"); doc.setFontSize(8);
  doc.text("ENTREPRISE", M, y);
  doc.setTextColor(ink[0], ink[1], ink[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text(setup.ent, M, y + 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`${result.sector.label}  ·  ${SIZE_LABEL[setup.size] || ""}`, M, y + 40);

  // Score (bloc droite)
  const gc = result.global >= 66 ? cyan : result.global >= 36 ? [255, 150, 30] : orange;
  doc.setFont("helvetica", "bold"); doc.setFontSize(46); doc.setTextColor(gc[0], gc[1], gc[2]);
  doc.text(String(result.global), W - M, y + 18, { align: "right" });
  doc.setFontSize(11); doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`/ 100   ·   Note ${result.grade}   ·   ${result.niveau}`, W - M, y + 38, { align: "right" });

  y += 78;
  doc.setDrawColor(225, 229, 236); doc.setLineWidth(0.6); doc.line(M, y, W - M, y);
  y += 28;

  // Axes (barres)
  doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(cyan[0], cyan[1], cyan[2]);
  doc.text("// DÉTAIL PAR AXE", M, y); y += 22;
  AXE_ORDER.forEach((a) => {
    const sc = result.axisScores[a];
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(AXES[a], M, y);
    doc.setTextColor(cyan[0], cyan[1], cyan[2]);
    doc.text(`${sc}/100`, W - M, y, { align: "right" });
    const barY = y + 6, barW = W - 2 * M;
    doc.setFillColor(240, 243, 248); doc.roundedRect(M, barY, barW, 7, 3, 3, "F");
    const col = sc >= 66 ? cyan : sc >= 36 ? [255, 150, 30] : orange;
    doc.setFillColor(col[0], col[1], col[2]); doc.roundedRect(M, barY, Math.max(barW * sc / 100, 4), 7, 3, 3, "F");
    y += 30;
  });

  y += 8;
  // Analyse
  doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(cyan[0], cyan[1], cyan[2]);
  doc.text("// VOTRE ANALYSE", M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(60, 70, 84);
  const analysis = generateAnalysis(setup, result).replace(/\n\n/g, "\n");
  const wrapped = doc.splitTextToSize(analysis, W - 2 * M);
  doc.text(wrapped, M, y, { lineHeightFactor: 1.5 });
  y += wrapped.length * 15.5 + 18;

  // Quick wins
  doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(cyan[0], cyan[1], cyan[2]);
  doc.text("// VOS 3 LEVIERS PRIORITAIRES", M, y); y += 20;
  result.quickWins.forEach((qw, i) => {
    if (y > 760) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(`${i + 1}. ${qw.reco.t}`, M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(`Axe : ${qw.label} (${qw.score}/100)   ·   Piste Forge-IA : ${qw.reco.o}`, M, y + 15);
    y += 40;
  });

  // Footer
  doc.setFillColor(7, 9, 15); doc.rect(0, 812, W, 30, "F");
  doc.setFont("courier", "normal"); doc.setFontSize(8); doc.setTextColor(170, 180, 196);
  doc.text("Forge-IA  ·  Hugo Mintegui  ·  contact@forge-ia.fr  ·  forge-ia.fr", M, 830);

  return doc;
}

// ---- NOTIFIER HUGO (Formspree) ----
function notifyHugo(setup, result, email, evenement) {
  try {
    fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        evenement: evenement || "Diagnostic complété",
        entreprise: setup.ent,
        contact: setup.nom,
        email: email || "(non renseigné)",
        secteur: result.sector.label,
        taille: SIZE_LABEL[setup.size] || setup.size,
        score: result.global,
        note: result.grade,
        niveau: result.niveau,
        levier_1: result.quickWins[0]?.label,
        levier_2: result.quickWins[1]?.label,
        levier_3: result.quickWins[2]?.label,
      }),
    });
  } catch (e) { /* silencieux */ }
}

// ---- ENVOYER LE PDF AU CLIENT (via fonction serveur Vercel + Brevo) ----
async function sendReportToClient(email, setup, result) {
  const doc = generatePdf(setup, result);
  const pdfBase64 = doc.output("datauristring").split(",")[1];
  try {
    const r = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, entreprise: setup.ent, nom: setup.nom, pdfBase64 }),
    });
    if (!r.ok) throw new Error("send failed");
    return true;
  } catch (e) {
    // Repli : téléchargement direct si l'email échoue
    doc.save(`Forge_Score_${setup.ent.replace(/\s+/g, "_")}.pdf`);
    return false;
  }
}

function AIAnalysis({ setup, result }) {
  const text = generateAnalysis(setup, result);
  return (
    <div style={{ background: "linear-gradient(135deg,#0D1117,rgba(0,212,255,0.04))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "28px 26px", marginBottom: 22 }}>
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const gradeColor = result.global >= 66 ? C.cyan : result.global >= 36 ? "#FFB84D" : C.orange;
  const notified = useRef(false);

  // Notifie Hugo automatiquement dès que le diagnostic est terminé
  useEffect(() => {
    if (notified.current) return;
    notified.current = true;
    notifyHugo(setup, result, "", "Diagnostic complété (20 questions)");
  }, []);

  const sendLead = async () => {
    if (!email.trim() || sending || sent) return;
    setSending(true);
    try {
      await sendReportToClient(email, setup, result);          // PDF au client
      notifyHugo(setup, result, email, "Lead avec email (PDF envoyé)"); // info à Hugo
      setSent(true);
    } catch (e) {
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fg-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "5vh 24px 8vh", position: "relative", zIndex: 1 }}>
      <Tag>Votre Forge Score — {setup.ent}</Tag>

      {/* SCORE HERO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <div style={{ background: "linear-gradient(135deg,#0D1117,rgba(0,212,255,0.04))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "30px 24px", textAlign: "center" }}>
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
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="axe" tick={{ fill: C.muted, fontSize: 9, fontFamily: "DM Sans" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke={C.cyan} fill={C.cyan} fillOpacity={0.18} strokeWidth={2} />
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
          <div style={{ position: "absolute", top: 18, left: 0, width: `${bench.bot}%`, height: 6, background: "rgba(255,107,26,0.2)", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 18, left: `${bench.top}%`, right: 0, height: 6, background: "rgba(0,212,255,0.15)", borderRadius: 3 }} />
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
          <div style={{ background: "rgba(0,212,255,0.08)", borderLeft: `2px solid ${C.cyan}`, borderRadius: 2, padding: "8px 14px", ...body, fontSize: 13, color: C.text }}>
            <strong>→ Offre adaptée :</strong> {qw.reco.o}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg,#0D1117,rgba(0,212,255,0.04))", border: `1px solid ${C.borderCyan}`, borderRadius: 10, padding: "32px 26px", textAlign: "center", marginTop: 22 }}>
        <div style={{ ...syne, fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 10 }}>Recevez votre rapport par email</div>
        <div style={{ ...body, fontSize: 14, color: C.muted, marginBottom: 22, maxWidth: 420, marginInline: "auto" }}>
          Entrez votre email : vous recevez votre rapport de diagnostic en PDF, et Hugo vous offre 30 minutes d'échange pour en parler.
        </div>
        <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.fr"
            disabled={sent}
            style={{ flex: 1, minWidth: 200, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "13px 15px", color: C.text, ...body, fontSize: 14, outline: "none", opacity: sent ? 0.6 : 1 }} />
          <button onClick={sendLead} disabled={sending || sent}
            style={{ ...mono, fontSize: 13, padding: "13px 24px", background: sent ? "#1D9E75" : C.orange, color: "#fff", border: "none", borderRadius: 4, cursor: sent ? "default" : "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 8, opacity: sending ? 0.7 : 1 }}>
            {sent ? <><Check size={15} /> Envoyé</> : <><Mail size={15} /> {sending ? "Envoi…" : "Envoyer"}</>}
          </button>
        </div>
        {sent && <div style={{ ...body, fontSize: 13, color: C.cyan, marginTop: 14 }}>Merci ! Hugo vous recontacte sous 24h.</div>}
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
    setResult(computeScore(answers, setup.sector));
    setStep("results");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden", ...body }}>
      <GridBg />
      {/* glow */}
      <div style={{ position: "fixed", top: "10%", left: "-10%", width: 500, height: 500, background: "radial-gradient(circle,rgba(0,212,255,0.06),transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "fgGlow 8s ease-in-out infinite" }} />

      {/* header */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: `1px solid ${C.border}`, background: "rgba(7,9,15,0.7)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 120 120" width="32" height="32" style={{ display: "block" }}>
            <rect width="120" height="120" rx="27" fill="#0D1117" />
            <g transform="translate(-3.5,1.5)">
              <rect x="28" y="30" width="15" height="66" fill="#FFFFFF" />
              <rect x="28" y="30" width="40" height="15" fill="#FFFFFF" />
              <rect x="28" y="58" width="30" height="14" fill="#FFFFFF" />
              <polygon points="82,21 86.24,33.76 99,38 86.24,42.24 82,55 77.76,42.24 65,38 77.76,33.76" fill="#00D4FF" />
            </g>
          </svg>
          <div style={{ ...syne, fontWeight: 800, fontSize: 20, color: C.text }}>Forge<span style={{ color: C.cyan }}>-IA</span></div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>FORGE SCORE</div>
      </div>

      {step === "intro" && <Intro onStart={() => setStep("setup")} />}
      {step === "setup" && <Setup onSubmit={(s) => { setSetup(s); setStep("quiz"); }} onBack={() => setStep("intro")} />}
      {step === "quiz" && <Quiz setup={setup} onComplete={finish} onBack={() => setStep("setup")} />}
      {step === "results" && <Results setup={setup} result={result} onRestart={() => { setStep("intro"); setSetup(null); setResult(null); }} />}
    </div>
  );
}
