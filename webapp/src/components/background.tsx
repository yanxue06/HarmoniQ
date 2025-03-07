import React, { useEffect, useRef, useState } from "react";
import "./background.css";

const FIRST_IMAGES = [
  "/assets/albumCovers/cover1.jpeg",
  "/assets/albumCovers/cover2.jpg",
  "/assets/albumCovers/cover3.jpg",
  "/assets/albumCovers/cover4.jpeg",
];

const SECOND_IMAGES = [
  "/assets/albumCovers/cover5.jpg",
  "/assets/albumCovers/cover6.jpg",
  "/assets/albumCovers/cover7.jpg",
  "/assets/albumCovers/cover8.jpg",
];

export const ScrollingBackground: React.FC = () => {
  const col1Ref = useRef<HTMLDivElement | null>(null);
  const col2Ref = useRef<HTMLDivElement | null>(null);
  const [col1Transform, setCol1Transform] = useState("0px");
  const [col2Transform, setCol2Transform] = useState("0px");

  useEffect(() => {
    const updateHeights = () => {
      if (col1Ref.current) {
        const totalHeight = col1Ref.current.scrollHeight;
        const halfHeight = totalHeight / 2;
        setCol1Transform(`-${halfHeight}px`);
      }
      if (col2Ref.current) {
        const totalHeight = col2Ref.current.scrollHeight;
        const halfHeight = totalHeight / 2;
        setCol2Transform(`-${halfHeight}px`);
      }
    };

    updateHeights();
    // Add resize listener in case window size changes
    window.addEventListener('resize', updateHeights);
    return () => window.removeEventListener('resize', updateHeights);
  }, []);

  return (
    <div className="scrolling-bg-outer">
      <div className="scrolling-column scrolling-column-1">
        <div
          className="scrolling-column-inner scrolling-column-inner-1"
          ref={col1Ref}
          style={{ "--scroll-distance": col1Transform } as React.CSSProperties}
        >
          {FIRST_IMAGES.map((src, idx) => (
            <img key={`col1-${idx}`} src={src} alt={`Album ${idx}`} />
          ))}
          {FIRST_IMAGES.map((src, idx) => (
            <img key={`col1-dup-${idx}`} src={src} alt={`Album Dup ${idx}`} />
          ))}
        </div>
      </div>
      <div className="scrolling-column scrolling-column-2">
        <div
          className="scrolling-column-inner scrolling-column-inner-2"
          ref={col2Ref}
          style={{ "--scroll-distance": col2Transform } as React.CSSProperties}
        >
          {SECOND_IMAGES.map((src, idx) => (
            <img key={`col2-${idx}`} src={src} alt={`Album ${idx}`} />
          ))}
          {SECOND_IMAGES.map((src, idx) => (
            <img key={`col2-dup-${idx}`} src={src} alt={`Album Dup ${idx}`} />
          ))}
        </div>
      </div>
    </div>
  );
};