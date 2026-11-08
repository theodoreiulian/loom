import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Film,
  Image,
  KeyRound,
  Layers3,
  LoaderCircle,
  MousePointer2,
  Play,
  Plus,
  ScanLine,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { ALL_MODELS } from "../models";
import "./LandingPage.css";

const scenes = [
  {
    name: "Landscapes",
    image: "/landing/dreamscape.jpg",
    prompt:
      "A winding road through red sandstone mountains. Wide shot, late afternoon light, muted colors and a slightly grainy film look.",
    label: "Desert road study",
    type: "Scenes & settings",
  },
  {
    name: "Products",
    image: "/landing/product.jpg",
    prompt:
      "A skincare product shoot with soft pink tones. Natural window light, simple styling and plenty of space around the product.",
    label: "Skincare campaign",
    type: "Product campaigns",
  },
  {
    name: "Interiors",
    image: "/landing/interior.jpg",
    prompt:
      "A living room with warm wood, textured fabrics and sculptural furniture. Afternoon sunlight, neutral colors, photographed at eye level.",
    label: "Living room concept",
    type: "Concept exploration",
  },
];

function LoomMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 5v14a8 8 0 0 0 16 0V5M3 10v9a13 13 0 0 0 26 0v-9M13 5v14a3 3 0 0 0 6 0V5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WorkflowPreview() {
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<
    "idle" | "refining" | "generating" | "complete"
  >("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = scenes[scene];
  const busy = phase === "refining" || phase === "generating";

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function selectScene(index: number) {
    if (timer.current) clearTimeout(timer.current);
    setScene(index);
    setPhase("idle");
  }

  function runPreview() {
    setPhase("refining");
    timer.current = setTimeout(() => {
      setPhase("generating");
      timer.current = setTimeout(() => setPhase("complete"), 1400);
    }, 1000);
  }

  function moveLight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--pointer-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--pointer-y",
      `${event.clientY - bounds.top}px`,
    );
  }

  return (
    <div
      className={`workflow-preview phase-${phase}`}
      onPointerMove={moveLight}
    >
      <div className="preview-toolbar">
        <span>
          <span className="live-dot" /> A simple image workflow
        </span>
        <span className="preview-tag">
          Sample workflow · illustrative images
        </span>
      </div>
      <div className="preview-stage">
        <div className="glass-ribbon ribbon-one" aria-hidden="true" />
        <div className="glass-ribbon ribbon-two" aria-hidden="true" />
        <svg
          className="preview-wires"
          viewBox="0 0 1100 370"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M287 133 C365 133 322 190 410 190" />
          <path d="M287 300 C365 300 340 231 410 231" />
          <path d="M648 210 C730 210 675 168 755 168" />
          <path className="wire-flow" d="M287 133 C365 133 322 190 410 190" />
          <path className="wire-flow" d="M648 210 C730 210 675 168 755 168" />
        </svg>
        <div className="demo-node prompt-demo">
          <div className="demo-node-title">
            <span>
              <span className="node-symbol text-symbol">T</span> Your idea
            </span>
            <span className="node-menu">···</span>
          </div>
          <p key={scene}>{active.prompt}</p>
          <div className="demo-node-footer">
            Prompt <span className="port port-right" />
          </div>
        </div>
        <div className="demo-node reference-demo">
          <div className="demo-node-title">
            <span>
              <Image size={13} /> Reference image
            </span>
            <Plus size={13} />
          </div>
          <img src={active.image} alt={`${active.name} reference image`} />
          <span className="port port-right" />
        </div>
        <div
          className={`demo-node engineer-demo ${phase === "refining" ? "node-working" : ""}`}
        >
          <div className="demo-node-title">
            <span>
              <WandSparkles size={15} /> Prompt engineer
            </span>
            <Sparkles size={13} />
          </div>
          <div className="engineer-orb">
            <Sparkles size={25} />
          </div>
          <p>
            Add detail to
            <br />
            your prompt.
          </p>
          <div className="demo-node-footer">
            <span>
              {phase === "refining"
                ? "Refining the prompt…"
                : "Prompt refinement"}
            </span>
            <span className="mini-badge">Gemini</span>
          </div>
          <span className="port port-left" />
          <span className="port port-right" />
        </div>
        <div
          className={`demo-node output-demo ${phase === "generating" ? "node-working" : ""}`}
        >
          <div className="demo-node-title">
            <span>
              <Image size={14} /> Image generator
            </span>
            <span className="output-status">
              {phase === "complete" ? (
                <>
                  <Check size={12} /> Ready
                </>
              ) : (
                "Output"
              )}
            </span>
          </div>
          <div className="output-image">
            <img key={scene} src={active.image} alt={active.label} />
            <div className="output-image-shade" />
            <span className="image-caption">{active.label}</span>
            {phase === "generating" && (
              <div className="generating-overlay">
                <LoaderCircle size={24} className="spin" />
                <span>Generating…</span>
              </div>
            )}
            {phase === "complete" && (
              <span className="complete-stamp">
                <Check size={12} /> Preview complete
              </span>
            )}
          </div>
          <div className="demo-node-footer">
            <span>Image generation</span>
            <span>
              16:9 <ScanLine size={12} />
            </span>
          </div>
          <span className="port port-left" />
        </div>
        <div className="collaborator-cursor" aria-hidden="true">
          <MousePointer2 size={19} fill="currentColor" />
          <span>You</span>
        </div>
      </div>
      <div className="preview-controls">
        <div className="scene-options" aria-label="Preview scenes">
          {scenes.map((item, index) => (
            <button
              key={item.name}
              aria-pressed={scene === index}
              onClick={() => selectScene(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <button className="run-preview" onClick={runPreview} disabled={busy}>
          {busy ? (
            <LoaderCircle size={14} className="spin" />
          ) : phase === "complete" ? (
            <Check size={14} />
          ) : (
            <Play size={13} fill="currentColor" />
          )}{" "}
          {busy
            ? "Playing preview…"
            : phase === "complete"
              ? "Run again"
              : "Try the preview"}
          <span className="preview-free">No key needed</span>
        </button>
      </div>
      <span className="sr-only" role="status">
        {phase === "complete"
          ? "Preview complete. This is a sample workflow with illustrative images. Open the canvas to generate with your own prompt."
          : busy
            ? "Playing the sample workflow."
            : "Sample workflow. Select a scene and play the preview."}
      </span>
    </div>
  );
}

const steps = [
  {
    title: "Add a prompt.",
    text: "Drop a prompt node onto the canvas and describe what you want to make. Add an image node if you have a reference to work from.",
    icon: <Plus size={19} />,
  },
  {
    title: "Connect your nodes.",
    text: "Drag between the dots on each node to connect them. You can send a prompt to an image model, then use the result as a video’s starting frame.",
    icon: <Layers3 size={19} />,
  },
  {
    title: "Choose a model and run it.",
    text: "Add your API key in Settings and pick a model on the generator node. Run the nodes in order, then adjust the prompt or settings if you want another version.",
    icon: <Play size={17} />,
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = scenes[selectedUseCase];

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { root, threshold: 0.12 },
    );
    root
      .querySelectorAll("[data-reveal]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page" ref={scrollRef}>
      <a className="landing-skip" href="#how-it-works">
        Skip to how it works
      </a>
      <header className="landing-header">
        <a className="loom-wordmark" href="#" aria-label="Loom home">
          <LoomMark />
          <span>loom</span>
        </a>
        <nav
          className={menuOpen ? "landing-nav nav-open" : "landing-nav"}
          aria-label="Main navigation"
        >
          <a href="#possibilities" onClick={() => setMenuOpen(false)}>
            Use cases
          </a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
        </nav>
        <a className="nav-cta" href="#/editor">
          Open canvas <ArrowUpRight size={16} />
        </a>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        >
          {menuOpen ? <X size={20} /> : <span className="menu-lines" />}
        </button>
      </header>
      <main>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-grain" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">
              <span className="tiny-spark">✳</span> AI image & video workflows
            </span>
            <h1 id="hero-title">
              A workspace for
              <br />
              <span className="connect-word">
                visual ideas.
                <svg viewBox="0 0 420 22" fill="none" aria-hidden="true">
                  <path
                    d="M5 14C118 0 280 3 414 12"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p>
              Connect prompts, reference images and AI models on a canvas.
              <br className="desktop-break" /> Change a prompt, try another
              model, or build on an image you like.
            </p>
            <div className="hero-actions">
              <a className="landing-primary" href="#/editor">
                Start creating <ArrowUpRight size={18} />
              </a>
              <a className="hero-secondary" href="#how-it-works">
                How it works <ArrowDown size={15} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="live-dot" /> No account needed. Bring your own
              API keys.
            </div>
          </div>
          <div className="hero-preview-wrap">
            <div className="preview-note">
              here’s what a simple workflow looks like{" "}
              <svg viewBox="0 0 47 40" fill="none" aria-hidden="true">
                <path
                  d="M3 3c32-6 39 9 30 30m-8-9 8 10 11-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <WorkflowPreview />
          </div>
          <div className="provider-strip">
            <span>
              MODELS & PROVIDERS
              <br />
              AVAILABLE IN LOOM
            </span>
            <div>
              <span className="provider-google">Google</span>
              <span className="provider-openai">
                <Sparkles size={22} /> OpenAI
              </span>
              <span className="provider-fal">✳ fal.ai</span>
              <span className="provider-kling">
                KLING<span> AI</span>
              </span>
              <span className="provider-flux">
                FLUX<span>.1</span>
              </span>
            </div>
            <span>
              {ALL_MODELS.length} image & video models
              <br />
              in the model picker <ArrowUpRight size={13} />
            </span>
          </div>
        </section>
        <section
          className="possibilities-section section-shell"
          id="possibilities"
          aria-labelledby="possibilities-title"
        >
          <div className="section-heading" data-reveal>
            <div>
              <span className="eyebrow">01 / USE CASES</span>
              <h2 id="possibilities-title">
                A few ways
                <br />
                <span>to use Loom.</span>
              </h2>
            </div>
            <p>
              Explore a setting, plan a product shoot, or test an interior.
              <br />
              Reuse the workflow with different prompts as you go.
            </p>
          </div>
          <div className="possibilities-layout" data-reveal>
            <div className="use-case-list">
              {scenes.map((item, index) => (
                <button
                  className={`use-case ${selectedUseCase === index ? "selected" : ""}`}
                  key={item.name}
                  onClick={() => setSelectedUseCase(index)}
                  aria-pressed={selectedUseCase === index}
                >
                  <span className="use-case-number">0{index + 1}</span>
                  <span>
                    <strong>{item.type}</strong>
                    <span>
                      {index === 0
                        ? "Develop a setting for a story or short film."
                        : index === 1
                          ? "Try a few looks for a product campaign."
                          : "Test materials and lighting for a room."}
                    </span>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
              ))}
              <div className="video-use-case">
                <Film size={19} />
                <p>
                  Use an image as a starting frame.
                  <span>
                    Connect an image to a video model and describe the motion
                    you want.
                  </span>
                </p>
              </div>
            </div>
            <div className="use-case-art">
              <img
                key={selected.image}
                src={selected.image}
                alt={selected.label}
                loading="lazy"
              />
              <div className="art-label">
                <span>
                  <span className="live-dot" /> {selected.type}
                </span>
                <span>
                  Example image <ArrowUpRight size={14} />
                </span>
              </div>
              <div className="art-floating-label">
                <Layers3 size={15} /> Reference + prompt
              </div>
            </div>
          </div>
        </section>
        <section
          className="how-section section-shell"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="section-heading" data-reveal>
            <div>
              <span className="eyebrow">02 / GETTING STARTED</span>
              <h2 id="how-title">
                Start with
                <br />
                <span>a simple workflow.</span>
              </h2>
            </div>
            <a className="text-link" href="#/editor">
              Open the editor <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="steps" data-reveal>
            {steps.map((step, index) => (
              <article className="how-step" key={step.title}>
                <div className="step-top">
                  <span>0{index + 1}</span>
                  <div className="step-icon">{step.icon}</div>
                  {index < 2 && <span className="step-line" />}
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <div className="your-keys" data-reveal>
            <div className="key-glass">
              <KeyRound size={25} />
            </div>
            <div>
              <h3>Use your own API keys</h3>
              <p>
                Add a key from fal.ai, Google or another supported provider.
                <br className="desktop-break" /> You pay the provider for
                generation; Loom has no subscription or credit bundles.
              </p>
            </div>
            <span className="keys-badge">
              <Check size={13} /> Projects saved in your browser
            </span>
          </div>
        </section>
        <section className="closing-section" aria-labelledby="closing-title">
          <div className="closing-orbit orbit-one" aria-hidden="true" />
          <div className="closing-orbit orbit-two" aria-hidden="true" />
          <span className="eyebrow">OPEN THE EDITOR</span>
          <h2 id="closing-title">
            Ready to
            <br />
            <span>try it?</span>
          </h2>
          <a className="landing-primary" href="#/editor">
            Start a workflow <ArrowUpRight size={18} />
          </a>
          <p>Start with a prompt or a reference image.</p>
        </section>
      </main>
      <footer className="landing-footer">
        <a className="loom-wordmark" href="#" aria-label="Loom home">
          <LoomMark />
          <span>loom</span>
        </a>
        <span>A browser-based editor for AI images and video.</span>
        <a href="#/editor">
          Open canvas <ArrowRight size={14} />
        </a>
      </footer>
    </div>
  );
}
