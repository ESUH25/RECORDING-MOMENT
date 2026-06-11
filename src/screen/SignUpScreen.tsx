import { useState } from "react";
import "../Auth.css";
import LemonLogo from "../components/LemonLogo";

interface SignUpScreenProps {
  onSignUp: () => void;
  onGoLogin: () => void;
}

const SignUpScreen = ({ onSignUp, onGoLogin }: SignUpScreenProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    localStorage.setItem("remon_user", JSON.stringify({ email, name }));
    onSignUp();
  };

  return (
    <div className="auth">
      <div className="auth__header">
        <button className="auth__back" onClick={onGoLogin}>
          ←
        </button>
        <div className="auth__logo">
          <LemonLogo size={28} color="#4E86FF" />
        </div>
        <h1 className="auth__title">Create account ✨</h1>
        <p className="auth__subtitle">Start capturing your moments</p>
      </div>

      <div className="auth__form">
        {error && <div className="auth__error">{error}</div>}

        <div className="auth__field">
          <label className="auth__label">Name</label>
          <input
            className="auth__input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
        </div>

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
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
        </div>

        <button className="auth__btn" onClick={handleSubmit}>
          Create Account 🎉
        </button>

        <div className="auth__switch">
          Already have an account? <button onClick={onGoLogin}>Sign In</button>
        </div>
      </div>
    </div>
  );
};

export default SignUpScreen;
