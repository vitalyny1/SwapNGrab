(() => {
const products=[
{title:"Acoustic guitar",emoji:"🎸",have:"Steel-string acoustic guitar, very good condition.",want:"Camera equipment or vinyl records.",where:"Manhattan, NY",region:"nyc",rank:1,keywords:"guitar music"},
{title:"Vintage road bicycle",emoji:"🚴",have:"Steel-frame road bike, classic style, rides well.",want:"Mountain bike accessories or electronics.",where:"Queens, NY",region:"nyc",rank:2,keywords:"bicycle bike road cycling"},
{title:"Vintage comic book collection",emoji:"📚",have:"Marvel and DC comics from assorted years.",want:"Gold coins, silver coins, or bicycle.",where:"Queens, NY",region:"nyc",rank:3,keywords:"comics books coins"},
{title:"Hybrid commuter bicycle",emoji:"🚲",have:"Adult hybrid bike, recently serviced, good condition.",want:"Camera gear, power tools, or similar value.",where:"Brooklyn, NY",region:"nyc",rank:4,keywords:"bicycle bike cycling commuter"},
{title:"Digital SLR camera kit",emoji:"📷",have:"Camera body with two lenses and carrying bag.",want:"Bicycle, guitar, or audio equipment.",where:"Long Island, NY",region:"nearby",rank:5,keywords:"camera photography dslr"},
{title:"Mountain bike",emoji:"🚵",have:"Adult mountain bike with front suspension.",want:"Laptop, camera equipment, or tools.",where:"Westchester, NY",region:"nearby",rank:6,keywords:"bicycle bike mountain"},
{title:"Cordless tool set",emoji:"🛠️",have:"Drill, impact driver, batteries and charger.",want:"Bicycle or vintage collectibles.",where:"New Jersey",region:"nearby",rank:7,keywords:"tools drill"},
{title:"Gold and silver coin set",emoji:"🪙",have:"Small collection of collectible coins.",want:"Vintage comics, camera, or musical instrument.",where:"Connecticut",region:"nearby",rank:8,keywords:"coins gold silver"}
];
const el=id=>document.getElementById(id);
function makeListing(p){return '<article class="listing"><div class="thumb">'+p.emoji+'</div><div><h3>'+p.title+'</h3><p><b>Have:</b> '+p.have+'</p><p><b>Want:</b> '+p.want+'</p><div class="meta">⌖ '+p.where+' · Sample listing</div></div></article>'}
function renderMatches(filter=false){
 const location=el("browseLocation").value;
 const q=(el("wantInput").value+" "+el("keywordsInput").value).toLowerCase().trim();
 const terms=q.split(/[^a-z0-9]+/).filter(w=>w.length>2);
 let results=products.filter(p=>(location==="nationwide"||p.region==="nyc"||p.region==="nearby")&&(!filter||!terms.length||(p.title+" "+p.have+" "+p.want+" "+p.keywords).toLowerCase().split(/[^a-z0-9]+/).some(word=>terms.some(t=>word.includes(t)))));
 results.sort((a,b)=>a.rank-b.rank);
 el("matchList").innerHTML=results.length?results.map(makeListing).join(""):'<p class="empty-state">No offers match those keywords. Try a broader search.</p>';
 el("matchCount").textContent=results.length+" available offer"+(results.length===1?"":"s");
 el("matchCaption").textContent=filter&&terms.length?'Filtered by what you want: '+(el("wantInput").value||el("keywordsInput").value):location==="nyc"?"All available offers · closest to New York City first":"All available offers · regional order";
}
el("findMatches").addEventListener("click",()=>renderMatches(true));
el("wantInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches(true)});
el("keywordsInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches(true)});
el("browseLocation").addEventListener("change",()=>renderMatches(false));
renderMatches(false);
document.querySelectorAll("[data-login]").forEach(b=>b.addEventListener("click",()=>el("loginDialog").showModal()));
el("loginDialog").querySelector("form").addEventListener("submit",e=>{e.preventDefault();el("loginDialog").close()});
})();