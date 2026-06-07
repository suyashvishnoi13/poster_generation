import { signup, login, googleAuth, logout, auth } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  const API_BASE_URL = "http://127.0.0.1:5001";

  // ── DOM REFS ──
  const landingPage   = document.getElementById("landingPage");
  const studioModal   = document.getElementById("studioModal");
  const loginModal    = document.getElementById("loginModal");
  const signupModal   = document.getElementById("signupModal");
  const feed          = document.getElementById("chatMessages");
  const welcomeState  = document.getElementById("welcomeState");
  const canvasStatus  = document.getElementById("canvasStatus");
  const fileInput     = document.getElementById("imageUploadInput");
  let uploadedFile    = null;
  

  // ── AUTH STATE ──
  onAuthStateChanged(auth, (user) => {
    const btn = document.getElementById("desiDescribeBtn");
    if (btn) btn.textContent = user ? "Enter Studio →" : "Launch Studio →";
  });

  // ── AUTH MODALS ──
  window.openLogin = () => {
    signupModal.classList.remove("active");
    loginModal.classList.add("active");
  };
  window.closeLogin  = () => loginModal.classList.remove("active");
  window.openSignup  = () => {
    loginModal.classList.remove("active");
    signupModal.classList.add("active");
  };
  window.closeSignup = () => signupModal.classList.remove("active");

  window.signupUser = async () => {
    const name  = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const pass  = document.getElementById("signupPassword").value;
    if (!name || !email || !pass) return alert("Please fill all fields.");
    try {
      await signup(name, email, pass);
      window.closeSignup();
      openStudio();
    } catch (err) { alert("Signup error: " + err.message); }
  };

  window.loginUser = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const pass  = document.getElementById("loginPassword").value;
    if (!email || !pass) return alert("Enter email and password.");
    try {
      await login(email, pass);
      window.closeLogin();
      openStudio();
    } catch (err) { alert("Login error: " + err.message); }
  };

  window.googleLogin = async () => {
    try {
      await googleAuth();
      window.closeLogin();
      window.closeSignup();
      openStudio();
    } catch (err) { alert("Google login error: " + err.message); }
  };

  window.handleLogout = async () => {
    try {
      await logout();
      studioModal.classList.remove("active");
      landingPage.style.display = "";
    } catch (err) { alert("Logout error: " + err.message); }
  };

  // ── OPEN / CLOSE STUDIO ──
  function openStudio() {
    landingPage.style.display = "none";
    studioModal.classList.add("active");
  }

  function handleLaunch() {
    if (!auth.currentUser) {
      window.openLogin();
    } else {
      openStudio();
    }
  }

  document.getElementById("desiDescribeBtn")?.addEventListener("click", handleLaunch);
  document.getElementById("heroLaunchBtn")?.addEventListener("click", handleLaunch);
  document.getElementById("closeStudio")?.addEventListener("click", () => {
    studioModal.classList.remove("active");
    landingPage.style.display = "";
  });

  // ── FORMAT TOGGLE ──
  document.querySelectorAll(".fmt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fmt-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("posterFormat").value = btn.dataset.value;
    });
  });

  // ── UPLOAD TRIGGER ──
  document.getElementById("uploadTrigger")?.addEventListener("click", () => {
    fileInput?.click();
  });

  // ── STATUS CHIP ──
  function setStatus(state) {
    canvasStatus.className = "status-chip " + state;
    canvasStatus.textContent = state === "idle" ? "Idle" : state === "working" ? "Generating…" : "Done";
  }

  // ── HIDE WELCOME STATE ──
  function hideWelcome() {
    if (welcomeState) welcomeState.style.display = "none";
  }

  // ── ADD MESSAGE ──
  function addMessage(content, type = "bot", isImage = false, slogan = "") {
    hideWelcome();

    if (isImage) {
      const card = document.createElement("div");
      card.className = "output-card";

      const img = document.createElement("img");
      img.src = content;
      img.style.cssText = "width:100%;display:block;border-radius:10px 10px 0 0;";
      img.onload = () => { feed.scrollTop = feed.scrollHeight; };

      const footer = document.createElement("div");
      footer.className = "output-card-footer";

      const sloganEl = document.createElement("span");
      sloganEl.className = "output-slogan";
      sloganEl.textContent = slogan ? `"${slogan}"` : "";

      // BUG FIX 2: Convert base64 to Blob URL so download works in all browsers
      const dl = document.createElement("a");
      dl.className = "download-link";
      dl.innerHTML = '<i class="fa-solid fa-download"></i> Download';
      dl.style.cursor = "pointer";
      dl.addEventListener("click", () => {
        const byteStr   = atob(content.split(",")[1]);
        const arr       = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
        const blob      = new Blob([arr], { type: "image/jpeg" });
        const blobUrl   = URL.createObjectURL(blob);
        const tmp       = document.createElement("a");
        tmp.href        = blobUrl;
        tmp.download    = `DesiScribe_${Date.now()}.jpg`;
        tmp.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      });

      footer.appendChild(sloganEl);
      footer.appendChild(dl);
      card.appendChild(img);
      card.appendChild(footer);
      feed.appendChild(card);
    } else {
      const row = document.createElement("div");
      row.className = `feed-msg ${type}`;

      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.innerHTML = type === "bot"
        ? '<i class="fa-solid fa-wand-magic-sparkles"></i>'
        : '<i class="fa-solid fa-user"></i>';

      const bubble = document.createElement("div");
      bubble.className = "msg-bubble";
      bubble.textContent = content;

      row.appendChild(avatar);
      row.appendChild(bubble);
      feed.appendChild(row);
    }

    feed.scrollTop = feed.scrollHeight;
  }

  // ── GET FORM DATA ──
  function getFormData() {
    const business = document.getElementById("businessType")?.value.trim();
    const desc     = document.getElementById("productDesc")?.value.trim();
    const adType   = document.getElementById("adType")?.value || "Catchy";
    const format   = document.getElementById("posterFormat")?.value || "Square";
    const lang     = document.getElementById("languageSelect")?.value || "English";

    if (!business || !desc) {
      alert("Please fill in Business Name and Product / Offer fields.");
      return null;
    }
    return { business_type: business, ad_type: adType, product_description: desc, language: lang, format };
  }

  // ── IMAGE UPLOAD ──
  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadedFile = file;
    const toggleContainer = document.getElementById("useImageToggleContainer");
    if (toggleContainer) toggleContainer.style.display = "flex";

    addMessage("Analysing your product photo…", "user");
    setStatus("working");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res    = await fetch(`${API_BASE_URL}/analyze-image`, { method: "POST", body: formData });
      const result = await res.json();

      if (result.status === "success") {
        document.getElementById("businessType").value = result.business_type || "";
        document.getElementById("productDesc").value  = result.description   || "";
        addMessage(`Got it! I see: "${result.description}". Form auto-filled — adjust anything and generate!`, "bot");
      } else {
        addMessage("Could not analyse image: " + result.error, "bot");
      }
    } catch (err) {
      addMessage("Network error during image analysis. Is the backend running?", "bot");
    }

    setStatus("idle");
    fileInput.value = "";
  });

  // ── SPEECH TO TEXT ──
  const micBtn = document.getElementById("micBtn");
  const productDesc = document.getElementById("productDesc");
  if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    recognition.onstart = () => {
      micBtn.style.color = "red";
    };
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      productDesc.value = productDesc.value ? productDesc.value + " " + text : text;
    };
    
    recognition.onend = () => {
      micBtn.style.color = "";
    };
    
    micBtn.addEventListener("click", () => {
      recognition.start();
    });
  } else if (micBtn) {
    micBtn.addEventListener("click", () => {
      alert("Speech recognition is not supported in your browser.");
    });
  }

  // ── SLOGAN ──
  const sloganBtn = document.getElementById("generateSloganBtn");
  sloganBtn?.addEventListener("click", async () => {
    const data = getFormData();
    if (!data) return;

    addMessage(`Writing a ${data.ad_type} slogan in ${data.language}…`, "user");
    setStatus("working");
    sloganBtn.disabled = true;
    sloganBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Writing…';

    try {
      const res    = await fetch(`${API_BASE_URL}/generate-slogan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.status === "success") {
        addMessage(`✦ ${result.slogan}`, "bot");
        setStatus("done");
      } else {
        addMessage("Error: " + result.error, "bot");
        setStatus("idle");
      }
    } catch (err) {
      addMessage("Network error. Is the backend running on port 5001?", "bot");
      setStatus("idle");
    }

    sloganBtn.disabled = false;
    sloganBtn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> Generate Slogan';
  });

  // ── POSTER ──
const posterBtn = document.getElementById("generatePosterBtn");

posterBtn?.addEventListener("click", async () => {
  const data = getFormData();
  if (!data) return;

  addMessage(`Generating ${data.format} poster in ${data.language}…`, "user");
  setStatus("working");
  posterBtn.disabled = true;
  posterBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

  const useToggle = document.getElementById("useUploadedImageToggle");
  const useUploaded = useToggle && useToggle.checked && uploadedFile !== null;

  const logoFile = document.getElementById("logoInput")?.files[0];
  const logoPosition = document.getElementById("logoPosition")?.value;

  // 🔥 ALWAYS use FormData now (supports logo + image)
  const formData = new FormData();

  // Add basic data
  Object.keys(data).forEach(key => formData.append(key, data[key]));

  // Add image if used
  if (useUploaded) {
    formData.append("use_uploaded_image", "true");
    formData.append("image", uploadedFile);
  } else {
    formData.append("use_uploaded_image", "false");
  }

  // 🔥 Add logo if present
  if (logoFile) {
    formData.append("logo", logoFile);
  }
  
  if (logoPosition) {
    formData.append("logo_position", logoPosition);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/generate-poster`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (result.status === "success") {
      addMessage(result.image_url, "bot", true, result.slogan);
      setStatus("done");
    } else {
      addMessage("Error: " + (result.error || "Unknown"), "bot");
      setStatus("idle");
    }

  } catch (err) {
    addMessage("Network error. Is the backend running on port 5001?", "bot");
    setStatus("idle");
  }

  posterBtn.disabled = false;
  posterBtn.innerHTML = '<i class="fa-solid fa-clapperboard"></i> Generate Poster';
});
});
