interface LemonLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
}

const LemonLogo = ({
  size = 32,
  color = "#4E86FF",
  showText = true,
}: LemonLogoProps) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.12" />
        <rect x="7" y="13" width="26" height="19" rx="5" fill={color} />
        <circle cx="20" cy="22" r="6.5" fill="white" />
        <circle cx="20" cy="22" r="4.5" fill={color} fillOpacity="0.85" />
        <circle cx="20" cy="22" r="2" fill="white" />
        <rect x="13" y="10" width="7" height="5" rx="1.5" fill={color} />
        <circle cx="30" cy="17" r="2" fill="#FFD93D" />
        <circle cx="23.5" cy="19.5" r="1" fill="white" fillOpacity="0.8" />
      </svg>
      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: size * 0.65,
            color,
            letterSpacing: "-0.5px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          re-mon
        </span>
      )}
    </div>
  );
};

export default LemonLogo;
