import { useState, useLayoutEffect, useRef, RefObject } from "react";

type Size = {
  width: number;
  height: number;
};

export function useContainerSize<T extends HTMLElement>(): [RefObject<T | null>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // use getBoundingClientRect() for precise fractional dimensions
        const { width, height } = entry.target.getBoundingClientRect();
        setSize({ width, height });
      }
    });

    observer.observe(element/*, { box: "border-box" }*/);

    // Set initial size
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, size];
}
