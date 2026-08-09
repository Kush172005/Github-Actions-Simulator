export function detectProjectStack(analyzers = []) {
  const depsAnalyzer = analyzers.find((a) => a.analyzer === "dependencies");
  const structureAnalyzer = analyzers.find((a) => a.analyzer === "repo_structure");

  let isNext = false;
  let isReact = false;
  let isVue = false;
  let isSvelte = false;
  let isNode = false;
  let isPython = false;
  let isGo = false;
  let isRust = false;
  let isDocker = false;

  // 1. Detect from dependencies
  if (depsAnalyzer && depsAnalyzer.findings) {
    const findingsStr = JSON.stringify(depsAnalyzer.findings).toLowerCase();
    const dataStr = JSON.stringify(depsAnalyzer.data || {}).toLowerCase();

    if (dataStr.includes('"type": "node"') || dataStr.includes("package.json")) {
      isNode = true;
    }
    if (dataStr.includes('"type": "python"') || dataStr.includes("requirements.txt") || dataStr.includes("pyproject.toml")) {
      isPython = true;
    }

    // Check findings / evidence text for specific framework names
    if (findingsStr.includes("next") || dataStr.includes("next")) isNext = true;
    if (findingsStr.includes("react") || dataStr.includes("react")) isReact = true;
    if (findingsStr.includes("vue") || dataStr.includes("vue")) isVue = true;
    if (findingsStr.includes("svelte") || dataStr.includes("svelte")) isSvelte = true;
  }

  // 2. Detect from repo structure
  if (structureAnalyzer && structureAnalyzer.data) {
    const sData = structureAnalyzer.data;
    if (sData.has_docker) isDocker = true;
    
    const lang = (sData.language || "").toLowerCase();
    if (lang === "typescript" || lang === "javascript") isNode = true;
    if (lang === "python") isPython = true;
    if (lang === "go") isGo = true;
    if (lang === "rust") isRust = true;
  }

  // Determine primary stack
  if (isNext) return { name: "Next.js", icon: "⚡", color: "from-zinc-100 to-zinc-400" };
  if (isReact) return { name: "React", icon: "⚛️", color: "from-cyan-400 to-blue-500" };
  if (isVue) return { name: "Vue.js", icon: "💚", color: "from-emerald-400 to-green-600" };
  if (isSvelte) return { name: "Svelte", icon: "🔥", color: "from-orange-400 to-red-500" };
  if (isNode) return { name: "Node.js", icon: "📦", color: "from-green-400 to-emerald-500" };
  if (isPython) return { name: "Python / FastAPI", icon: "🐍", color: "from-yellow-400 to-blue-500" };
  if (isGo) return { name: "Go / Golang", icon: "🐹", color: "from-cyan-400 to-sky-500" };
  if (isRust) return { name: "Rust", icon: "🦀", color: "from-orange-500 to-amber-700" };
  if (isDocker) return { name: "Docker Containerized", icon: "🐳", color: "from-blue-400 to-indigo-500" };

  return { name: "General Repo", icon: "📁", color: "from-zinc-400 to-zinc-600" };
}
