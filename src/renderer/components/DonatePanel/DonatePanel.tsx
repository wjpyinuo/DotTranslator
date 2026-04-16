import { useState } from 'react';

// QR 码从服务器动态获取（加密传输）
const QR_ENDPOINTS = {
  wechat: 'https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/assets/wechat-qr.png',
  alipay: 'https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/assets/alipay-qr.png',
};

export function DonatePanel() {
  const [showWechat, setShowWechat] = useState(true);
  const [imgError, setImgError] = useState(false);

  const currentQR = showWechat ? QR_ENDPOINTS.wechat : QR_ENDPOINTS.alipay;

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
          onClick={() => { setShowWechat(true); setImgError(false); }}
        >
          💚 微信支付
        </button>
        <button
          className={`donate-tab-btn ${!showWechat ? 'active' : ''}`}
          onClick={() => { setShowWechat(false); setImgError(false); }}
        >
          💙 支付宝
        </button>
      </div>

      <div className="donate-code-wrapper">
        <div className="donate-code-card">
          {!imgError ? (
            <img
              key={currentQR}
              src={currentQR}
              alt={showWechat ? '微信收款码' : '支付宝收款码'}
              className="donate-code-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="donate-code-fallback">
              <span>{showWechat ? '💚' : '💙'}</span>
              <span>收款码加载失败，请稍后重试</span>
            </div>
          )}
          <span className="donate-label">{showWechat ? '微信支付' : '支付宝'}</span>
        </div>
      </div>

      <p className="donate-thanks">感谢你的支持 ❤️</p>
    </div>
  );
}
