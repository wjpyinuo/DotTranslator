import { useState } from 'react';

// QR 码远程读取地址（生产环境从服务器获取）
const QR_BASE = 'https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/assets';

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
        <div className="donate-code-card">
          <img
            src={showWechat ? `${QR_BASE}/wechat-qr.png` : `${QR_BASE}/alipay-qr.png`}
            alt={showWechat ? '微信收款码' : '支付宝收款码'}
            className="donate-code-img"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = (e.target as HTMLImageElement).nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="donate-code-fallback" style={{ display: 'none' }}>
            <span>{showWechat ? '💚' : '💙'}</span>
            <span>收款码加载中，请稍后重试</span>
          </div>
          <span className="donate-label">{showWechat ? '微信支付' : '支付宝'}</span>
        </div>
      </div>

      <p className="donate-thanks">感谢你的支持 ❤️</p>
    </div>
  );
}
