import { useState } from "react";
import "../Auth.css";
import LemonLogo from "../components/LemonLogo";

interface LoginScreenProps {
  onLogin: () => void;
  onGoSignUp: () => void;
}

const LoginScreen = ({ onLogin, onGoSignUp }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (emailStr: string) => {
    if (!emailStr) return "이메일을 입력해주세요.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr))
      return "올바른 이메일 형식이 아닙니다 (예: react@example.com).";
    return "";
  };

  const handleSubmit = () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // ✅ FIX: 기존 계정 정보(name 포함)를 보존하면서 로그인 처리
    // 회원가입 시 저장된 name이 있으면 유지, 없으면 email 앞부분 사용
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem("remon_user") ?? "{}");
      } catch {
        return {};
      }
    })();

    const name = existing.name?.trim() || email.split("@")[0];
    localStorage.setItem("remon_user", JSON.stringify({ email, name }));
    onLogin();
  };

  return (
    <div className="auth">
      <div className="auth__header">
        <div className="auth__logo">
          <LemonLogo size={28} color="#4E86FF" />
        </div>
        <h1 className="auth__title">Welcome back 👋</h1>
        <p className="auth__subtitle">Sign in to continue your journey</p>
      </div>

      <div className="auth__form">
        {error && <div className="auth__error">{error}</div>}

        <div className="auth__field">
          <label className="auth__label">Email</label>
          <input
            className="auth__input"
            type="email"
            placeholder="hello@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </div>

        <div className="auth__field">
          <label className="auth__label">Password</label>
          <input
            className="auth__input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
        </div>

        <button className="auth__btn" onClick={handleSubmit}>
          Sign In ☀️
        </button>

        <div className="auth__divider">
          <div className="auth__divider-line" />
          <span className="auth__divider-text">or</span>
          <div className="auth__divider-line" />
        </div>

        <div className="auth__switch">
          Don't have an account? <button onClick={onGoSignUp}>Sign Up</button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
