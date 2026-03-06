import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    window.history.scrollRestoration = "manual";

    if (navType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname, search, navType]);

  return null;
};
