const fields = {
  businessName: document.querySelector("#businessName"),
  businessType: document.querySelector("#businessType"),
  locationMood: document.querySelector("#locationMood"),
  audience: document.querySelector("#audience"),
  strengths: document.querySelector("#strengths"),
};

const stepPanels = [...document.querySelectorAll(".step-panel")];
const stepLinks = [...document.querySelectorAll(".step-link")];
const trackDots = [...document.querySelectorAll(".track-dot")];
const stepTitle = document.querySelector("#stepTitle");
const logoInput = document.querySelector("#logoInput");
const imageInput = document.querySelector("#imageInput");
const logoPreview = document.querySelector("#logoPreview");
const previewGrid = document.querySelector("#previewGrid");
const mockupGrid = document.querySelector("#mockupGrid");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const generateButton = document.querySelector("#generateButton");
const refreshMockupsButton = document.querySelector("#refreshMockupsButton");
const copyButton = document.querySelector("#copyButton");
const resetButton = document.querySelector("#resetButton");
const toast = document.querySelector("#toast");

const outputs = {
  brandLanguage: document.querySelector("#brandLanguage"),
  promoIdeas: document.querySelector("#promoIdeas"),
  imagePrompt: document.querySelector("#imagePrompt"),
  copyBlocks: document.querySelector("#copyBlocks"),
};

const stepTitles = [
  "사업장 정보를 알려주세요",
  "로고와 참고 이미지를 올려주세요",
  "필요한 제작물을 선택해주세요",
  "브랜드 제안 결과를 확인하세요",
];

let currentStep = 0;
let uploadedImages = [];
let logoImage = null;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function updateStep(step) {
  currentStep = Math.max(0, Math.min(stepPanels.length - 1, step));

  stepPanels.forEach((panel, index) => {
    panel.classList.toggle("active", index === currentStep);
  });
  stepLinks.forEach((link, index) => {
    link.classList.toggle("active", index === currentStep);
    link.classList.toggle("done", index < currentStep);
  });
  trackDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentStep);
    dot.classList.toggle("done", index < currentStep);
  });

  stepTitle.textContent = stepTitles[currentStep];
  prevButton.disabled = currentStep === 0;
  nextButton.classList.toggle("hidden", currentStep === stepPanels.length - 1);
  generateButton.classList.toggle("hidden", currentStep !== stepPanels.length - 1);
  copyButton.classList.toggle("hidden", currentStep !== stepPanels.length - 1);
}

function getSelectedGoals() {
  return [...document.querySelectorAll(".goal-card.selected")].map((card) => ({
    category: card.dataset.category,
    layout: card.dataset.layout,
    title: card.querySelector("strong").textContent.trim(),
    note: card.querySelector("span").textContent.trim(),
  }));
}

function getBrandInput() {
  const name = fields.businessName.value.trim() || "우리 브랜드";
  const type = fields.businessType.value;
  const mood = fields.locationMood.value.trim() || "따뜻하고 기억에 남는 공간";
  const audience = fields.audience.value.trim() || "처음 방문하는 고객과 재방문 고객";
  const strengths = fields.strengths.value.trim() || "친절한 응대, 깔끔한 경험, 사진으로 남기고 싶은 디테일";
  const goals = getSelectedGoals();

  return { name, type, mood, audience, strengths, goals };
}

function pickTone(type, mood) {
  const toneMap = {
    "숙소 / 펜션 / 호텔": ["차분한", "배려 깊은", "머무름을 존중하는"],
    "카페 / 베이커리": ["다정한", "감각적인", "일상에 스며드는"],
    "식당 / 주점": ["활기 있는", "진심이 느껴지는", "입맛을 당기는"],
    "뷰티 / 스파": ["섬세한", "안정감 있는", "회복을 돕는"],
    "공방 / 클래스": ["손맛 있는", "창작을 북돋는", "친근한"],
    "소매 / 편집숍": ["취향이 선명한", "추천이 믿음직한", "발견의 즐거움이 있는"],
    "기타 로컬 사업장": ["명확한", "친절한", "기억하기 쉬운"],
  };

  const base = toneMap[type] || toneMap["기타 로컬 사업장"];
  const hasQuietMood = /조용|차분|숲|휴식|따뜻|감성/.test(mood);
  return hasQuietMood ? ["따뜻한", ...base.slice(0, 2)] : base;
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
}

function logoMarkup() {
  if (!logoImage) {
    return `<div class="mock-logo text-logo">BM</div>`;
  }

  return `<img class="mock-logo" src="${logoImage.src}" alt="${escapeHTML(logoImage.name)}" />`;
}

function goalTitles(goals) {
  return goals.map((goal) => goal.title);
}

function categorySummary(goals) {
  const grouped = goals.reduce((acc, goal) => {
    acc[goal.category] = acc[goal.category] || [];
    acc[goal.category].push(goal.title);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, titles]) => `${category}: ${titles.join(", ")}`);
}

function createMockup(goal, index, input) {
  const fallbackLayouts = ["poster", "review", "guide", "sticker", "social", "banner", "tag"];
  const layout = goal?.layout || fallbackLayouts[index % fallbackLayouts.length];
  const title = goal?.title || ["AI 포스터", "리뷰 요청 카드", "객실 안내문", "스티커", "SNS 포스트", "이벤트 배너", "패키지 태그"][index];
  const category = goal?.category || "추천";
  const copyByLayout = {
    poster: "사진, 조명, 로고, 타이포그래피를 결합한 완성형 홍보 포스터.",
    sticker: "좋은 시간은 오래 남습니다.",
    postcard: `${input.mood}에서 쉬어가는 작은 기록.`,
    keyring: "작게 지니는 브랜드의 순간.",
    mug: "매일의 시작에 브랜드 감성을 더합니다.",
    guide: `${input.name}을 찾아주셔서 감사합니다. 편안한 이용을 위해 안내드립니다.`,
    notice: "조용한 이용을 부탁드리며 필요한 내용을 정리했습니다.",
    review: "오늘의 시간이 좋았다면 짧은 리뷰를 남겨주세요.",
    menu: "이곳에서 누릴 수 있는 서비스를 한눈에 안내합니다.",
    social: `${input.mood}을 느낄 수 있는 ${input.name}.`,
    banner: "리뷰 인증 시 다음 방문 혜택을 드립니다.",
    leaflet: "방문 전 알아두면 좋은 매력을 접지형으로 소개합니다.",
    coupon: "다음 방문을 위한 작은 혜택을 준비했습니다.",
    tag: input.strengths,
  };

  return {
    type: category,
    title,
    body: copyByLayout[layout] || copyByLayout.tag,
    layout,
  };
}

function mockupVisual(layout, logo, title, body, input) {
  const safeTitle = escapeHTML(title);
  const safeBody = escapeHTML(body);
  const safeName = escapeHTML(input.name);
  const heroImage = uploadedImages[0]?.url;

  if (layout === "poster") {
    const productVisual = heroImage
      ? `<img class="poster-product-image" src="${heroImage}" alt="${escapeHTML(uploadedImages[0].name)}" />`
      : `<div class="poster-product-placeholder"><span></span></div>`;

    return `
      <div class="mock-premium-poster">
        <div class="poster-light"></div>
        <div class="poster-leaf-shadow"></div>
        <header>${logo}</header>
        <strong class="poster-headline">Signature<br />Moment</strong>
        <p>브랜드가 기억되는 한 장면을 만듭니다.</p>
        <div class="poster-hero">${productVisual}</div>
        <footer>${safeName}</footer>
      </div>
    `;
  }

  if (layout === "sticker") {
    return `
      <div class="mock-sticker-sheet">
        <div class="sticker-circle">${logo}</div>
        <div class="sticker-pill">${safeName}</div>
        <div class="sticker-square">${safeTitle}</div>
      </div>
    `;
  }

  if (layout === "postcard") {
    return `
      <div class="mock-postcard">
        <div class="postcard-photo"></div>
        <div class="postcard-message">
          ${logo}
          <strong>${safeTitle}</strong>
          <p>${safeBody}</p>
        </div>
      </div>
    `;
  }

  if (layout === "keyring") {
    return `
      <div class="mock-keyring">
        <span class="keyring-loop"></span>
        <div class="keyring-body">${logo}<strong>${safeName}</strong></div>
      </div>
    `;
  }

  if (layout === "mug") {
    return `
      <div class="mock-mug product-stage">
        <div class="mug-shadow"></div>
        <div class="mug-body">
          <div class="mug-print-area">
            ${logo}
            <strong>${safeTitle}</strong>
            <small>${safeName}</small>
          </div>
        </div>
        <span class="mug-handle"></span>
      </div>
    `;
  }

  if (layout === "guide" || layout === "notice" || layout === "menu") {
    return `
      <div class="mock-document">
        <header>${logo}<span>${safeName}</span></header>
        <strong>${safeTitle}</strong>
        <p>${safeBody}</p>
        <div class="document-lines"><i></i><i></i><i></i></div>
      </div>
    `;
  }

  if (layout === "review" || layout === "coupon") {
    return `
      <div class="mock-card-ticket">
        <div>${logo}<strong>${safeTitle}</strong><p>${safeBody}</p></div>
        <span class="qr-box">QR</span>
      </div>
    `;
  }

  if (layout === "banner") {
    return `
      <div class="mock-banner-wide">
        ${logo}
        <div><strong>${safeTitle}</strong><p>${safeBody}</p></div>
        <span>EVENT</span>
      </div>
    `;
  }

  if (layout === "leaflet") {
    return `
      <div class="mock-leaflet print-preview">
        <section class="leaflet-cover">
          <div class="leaflet-logo">${logo}</div>
          <strong>${safeName}</strong>
          <p>Brand guide</p>
        </section>
        <section class="leaflet-story">
          <span>01</span>
          <strong>${safeTitle}</strong>
          <p>${safeBody}</p>
          <i></i>
        </section>
        <section class="leaflet-info">
          <div class="map-card"><span></span><span></span><span></span></div>
          <strong>Visit info</strong>
          <p>위치 · 이용 안내 · 혜택</p>
        </section>
      </div>
    `;
  }

  return `
    <div class="mock-social-post">
      <div class="social-image"></div>
      <div class="social-caption">${logo}<strong>${safeTitle}</strong><p>${safeBody}</p></div>
    </div>
  `;
}

function generateMockups(input) {
  const name = escapeHTML(input.name);
  const mood = escapeHTML(input.mood);
  const selectedGoals = input.goals.length
    ? input.goals
    : [
        { category: "안내문", layout: "review", title: "리뷰 요청 카드" },
        { category: "홍보물", layout: "social", title: "SNS 포스트" },
        { category: "굿즈", layout: "sticker", title: "스티커" },
      ];
  const logo = logoMarkup();
  const mockups = selectedGoals.slice(0, 8).map((goal, index) => createMockup(goal, index, input));

  mockupGrid.innerHTML = mockups
    .map(
      (mockup) => `
        <article class="mockup-card ${mockup.layout}">
          ${mockupVisual(mockup.layout, logo, mockup.title, mockup.body, input)}
          <span>${escapeHTML(mockup.type)}</span>
          <h5>${escapeHTML(mockup.title)}</h5>
          <p>${escapeHTML(mockup.body)}</p>
          <small>${name} · ${mood}</small>
        </article>
      `,
    )
    .join("");
}

function generateBrandLanguage(input) {
  const tones = pickTone(input.type, input.mood);
  const name = escapeHTML(input.name);
  const mood = escapeHTML(input.mood);
  const audience = escapeHTML(input.audience);
  const typeTones = escapeHTML(tones.join(", "));
  const keywordTones = escapeHTML(tones.join(" · "));

  return `
    <p><strong>브랜드 성격</strong><br>${name}은 ${mood}을 중심으로, ${audience}에게 ${typeTones} 인상을 주는 브랜드입니다.</p>
    <p><strong>추천 톤앤매너</strong></p>
    ${renderList([
      `문장은 짧고 부드럽게 씁니다. 예: "편히 머무르실 수 있도록 준비했습니다."`,
      `설명보다 장면을 먼저 떠올리게 합니다. 예: "${input.mood}에서 천천히 쉬어가세요."`,
      `과장된 표현보다 실제 강점인 "${input.strengths}"을 구체적으로 보여줍니다.`,
    ])}
    <p><strong>브랜드 키워드</strong><br>${keywordTones} · 지역성 · 기억에 남는 디테일 · 다시 찾고 싶은 경험</p>
    <p><strong>대표 문장</strong><br>${name}, 오늘의 시간을 조금 더 편안하게 만드는 곳.</p>
  `;
}

function generatePromoIdeas(input) {
  const imageNote = logoImage
    ? `업로드한 로고 "${logoImage.name}"을 모든 시안의 기준 마크로 적용`
    : "로고를 추가하면 리뷰 카드, 굿즈, SNS 시안에 바로 적용할 수 있음";

  const baseIdeas = [
    `리뷰 요청 카드: "${input.name}에서의 순간이 좋았다면, 짧은 리뷰로 남겨주세요."`,
    `안내문: 딱딱한 공지 대신 ${input.mood}에 맞춘 짧은 문장형 안내`,
    `SNS 포스트: 방문 전 기대감을 만드는 이미지 3장 구성`,
    `스티커/엽서: 로고와 대표 문장을 넣은 소형 굿즈`,
    `이벤트 배너: 재방문 쿠폰 또는 리뷰 인증 혜택 안내`,
    `패키지 태그: 상품/객실 비품에 붙일 수 있는 브랜드 한 줄 문구`,
  ];

  const goalIdeas = input.goals.map(
    (goal) => `${goal.category} / ${goal.title}: ${input.name}의 강점 "${input.strengths}"을 중심 메시지로 사용`,
  );

  return `
    <p><strong>시각 기준</strong><br>${imageNote}</p>
    <p><strong>선택한 종류</strong><br>${escapeHTML(categorySummary(input.goals).join(" · ") || "기본 추천 세트")}</p>
    <p><strong>추천 제작물</strong></p>
    ${renderList([...goalIdeas, ...baseIdeas].slice(0, 10))}
  `;
}

function generateImagePrompt(input) {
  const goals = input.goals.length ? goalTitles(input.goals).join(", ") : "SNS 포스트";
  const imageContext = logoImage
    ? "업로드한 로고를 상단 또는 하단 여백에 자연스럽게 배치한다."
    : "브랜드 로고가 들어갈 여백을 남긴다.";
  const referenceContext = uploadedImages.length
    ? `참고 이미지 ${uploadedImages.length}장을 제품, 공간, 질감, 조명 방향의 기준으로 사용한다.`
    : "제품 또는 공간 사진이 없다면 고급 호텔/로컬 브랜드 홍보 사진을 새로 구성한다.";
  const name = escapeHTML(input.name);
  const safeGoals = escapeHTML(goals);
  const type = escapeHTML(input.type);
  const mood = escapeHTML(input.mood);
  const audience = escapeHTML(input.audience);

  return `
    <p><strong>ChatGPT / Gemini 제작용 프롬프트</strong></p>
    <p>${name}의 ${safeGoals}용 프리미엄 마케팅 비주얼을 제작한다. ${type} 브랜드이며 분위기는 ${mood}. 주요 고객은 ${audience}. ${imageContext} ${referenceContext} 결과물은 실제 브랜드 캠페인에 쓸 수 있는 완성형 포스터 수준이어야 한다. 자연광, 부드러운 그림자, 고급스러운 여백, 선명한 제품/공간 사진, 세련된 영문 대형 타이포그래피와 간결한 한글 보조 문구를 사용한다. 로고는 왜곡하지 말고 브랜드 컬러와 어울리게 배치한다. 저가 템플릿 느낌, 과한 장식, 작은 박스형 목업, 읽기 어려운 글자는 피한다.</p>
    <div class="ai-handoff">
      <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">ChatGPT에서 만들기</a>
      <a href="https://gemini.google.com/" target="_blank" rel="noreferrer">Gemini에서 만들기</a>
    </div>
    <p><strong>수정 요청 예시</strong></p>
    ${renderList([
      "첨부한 포스터처럼 큰 영문 헤드라인, 실제 제품 사진, 자연광 그림자를 중심으로 다시 만들어줘.",
      "로고는 상단 중앙에 작고 고급스럽게 배치하고, 제품에는 작은 화이트 로고만 넣어줘.",
      "저가 템플릿 느낌을 줄이고 호텔 브랜드 광고처럼 여백과 조명을 더 고급스럽게 만들어줘.",
    ])}
  `;
}

function generateCopyBlocks(input) {
  const name = escapeHTML(input.name);
  const mood = escapeHTML(input.mood);

  return `
    <p><strong>객실/매장 안내문</strong><br>${name}을 찾아주셔서 감사합니다. 머무시는 동안 편안한 시간이 되도록 필요한 내용을 아래에 정리했습니다.</p>
    <p><strong>리뷰 요청 카드</strong><br>오늘의 경험이 마음에 드셨다면 짧은 리뷰를 남겨주세요. 다음에 오실 분들에게 큰 도움이 됩니다.</p>
    <p><strong>SNS 포스트 문구</strong><br>${mood}을 느낄 수 있는 ${name}. 잠시 쉬어가고 싶은 날, 이곳에서 만나요.</p>
    <p><strong>굿즈 문구</strong><br>좋은 시간은 오래 남습니다. ${name}</p>
  `;
}

function generateAll() {
  const input = getBrandInput();

  generateMockups(input);
  outputs.brandLanguage.innerHTML = generateBrandLanguage(input);
  outputs.promoIdeas.innerHTML = generatePromoIdeas(input);
  outputs.imagePrompt.innerHTML = generateImagePrompt(input);
  outputs.copyBlocks.innerHTML = generateCopyBlocks(input);

  Object.values(outputs).forEach((node) => node.classList.remove("empty"));
  showToast("브랜드 제안을 만들었습니다.");
}

function previewImages(files) {
  uploadedImages.forEach((image) => URL.revokeObjectURL(image.url));
  uploadedImages = [...files].map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }));

  previewGrid.innerHTML = uploadedImages
    .map(
      (image) => `
        <figure class="preview-item">
          <img src="${image.url}" alt="${escapeHTML(image.name)}" />
          <span>${escapeHTML(image.name)}</span>
        </figure>
      `,
    )
    .join("");
}

function previewLogo(file) {
  if (!file) {
    logoImage = null;
    logoPreview.className = "logo-preview empty";
    logoPreview.textContent = "LOGO";
    generateMockups(getBrandInput());
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    logoImage = {
      name: file.name,
      src: reader.result,
    };

    logoPreview.className = "logo-preview";
    logoPreview.innerHTML = `<img src="${logoImage.src}" alt="${escapeHTML(logoImage.name)}" />`;
    generateMockups(getBrandInput());
    showToast("로고를 시안에 적용했습니다.");
  });
  reader.addEventListener("error", () => {
    showToast("로고 파일을 읽지 못했습니다. 다른 이미지 파일로 다시 시도해주세요.");
  });
  reader.readAsDataURL(file);
}

function collectResultText() {
  const input = getBrandInput();
  return [
    `브랜딩메이트 결과 - ${input.name}`,
    "",
    "[선택 제작물]",
    categorySummary(input.goals).join(" / ") || "선택 없음",
    "",
    "[브랜드 언어]",
    outputs.brandLanguage.innerText,
    "",
    "[홍보물 / 굿즈 제안]",
    outputs.promoIdeas.innerText,
    "",
    "[포스트 이미지 프롬프트]",
    outputs.imagePrompt.innerText,
    "",
    "[바로 쓸 문구]",
    outputs.copyBlocks.innerText,
  ].join("\n");
}

document.querySelectorAll(".goal-card").forEach((card) => {
  card.addEventListener("click", () => card.classList.toggle("selected"));
});

stepLinks.forEach((link) => {
  link.addEventListener("click", () => {
    updateStep(Number(link.dataset.stepTarget));
  });
});

logoInput.addEventListener("change", (event) => {
  previewLogo(event.target.files[0]);
});

imageInput.addEventListener("change", (event) => {
  previewImages(event.target.files);
});

prevButton.addEventListener("click", () => updateStep(currentStep - 1));

nextButton.addEventListener("click", () => {
  if (currentStep === 2) {
    generateAll();
  }
  updateStep(currentStep + 1);
});

generateButton.addEventListener("click", generateAll);
refreshMockupsButton.addEventListener("click", () => generateMockups(getBrandInput()));

copyButton.addEventListener("click", async () => {
  if (outputs.brandLanguage.classList.contains("empty")) {
    generateAll();
  }

  try {
    await navigator.clipboard.writeText(collectResultText());
    showToast("결과를 클립보드에 복사했습니다.");
  } catch {
    showToast("복사 권한이 없어 결과를 선택해서 복사해주세요.");
  }
});

resetButton.addEventListener("click", () => {
  Object.values(fields).forEach((field) => {
    if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else {
      field.value = "";
    }
  });

  document.querySelectorAll(".goal-card").forEach((card, index) => {
    card.classList.toggle("selected", ["sticker", "guide", "review", "poster", "social"].includes(card.dataset.layout));
  });

  uploadedImages.forEach((image) => URL.revokeObjectURL(image.url));
  logoImage = null;
  uploadedImages = [];
  logoInput.value = "";
  imageInput.value = "";
  previewGrid.innerHTML = "";
  mockupGrid.innerHTML = "";
  logoPreview.className = "logo-preview empty";
  logoPreview.textContent = "LOGO";

  outputs.brandLanguage.textContent = "결과 생성 전입니다.";
  outputs.promoIdeas.textContent = "선택한 제작물에 맞춰 정리됩니다.";
  outputs.imagePrompt.textContent = "이미지 생성 및 수정용 프롬프트가 표시됩니다.";
  outputs.copyBlocks.textContent = "안내문, 리뷰 요청, 이벤트 문구 초안을 만듭니다.";
  Object.values(outputs).forEach((node) => node.classList.add("empty"));

  updateStep(0);
  showToast("초기화했습니다.");
});

updateStep(0);
