import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    window.history.scrollRestoration = "manual";

    const shouldForceTop = pathname === "/" || navType !== "POP";

    if (shouldForceTop && !hash) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  }, [pathname, search, hash, navType]);

  return null;
};
