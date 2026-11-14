(() => {
  const offers = [
    {title:"Vintage film camera",emoji:"📷",tag:"ELECTRONICS",have:"35mm camera with lens, in good working condition.",want:"Acoustic guitar, vinyl records, or similar.",location:"Queens, NY"},
    {title:"Cordless power tool set",emoji:"🛠️",tag:"TOOLS",have:"Cordless drill, impact driver and two batteries.",want:"Table saw or other woodworking tools.",location:"Brooklyn, NY"},
    {title:"Mountain bike",emoji:"🚲",tag:"SPORTS & OUTDOORS",have:"Adult mountain bike, recently tuned up.",want:"Laptop, camera equipment, or make an offer.",location:"Long Island, NY"},
    {title:"Vinyl record collection",emoji:"💿",tag:"MUSIC",have:"Classic rock and jazz records, assorted collection.",want:"Vintage stereo receiver or turntable.",location:"New Jersey"},
    {title:"Solid wood coffee table",emoji:"🪵",tag:"HOME",have:"Handmade oak coffee table, very good condition.",want:"Bookshelf, floor lamp, or houseplants.",location:"Westchester, NY"},
    {title:"Board game collection",emoji:"🎲",tag:"GAMES & HOBBIES",have:"Strategy and family games, several out of print.",want:"LEGO sets, model trains, or puzzles.",location:"Connecticut"},
    {title:"Digital piano keyboard",emoji:"🎹",tag:"MUSIC",have:"88-key digital keyboard with stand.",want:"Electric guitar or audio recording gear.",location:"Manhattan, NY"},
    {title:"Camping equipment",emoji:"⛺",tag:"SPORTS & OUTDOORS",have:"Two-person tent, sleeping bags and camp stove.",want:"Fishing gear or folding kayak.",location:"New York, NY"},
    {title:"Vintage comic books",emoji:"📚",tag:"COLLECTIBLES",have:"Marvel and DC comics, assorted years.",want:"Silver coins, gold coins, or coin collection.",location:"Queens, NY"}
  ];
  const grid = document.getElementById("offerGrid");
  const search = document.getElementById("searchInput");
  const resultLabel = document.getElementById("resultLabel");
  let showAll = false;
  const card = item => `<article class="offer-card"><div class="offer-top"><span class="offer-tag">${item.tag}</span><span class="offer-emoji">${item.emoji}</span></div><h3>${item.title}</h3><p><b>Have:</b> ${item.have}</p><p><b>Want:</b> ${item.want}</p><div class="offer-location">⌖ &nbsp;${item.location} &nbsp;·&nbsp; Sample listing</div></article>`;
  function render() {
    const term = search.value.trim().toLowerCase();
    const matches = offers.filter(o => Object.values(o).join(" ").toLowerCase().includes(term));
    const visible = showAll || term ? matches : matches.slice(0,6);
    grid.innerHTML = visible.length ? visible.map(card).join("") : '<p>No offers match that search. Try a different keyword.</p>';
    resultLabel.textContent = term ? `${matches.length} sample offer${matches.length === 1 ? "" : "s"} found` : "A few things people are offering";
    document.getElementById("showAll").hidden = showAll || !!term || matches.length <= 6;
  }
  document.getElementById("searchForm").addEventListener("submit", e => {e.preventDefault();showAll=true;render();});
  document.getElementById("showAll").addEventListener("click", () => {showAll=true;render();});
  search.addEventListener("input", () => {showAll=false;render();});
  render();
  const dialog = document.getElementById("authDialog");
  document.querySelectorAll("[data-open-auth]").forEach(btn => btn.addEventListener("click", () => {
    const register = btn.dataset.openAuth === "register";
    document.getElementById("authTitle").textContent = register ? "Create your account" : "Welcome back";
    document.getElementById("authEyebrow").textContent = register ? "JOIN THE COMMUNITY" : "GOOD TO SEE YOU AGAIN";
    dialog.showModal();
  }));
  document.getElementById("authForm").addEventListener("submit", e => {e.preventDefault();dialog.close();});
  document.getElementById("menuToggle").addEventListener("click", () => document.querySelector(".main-nav").classList.toggle("open"));
  document.querySelectorAll(".main-nav a").forEach(a => a.addEventListener("click", () => document.querySelector(".main-nav").classList.remove("open")));
  document.getElementById("year").textContent = new Date().getFullYear();
})();