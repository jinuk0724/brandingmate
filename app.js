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
  return [...document.querySelectorAll(".goal-card.selected")].map((card) =>
    card.querySelector("strong").textContent.trim(),
  );
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

function generateMockups(input) {
  const name = escapeHTML(input.name);
  const mood = escapeHTML(input.mood);
  const strengths = escapeHTML(input.strengths);
  const goals = input.goals.length ? input.goals : ["리뷰 요청 카드", "SNS 포스트", "굿즈"];
  const logo = logoMarkup();

  const mockups = [
    {
      type: "Review card",
      title: "리뷰 요청 카드",
      body: "오늘의 시간이 좋았다면 짧은 리뷰를 남겨주세요.",
      className: "review",
    },
    {
      type: "Room guide",
      title: goals.includes("객실 안내문") ? "객실 안내문" : "매장 안내문",
      body: `${input.name}을 찾아주셔서 감사합니다. 편안한 이용을 위해 안내드립니다.`,
      className: "guide",
    },
    {
      type: "Sticker",
      title: "굿즈 스티커",
      body: "좋은 시간은 오래 남습니다.",
      className: "sticker",
    },
    {
      type: "Social post",
      title: "SNS 포스트",
      body: `${input.mood}을 느낄 수 있는 ${input.name}.`,
      className: "social",
    },
    {
      type: "Event banner",
      title: "리뷰 이벤트",
      body: "리뷰 인증 시 다음 방문 혜택을 드립니다.",
      className: "banner",
    },
    {
      type: "Package tag",
      title: "패키지 태그",
      body: strengths,
      className: "tag",
    },
  ];

  mockupGrid.innerHTML = mockups
    .map(
      (mockup) => `
        <article class="mockup-card ${mockup.className}">
          <div class="mockup-logo-slot">${logo}</div>
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

  const goalIdeas = input.goals.map((goal) => `${goal}: ${input.name}의 강점 "${input.strengths}"을 중심 메시지로 사용`);

  return `
    <p><strong>시각 기준</strong><br>${imageNote}</p>
    <p><strong>추천 제작물</strong></p>
    ${renderList([...goalIdeas, ...baseIdeas].slice(0, 10))}
  `;
}

function generateImagePrompt(input) {
  const goals = input.goals.length ? input.goals.join(", ") : "SNS 포스트";
  const imageContext = logoImage
    ? "업로드한 로고를 상단 또는 하단 여백에 자연스럽게 배치한다."
    : "브랜드 로고가 들어갈 여백을 남긴다.";
  const name = escapeHTML(input.name);
  const safeGoals = escapeHTML(goals);
  const type = escapeHTML(input.type);
  const mood = escapeHTML(input.mood);
  const audience = escapeHTML(input.audience);

  return `
    <p><strong>이미지 생성 프롬프트</strong></p>
    <p>${name}의 ${safeGoals}용 마케팅 이미지. ${type} 브랜드이며 분위기는 ${mood}. 주요 고객은 ${audience}. ${imageContext} 따뜻하지만 과하지 않은 상업용 디자인, 읽기 쉬운 한글 타이포그래피 영역, 실제 홍보물로 사용할 수 있는 균형 잡힌 레이아웃.</p>
    <p><strong>수정 요청 예시</strong></p>
    ${renderList([
      "로고가 들어갈 상단 여백을 더 넓혀줘.",
      "리뷰 이벤트 문구가 잘 보이도록 대비를 높여줘.",
      "객실 안내문 느낌으로 더 차분하고 정돈되게 바꿔줘.",
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
    input.goals.join(", ") || "선택 없음",
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
    card.classList.toggle("selected", [0, 1, 2, 3].includes(index));
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
