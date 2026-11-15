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
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
let currentUser = null;
let currentListings = [];
let myListings = [];
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

// Free semantic matching runs in the visitor's browser. The model is downloaded
// once and cached by the browser; no listing text is sent to an AI API.
let embeddingPipelinePromise = null;
const AI_MATCH_THRESHOLD = 0.32;
async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = (async () => {
      const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2");
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    })().catch(error => {
      embeddingPipelinePromise = null;
      throw error;
    });
  }
  return embeddingPipelinePromise;
}
async function getAiMatchScores(want, have, items) {
  const texts = [want || " ", have || " "];
  items.forEach(item => texts.push(item.have_text || " "));
  items.forEach(item => texts.push(item.want_text || "open to any offer"));
  const extractor = await getEmbeddingPipeline();
  const result = await extractor(texts, { pooling: "mean", normalize: true });
  const vectors = result.tolist();
  const dot = (a,b) => a.reduce((sum,value,index)=>sum+value*b[index],0);
  const scores = new Map();
  items.forEach((item,index) => {
    const wantScore = want ? dot(vectors[0],vectors[2+index]) : 1;
    const haveScore = have
      ? (item.want_text ? dot(vectors[1],vectors[2+items.length+index]) : 1)
      : 1;
    scores.set(item.id, want && have ? Math.min(wantScore,haveScore) : (want ? wantScore : haveScore));
  });
  return scores;
}



// Drag either divider to resize the four desktop panels.
(function enablePanelResizing(){
  const layout=el("fourPanelLayout");
  const vertical=el("verticalSplitter");
  const horizontal=el("horizontalSplitter");
  if(!layout||!vertical||!horizontal)return;
  function startDrag(handle,axis,event){
    if(event.button!==0 && event.pointerType!=="touch")return;
    event.preventDefault();
    const rect=layout.getBoundingClientRect();
    handle.setPointerCapture(event.pointerId);
    const move=moveEvent=>{
      if(axis==="x"){
        const pct=(moveEvent.clientX-rect.left)/rect.width*100;
        layout.style.setProperty("--left-pane",Math.max(22,Math.min(55,pct))+"%");
      }else{
        const pct=(moveEvent.clientY-rect.top)/rect.height*100;
        layout.style.setProperty("--top-pane",Math.max(30,Math.min(78,pct))+"%");
      }
    };
    const stop=()=>{
      handle.removeEventListener("pointermove",move);
      handle.removeEventListener("pointerup",stop);
      handle.removeEventListener("pointercancel",stop);
    };
    handle.addEventListener("pointermove",move);
    handle.addEventListener("pointerup",stop);
    handle.addEventListener("pointercancel",stop);
  }
  vertical.addEventListener("pointerdown",event=>startDrag(vertical,"x",event));
  horizontal.addEventListener("pointerdown",event=>startDrag(horizontal,"y",event));
  vertical.addEventListener("keydown",event=>{
    if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
    event.preventDefault();
    const current=parseFloat(getComputedStyle(layout).getPropertyValue("--left-pane"))||32;
    layout.style.setProperty("--left-pane",Math.max(22,Math.min(55,current+(event.key==="ArrowRight"?2:-2)))+"%");
  });
  horizontal.addEventListener("keydown",event=>{
    if(event.key!=="ArrowUp"&&event.key!=="ArrowDown")return;
    event.preventDefault();
    const current=parseFloat(getComputedStyle(layout).getPropertyValue("--top-pane"))||62;
    layout.style.setProperty("--top-pane",Math.max(30,Math.min(78,current+(event.key==="ArrowDown"?2:-2)))+"%");
  });
})();

function listingCard(item, showActions = false) {
  const imagePath = item.listing_images?.[0]?.storage_path;
  const imageUrl = imagePath ? supabase.storage.from("listing-photos").getPublicUrl(imagePath).data.publicUrl : "";
  const owner = item.profiles?.display_name || item.profiles?.username || "SwapNGrab member";
  const location = [item.city,item.region].filter(Boolean).join(", ") || "Location not provided";
  const image = imageUrl
    ? '<img class="listing-photo" src="'+escapeHTML(imageUrl)+'" alt="">'
    : '<div class="thumb" aria-hidden="true">↻</div>';
  return '<article class="listing">'+image+'<div class="listing-content">'+
    '<div class="offer-id">ID: '+escapeHTML(item.public_id || "ID pending")+'</div>'+
    '<p><b>Have / Offer:</b> '+escapeHTML(item.have_text)+'</p>'+
    '<p><b>Want:</b> '+escapeHTML(item.want_text || "Open to any offer")+'</p>'+
    '<div class="meta">⌖ '+escapeHTML(location)+' · Posted by '+escapeHTML(owner)+'</div>'+
    (showActions ? '<div class="offer-actions"><button type="button" class="plain-button" data-offer-action="edit" data-offer-id="'+escapeHTML(item.id)+'">EDIT</button> <button type="button" class="plain-button" data-offer-action="delete" data-offer-id="'+escapeHTML(item.id)+'">DELETE</button></div>' : '')+
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
  if (currentUser) {
    let own = await supabase.from("listings")
      .select("*, listing_images(storage_path), profiles(display_name,username)")
      .eq("owner_id",currentUser.id)
      .order("created_at",{ascending:false});
    if (own.error) {
      own = await supabase.from("listings").select("*").eq("owner_id",currentUser.id).order("created_at",{ascending:false});
    }
    myListings = own.data || [];
  } else {
    myListings = [];
  }
  renderMyOffers();
  renderListings(false);
}

function renderMyOffers() {
  const panel=el("myOffersPanel");
  panel.hidden=!currentUser;
  if(!currentUser)return;
  el("myOfferCount").textContent=myListings.length+" offer"+(myListings.length===1?"":"s");
  el("myOfferList").innerHTML=myListings.length
    ? myListings.map(item=>listingCard(item,true)).join("")
    : '<p class="empty-state">You have not posted any offers yet.</p>';
}

function renderListings(applySearch, aiScores = null, matchMode = "") {
  const want = trim("wantInput");
  const have = trim("haveInput");
  const radius = Number(el("distanceInput").value);
  let list = currentListings.filter(item => {
    if (currentUser && item.owner_id === currentUser.id) return false;
    // Keep offers with unknown locations in the results; distance can only
    // exclude listings when their coordinates are known.
    if (locationCenter && item.latitude != null && item.longitude != null &&
        miles(locationCenter,{lat:item.latitude,lon:item.longitude}) > radius) return false;
    if (applySearch && aiScores) {
      if ((aiScores.get(item.id) ?? -1) < AI_MATCH_THRESHOLD) return false;
    } else {
      if (applySearch && want && !overlaps(want,[item.have_text,(item.keywords||[]).join(" ")].join(" "))) return false;
      if (applySearch && have && item.want_text && !overlaps(have,item.want_text)) return false;
    }
    return true;
  });
  const distanceFor = item => locationCenter && item.latitude != null && item.longitude != null
    ? miles(locationCenter,{lat:item.latitude,lon:item.longitude})
    : Infinity;
  if (aiScores) {
    list.sort((a,b)=>(aiScores.get(b.id)||0)-(aiScores.get(a.id)||0) || distanceFor(a)-distanceFor(b));
  } else if (locationCenter) {
    list.sort((a,b)=>distanceFor(a)-distanceFor(b));
  }
  el("matchList").innerHTML = list.length
    ? list.map(listingCard).join("")
    : '<p class="empty-state">No offers found. Try a larger distance, ALL categories, or different search words.</p>';
  el("matchCount").textContent = list.length+" offer"+(list.length===1?"":"s");
  const locationText = locationCenter ? " · within "+radius+" miles of "+locationCenter.label : "";
  el("matchCaption").textContent = (locationText ? locationText.slice(3) : "All offers")+
    (applySearch ? (matchMode==="ai" ? " · AI semantic matches" : matchMode==="fallback" ? " · keyword matches (AI unavailable)" : " · reciprocal matches") : " · newest first");
}

async function findMatches() {
  const button = el("findMatches");
  button.disabled = true;
  try {
    const location = trim("locationInput");
    const want = trim("wantInput");
    const have = trim("haveInput");
    locationCenter = location ? await geocode(location) : null;
    if (want || have) {
      el("matchCaption").textContent = "Loading free AI matching model…";
      try {
        const candidates = currentListings.filter(item => !currentUser || item.owner_id !== currentUser.id);
        const aiScores = await getAiMatchScores(want,have,candidates);
        renderListings(true,aiScores,"ai");
      } catch (aiError) {
        console.warn("AI matching unavailable; using keyword matching.",aiError);
        renderListings(true,null,"fallback");
      }
    } else {
      renderListings(true);
    }
  } catch (error) {
    el("matchList").innerHTML = '<p class="empty-state">'+escapeHTML(error.message)+'</p>';
    el("matchCount").textContent = "0 offers";
  } finally {
    button.disabled = false;
  }
}

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
  el("postOfferButton").disabled = false;
  el("postOfferButton").textContent = currentUser ? "Post my offer" : "Log in to post offer";
  el("postNote").textContent = currentUser
    ? "You are signed in. Your offer will be published after you submit it."
    : "Create an account or log in to post an offer.";
  el("postNote").textContent = currentUser
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
      currentUser = response.data.user || response.data.session?.user || null;
      updateAccountUI();
      el("authMessage").textContent="You are signed in.";
      el("loginDialog").close();
    }
  } catch(error) {
    el("authMessage").textContent=error.message || "Could not complete sign-in.";
  } finally { submit.disabled=false; }
});


async function editMyOffer(id) {
  const item = myListings.find(listing=>listing.id===id);
  if(!item)return;
  const have=window.prompt("I HAVE / I OFFER:",item.have_text || "");
  if(have===null)return;
  if(!have.trim()){window.alert("Please describe what you have or can offer.");return;}
  const want=window.prompt("I WANT (leave blank if open to any offer):",item.want_text || "");
  if(want===null)return;
  const oldLocation=[item.city,item.region].filter(Boolean).join(", ") || item.postal_code || "";
  const location=window.prompt("LOCATION (city or ZIP code):",oldLocation);
  if(location===null)return;
  const button=el("myOfferList").querySelector('[data-offer-id="'+CSS.escape(id)+'"][data-offer-action="edit"]');
  if(button)button.disabled=true;
  try {
    let place=null;
    if(location.trim()!==oldLocation) {
      if(location.trim()) {
        try { place=await geocode(location.trim()); }
        catch(_) { place={city:location.trim(),region:"",postal_code:/^\d{5}$/.test(location.trim())?location.trim():"",lat:null,lon:null}; }
      } else {
        place={city:null,region:null,postal_code:null,lat:null,lon:null};
      }
    }
    const changes={
      have_text:have.trim(),
      want_text:want.trim() || null
    };
    if(place) {
      Object.assign(changes,{
        city:place.city || null,
        region:place.region || null,
        postal_code:place.postal_code || null,
        latitude:place.lat ?? null,
        longitude:place.lon ?? null
      });
    }
    const {error}=await supabase.from("listings").update(changes).eq("id",id).eq("owner_id",currentUser.id);
    if(error)throw error;
    el("postNote").textContent="Your offer has been updated.";
    await loadListings();
  } catch(error) {
    window.alert("Could not update offer: "+(error.message || "Please try again."));
    if(button)button.disabled=false;
  }
}

async function deleteMyOffer(id) {
  const item=myListings.find(listing=>listing.id===id);
  if(!item)return;
  if(!window.confirm("Delete this offer? This cannot be undone."))return;
  const button=el("myOfferList").querySelector('[data-offer-id="'+CSS.escape(id)+'"][data-offer-action="delete"]');
  if(button)button.disabled=true;
  try {
    const {error}=await supabase.from("listings").delete().eq("id",id).eq("owner_id",currentUser.id);
    if(error)throw error;
    const paths=(item.listing_images || []).map(photo=>photo.storage_path).filter(Boolean);
    if(paths.length) {
      const cleanup=await supabase.storage.from("listing-photos").remove(paths);
      if(cleanup.error)console.warn("Offer deleted, but photo cleanup failed:",cleanup.error);
    }
    el("postNote").textContent="Your offer has been deleted.";
    await loadListings();
  } catch(error) {
    window.alert("Could not delete offer: "+(error.message || "Please try again."));
    if(button)button.disabled=false;
  }
}

el("myOfferList").addEventListener("click",event=>{
  const button=event.target.closest("[data-offer-action]");
  if(!button || !currentUser)return;
  const id=button.dataset.offerId;
  if(button.dataset.offerAction==="edit")editMyOffer(id);
  if(button.dataset.offerAction==="delete")deleteMyOffer(id);
});

async function postOffer() {
  if(!currentUser){openAuth();return;}
  const have=trim("postHave"),want=trim("postWant"),location=trim("postLocation");
  if(!have){el("postNote").textContent="Please describe what you have or can offer.";return;}
  const button=el("postOfferButton");
  button.disabled=true;
  el("postNote").textContent="Saving your offer…";
  try {
    let place=null;
    if(location){try{place=await geocode(location);}catch(_){place={city:location,region:"",postal_code:"",lat:null,lon:null};}}
    const payload={
      owner_id:currentUser.id,
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
    ["postHave","postWant","postLocation"].forEach(id=>el(id).value="");
    el("postPhotos").value="";
    el("postNote").textContent="Your offer is now posted.";
    await loadListings();
  } catch(error) {
    el("postNote").textContent="Could not post offer: "+(error.message || "Please try again.");
  } finally {button.disabled=false;}
}
document.addEventListener("click",event=>{
  if(event.target.closest("#postOfferButton")){
    event.preventDefault();
    postOffer();
  }
});

supabase.auth.onAuthStateChange((_event,session)=>{
  currentUser=session?.user || null;
  updateAccountUI();
  loadListings();
});
(async()=>{
  const {data}=await supabase.auth.getSession();
  currentUser=data.session?.user || null;
  updateAccountUI();
  await loadListings();
})();
})();