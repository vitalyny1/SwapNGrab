(() => {
"use strict";

// Supabase browser credentials: the publishable key is intended for public frontend use.
// Database access is protected by the Row Level Security policies installed in Supabase.
const SUPABASE_URL = "https://hnhnfcmyzoupssrwdqzl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KmJwunh56Y6vIpcP1LFhNg_QJgDehiG";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const el = id => document.getElementById(id);
const trim = id => el(id).value.trim();
const words = s => (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 1);
const overlaps = (a, b) => {
  const set = new Set(words(b));
  return words(a).some(x => set.has(x));
};
const typeName = t => ({
  item: "Things",
  service_skill: "Services & Skills",
  space: "Rooms & Space"
}[t] || "Things");
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
let currentUser = null;
let currentListings = [];
let locationCenter = null;

async function geocode(q) {
  const zip = q.match(/^\d{5}$/);
  if (zip) {
    const response = await fetch("https://api.zippopotam.us/us/" + zip[0]);
    if (!response.ok) throw new Error("ZIP code not found.");
    const place = (await response.json()).places?.[0];
    if (!place) throw new Error("ZIP code not found.");
    return {lat:+place.latitude, lon:+place.longitude, city:place["place name"], region:place["state abbreviation"], label:place["place name"]+", "+place["state abbreviation"], postal_code:zip[0]};
  }
  const parts = q.split(",");
  const response = await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(parts[0].trim())+"&count=10&language=en&format=json");
  if (!response.ok) throw new Error("Could not look up that location.");
  const hits = ((await response.json()).results || []).filter(x => x.country_code === "US");
  if (!hits.length) throw new Error("City not found. Try a US city or ZIP code.");
  const state = parts[1]?.trim().toLowerCase();
  const place = (state && hits.find(x => (x.admin1 || "").toLowerCase().includes(state))) || hits[0];
  return {lat:place.latitude, lon:place.longitude, city:place.name, region:place.admin1 || "", label:place.name+(place.admin1?", "+place.admin1:""), postal_code:""};
}
const miles = (a,b) => {
  const rad=n=>n*Math.PI/180, dLat=rad(b.lat-a.lat), dLon=rad(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
};

function listingCard(item) {
  const imagePath = item.listing_images?.[0]?.storage_path;
  const imageUrl = imagePath ? supabase.storage.from("listing-photos").getPublicUrl(imagePath).data.publicUrl : "";
  const owner = item.profiles?.display_name || item.profiles?.username || "SwapNGrab member";
  const location = [item.city,item.region].filter(Boolean).join(", ") || "Location not provided";
  const image = imageUrl
    ? '<img class="listing-photo" src="'+escapeHTML(imageUrl)+'" alt="">'
    : '<div class="thumb" aria-hidden="true">↻</div>';
  return '<article class="listing">'+image+'<div class="listing-content">'+
    '<h3>'+escapeHTML(item.title)+'</h3>'+
    '<span class="category-tag">'+escapeHTML(typeName(item.listing_type))+'</span>'+
    '<p><b>Have / Offer:</b> '+escapeHTML(item.have_text)+'</p>'+
    '<p><b>Want:</b> '+escapeHTML(item.want_text || "Open to any offer")+'</p>'+
    '<div class="meta">⌖ '+escapeHTML(location)+' · Posted by '+escapeHTML(owner)+'</div>'+
    '</div></article>';
}

async function loadListings() {
  const list = el("matchList");
  list.innerHTML = '<p class="empty-state">Loading offers…</p>';
  let result = await supabase.from("listings")
    .select("*, listing_images(storage_path), profiles(display_name,username)")
    .eq("status","active")
    .order("created_at",{ascending:false});
  // Fallback keeps browsing functional if the related profile/photo view is not yet cached.
  if (result.error) {
    result = await supabase.from("listings").select("*").eq("status","active").order("created_at",{ascending:false});
  }
  if (result.error) {
    list.innerHTML = '<p class="empty-state">Could not load offers: '+escapeHTML(result.error.message)+'</p>';
    el("matchCount").textContent = "Unavailable";
    return;
  }
  currentListings = result.data || [];
  renderListings(false);
}

function renderListings(applySearch) {
  const want = trim("wantInput");
  const have = trim("haveInput");
  const category = el("categoryInput").value;
  const radius = Number(el("distanceInput").value);
  let list = currentListings.filter(item => {
    if (category !== "all" && item.listing_type !== category) return false;
    if (locationCenter && item.latitude != null && item.longitude != null &&
        miles(locationCenter,{lat:item.latitude,lon:item.longitude}) > radius) return false;
    if (locationCenter && (item.latitude == null || item.longitude == null)) return false;
    if (applySearch && want && !overlaps(want,[item.title,item.have_text,(item.keywords||[]).join(" ")].join(" "))) return false;
    if (applySearch && have && item.want_text && !overlaps(have,item.want_text)) return false;
    return true;
  });
  if (locationCenter) {
    list.sort((a,b)=>miles(locationCenter,{lat:a.latitude,lon:a.longitude})-miles(locationCenter,{lat:b.latitude,lon:b.longitude}));
  }
  el("matchList").innerHTML = list.length
    ? list.map(listingCard).join("")
    : '<p class="empty-state">No offers found. Try a larger distance, ALL categories, or different search words.</p>';
  el("matchCount").textContent = list.length+" offer"+(list.length===1?"":"s");
  const categoryText = category==="all" ? "All categories" : typeName(category);
  const locationText = locationCenter ? " · within "+radius+" miles of "+locationCenter.label : "";
  el("matchCaption").textContent = categoryText+locationText+(applySearch?" · reciprocal matches":" · newest first");
}

async function findMatches() {
  const button = el("findMatches");
  button.disabled = true;
  try {
    const location = trim("locationInput");
    locationCenter = location ? await geocode(location) : null;
    renderListings(true);
  } catch (error) {
    el("matchList").innerHTML = '<p class="empty-state">'+escapeHTML(error.message)+'</p>';
    el("matchCount").textContent = "0 offers";
  } finally {
    button.disabled = false;
  }
}

const categoryPicker=el("categoryPicker");
const categoryToggle=el("categoryPickerToggle");
const categoryMenu=el("categoryPickerMenu");
const categoryLabel=el("categoryPickerLabel");
categoryToggle.addEventListener("click",()=>{
  const open=categoryMenu.hidden;
  categoryMenu.hidden=!open;
  categoryToggle.setAttribute("aria-expanded",String(open));
});
categoryMenu.addEventListener("click",event=>{
  const option=event.target.closest("[data-value]");
  if(!option)return;
  el("categoryInput").value=option.dataset.value;
  categoryLabel.textContent=option.querySelector("strong").textContent+" — "+option.querySelector("span").textContent;
  categoryMenu.querySelectorAll(".category-option").forEach(item=>{
    const selected=item===option;
    item.classList.toggle("selected",selected);
    item.setAttribute("aria-selected",String(selected));
  });
  categoryMenu.hidden=true;
  categoryToggle.setAttribute("aria-expanded","false");
  renderListings(false);
});
document.addEventListener("click",event=>{
  if(!categoryPicker.contains(event.target)){
    categoryMenu.hidden=true;
    categoryToggle.setAttribute("aria-expanded","false");
  }
});
categoryPicker.addEventListener("keydown",event=>{
  if(event.key==="Escape"){categoryMenu.hidden=true;categoryToggle.setAttribute("aria-expanded","false");categoryToggle.focus();}
});
el("findMatches").addEventListener("click",findMatches);
["wantInput","haveInput"].forEach(id=>el(id).addEventListener("keydown",event=>{if(event.key==="Enter")findMatches();}));
el("locationInput").addEventListener("keydown",event=>{if(event.key==="Enter")findMatches();});

function setAuthMode(signup) {
  el("authTitle").textContent = signup ? "Create your SwapNGrab account" : "Log in to SwapNGrab";
  el("authIntro").textContent = signup ? "Create a free account to post and manage offers." : "Sign in to manage your offers.";
  el("displayNameWrap").hidden = !signup;
  el("authDisplayName").required = signup;
  el("authPassword").autocomplete = signup ? "new-password" : "current-password";
  el("authSubmit").textContent = signup ? "Create account" : "Log in";
  el("authModeToggle").textContent = signup ? "Already have an account? Log in" : "Create a new account";
  el("authMessage").textContent = "";
  el("authForm").dataset.mode = signup ? "signup" : "login";
}
function updateAccountUI() {
  const label = currentUser ? "Log out" : "Log in / Create account";
  document.querySelectorAll("[data-login]").forEach(button=>button.textContent=label);
  el("accountPrompt").textContent = currentUser
    ? "Signed in as " + (currentUser.email || "SwapNGrab member")
    : "Want to save your offers and manage your matches?";
  el("postOfferButton").textContent = currentUser ? "Post my offer" : "Log in to post offer";
  el("postNote").textContent = currentUser
    ? "You are signed in. Your offer will be published after you submit it."
    : "Create an account or log in to post an offer.";
  el("postMessage").textContent = currentUser
    ? "You are signed in. Your offer will be published after you submit it."
    : "Create an account or log in to post an offer.";
}
function openAuth() {
  setAuthMode(false);
  el("loginDialog").showModal();
}
document.querySelectorAll("[data-login]").forEach(button=>button.addEventListener("click",async()=>{
  if(currentUser){
    await supabase.auth.signOut();
  } else openAuth();
}));
el("closeAuth").addEventListener("click",()=>el("loginDialog").close());
el("authModeToggle").addEventListener("click",()=>setAuthMode(el("authForm").dataset.mode!=="signup"));
el("authForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const signup=el("authForm").dataset.mode==="signup";
  const email=trim("authEmail");
  const password=el("authPassword").value;
  const submit=el("authSubmit");
  submit.disabled=true;
  el("authMessage").textContent=signup?"Creating account…":"Signing in…";
  try {
    const response=signup
      ? await supabase.auth.signUp({email,password,options:{data:{display_name:trim("authDisplayName")},emailRedirectTo:"https://vitalyny1.github.io/SwapNGrab/"}})
      : await supabase.auth.signInWithPassword({email,password});
    if(response.error) throw response.error;
    if(signup && !response.data.session) {
      el("authMessage").textContent="Account created. Check your email for the confirmation link, then log in.";
    } else {
      el("authMessage").textContent="You are signed in.";
      el("loginDialog").close();
    }
  } catch(error) {
    el("authMessage").textContent=error.message || "Could not complete sign-in.";
  } finally { submit.disabled=false; }
});

async function postOffer() {
  if(!currentUser){openAuth();return;}
  const title=trim("postTitle"),have=trim("postHave"),want=trim("postWant"),location=trim("postLocation");
  if(!title||!have){el("postMessage").textContent="Please enter an offer title and what you have or can offer.";return;}
  const button=el("postOfferButton");
  button.disabled=true;
  el("postMessage").textContent="Saving your offer…";
  try {
    let place=null;
    if(location){try{place=await geocode(location);}catch(_){place={city:location,region:"",postal_code:"",lat:null,lon:null};}}
    const payload={
      owner_id:currentUser.id,
      title,
      listing_type:el("postType").value,
      have_text:have,
      want_text:want || null,
      city:place?.city || null,
      region:place?.region || null,
      postal_code:place?.postal_code || (/^\d{5}$/.test(location)?location:null),
      latitude:place?.lat ?? null,
      longitude:place?.lon ?? null,
      status:"active"
    };
    const {data,error}=await supabase.from("listings").insert(payload).select("id").single();
    if(error)throw error;
    const files=Array.from(el("postPhotos").files || []);
    for(const file of files){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type))continue;
      if(file.size>5*1024*1024)continue;
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const path=currentUser.id+"/"+data.id+"/"+crypto.randomUUID()+"-"+safeName;
      const upload=await supabase.storage.from("listing-photos").upload(path,file,{contentType:file.type,upsert:false});
      if(upload.error)throw upload.error;
      const imageRow=await supabase.from("listing_images").insert({listing_id:data.id,owner_id:currentUser.id,storage_path:path});
      if(imageRow.error)throw imageRow.error;
    }
    ["postTitle","postHave","postWant","postLocation"].forEach(id=>el(id).value="");
    el("postPhotos").value="";
    el("postMessage").textContent="Your offer is now posted.";
    await loadListings();
  } catch(error) {
    el("postMessage").textContent="Could not post offer: "+(error.message || "Please try again.");
  } finally {button.disabled=false;}
}
el("postOfferButton").addEventListener("click",postOffer);

supabase.auth.onAuthStateChange((_event,session)=>{
  currentUser=session?.user || null;
  updateAccountUI();
});
(async()=>{
  const {data}=await supabase.auth.getSession();
  currentUser=data.session?.user || null;
  updateAccountUI();
  await loadListings();
})();
})();