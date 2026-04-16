import { useState } from 'react';

export function DonatePanel() {
  const [showWechat, setShowWechat] = useState(true);

  return (
    <div className="donate-page">
      <div className="donate-hero">
        <div className="donate-pulse">☕</div>
        <h2>请作者喝杯咖啡</h2>
        <p className="donate-desc">
          如果 DotTranslator 对你有帮助，欢迎打赏支持！<br />
          每一份鼓励都是持续更新的动力 💪
        </p>
      </div>

      <div className="donate-tabs">
        <button
          className={`donate-tab-btn ${showWechat ? 'active' : ''}`}
          onClick={() => setShowWechat(true)}
        >
          💚 微信支付
        </button>
        <button
          className={`donate-tab-btn ${!showWechat ? 'active' : ''}`}
          onClick={() => setShowWechat(false)}
        >
          💙 支付宝
        </button>
      </div>

      <div className="donate-code-wrapper">
        {showWechat ? (
          <div className="donate-code-card">
            <img
              src="https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/assets/wechat-qr.png"
              alt="微信收款码"
              className="donate-code-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="donate-code-fallback" style={{ display: 'none' }}>
              <span>💚</span>
              <span>请将收款码放置于<br />assets/wechat-qr.png</span>
            </div>
            <span className="donate-label">微信支付</span>
          </div>
        ) : (
          <div className="donate-code-card">
            <img
              src="https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/assets/alipay-qr.png"
              alt="支付宝收款码"
              className="donate-code-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="donate-code-fallback" style={{ display: 'none' }}>
              <span>💙</span>
              <span>请将收款码放置于<br />assets/alipay-qr.png</span>
            </div>
            <span className="donate-label">支付宝</span>
          </div>
        )}
      </div>

      <p className="donate-thanks">感谢你的支持 ❤️</p>
    </div>
  );
}
