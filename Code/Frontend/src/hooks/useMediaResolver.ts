import { useEffect } from "react";
import { bookFacade } from "@/store/book/facade";

export function useMediaResolver(ref: string, url: string) {
  useEffect(() => {
    bookFacade.setMediaState(ref, "loading");

    const img = new Image();
    img.onload = () => bookFacade.setMediaState(ref, "resolved", url);
    img.onerror = () => bookFacade.setMediaState(ref, "error");
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [ref, url]);
}
