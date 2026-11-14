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
const trimValue=id=>el(id).value.trim();
const words=value=>value.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>1);
const overlaps=(wanted,available)=>{const a=words(wanted),b=new Set(words(available));return a.some(word=>b.has(word));};
function makeListing(p){return '<article class="listing"><div class="thumb">'+p.emoji+'</div><div><h3>'+p.title+'</h3><p><b>Have:</b> '+p.have+'</p><p><b>Want:</b> '+p.want+'</p><div class="meta">⌖ '+p.where+' · Sample listing</div></div></article>'}
function renderMatches(applyFilters=false){
 const location=el("browseLocation").value;
 const userWants=trimValue("wantInput");
 const userHas=trimValue("haveInput");
 const extra=trimValue("keywordsInput");
 const wantCriteria=[userWants,extra].filter(v=>v!=="").join(" ");
 let results=products.filter(p=>{
   if(location!=="nationwide"&&p.region!=="nyc"&&p.region!=="nearby")return false;
   if(!applyFilters)return true;
   // Only enforce a reciprocal direction when the corresponding user field is nonblank after trimming.
   const theirHaveMatches=!wantCriteria||overlaps(wantCriteria,p.have+" "+p.title+" "+p.keywords);
   const theirWantMatches=!userHas||overlaps(userHas,p.want);
   return theirHaveMatches&&theirWantMatches;
 });
 results.sort((a,b)=>a.rank-b.rank);
 el("matchList").innerHTML=results.length?results.map(makeListing).join(""):'<p class="empty-state">No reciprocal matches found. Try different keywords or leave one side blank to broaden your results.</p>';
 el("matchCount").textContent=results.length+" available offer"+(results.length===1?"":"s");
 if(!applyFilters||(!userWants&&!userHas&&!extra)){
   el("matchCaption").textContent=location==="nyc"?"All available offers · closest to New York City first":"All available offers · regional order";
 }else{
   const directions=[];
   if(wantCriteria)directions.push("their HAVE matches your WANT");
   if(userHas)directions.push("their WANT matches your HAVE");
   el("matchCaption").textContent="Reciprocal results · "+directions.join(" · ");
 }
}
el("findMatches").addEventListener("click",()=>renderMatches(true));
el("wantInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches(true)});
el("haveInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches(true)});
el("keywordsInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderMatches(true)});
el("browseLocation").addEventListener("change",()=>renderMatches(false));
renderMatches(false);
document.querySelectorAll("[data-login]").forEach(b=>b.addEventListener("click",()=>el("loginDialog").showModal()));
el("loginDialog").querySelector("form").addEventListener("submit",e=>{e.preventDefault();el("loginDialog").close()});
})();