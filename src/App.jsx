import { useState, useEffect } from "react";

const STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"];
const STATUS_COLORS = {
  Saved:     { bg: "#1e293b", text: "#94a3b8" },
  Applied:   { bg: "#1e3a5f", text: "#60a5fa" },
  Interview: { bg: "#3b2a00", text: "#fbbf24" },
  Offer:     { bg: "#052e16", text: "#4ade80" },
  Rejected:  { bg: "#2d0a0a", text: "#f87171" },
};

const PROFILE = {
  name: "Nik Samuel Lobo",
  degree: "Bachelor's in Computer Science",
  certs: "CompTIA A+, CompTIA Security+",
  experience: "DSD Associate at Walmart (supply chain, inventory management, customer service)",
  location: "Canada",
  target: "entry-level IT, cybersecurity, supply chain, or customer support roles in Canada",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await response.json();
  return data.content?.map((i) => i.text || "").join("") || "";
}

export default function JobHub() {
  const [tab, setTab] = useState("apply");
  const [jobs, setJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jh_jobs") || "[]"); } catch { return []; }
  });
  const [jobDesc, setJobDesc] = useState("");
  const [jobMeta, setJobMeta] = useState({ company: "", role: "", location: "", url: "" });
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [result, setResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("jh_jobs", JSON.stringify(jobs)); } catch {}
  }, [jobs]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const generate = async () => {
    if (!jobDesc.trim() || !jobMeta.company || !jobMeta.role) return;
    setGenerating(true);
    setResult(null);

    try {
      setGenStep("Analyzing job description...");
      await sleep(400);

      const profileSummary = `
Candidate profile:
- Name: ${PROFILE.name}
- Degree: ${PROFILE.degree}
- Certifications: ${PROFILE.certs}
- Work experience: ${PROFILE.experience}
- Location: ${PROFILE.location}
- Targeting: ${PROFILE.target}
`;

      setGenStep("Writing tailored cover letter...");
      const coverLetter = await callClaude(
        `You are an expert career coach helping someone land their first job in tech/cybersecurity in Canada.
Write a concise, professional, and genuine cover letter tailored to the job description.
Use the candidate profile provided. Keep it to 3 short paragraphs.
Do NOT use generic filler phrases. Sound human and specific to this role.
Start with "Dear Hiring Manager," and end with "Sincerely,\n${PROFILE.name}".
Return ONLY the cover letter text, nothing else.`,
        `${profileSummary}\n\nJob posting for ${jobMeta.role} at ${jobMeta.company}:\n${jobDesc}`
      );

      setGenStep("Generating resume bullet points...");
      const bullets = await callClaude(
        `You are an expert resume writer. Generate 4-5 strong resume bullet points that highlight how the candidate's background matches this specific job.
Use action verbs, be specific, quantify where possible.
Format: one bullet per line starting with "•"
Return ONLY the bullet points, nothing else.`,
        `${profileSummary}\n\nJob posting for ${jobMeta.role} at ${jobMeta.company}:\n${jobDesc}`
      );

      setGenStep("Identifying key skills...");
      const skills = await callClaude(
        `Extract 5-8 key skills or keywords from this job posting the candidate should highlight.
Return as a comma-separated list only. No explanation.`,
        `Job posting for ${jobMeta.role} at ${jobMeta.company}:\n${jobDesc}`
      );

      setGenStep("Saving to tracker...");
      await sleep(300);

      const newJob = {
        id: Date.now(),
        company: jobMeta.company,
        role: jobMeta.role,
        location: jobMeta.location,
        url: jobMeta.url,
        status: "Saved",
        dateAdded: new Date().toISOString().split("T")[0],
        dateApplied: null,
        notes: "",
        coverLetter,
        bullets,
        skills,
        jobDesc,
      };

      setJobs((prev) => [newJob, ...prev]);
      setResult(newJob);
      setGenStep("");
    } catch (err) {
      showToast("Something went wrong. Please try again.");
      setGenStep("");
    } finally {
      setGenerating(false);
    }
  };

  const updateJob = (id, fields) => setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...fields } : j)));
  const deleteJob = (id) => { setJobs((prev) => prev.filter((j) => j.id !== id)); if (expandedId === id) setExpandedId(null); };
  const markApplied = (id) => { updateJob(id, { status: "Applied", dateApplied: new Date().toISOString().split("T")[0] }); showToast("Marked as Applied!"); };

  const filtered = filterStatus === "All" ? jobs : jobs.filter((j) => j.status === filterStatus);
  const stats = STATUSES.reduce((acc, s) => { acc[s] = jobs.filter((j) => j.status === s).length; return acc; }, {});

  const S = {
    wrap: { fontFamily: "'Inter', system-ui, sans-serif", background: "#080d16", minHeight: "100vh", color: "#e2e8f0", fontSize: 14 },
    inner: { maxWidth: 700, margin: "0 auto", padding: "20px 16px 80px" },
    h1: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 },
    tabs: { display: "flex", gap: 4, background: "#0f172a", borderRadius: 10, padding: 4, marginBottom: 24 },
    tab: (a) => ({ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: a ? "#1d4ed8" : "transparent", color: a ? "white" : "#475569", transition: "all 0.15s" }),
    card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 20, marginBottom: 16 },
    label: { fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" },
    input: { width: "100%", background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
    primaryBtn: { background: "#1d4ed8", color: "white", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
    ghostBtn: { background: "transparent", color: "#64748b", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
    successBtn: { background: "#15803d", color: "#4ade80", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1 },
    copyBtn: (c) => ({ background: c ? "#15803d" : "#1e293b", color: c ? "#4ade80" : "#94a3b8", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }),
    skillPill: { display: "inline-block", background: "#1e3a5f", color: "#60a5fa", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 500, margin: "3px 4px 3px 0" },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
    badge: (s) => ({ background: STATUS_COLORS[s]?.bg || "#1e293b", color: STATUS_COLORS[s]?.text || "#94a3b8", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }),
    statBtn: (active, s) => ({ background: active ? STATUS_COLORS[s]?.bg || "#1e293b" : "#0f172a", border: `1px solid ${active ? "transparent" : "#1e293b"}`, borderRadius: 10, padding: "10px 6px", cursor: "pointer", textAlign: "center", flex: 1 }),
    jobCard: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, marginBottom: 8, overflow: "hidden" },
    preBox: { fontSize: 12, color: "#64748b", lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#080d16", borderRadius: 8, padding: 12 },
  };

  return (
    <div style={S.wrap}>
      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "#1d4ed8", color: "white", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 999, whiteSpace: "nowrap" }}>{toast}</div>}

      <div style={S.inner}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
            <span style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Nik's Personal Job Hub</span>
          </div>
          <h1 style={S.h1}>AI Application Assistant</h1>
          <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>{jobs.length} jobs tracked · {stats.Applied || 0} applied · {stats.Interview || 0} interviews</div>
        </div>

        <div style={S.tabs}>
          <button style={S.tab(tab === "apply")} onClick={() => setTab("apply")}>✦ Apply to a Job</button>
          <button style={S.tab(tab === "tracker")} onClick={() => setTab("tracker")}>📋 My Tracker ({jobs.length})</button>
        </div>

        {tab === "apply" && (
          <div>
            {!result ? (
              <>
                <div style={S.card}>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                    Find a job on LinkedIn or Indeed → paste it below → Claude writes your cover letter, resume bullets, and saves it to your tracker automatically.
                  </p>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Company *</label><input style={S.input} placeholder="e.g. Bell Canada" value={jobMeta.company} onChange={(e) => setJobMeta({ ...jobMeta, company: e.target.value })} /></div>
                    <div><label style={S.label}>Role *</label><input style={S.input} placeholder="e.g. SOC Analyst" value={jobMeta.role} onChange={(e) => setJobMeta({ ...jobMeta, role: e.target.value })} /></div>
                    <div><label style={S.label}>Location</label><input style={S.input} placeholder="e.g. Toronto, ON" value={jobMeta.location} onChange={(e) => setJobMeta({ ...jobMeta, location: e.target.value })} /></div>
                    <div><label style={S.label}>Job URL</label><input style={S.input} placeholder="Paste link here" value={jobMeta.url} onChange={(e) => setJobMeta({ ...jobMeta, url: e.target.value })} /></div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Job Description *</label>
                    <textarea style={{ ...S.input, minHeight: 160, lineHeight: 1.6, resize: "vertical" }} placeholder="Paste the full job description here..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
                  </div>
                  <button onClick={generate} disabled={generating || !jobDesc.trim() || !jobMeta.company || !jobMeta.role} style={{ ...S.primaryBtn, opacity: generating || !jobDesc.trim() || !jobMeta.company || !jobMeta.role ? 0.5 : 1 }}>
                    {generating ? genStep || "Working..." : "✦ Generate Application Materials"}
                  </button>
                </div>
                {generating && (
                  <div style={{ ...S.card, textAlign: "center", padding: "32px 20px" }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div>
                    <div style={{ color: "#60a5fa", fontSize: 13, fontWeight: 500 }}>{genStep}</div>
                    <div style={{ color: "#334155", fontSize: 12, marginTop: 6 }}>Takes about 15 seconds...</div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 16 }}>{result.company} — {result.role}</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>Saved to tracker ✓</div>
                  </div>
                  <button onClick={() => { setResult(null); setJobDesc(""); setJobMeta({ company: "", role: "", location: "", url: "" }); }} style={S.ghostBtn}>+ New Job</button>
                </div>

                <div style={S.card}>
                  <div style={S.sectionTitle}>Key skills to highlight</div>
                  <div>{result.skills.split(",").map((s, i) => <span key={i} style={S.skillPill}>{s.trim()}</span>)}</div>
                </div>

                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={S.sectionTitle}>Cover letter</div>
                    <button style={S.copyBtn(copiedKey === "cover")} onClick={() => copyText(result.coverLetter, "cover")}>{copiedKey === "cover" ? "✓ Copied" : "Copy"}</button>
                  </div>
                  <div style={S.preBox}>{result.coverLetter}</div>
                </div>

                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={S.sectionTitle}>Resume bullet points</div>
                    <button style={S.copyBtn(copiedKey === "bullets")} onClick={() => copyText(result.bullets, "bullets")}>{copiedKey === "bullets" ? "✓ Copied" : "Copy"}</button>
                  </div>
                  <div style={S.preBox}>{result.bullets}</div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button style={S.successBtn} onClick={() => { markApplied(result.id); setTab("tracker"); }}>✓ I Applied — Move to Tracker</button>
                  {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ ...S.ghostBtn, textDecoration: "none", display: "flex", alignItems: "center" }}>View Posting ↗</a>}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "tracker" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)} style={S.statBtn(filterStatus === s, s)}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{stats[s]}</div>
                  <div style={{ fontSize: 9, color: filterStatus === s ? STATUS_COLORS[s]?.text : "#475569", marginTop: 2 }}>{s}</div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ ...S.card, textAlign: "center", padding: "50px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🛡️</div>
                <div style={{ color: "#475569", fontSize: 13 }}>{jobs.length === 0 ? "Apply to a job first — it'll appear here automatically." : "No jobs in this stage."}</div>
                {jobs.length === 0 && <button onClick={() => setTab("apply")} style={{ ...S.primaryBtn, marginTop: 14, width: "auto", padding: "10px 24px" }}>Apply to a Job →</button>}
              </div>
            )}

            {filtered.map((job) => {
              const isExpanded = expandedId === job.id;
              return (
                <div key={job.id} style={S.jobCard}>
                  <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : job.id)}>
                      <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{job.company}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{job.role} · {job.location}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={S.badge(job.status)}>{job.status}</span>
                        <span style={{ color: "#334155", fontSize: 11 }}>Added {job.dateAdded}</span>
                        {job.dateApplied && <span style={{ color: "#334155", fontSize: 11 }}>Applied {job.dateApplied}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select value={job.status} onChange={(e) => updateJob(job.id, { status: e.target.value })} style={{ background: STATUS_COLORS[job.status]?.bg, color: STATUS_COLORS[job.status]?.text, border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => deleteJob(job.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 16, padding: "4px" }}>✕</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e293b", paddingTop: 14 }}>
                      {job.skills && <div style={{ marginBottom: 14 }}><div style={S.sectionTitle}>Key skills</div><div>{job.skills.split(",").map((s, i) => <span key={i} style={S.skillPill}>{s.trim()}</span>)}</div></div>}

                      {job.coverLetter && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={S.sectionTitle}>Cover letter</div>
                            <button style={S.copyBtn(copiedKey === `c${job.id}`)} onClick={() => copyText(job.coverLetter, `c${job.id}`)}>{copiedKey === `c${job.id}` ? "✓ Copied" : "Copy"}</button>
                          </div>
                          <div style={S.preBox}>{job.coverLetter}</div>
                        </div>
                      )}

                      {job.bullets && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={S.sectionTitle}>Resume bullets</div>
                            <button style={S.copyBtn(copiedKey === `b${job.id}`)} onClick={() => copyText(job.bullets, `b${job.id}`)}>{copiedKey === `b${job.id}` ? "✓ Copied" : "Copy"}</button>
                          </div>
                          <div style={S.preBox}>{job.bullets}</div>
                        </div>
                      )}

                      <div style={{ marginBottom: 14 }}>
                        <div style={S.sectionTitle}>Notes</div>
                        <textarea style={{ ...S.input, fontSize: 12, minHeight: 70, resize: "none" }} placeholder="Interview date, recruiter name, follow-up needed..." value={job.notes} onChange={(e) => updateJob(job.id, { notes: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {job.status === "Saved" && <button style={{ ...S.successBtn, flex: "none", padding: "8px 16px", fontSize: 12 }} onClick={() => markApplied(job.id)}>✓ Mark as Applied</button>}
                        {job.url && <a href={job.url} target="_blank" rel="noreferrer" style={{ ...S.ghostBtn, textDecoration: "none", display: "flex", alignItems: "center" }}>View Posting ↗</a>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
