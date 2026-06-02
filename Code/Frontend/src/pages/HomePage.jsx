import { Link } from "react-router-dom";
import { useJourney } from "../context/JourneyContext";
import "./HomePage.css";

export default function HomePage() {
  const { state } = useJourney();
  const userName = state.user?.displayName || state.user?.email || "旅行者";

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">Mini-Map Agent</p>
          <h1>
            你想去哪里，<span>我来带你去</span>
          </h1>
          <p className="home-hero__sub">
            用故事感的节奏规划每一天，预算、路线和体验一次生成。
          </p>
          <div className="home-hero__actions">
            <Link className="btn btn--primary btn--large" to="/plan">
              现在开始规划
            </Link>
            <Link className="btn btn--ghost btn--large" to="/journeys">
              查看我的行程
            </Link>
          </div>
          <p className="home-hero__welcome">欢迎回来，{userName}</p>
        </div>
        <div className="home-hero__visual">
          <div className="home-orbit">
            <div className="home-orbit__core">🗺️</div>
            <div className="home-orbit__ring"></div>
            <div className="home-orbit__spark"></div>
          </div>
          <div className="home-hero__card">
            <p>关键词驱动</p>
            <h3>1 次输入，5 步完成</h3>
            <span>让路线和预算同时对齐。</span>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="feature-card">
          <h3>目的地画像</h3>
          <p>结合兴趣与节奏，生成更像你的行程。</p>
        </div>
        <div className="feature-card">
          <h3>预算可控</h3>
          <p>每一步花费都有上限，不再担心超支。</p>
        </div>
        <div className="feature-card">
          <h3>行程可复盘</h3>
          <p>所有旅行都会保存在你的账号里。</p>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta__text">
          <h2>让行程像一部正在发生的旅行故事</h2>
          <p>选择目的地，交给 Mini-Map 规划剩下的每一天。</p>
        </div>
        <div className="home-cta__actions">
          <Link className="btn btn--secondary btn--large" to="/auth">
            登录 / 注册
          </Link>
        </div>
      </section>
    </div>
  );
}
