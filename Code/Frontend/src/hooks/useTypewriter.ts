import { useEffect, useRef } from "react";
import { bookFacade } from "@/store/book/facade";

export function useTypewriter(text: string, speedMs = 30) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const totalChars = text.length;
    let currentChar = 0;

    bookFacade.setNarrativeProgress(0);

    intervalRef.current = setInterval(() => {
      currentChar++;
      const progress = Math.min(currentChar / totalChars, 1);
      bookFacade.setNarrativeProgress(progress);

      if (progress >= 1 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, speedMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speedMs]);
}
