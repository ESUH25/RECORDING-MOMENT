import { useEffect } from "react";
import "./SplashScreen.css";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  useEffect(() => {
    const t = setTimeout(onFinish, 3000);
    return () => clearTimeout(t);
  }, [onFinish]);

  const sunRays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="splash">
      <div className="splash__deco splash__deco--1" />
      <div className="splash__deco splash__deco--2" />
      <div className="splash__deco splash__deco--3" />

      <svg
        className="splash__sun"
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
      >
        <circle cx="28" cy="28" r="13" fill="#F4A800" />
        {sunRays.map((deg, i) => (
          <line
            key={i}
            x1="28"
            y1="28"
            x2={28 + 25 * Math.cos((deg * Math.PI) / 180)}
            y2={28 + 25 * Math.sin((deg * Math.PI) / 180)}
            stroke="#F4A800"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="splash__content">
        <div className="splash__icon-wrap">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="8" y="20" width="48" height="32" rx="7" fill="#4E86FF" />
            <circle cx="32" cy="36" r="11" fill="white" />
            <circle cx="32" cy="36" r="7.5" fill="#4E86FF" fillOpacity="0.85" />
            <circle cx="32" cy="36" r="3.5" fill="white" />
            <rect x="21" y="14" width="11" height="9" rx="3" fill="#4E86FF" />
            <circle cx="47" cy="25" r="3" fill="#FFD93D" />
            <circle cx="37" cy="31" r="1.5" fill="white" fillOpacity="0.75" />
          </svg>
        </div>

        <div>
          <h1 className="splash__title">
            Recording
            <br />
            <span>Moment</span>
          </h1>
          <p className="splash__tagline">capture every golden moment ☀️</p>
        </div>

        <div className="splash__loader">
          <div className="splash__bar-bg">
            <div className="splash__bar-fill" />
          </div>
          <span className="splash__loader-label">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
