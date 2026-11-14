(() => {
const products=[
{title:"Acoustic guitar",emoji:"🎸",type:"item",have:"Steel-string acoustic guitar, very good condition.",want:"Camera equipment or vinyl records.",where:"Manhattan, NY",region:"nyc",rank:1,lat:40.7831,lon:-73.9712,keywords:"guitar music"},
{title:"Vintage road bicycle",emoji:"🚴",type:"item",have:"Steel-frame road bike, classic style, rides well.",want:"Plumbing service or bicycle accessories.",where:"Queens, NY",region:"nyc",rank:2,lat:40.7282,lon:-73.7949,keywords:"bicycle bike road cycling"},
{title:"Vintage comic book collection",emoji:"📚",type:"item",have:"Marvel and DC comics from assorted years.",want:"Gold coins, silver coins, or bicycle.",where:"Queens, NY",region:"nyc",rank:3,lat:40.7282,lon:-73.7949,keywords:"comics books coins"},
{title:"Hybrid commuter bicycle",emoji:"🚲",type:"item",have:"Adult hybrid bike, recently serviced, good condition.",want:"Camera gear, power tools, or similar value.",where:"Brooklyn, NY",region:"nyc",rank:4,lat:40.6782,lon:-73.9442,keywords:"bicycle bike cycling commuter"},
{title:"Digital SLR camera kit",emoji:"📷",type:"item",have:"Camera body with two lenses and carrying bag.",want:"Bicycle, guitar, or audio equipment.",where:"Long Island, NY",region:"nearby",rank:5,lat:40.7891,lon:-73.1350,keywords:"camera photography dslr"},
{title:"Mountain bike",emoji:"🚵",type:"item",have:"Adult mountain bike with front suspension.",want:"Laptop, camera equipment, or tools.",where:"Westchester, NY",region:"nearby",rank:6,lat:41.1220,lon:-73.7949,keywords:"bicycle bike mountain"},
{title:"Cordless tool set",emoji:"🛠️",type:"item",have:"Drill, impact driver, batteries and charger.",want:"Bicycle or vintage collectibles.",where:"New Jersey",region:"nearby",rank:7,lat:40.7178,lon:-74.0431,keywords:"tools drill"},
{title:"Gold and silver coin set",emoji:"🪙",type:"item",have:"Small collection of collectible coins.",want:"Vintage comics, camera, or musical instrument.",where:"Connecticut",region:"nearby",rank:8,lat:41.0262,lon:-73.6282,keywords:"coins gold silver"},
{title:"Home plumbing service",emoji:"🔧",type:"service",have:"Help with faucet repairs, leaks, and basic home plumbing.",want:"Bicycle or bicycle accessories.",where:"Queens, NY",region:"nyc",rank:9,lat:40.7282,lon:-73.7949,keywords:"plumbing plumber faucet repair service"},
{title:"Website design help",emoji:"💻",type:"skill",have:"I can build or improve a small business website.",want:"Furniture, tools, or other useful items.",where:"Brooklyn, NY",region:"nyc",rank:10,lat:40.6782,lon:-73.9442,keywords:"website web design computer skill"},
{title:"Guitar lessons",emoji:"🎼",type:"service",have:"Beginner acoustic guitar lessons.",want:"Camera equipment or photography help.",where:"Manhattan, NY",region:"nyc",rank:11,lat:40.7831,lon:-73.9712,keywords:"guitar lessons music teaching"}
];
const el=id=>document.getElementById(id),trim=id=>el(id).value.trim();
const words=s=>s.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>1);
const overlaps=(a,b)=>{const set=new Set(words(b));return words(a).some(x=>set.has(x));};
const miles=(a,b)=>{const r=n=>n*Math.PI/180,dl=r(b.lat-a.lat),dn=r(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
const typeName=t=>({item:"Things",service:"Services & Skills",skill:"Services & Skills",service_skill:"Services & Skills",space:"Rooms & Space"}[t]||"Things");
async function geocode(q){
 const z=q.match(/^\d{5}$/);
 if(z){const r=await fetch("https://api.zippopotam.us/us/"+z[0]);if(!r.ok)throw Error("ZIP code not found");const p=(await r.json()).places?.[0];if(!p)throw Error("ZIP code not found");return {lat:+p.latitude,lon:+p.longitude,label:p["place name"]+", "+p["state abbreviation"]};}
 const parts=q.split(","),r=await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(parts[0].trim())+"&count=10&language=en&format=json");
 if(!r.ok)throw Error("Could not look up that location");const hits=((await r.json()).results||[]).filter(x=>x.country_code==="US");if(!hits.length)throw Error("City not found. Try a US city or ZIP code.");
 const st=parts[1]?.trim().toLowerCase(),p=(st&&hits.find(x=>(x.admin1||"").toLowerCase().includes(st)))||hits[0];return {lat:p.latitude,lon:p.longitude,label:p.name+(p.admin1?", "+p.admin1:"")};
}
function card(p){return '<article class="listing"><div class="thumb">'+p.emoji+'</div><div><h3>'+p.title+'</h3><span class="category-tag">'+typeName(p.type)+'</span><p><b>Have / Offer:</b> '+p.have+'</p><p><b>Want:</b> '+(p.want||"Open to any offer")+'</p><div class="meta">⌖ '+p.where+' · Sample listing</div><button class="contact-link" type="button" data-contact="'+p.title.replace(/"/g,'&quot;')+'">Contact owner</button></div></article>';}
async function render(filter=false){
 const scope="nyc",want=trim("wantInput"),have=trim("haveInput"),q=trim("locationInput"),radius=+el("distanceInput").value,category=el("categoryInput").value,btn=el("findMatches");btn.disabled=true;
 try{
  const center=filter&&q?await geocode(q):null;
  let list=products.filter(p=>{
   if(category==="item"&&p.type!=="item")return false;
   if(category==="service_skill"&&p.type!=="service"&&p.type!=="skill")return false;
   if(category==="space"&&p.type!=="space")return false;
   if(!center&&scope!=="nationwide"&&p.region!=="nyc"&&p.region!=="nearby")return false;
   if(center&&miles(center,{lat:p.lat,lon:p.lon})>radius)return false;
   return !filter||((!want||overlaps(want,p.have+" "+p.title+" "+p.keywords))&&(!have||!p.want.trim()||overlaps(have,p.want)));
  });
  list.sort((a,b)=>center?miles(center,{lat:a.lat,lon:a.lon})-miles(center,{lat:b.lat,lon:b.lon}):a.rank-b.rank);
  el("matchList").innerHTML=list.length?list.map(card).join(""):'<p class="empty-state">No matching offers found. Try All categories, a larger distance, or different search terms.</p>';
  el("matchCount").textContent=list.length+" available offer"+(list.length===1?"":"s");
  el("matchCaption").textContent=(category==="all"?"All categories":typeName(category)+" category")+" · "+(center?"within "+radius+" miles of "+center.label+" · nearest first":filter?"matching search results":"sample offers");
 }catch(e){el("matchList").innerHTML='<p class="empty-state">'+e.message+'. Please check the location and try again.</p>';el("matchCount").textContent="0 offers";el("matchCaption").textContent="Location search";}
 finally{btn.disabled=false;}
}
el("findMatches").addEventListener("click",()=>render(true));
el("categoryInput").addEventListener("change",()=>render(true));
["wantInput","haveInput","locationInput"].forEach(id=>el(id).addEventListener("keydown",e=>{if(e.key==="Enter")render(true)}));
render(false);
document.querySelectorAll("[data-login]").forEach(b=>b.addEventListener("click",()=>el("loginDialog").showModal()));
el("loginDialog").querySelector("form").addEventListener("submit",e=>{e.preventDefault();el("loginDialog").close()});
const contactDialog=el("contactDialog");
el("matchList").addEventListener("click",e=>{
 const button=e.target.closest("[data-contact]");
 if(!button)return;
 el("contactListingTitle").textContent="Regarding: "+button.dataset.contact;
 contactDialog.showModal();
});
el("closeContact").addEventListener("click",()=>contactDialog.close());
el("contactForm").addEventListener("submit",e=>e.preventDefault());
})();