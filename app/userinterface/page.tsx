import Link from "next/link";

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden 
      bg-gradient-to-br from-orange-200/40 via-white to-yellow-100/60
      flex flex-col items-center justify-center text-center px-6">

      {/* STATIC SPICE SWIRL (NO MOVEMENT) */}
      <div className="absolute top-10 opacity-20 text-[120px] select-none pointer-events-none">
        🌶️ 🌿 🧄 🌾
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* POP-UP TITLE */}
        <h1 className="text-7xl md:text-8xl font-extrabold tracking-tight 
          bg-gradient-to-r from-orange-600 via-yellow-500 to-red-500 
          bg-clip-text text-transparent drop-shadow-2xl 
          animate-[popUp_1s_ease-out]">
          Swaadha
        </h1>

        {/* SUBTITLE */}
        <p className="mt-6 text-2xl md:text-3xl font-semibold text-gray-800 leading-relaxed">
          Where Tradition Meets Taste
        </p>

        {/* DESCRIPTION */}
        <p className="mt-5 max-w-2xl mx-auto text-gray-600 text-lg leading-relaxed">
          Experience the soul of India through pure, premium ingredients and heritage spices.
        </p>

        {/* CTA BUTTON WITH LINK */}
        <Link href="/userinterface/home">
          <button className="mt-10 bg-orange-600 hover:bg-orange-700 transition-all duration-300 
            text-white px-12 py-4 rounded-full text-lg shadow-xl hover:shadow-2xl 
            flex items-center gap-3 hover:scale-105">
            Explore Our Collection <span className="text-xl">➜</span>
          </button>
        </Link>

      </div>

      {/* WAVE DIVIDER (BOTTOM) */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg viewBox="0 0 1440 320" className="w-full">
          <path
            fill="#ffffff"
            d="M0,224L80,218.7C160,213,320,203,480,176C640,149,800,107,960,112C1120,117,1280,171,1360,197.3L1440,224L1440,320L0,320Z"
          ></path>
        </svg>
      </div>

    </main>
  );
}
