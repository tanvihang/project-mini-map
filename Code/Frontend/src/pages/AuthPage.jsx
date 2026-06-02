import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJourney } from "../context/JourneyContext";
import { useGateway } from "../hooks/useGateway";
import "./AuthPage.css";

export default function AuthPage() {
  const { state } = useJourney();
  const { register, login } = useGateway();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    displayName: "",
  });
  const [loginResult, setLoginResult] = useState(null);
  const [registerResult, setRegisterResult] = useState(null);

  const handleLogin = async () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginResult({ success: false, message: "请输入邮箱和密码" });
      return;
    }
    const result = await login(loginForm.email, loginForm.password);
    setLoginResult(result);
    if (result.success) {
      navigate("/plan");
    }
  };

  const handleRegister = async () => {
    if (!registerForm.email.trim() || !registerForm.password.trim()) {
      setRegisterResult({ success: false, message: "请输入邮箱和密码" });
      return;
    }
    const result = await register(
      registerForm.email,
      registerForm.password,
      registerForm.displayName || null,
    );
    setRegisterResult(result);
    if (result.success) {
      navigate("/plan");
    }
  };

  return (
    <div className="auth">
      <section className="auth-hero">
        <h1>登录 Mini-Map</h1>
        <p>解锁你的行程记录，随时查看与继续规划。</p>
        {state.user && (
          <div className="auth-hero__user">
            当前用户：{state.user.displayName || state.user.email}
          </div>
        )}
      </section>

      <div className="auth-panels">
        <div className="auth-panel">
          <h2>已有账号</h2>
          <label className="auth-field">
            邮箱
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="you@email.com"
            />
          </label>
          <label className="auth-field">
            密码
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="至少8个字符"
            />
          </label>
          <button className="btn btn--primary" onClick={handleLogin}>
            立即登录
          </button>
          {loginResult && (
            <div
              className={`auth-result ${loginResult.success ? "auth-result--success" : "auth-result--error"}`}
            >
              {loginResult.success ? "登录成功" : loginResult.message}
            </div>
          )}
        </div>

        <div className="auth-panel auth-panel--accent">
          <h2>创建新账号</h2>
          <label className="auth-field">
            邮箱
            <input
              type="email"
              value={registerForm.email}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="you@email.com"
            />
          </label>
          <label className="auth-field">
            密码
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              placeholder="至少8个字符"
            />
          </label>
          <label className="auth-field">
            显示名称
            <input
              value={registerForm.displayName}
              onChange={(e) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  displayName: e.target.value,
                }))
              }
              placeholder="可选"
            />
          </label>
          <button className="btn btn--secondary" onClick={handleRegister}>
            创建账号
          </button>
          {registerResult && (
            <div
              className={`auth-result ${registerResult.success ? "auth-result--success" : "auth-result--error"}`}
            >
              {registerResult.success ? "注册成功" : registerResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="auth-footer">
        <Link to="/">返回首页</Link>
      </div>
    </div>
  );
}
