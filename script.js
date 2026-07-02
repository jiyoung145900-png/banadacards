document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // 1. 텍스트 실시간 연동
  const inputs = {
    accountNumber: $('accountNumber'),
    accountHolder: $('accountHolder'),
    footerText: $('footerText')
  };

  const renders = {
    account: $('renderAccount'),
    name: $('renderName'),
    footer: $('renderFooter')
  };

  function bindText(inputEl, renderEl) {
    inputEl.addEventListener('input', () => {
      renderEl.textContent = inputEl.value;
    });
  }

  bindText(inputs.accountNumber, renders.account);
  bindText(inputs.accountHolder, renders.name);
  bindText(inputs.footerText, renders.footer);


  // 2. 은행 선택 + 자동 배지 생성
  const bankSelect = $('bankSelect');
  const customBankRow = $('customBankRow');
  const customBankName = $('customBankName');
  const renderBank = $('renderBank');
  const renderMainImage = $('renderMainImage');

  // 텍스트 배지를 SVG data URI로 생성 (실제 은행 로고 파일이 없을 때 쓰는 대체 배지입니다)
  function buildBankBadge(label, color) {
    const lightBg = ['#FFB515', '#FFEB00'].includes(color.toUpperCase());
    const textColor = lightBg ? '#2d2626' : '#ffffff';
    const safeLabel = (label || '?').slice(0, 4);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'>
      <circle cx='130' cy='130' r='130' fill='${color}'/>
      <text x='130' y='146' font-family='Pretendard, sans-serif' font-size='46' font-weight='700' fill='${textColor}' text-anchor='middle'>${safeLabel}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function applyBankBadge() {
    const opt = bankSelect.options[bankSelect.selectedIndex];
    const color = opt.getAttribute('data-color') || '#888888';
    const logoPath = opt.getAttribute('data-logo');
    let label = opt.getAttribute('data-label') || '';

    if (bankSelect.value === '__custom__') {
      label = (customBankName.value || '은행').slice(0, 2);
      renderMainImage.src = buildBankBadge(label, color);
      return;
    }

    if (logoPath) {
      // assets/bank-logos/ 폴더에 실제 로고 파일이 있으면 그걸 쓰고,
      // 없으면(404) 자동으로 색상 배지로 대체합니다.
      const probe = new Image();
      probe.onload = () => { renderMainImage.src = logoPath; };
      probe.onerror = () => { renderMainImage.src = buildBankBadge(label, color); };
      probe.src = logoPath;
    } else {
      renderMainImage.src = buildBankBadge(label, color);
    }
  }

  function updateBankName() {
    if (bankSelect.value === '__custom__') {
      renderBank.textContent = customBankName.value || '';
    } else {
      renderBank.textContent = bankSelect.value;
    }
  }

  bankSelect.addEventListener('change', () => {
    const isCustom = bankSelect.value === '__custom__';
    customBankRow.style.display = isCustom ? 'block' : 'none';
    updateBankName();
    applyBankBadge();
  });

  customBankName.addEventListener('input', () => {
    updateBankName();
    applyBankBadge();
  });

  // 초기값 세팅
  updateBankName();
  applyBankBadge();


  // 3. 테마 변경 로직
  const root = document.documentElement;
  const poster = $('poster');
  const swatches = document.querySelectorAll('.theme-swatch');

  const themes = {
    pink: {
      bg: '#fcf1f3', glow1: 'rgba(255, 182, 193, 0.6)', glow2: 'rgba(255, 228, 225, 0.8)',
      main: '#2d2626', accent: '#d85c6c', boxBg: 'rgba(255, 255, 255, 0.7)', boxBorder: 'rgba(255, 255, 255, 0.9)'
    },
    blue: {
      bg: '#f4f9ff', glow1: 'rgba(182, 211, 242, 0.5)', glow2: 'rgba(227, 240, 255, 0.8)',
      main: '#1a2b4c', accent: '#4a90e2', boxBg: 'rgba(255, 255, 255, 0.7)', boxBorder: 'rgba(255, 255, 255, 0.9)'
    },
    black: {
      bg: '#1a1a1a', glow1: 'rgba(80, 80, 80, 0.4)', glow2: 'rgba(40, 40, 40, 0.6)',
      main: '#ffffff', accent: '#d4af37', boxBg: 'rgba(30, 30, 30, 0.6)', boxBorder: 'rgba(255, 255, 255, 0.1)'
    }
  };

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const themeKey = swatch.getAttribute('data-theme');
      const t = themes[themeKey];

      root.style.setProperty('--bg-color', t.bg);
      root.style.setProperty('--glow-1', t.glow1);
      root.style.setProperty('--glow-2', t.glow2);
      root.style.setProperty('--text-main', t.main);
      root.style.setProperty('--text-accent', t.accent);
      root.style.setProperty('--box-bg', t.boxBg);
      root.style.setProperty('--box-border', t.boxBorder);

      poster.setAttribute('data-active-theme', themeKey);
    });
  });


  // 4. 계좌번호 복사 (손님용)
  const copyBtn = $('copyAccountBtn');
  const copyAllBtn = $('copyAllBtn');
  const copyToast = $('copyToast');
  let toastTimer = null;

  async function writeClipboardText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 클립보드 API를 쓸 수 없는 환경을 위한 대체 방법
      const tmp = document.createElement('textarea');
      tmp.value = text;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.focus();
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    }
  }

  async function copyAccountNumber(opts = {}) {
    const text = inputs.accountNumber.value.trim();
    if (!text) return;
    try {
      await writeClipboardText(text);
      if (!opts.silent) showToast('계좌번호가 복사되었습니다');
    } catch (err) {
      console.error('복사 실패:', err);
      if (!opts.silent) showToast('복사에 실패했어요. 직접 선택해 복사해주세요');
    }
  }

  async function copyAllInfo() {
    const bank = renderBank.textContent.trim();
    const account = inputs.accountNumber.value.trim();
    const holder = inputs.accountHolder.value.trim();
    if (!account) return;
    const text = `${bank} ${account} 예금주 ${holder}`;
    try {
      await writeClipboardText(text);
      showToast('은행명·계좌번호·예금주가 복사되었습니다');
    } catch (err) {
      console.error('복사 실패:', err);
      showToast('복사에 실패했어요. 직접 선택해 복사해주세요');
    }
  }

  function showToast(message) {
    copyToast.textContent = message;
    copyToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => copyToast.classList.remove('show'), 1800);
  }

  copyBtn.addEventListener('click', () => copyAccountNumber());
  copyAllBtn.addEventListener('click', copyAllInfo);
  renders.account.addEventListener('click', () => copyAccountNumber());
  renders.account.style.cursor = 'pointer';


  // 5. 고화질 다운로드 로직 (html2canvas)
  const downloadBtn = $('downloadBtn');

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.textContent = '이미지 렌더링 중...';
    downloadBtn.style.opacity = '0.7';
    downloadBtn.style.pointerEvents = 'none';

    try {
      const canvas = await html2canvas(poster, {
        scale: 3, // 초고화질 출력
        useCORS: true,
        backgroundColor: getComputedStyle(root).getPropertyValue('--bg-color').trim(),
        logging: false,
        ignoreElements: (el) => el.classList && el.classList.contains('no-capture')
      });

      const link = document.createElement('a');
      link.download = `계좌안내_${inputs.accountHolder.value}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 이미지 저장과 동시에 계좌번호도 클립보드에 복사 (손님 전송 시 바로 붙여넣기용)
      await copyAccountNumber({ silent: true });
      showToast('이미지 저장 + 계좌번호 복사 완료');
    } catch (error) {
      console.error('저장 중 오류 발생:', error);
      alert('이미지 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      downloadBtn.textContent = '이미지로 저장하기';
      downloadBtn.style.opacity = '1';
      downloadBtn.style.pointerEvents = 'auto';
    }
  });
});