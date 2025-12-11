import { useState, useEffect } from "react";

export default function HeroSlider({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const goNext = () => setIndex((prev) => (prev + 1) % images.length);
  const goPrev = () =>
    setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-transparent">
      {/* Slides Container */}
      <div
        className="flex h-full transition-transform duration-700"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((img, i) => (
          <div key={i} className="w-full flex-shrink-0 relative h-full">
            <img
              src={img}
              alt={`slider-${i}`}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Left Arrow */}
      <button
        onClick={goPrev}
        className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/40 text-white px-4 py-2 rounded-full hover:bg-black/60 z-10"
      >
        ❮
      </button>

      {/* Right Arrow */}
      <button
        onClick={goNext}
        className="absolute right-5 top-1/2 -translate-y-1/2 bg-black/40 text-white px-4 py-2 rounded-full hover:bg-black/60 z-10"
      >
        ❯
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full ${
              index === i ? "bg-white" : "bg-white/50"
            }`}
          ></button>
        ))}
      </div>
    </div>
  );
}
