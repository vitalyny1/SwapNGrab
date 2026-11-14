(() => {
const products=[
{title:"Hybrid commuter bicycle",emoji:"🚲",have:"Adult hybrid bike, recently serviced, good condition.",want:"Camera gear, power tools, or similar value.",where:"Brooklyn, NY",keywords:"bicycle bike cycling commuter"},
{title:"Vintage road bicycle",emoji:"🚴",have:"Steel-frame road bike, classic style, rides well.",want:"Mountain bike accessories or electronics.",where:"Queens, NY",keywords:"bicycle bike road cycling"},
{title:"Digital SLR camera kit",emoji:"📷",have:"Camera body with two lenses and carrying bag.",want:"Bicycle, guitar, or audio equipment.",where:"Long Island, NY",keywords:"camera photography dslr"},
{title:"Cordless tool set",emoji:"🛠️",have:"Drill, impact driver, batteries and charger.",want:"Bicycle or vintage collectibles.",where:"New Jersey",keywords:"tools drill"},
{title:"Vintage comic book collection",emoji:"📚",have:"Marvel and DC comics from assorted years.",want:"Gold coins, silver coins, or bicycle.",where:"Queens, NY",keywords:"comics books coins"},
{title:"Acoustic guitar",emoji:"🎸",have:"Steel-string acoustic guitar, very good condition.",want:"Camera equipment or vinyl records.",where:"Manhattan, NY",keywords:"guitar music"},
{title:"Mountain bike",emoji:"🚵",have:"Adult mountain bike with front suspension.",want:"Laptop, camera equipment, or tools.",where:"Westchester, NY",keywords:"bicycle bike mountain"},
{title:"Gold and silver coin set",emoji:"🪙",have:"Small collection of collectible coins.",want:"Vintage comics, camera, or musical instrument.",where:"Connecticut",keywords:"coins gold silver"}
];
const el=id=>document.getElementById(id);
function makeListing(p){return '<article class="listing"><div class="thumb">'+p.emoji+'</div><div><h3>'+p.title+'</h3><p><b>Have:</b> '+p.have+'</p><p><b>Want:</b> '+p.want+'</p><div class="meta">⌖ '+p.where+' · Sample listing</div></div><span class="match-tag">Possible match</span></article>'}
function renderMatches(){
 const q=(el("wantInput").value+" "+el("keywordsInput").value).toLowerCase().trim();
 const terms=q.split(/[^a-z0-9]+/).filter(w=>w.length>2);
 let results=products.filter(p=>{const hay=(p.title+" "+p.have+" "+p.want+" "+p.keywords).toLowerCase();return terms.some(t=>hay.includes(t))});
 if(!terms.length)results=products.slice(0,4);
 el("matchList").innerHTML=results.length?results.map(makeListing).join(""):'<p class="empty-state">No sample matches found. Try broader keywords such as bicycle, camera, tools, coins or guitar.</p>';
 el("matchCount").textContent=results.length+" possible match"+(results.length===1?"":"es");
 el("matchCaption").textContent='Based on what you want: '+(el("wantInput").value||"your interests");
}
el("findMatches").addEventListener("click",renderMatches);
el("wantInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches()});
el("keywordsInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches()});
renderMatches();
document.querySelectorAll("[data-login]").forEach(b=>b.addEventListener("click",()=>el("loginDialog").showModal()));
el("loginDialog").querySelector("form").addEventListener("submit",e=>{e.preventDefault();el("loginDialog").close()});
})();