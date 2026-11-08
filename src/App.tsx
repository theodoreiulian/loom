import { lazy, Suspense, useEffect, useState } from "react";
import LandingPage from "./components/LandingPage";

const Editor = lazy(() => import("./Editor"));

export default function App() {
  const [isEditor, setIsEditor] = useState(
    () => window.location.hash === "#/editor",
  );

  useEffect(() => {
    const onHashChange = () => setIsEditor(window.location.hash === "#/editor");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (!isEditor) return <LandingPage />;

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center" role="status">
          Opening your canvas…
        </div>
      }
    >
      <Editor />
    </Suspense>
  );
}
