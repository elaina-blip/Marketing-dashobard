"use client";
import React,{useState,useMemo,useEffect,useRef}from"react";
import{Search,Megaphone,LayoutGrid,Plus,X,Check,Clock,AlertTriangle,Circle,Star,Users,Calendar,MessageSquare,ChevronDown,Building2,Filter,CalendarDays,ChevronLeft,ChevronRight,Paperclip,Link2,FileText,Download,Trash2,Eye,EyeOff,Copy,BarChart2,Mail,Globe,TrendingUp,Zap,Settings}from"lucide-react";
import{loadTasks,updateTask as dbUpdate,setAssignee as dbSetAssignee,addNote as dbAddNote,addLink as dbAddLink,uploadFile as dbUploadFile,fileUrl as dbFileUrl,removeAttachment as dbRemoveAttachment,getTeam,currentEmail,signOut as dbSignOut,createTask as dbCreateTask,loadCompanyLogins as dbLoadCompanyLogins,replaceCompanyLogins as dbReplaceCompanyLogins}from"@/lib/data";

// ── COMPANIES ──────────────────────────────────────────────────
const COMPANIES=[
{id:"aps",name:"Alliance Permitting Service",short:"APS",site:"alliancepermitting.com",color:"#16C7E8",
theme:{bg:"#06171D",bgCard:"#0C2630",bgElevated:"#102F39",bgSunk:"#081E25",ink:"#EAF6F8",inkMuted:"#9FC3CC",inkFaint:"#6E929B",inkGhost:"#3C5A62",line:"rgba(125,205,220,.13)",lineStrong:"rgba(125,205,220,.26)",accent:"#16C7E8",accentHover:"#3FD6F0",accentSoft:"rgba(22,199,232,.15)",accentWash:"rgba(22,199,232,.07)",accentDeep:"#7DE9FB",gold:"#F5B53F",goldSoft:"rgba(245,181,63,.16)",teal:"#22D3C5",tealSoft:"rgba(34,211,197,.15)",indigo:"#A6B4FC",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#34E07B",goodSoft:"rgba(52,224,123,.15)",warn:"#F5B53F",warnSoft:"rgba(245,181,63,.16)",bad:"#FF6B73",badSoft:"rgba(255,107,115,.15)",sideBg:"#041117",sideText:"#A7C7CF",sideTextDim:"#5E828B",shadowCard:"0 1px 2px rgba(0,0,0,.45),0 0 0 1px rgba(125,205,220,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.7),0 0 0 1px rgba(22,199,232,.22)",navActiveBg:"linear-gradient(90deg,rgba(22,199,232,.22),rgba(22,199,232,.05))",navActiveText:"#D6F7FE",gradBrand:"linear-gradient(150deg,#16C7E8,#34E07B)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(22,199,232,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(52,224,123,.10),transparent 62%)"}},
{id:"ads",name:"Alliance Data Solutions",short:"ADS",site:"alliancedatasolutions.ai",color:"#A78BFA",
theme:{bg:"#0D0B18",bgCard:"#160F2B",bgElevated:"#1E1540",bgSunk:"#0A0814",ink:"#F0EDFF",inkMuted:"#A89DC8",inkFaint:"#6B5E8A",inkGhost:"#3A2D55",line:"rgba(167,139,250,.13)",lineStrong:"rgba(167,139,250,.26)",accent:"#A78BFA",accentHover:"#BBA6FC",accentSoft:"rgba(167,139,250,.16)",accentWash:"rgba(167,139,250,.07)",accentDeep:"#C4B5FD",gold:"#FBBF24",goldSoft:"rgba(251,191,36,.16)",teal:"#34D399",tealSoft:"rgba(52,211,153,.15)",indigo:"#818CF8",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#34D399",goodSoft:"rgba(52,211,153,.15)",warn:"#FBBF24",warnSoft:"rgba(251,191,36,.16)",bad:"#FB7185",badSoft:"rgba(251,113,133,.15)",sideBg:"#08050F",sideText:"#B4A8D4",sideTextDim:"#5E4F7A",shadowCard:"0 1px 2px rgba(0,0,0,.5),0 0 0 1px rgba(167,139,250,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.75),0 0 0 1px rgba(167,139,250,.22)",navActiveBg:"linear-gradient(90deg,rgba(167,139,250,.22),rgba(167,139,250,.05))",navActiveText:"#EDE9FF",gradBrand:"linear-gradient(150deg,#A78BFA,#34D399)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(167,139,250,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(52,211,153,.10),transparent 62%)"}},
{id:"tgr",name:"TigerLeads AI",short:"TGR",site:"tigerleads.ai",color:"#FF7A1A",
theme:{bg:"#0E0F12",bgCard:"#17181D",bgElevated:"#1F2128",bgSunk:"#121317",ink:"#F5F2EE",inkMuted:"#A8A29B",inkFaint:"#6F6A63",inkGhost:"#3C3935",line:"rgba(255,180,120,.12)",lineStrong:"rgba(255,180,120,.24)",accent:"#FF7A1A",accentHover:"#FF9444",accentSoft:"rgba(255,122,26,.16)",accentWash:"rgba(255,122,26,.07)",accentDeep:"#FFA85C",gold:"#FFB020",goldSoft:"rgba(255,176,32,.16)",teal:"#2DD4BF",tealSoft:"rgba(45,212,191,.15)",indigo:"#A6B4FC",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#36D77E",goodSoft:"rgba(54,215,126,.15)",warn:"#FFB020",warnSoft:"rgba(255,176,32,.16)",bad:"#FF6B5E",badSoft:"rgba(255,107,94,.15)",sideBg:"#090A0C",sideText:"#C5BFB7",sideTextDim:"#6F6A63",shadowCard:"0 1px 2px rgba(0,0,0,.5),0 0 0 1px rgba(255,180,120,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.72),0 0 0 1px rgba(255,122,26,.22)",navActiveBg:"linear-gradient(90deg,rgba(255,122,26,.22),rgba(255,122,26,.05))",navActiveText:"#FFE6CF",gradBrand:"linear-gradient(150deg,#FF7A1A,#FFB020)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(255,122,26,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(255,176,32,.10),transparent 62%)"}},
];

let TEAM=["Marshall","Elaina","Weston","Dena"];
const STATUSES={not_started:{label:"Not Started",icon:Circle},in_progress:{label:"In Progress",icon:Clock},blocked:{label:"Blocked",icon:AlertTriangle},done:{label:"Done",icon:Check}};
const STATUS_ORDER=["not_started","in_progress","blocked","done"];
const PRIORITIES={high:"#FF6B5E",medium:"#FFB020",low:"#6F6A63"};
function fmtDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function useTheme(id){return(id==="all"?COMPANIES[0]:COMPANIES.find(c=>c.id===id)||COMPANIES[0]).theme;}
function stC(s,t){return{not_started:t.inkFaint,in_progress:t.accent,blocked:t.bad,done:t.good}[s]||t.inkFaint;}
function iS(t){return{width:"100%",padding:"9px 12px",background:t.bgSunk,border:`1px solid ${t.lineStrong}`,borderRadius:8,color:t.ink,fontSize:13.5,fontFamily:"'IBM Plex Sans',inherit",outline:"none"};}

// ── UI ATOMS ──────────────────────────────────────────────────
function Btn({children,theme:t,accent,sm,onClick}){
  return <button onClick={onClick} style={{border:`1px solid ${accent?t.accent:t.lineStrong}`,background:accent?t.accent:t.bgCard,color:accent?t.bg:t.ink,padding:sm?"5px 10px":"8px 13px",borderRadius:8,fontFamily:"'IBM Plex Sans',inherit",fontSize:sm?12:13,fontWeight:accent?600:500,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,whiteSpace:"nowrap",boxShadow:accent?`0 6px 16px -8px ${t.accent}cc`:"none"}}>{children}</button>;
}
function KpiCard({label,value,sub,trend,trendDir,icon:Icon,theme:t}){
  const ok=trendDir==="up"||trendDir==="down-good";
  const tC=ok?t.good:trendDir==="flat"?t.inkMuted:t.bad;
  const tB=ok?t.goodSoft:trendDir==="flat"?t.bgElevated:t.badSoft;
  return(
    <div className="kpi-card" style={{background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:12,padding:"18px 18px 16px",position:"relative",overflow:"hidden",boxShadow:t.shadowCard,transition:"box-shadow .2s,transform .2s"}}>
      <div className="kpi-line" style={{position:"absolute",inset:"0 0 auto 0",height:2,background:`linear-gradient(90deg,transparent,${t.accent},transparent)`,opacity:0}}/>
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".07em",color:t.inkMuted,marginBottom:13,display:"flex",alignItems:"center",gap:7,fontWeight:500}}>{Icon&&<Icon size={14} style={{color:t.inkFaint}}/>}{label}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:33,fontWeight:400,letterSpacing:"-.025em",color:t.ink,lineHeight:.95}}>{value}</div>
      {(sub||trend)&&<div style={{marginTop:12,fontSize:12,color:t.inkMuted,display:"flex",alignItems:"center",gap:8}}>{trend&&<span style={{display:"inline-flex",alignItems:"center",gap:3,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"2px 6px",borderRadius:5,color:tC,background:tB}}>{trend}</span>}{sub}</div>}
    </div>
  );
}
function Panel({children,flush,style,theme:t}){return <div style={{background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:12,padding:flush?0:22,overflow:flush?"hidden":"visible",boxShadow:t.shadowCard,...style}}>{children}</div>;}
function PHead({title,sub,right,theme:t,b}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,...(b?{padding:"18px 22px",borderBottom:`1px solid ${t.line}`}:{marginBottom:18})}}>
      <div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16.5,fontWeight:500,letterSpacing:"-.01em",color:t.ink}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:t.inkMuted,marginTop:3}}>{sub}</div>}
      </div>
      {right&&<div style={{flexShrink:0}}>{right}</div>}
    </div>
  );
}
function Pill({children,v="neutral",theme:t}){
  const map={good:{bg:t.goodSoft,c:t.good},warn:{bg:t.warnSoft,c:t.warn},bad:{bg:t.badSoft,c:t.bad},accent:{bg:t.accentSoft,c:t.accent},info:{bg:t.indigoSoft,c:t.indigo},neutral:{bg:t.bgElevated,c:t.inkMuted}};
  const s=map[v]||map.neutral;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap",background:s.bg,color:s.c}}>{children}</span>;
}
function Bar({pct,color,theme:t}){return <div style={{height:6,borderRadius:20,background:t.bgSunk,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:20,background:color||t.accent,transition:"width .4s"}}/></div>;}
function Tabs2({tabs,active,onChange,theme:t}){
  return <div style={{display:"flex",gap:4,background:t.bgElevated,padding:3,borderRadius:8,border:`1px solid ${t.line}`}}>{tabs.map(tab=><button key={tab} onClick={()=>onChange(tab)} style={{padding:"4px 11px",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",border:"none",background:active===tab?t.bgCard:"transparent",color:active===tab?t.ink:t.inkMuted,boxShadow:active===tab?t.shadowCard:"none"}}>{tab}</button>)}</div>;
}
function Spark({color,height=240,uid="s"}){
  const pts=[170,160,150,165,140,130,135,115,125,100,110,90,95,80,90,70,75,60,68,55,62,48,55,42];
  const n=pts.length,w=720,maxY=220,mn=Math.min(...pts),mx=Math.max(...pts);
  const nv=v=>maxY-((v-mn)/(mx-mn))*(maxY-20)-20;
  const pD=pts.map((v,i)=>`${i===0?"M":"L"}${40+i*(w/(n-1))},${nv(v)}`).join(" ");
  const aD=pD+` L${40+(n-1)*(w/(n-1))},${maxY} L40,${maxY} Z`;
  const id=`g${uid}${color.replace(/#/g,"")}`;
  return(
    <svg viewBox={`0 0 760 ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <g stroke="rgba(255,255,255,.06)" strokeWidth="1">{[20,70,120,170,220].map(y=><line key={y} x1="40" y1={y} x2="740" y2={y}/>)}</g>
      <path fill={`url(#${id})`} d={aD}/>
      <path d={pD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={40+(n-1)*(w/(n-1))} cy={nv(pts[n-1])} r="4.5" fill={color}/>
      <circle cx={40+(n-1)*(w/(n-1))} cy={nv(pts[n-1])} r="10" fill={color} fillOpacity=".25"/>
    </svg>
  );
}
function SecH({title,meta,right,theme:t}){
  return(
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,margin:"6px 0 16px"}}>
      <div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:21,fontWeight:500,letterSpacing:"-.015em",color:t.ink}}>{title}</div>
        {meta&&<div style={{fontSize:12,color:t.inkFaint,marginTop:3,display:"flex",alignItems:"center",gap:6}}>{meta}</div>}
      </div>
      {right}
    </div>
  );
}
function TBar({title,sub,actions,theme:t}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:24,marginBottom:30,paddingBottom:22,borderBottom:`1px solid ${t.line}`}}>
      <div>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".13em",color:t.inkFaint,marginBottom:7}}>Marketing Operations</div>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:400,letterSpacing:"-.02em",color:t.ink,lineHeight:1.12,margin:0}}>{title}</h1>
        <div style={{color:t.inkMuted,marginTop:8,fontSize:13.5}}>{sub}</div>
      </div>
      <div style={{display:"flex",gap:9,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>{actions}</div>
    </div>
  );
}
function CTag({label,theme:t}){
  const m={Social:{bg:t.accentSoft,c:t.accentDeep},Video:{bg:t.goldSoft,c:t.gold},Blog:{bg:t.indigoSoft,c:t.indigo},Link:{bg:t.indigoSoft,c:t.indigo},Email:{bg:t.tealSoft,c:t.teal},SEO:{bg:t.indigoSoft,c:t.indigo},Case:{bg:t.pinkSoft,c:t.pink}};
  const v=m[label]||{bg:t.bgElevated,c:t.inkMuted};
  return <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:v.bg,color:v.c}}>{label}</span>;
}
function Field({label,children,theme:t}){
  return(
    <div style={{marginBottom:22}}>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:700,color:t.inkMuted,marginBottom:9,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>
      {children}
    </div>
  );
}
function KwList({rows,theme:t}){
  return(
    <div>{rows.map((r,i)=>(
      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"center",padding:"11px 0",borderBottom:i<rows.length-1?`1px solid ${t.line}`:"none"}}>
        <div>
          <div style={{fontSize:13,color:t.ink,fontWeight:450}}>{r.kw}</div>
          <div style={{fontSize:11,color:t.inkFaint,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{r.vol}</div>
        </div>
        {r.pos!==""&&<div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,width:34,textAlign:"right",color:t.ink}}>{r.pos}</div>}
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,fontWeight:600,color:r.dir==="up"?t.good:r.dir==="down"?t.bad:r.dir==="new"?t.accent:t.inkMuted}}>{r.change}</div>
      </div>
    ))}</div>
  );
}

// ── VIEWS ─────────────────────────────────────────────────────
function OverviewView({theme:t,companyId}){
  const co=companyId==="all"?COMPANIES[0]:COMPANIES.find(c=>c.id===companyId)||COMPANIES[0];
  const brand={aps:"permits brand",ads:"data brand",tgr:"AI pipeline"}[co.id]||"brand";
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:24,marginBottom:30,paddingBottom:22,borderBottom:`1px solid ${t.line}`}}>
        <div>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".13em",color:t.inkFaint,marginBottom:7}}>Marketing Operations</div>
          <h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:400,letterSpacing:"-.02em",color:t.ink,lineHeight:1.12,margin:0}}>
            Good morning, Marshall — your <em style={{fontStyle:"italic",color:t.accentDeep,fontWeight:500,textShadow:`0 0 22px ${t.accent}66`}}>{brand}</em> is gaining ground.
          </h1>
          <div style={{color:t.inkMuted,marginTop:8,fontSize:13.5}}>Last 30 days · Updated 4 minutes ago · <span style={{color:t.good}}>●</span> All channels synced</div>
        </div>
        <div style={{display:"flex",gap:9,flexShrink:0}}><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New Campaign</Btn></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Organic sessions" value="18,427" trend="▲ 23.4%" trendDir="up" sub="vs. prior 30 days" icon={TrendingUp} theme={t}/>
        <KpiCard label="Avg. keyword position" value="14.2" trend="▲ 3.6 pos" trendDir="up" sub="184 tracked terms" icon={Search} theme={t}/>
        <KpiCard label="Inbound leads" value="312" trend="▲ 11.8%" trendDir="up" sub="78% organic-sourced" icon={Users} theme={t}/>
        <KpiCard label="Cost per lead" value="$48" trend="▼ 19.0%" trendDir="down-good" sub="vs vendor's $84" icon={BarChart2} theme={t}/>
      </div>
      <SecH title="Organic search performance" meta={<><span style={{color:t.good}}>●</span> Live from Google Search Console & GA4</>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Sessions & clicks" sub="Organic sessions · daily · last 30 days" theme={t} right={<Tabs2 tabs={["7d","30d","90d","1y"]} active="30d" onChange={()=>{}} theme={t}/>}/><Spark color={t.accent} uid="ov1"/></Panel>
        <Panel theme={t}><PHead title="Top keyword movements" sub="Position changes · last 7 days" theme={t}/>
          <KwList rows={[{kw:"florida building permit expediter",vol:"2,400/mo · KD 38",pos:"3",change:"▲5",dir:"up"},{kw:"solar permit florida fast",vol:"1,200/mo · KD 31",pos:"4",change:"▲8",dir:"up"},{kw:"orlando permit services",vol:"880/mo · KD 24",pos:"7",change:"▲3",dir:"up"},{kw:"permit expediter near me",vol:"6,600/mo · KD 44",pos:"18",change:"▲4",dir:"up"},{kw:"ai permit software",vol:"170/mo · KD 22",pos:"9",change:"NEW",dir:"new"}]} theme={t}/>
        </Panel>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="Lead source attribution" sub="312 leads this month · what's driving pipeline" theme={t}/>
          <div style={{display:"flex",height:14,borderRadius:7,overflow:"hidden",margin:"4px 0 20px"}}>
            {[{w:42,c:t.accent},{w:18,c:t.good},{w:14,c:t.teal},{w:10,c:t.indigo},{w:8,c:t.pink},{w:8,c:t.gold}].map((x,i)=><div key={i} style={{flex:x.w,background:x.c}}/>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[["Organic search","131 · 42%",t.accent],["LinkedIn (organic)","56 · 18%",t.good],["Direct","44 · 14%",t.teal],["Referral","31 · 10%",t.indigo],["Email","25 · 8%",t.pink],["Paid (Google)","25 · 8%",t.gold]].map(([l,v,c],i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"center"}}>
                <div style={{width:10,height:10,borderRadius:3,background:c}}/>
                <div style={{fontSize:13,color:t.ink}}>{l}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:t.inkMuted}}>{v}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel theme={t}><PHead title="Team activity" sub="Recent actions across channels" theme={t}/>
          <div>{[
            {icon:"📝",text:<><strong>Marshall</strong> published "Solar Permits — 2026 Cycle Times" to the blog.</>,time:"23m"},
            {icon:"🔗",text:<>3 new backlinks detected from <strong>constructiondive.com</strong>.</>,time:"2h"},
            {icon:"📈",text:<><strong>"orlando permit expediter"</strong> moved #6 → #3.</>,time:"5h"},
            {icon:"✉️",text:<><strong>April newsletter</strong> sent · 38.4% open, 4.2% CTR.</>,time:"1d"},
            {icon:"⚠️",text:<>Audit found <strong>3 new broken links</strong> in /resources.</>,time:"1d"},
          ].map((it,i,a)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<a.length-1?`1px solid ${t.line}`:"none"}}>
              <div style={{width:28,height:28,borderRadius:8,background:t.bgElevated,border:`1px solid ${t.line}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{it.icon}</div>
              <div style={{color:t.ink,lineHeight:1.45,fontSize:13}}>{it.text}</div>
              <div style={{fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{it.time}</div>
            </div>
          ))}</div>
        </Panel>
      </div>
    </div>
  );
}

function SeoView({theme:t}){
  const [tab,setTab]=useState("28d");
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>SEO & <em style={{fontStyle:"italic",color:t.accentDeep}}>Organic</em></>} sub="Google Search Console + GA4 + Ahrefs · last 28 days" actions={<><Btn theme={t}>Last 28 days ▾</Btn><Btn theme={t} accent>+ Track keyword</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Total clicks" value="9,184" trend="▲ 18.2%" trendDir="up" sub="vs prior period" theme={t}/>
        <KpiCard label="Impressions" value="412K" trend="▲ 26.9%" trendDir="up" sub="rising visibility" theme={t}/>
        <KpiCard label="Avg. CTR" value={<>2.23<small style={{fontSize:18,color:t.inkFaint}}>%</small></>} trend="▼ 0.3pt" trendDir="down" sub="impressions outpacing" theme={t}/>
        <KpiCard label="Indexed pages" value="147" trend="▲ 12" trendDir="up" sub="9 pending discovery" theme={t}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Clicks vs. impressions" sub="Daily · Search Console" theme={t} right={<Tabs2 tabs={["7d","28d","3m"]} active={tab} onChange={setTab} theme={t}/>}/><Spark color={t.accent} height={240} uid="seo1"/></Panel>
        <Panel theme={t}><PHead title="Ranking distribution" sub="184 tracked keywords by position bucket" theme={t}/>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:6}}>
            {[["Positions 1–3",22,30,t.good],["Positions 4–10",41,56,t.accent],["Positions 11–20",58,78,t.gold],["Positions 21–50",44,60,t.inkFaint],["Beyond 50",19,26,t.lineStrong]].map(([l,c,p,col])=>(
              <div key={l}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,color:t.inkMuted}}><span>{l}</span><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.ink}}>{c}</strong></div><Bar pct={p} color={col} theme={t}/></div>
            ))}
          </div>
          <div style={{marginTop:16,fontSize:12,color:t.inkFaint}}>63 keywords in the "striking distance" 11–20 band — highest ROI to push to page one.</div>
        </Panel>
      </div>
      <SecH title="Keyword universe" meta="184 tracked terms · click a column to sort" theme={t}/>
      <Panel theme={t} flush style={{marginBottom:30}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Keyword","Position","7-day","Volume","KD","Clicks","URL"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:h==="Keyword"||h==="URL"?"left":"right",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600,background:t.bgElevated}}>{h}</th>)}</tr></thead>
          <tbody>{[
            ["florida building permit expediter",3,"▲5","up",2400,38,684,"/services/florida"],
            ["solar permit florida fast",4,"▲8","up",1200,31,402,"/solutions/solar"],
            ["orlando permit services",7,"▲3","up",880,24,191,"/areas/orlando"],
            ["ai permit software",9,"NEW","new",170,22,38,"/platform"],
            ["commercial roofing permits tampa",11,"▼2","down",390,19,44,"/areas/tampa"],
            ["permit expediter near me",18,"▲4","up",6600,44,121,"/"],
            ["how long does a building permit take",14,"▲6","up",3300,29,88,"/blog/permit-timelines"],
            ["broward county permit expeditor",2,"▲1","up",320,17,142,"/areas/broward"],
          ].map((r,i)=>(
            <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
              <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontWeight:600,color:t.ink,fontFamily:"'JetBrains Mono',monospace"}}>{r[1]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,fontWeight:600,color:r[3]==="up"?t.good:r[3]==="down"?t.bad:t.accent}}>{r[2]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[4].toLocaleString()}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[5]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[6]}</td>
              <td style={{padding:"12px 14px",fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{r[7]}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t} flush>
          <PHead title="Technical health audit" sub="38 tracked items · 5 critical open" theme={t} b right={<Btn theme={t} sm>Re-scan</Btn>}/>
          <div style={{padding:"6px 22px 14px"}}>{[
            {title:"Duplicate meta descriptions site-wide",desc:"Placeholder copy showing in SERPs across 31 pages",sev:"bad",pill:"Critical"},
            {title:"Identical <title> tags on every page",desc:"Highest-impact on-page fix — unique titles needed",sev:"bad",pill:"Critical"},
            {title:"No canonical tags",desc:"Risk of duplicate-content dilution",sev:"warn",pill:"High"},
            {title:"Missing structured data / schema",desc:"Organization, LocalBusiness, FAQ absent",sev:"warn",pill:"High"},
            {title:"Image alt text missing",desc:"Affects 64 images across the site",sev:"neutral",pill:"Medium"},
            {title:"XML sitemap submitted",desc:"Verified in Search Console May 24",sev:"good",pill:"Resolved"},
          ].map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:`1px solid ${t.line}`}}>
              <span style={{width:8,height:8,borderRadius:"50%",marginTop:4,flexShrink:0,display:"block",background:r.sev==="bad"?t.bad:r.sev==="warn"?t.warn:r.sev==="good"?t.good:t.inkFaint}}/>
              <div><div style={{fontSize:13,fontWeight:500,color:t.ink}}>{r.title}</div><div style={{fontSize:11.5,color:t.inkMuted,marginTop:2}}>{r.desc}</div></div>
              <Pill v={r.sev==="bad"?"bad":r.sev==="warn"?"warn":r.sev==="good"?"good":"neutral"} theme={t}>{r.pill}</Pill>
            </div>
          ))}</div>
        </Panel>
        <Panel theme={t} flush>
          <PHead title="Backlink profile" sub="Domain Rating 34 · 1,284 referring domains" theme={t} b right={<Pill v="good" theme={t}>+18 this mo</Pill>}/>
          <div style={{padding:"6px 22px 14px"}}>{[
            ["constructiondive.com","DR 78 · dofollow · /news/ai-permitting","info","New"],
            ["jaxchamber.com","DR 61 · dofollow · member directory","info","New"],
            ["solarpowerworldonline.com","DR 72 · dofollow · guest article","good","Live"],
            ["builderonline.com","DR 69 · nofollow · roundup mention","neutral","Nofollow"],
            ["spammydirectory.xyz","DR 4 · toxic · recommend disavow","bad","Toxic"],
          ].map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${t.line}`}}>
              <div><div style={{fontSize:13,fontWeight:500,color:t.ink}}>{r[0]}</div><div style={{fontSize:11.5,color:t.inkMuted,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{r[1]}</div></div>
              <Pill v={r[2]} theme={t}>{r[3]}</Pill>
            </div>
          ))}</div>
        </Panel>
      </div>
    </div>
  );
}

function SocialView({theme:t}){
  const socials=[
    {name:"LinkedIn",handle:"alliance-permitting-service",followers:"3,148",plus:"+184",eng:"6.4%",bg:"#0A66C2",letter:"in"},
    {name:"Instagram",handle:"@permittingalliance",followers:"1,872",plus:"+62",eng:"3.1%",bg:"#E1306C",letter:"IG"},
    {name:"Facebook",handle:"/alliancepermitting",followers:"2,401",plus:"+28",eng:"1.8%",bg:"#1877F2",letter:"fb"},
    {name:"X / Twitter",handle:"@alliancepermit1",followers:"948",plus:"+12",eng:"2.2%",bg:"#14171A",letter:"X"},
  ];
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Social <em style={{fontStyle:"italic",color:t.accentDeep}}>Media</em></>} sub="4 connected channels · organic + scheduled · last 30 days" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ Schedule post</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        {socials.map(s=>(
          <Panel key={s.name} theme={t}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>{s.letter}</div>
              <div><div style={{fontSize:12.5,fontWeight:600,color:t.ink}}>{s.name}</div><div style={{fontSize:10.5,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{s.handle}</div></div>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:400,color:t.ink,marginBottom:10}}>{s.followers}</div>
            <div style={{display:"flex",gap:16}}>
              <div><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.ink,fontSize:13,display:"block"}}>{s.plus}</strong><span style={{fontSize:11.5,color:t.inkMuted}}>new followers</span></div>
              <div><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.ink,fontSize:13,display:"block"}}>{s.eng}</strong><span style={{fontSize:11.5,color:t.inkMuted}}>engagement</span></div>
            </div>
          </Panel>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Engagement trend" sub="Total interactions across channels · daily" theme={t} right={<Tabs2 tabs={["30d","90d"]} active="30d" onChange={()=>{}} theme={t}/>}/><Spark color={t.accent} uid="soc1"/></Panel>
        <Panel theme={t}><PHead title="Best performing posts" sub="By engagement rate · last 30 days" theme={t}/>
          <KwList rows={[
            {kw:'"Permit nightmares" carousel',vol:"LinkedIn · 1,204 reactions",pos:"",change:"9.8%",dir:"up"},
            {kw:"Dream Finders project reel",vol:"Instagram · 18.4K views",pos:"",change:"7.1%",dir:"up"},
            {kw:'"3 days, not 3 weeks" before/after',vol:"LinkedIn · 642 reactions",pos:"",change:"6.2%",dir:"up"},
            {kw:"Solar tax-credit deadline alert",vol:"Facebook · 88 shares",pos:"",change:"3.4%",dir:"flat"},
          ]} theme={t}/>
        </Panel>
      </div>
      <SecH title="Publishing queue" meta="Scheduled across all channels" theme={t}/>
      <Panel theme={t} flush>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Post","Channel","Type","Scheduled","Status"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600,background:t.bgElevated}}>{h}</th>)}</tr></thead>
          <tbody>{[
            ["Atlanta GA service-launch announcement","LinkedIn","Social","Wed · 10:00 AM","good","Queued"],
            ["EV charger permit reel","Instagram","Video","Thu · 12:30 PM","good","Queued"],
            ["Permit nightmares — part 5","LinkedIn","Social","Fri · 9:00 AM","warn","Draft"],
            ["Weekend code-update digest","Facebook · X","Link","Sat · 8:00 AM","neutral","Idea"],
          ].map((r,i)=>(
            <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
              <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
              <td style={{padding:"12px 14px",color:t.inkMuted}}>{r[1]}</td>
              <td style={{padding:"12px 14px"}}><CTag label={r[2]} theme={t}/></td>
              <td style={{padding:"12px 14px",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted,fontSize:12}}>{r[3]}</td>
              <td style={{padding:"12px 14px"}}><Pill v={r[4]} theme={t}>{r[5]}</Pill></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
    </div>
  );
}

function PaidView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Paid <em style={{fontStyle:"italic",color:t.accentDeep}}>Advertising</em></>} sub="Google Ads + Meta · run lean, in-house · last 30 days" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New campaign</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Ad spend" value="$4,820" trend="— flat" trendDir="flat" sub="within budget" theme={t}/>
        <KpiCard label="Paid leads" value="61" trend="▲ 9.0%" trendDir="up" sub="conversions" theme={t}/>
        <KpiCard label="Cost per lead" value="$79" trend="▼ 8.1%" trendDir="down-good" sub="improving" theme={t}/>
        <KpiCard label="ROAS" value={<>4.2<small style={{fontSize:18,color:t.inkFaint}}>×</small></>} trend="▲ 0.4×" trendDir="up" sub="on closed deals" theme={t}/>
      </div>
      <Panel theme={t} flush style={{marginBottom:30}}>
        <PHead title="Active campaigns" sub="Google Ads & Meta" theme={t} b/>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Campaign","Platform","Spend","Clicks","Leads","CPL","Status"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:h==="Campaign"||h==="Platform"?"left":"right",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600,background:t.bgElevated}}>{h}</th>)}</tr></thead>
          <tbody>{[
            ["FL Permit Expediting — Search","Google","$2,140",418,31,"$69","good","Active"],
            ["Solar Installers — Search","Google","$1,180",204,18,"$66","good","Active"],
            ["Contractor Retargeting","Meta","$880",612,9,"$98","good","Active"],
            ["Brand Defense","Google","$420",189,3,"$140","warn","Review"],
            ["Texas Launch — Awareness","Meta","$200",88,0,"—","neutral","Paused"],
          ].map((r,i)=>(
            <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
              <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
              <td style={{padding:"12px 14px",color:t.inkMuted}}>{r[1]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.ink}}>{r[2]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[3]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[4]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[5]}</td>
              <td style={{padding:"12px 14px"}}><Pill v={r[6]} theme={t}>{r[7]}</Pill></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="Spend vs. leads" sub="Daily · all paid channels" theme={t}/><Spark color={t.gold} uid="paid1"/></Panel>
        <Panel theme={t}><PHead title="Top converting keywords" sub="Google Ads · by leads" theme={t}/>
          <KwList rows={[
            {kw:"permit expediter florida",vol:"$3.10 CPC · Quality 9",pos:"",change:"14 leads",dir:"up"},
            {kw:"fast solar permitting",vol:"$2.40 CPC · Quality 8",pos:"",change:"11 leads",dir:"up"},
            {kw:"commercial permit help",vol:"$4.80 CPC · Quality 7",pos:"",change:"8 leads",dir:"up"},
            {kw:"building permit service near me",vol:"$5.20 CPC · Quality 6",pos:"",change:"5 leads",dir:"flat"},
          ]} theme={t}/>
        </Panel>
      </div>
    </div>
  );
}

function EmailView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Email & <em style={{fontStyle:"italic",color:t.accentDeep}}>Nurture</em></>} sub="Newsletter + lifecycle automations · last 30 days" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New campaign</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="List size" value="4,612" trend="▲ 6.2%" trendDir="up" sub="+268 net new" theme={t}/>
        <KpiCard label="Avg. open rate" value={<>38.4<small style={{fontSize:18,color:t.inkFaint}}>%</small></>} trend="▲ 2.1pt" trendDir="up" sub="above 21% benchmark" theme={t}/>
        <KpiCard label="Avg. click rate" value={<>4.2<small style={{fontSize:18,color:t.inkFaint}}>%</small></>} trend="▲ 0.6pt" trendDir="up" sub="healthy" theme={t}/>
        <KpiCard label="Email-sourced leads" value="25" trend="▲ 14%" trendDir="up" sub="8% of total" theme={t}/>
      </div>
      <Panel theme={t} flush style={{marginBottom:30}}>
        <PHead title="Recent campaigns" sub="Broadcasts & automations" theme={t} b/>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Campaign","Sent","Recipients","Open","Click","Type"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:h==="Campaign"||h==="Type"?"left":"right",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600,background:t.bgElevated}}>{h}</th>)}</tr></thead>
          <tbody>{[
            ["May Newsletter — Permit Cycle Times","May 10","4,344","38.4%","4.2%","Broadcast"],
            ["Solar Tax Credit Deadline Alert","May 4","1,210","44.1%","7.8%","Segment"],
            ["New Lead → Welcome Series (1/3)","Ongoing","312","61.2%","11.4%","Automation"],
            ["Quote Follow-up (no response 48h)","Ongoing","98","52.0%","9.1%","Automation"],
            ["Re-engagement — dormant 90d","Apr 28","640","18.3%","1.2%","Win-back"],
          ].map((r,i)=>(
            <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
              <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted,fontSize:12}}>{r[1]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[2]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.ink,fontWeight:600}}>{r[3]}</td>
              <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[4]}</td>
              <td style={{padding:"12px 14px"}}><CTag label={r[5]==="Automation"||r[5]==="Win-back"||r[5]==="Segment"?"Email":r[5]} theme={t}/></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="List growth" sub="Subscribers · last 6 months" theme={t}/><Spark color={t.good} uid="em1"/></Panel>
        <Panel theme={t}><PHead title="Segments" sub="By lifecycle stage" theme={t}/>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:6}}>{[
            ["Contractors",1842,80,t.accent],["Solar installers",1108,48,t.gold],["Developers / GCs",962,42,t.teal],["Architects",418,18,t.indigo],["Unsegmented",282,12,t.inkFaint],
          ].map(([l,v,p,c])=>(
            <div key={l}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,color:t.inkMuted}}><span>{l}</span><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.ink}}>{v.toLocaleString()}</strong></div><Bar pct={p} color={c} theme={t}/></div>
          ))}</div>
        </Panel>
      </div>
    </div>
  );
}

function ContentView({theme:t}){
  const cols=[
    {label:"Briefing",color:t=>t.inkFaint,count:5,cards:[{title:"2026 Florida Permit Cycle Times by County",type:"Blog",kw:"\"florida permit timeline\"",owner:"MC"},{title:"How AI Reduces Permit Rejection Rates",type:"SEO",kw:"\"ai permit software\"",owner:"MC"},{title:"Solar Tax Credit Sunset Guide",type:"Blog",kw:"\"solar permit florida\"",owner:"JD"}]},
    {label:"In Draft",color:t=>t.gold,count:6,cards:[{title:"Texas Expansion Landing Page",type:"SEO",kw:"/areas/texas",owner:"MC"},{title:"Dream Finders Homes Case Study",type:"Case",kw:"social proof",owner:"JD"},{title:"LinkedIn: Permit nightmares series",type:"Social",kw:"engagement",owner:"JD"}]},
    {label:"In Review",color:t=>t.accent,count:3,cards:[{title:"HVAC Permit Guide — Q3 update",type:"Blog",kw:"legal review",owner:"MC"},{title:"New homepage hero copy",type:"SEO",kw:"conversion",owner:"MC"}]},
    {label:"Ready",color:t=>t.good,count:4,cards:[{title:"Atlanta GA service-launch post",type:"Social",kw:"scheduled",owner:"JD"},{title:"Permit expediting vs. DIY ROI",type:"Blog",kw:"\"permit cost\"",owner:"MC"}]},
  ];
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Content <em style={{fontStyle:"italic",color:t.accentDeep}}>Pipeline</em></>} sub="18 assets in flight · 4 ready to publish this week" actions={<><Btn theme={t}>Calendar ▾</Btn><Btn theme={t} accent>+ Add brief</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        {cols.map(col=>{
          const colColor=col.color(t);
          return(
            <div key={col.label}>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",color:t.ink,marginBottom:12}}>
                <span style={{width:8,height:8,borderRadius:3,background:colColor,display:"inline-block"}}/>
                {col.label}
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:t.inkMuted,background:t.bgCard,padding:"1px 7px",borderRadius:20,border:`1px solid ${t.line}`,marginLeft:"auto"}}>{col.count}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {col.cards.map((card,i)=>(
                  <div key={i} className="kan-card" style={{background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:10,padding:"13px 14px",cursor:"pointer",transition:"box-shadow .2s,transform .2s"}}>
                    <div style={{fontSize:12.5,fontWeight:500,lineHeight:1.35,color:t.ink,marginBottom:9}}>{card.title}</div>
                    <div style={{marginBottom:8}}><CTag label={card.type} theme={t}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{card.kw}</span>
                      <div style={{width:22,height:22,borderRadius:"50%",background:`linear-gradient(145deg,${t.accent},${t.accentDeep})`,display:"flex",alignItems:"center",justifyContent:"center",color:t.bg,fontSize:9,fontWeight:700}}>{card.owner}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <SecH title="Publishing calendar" meta="June 2026" right={<Tabs2 tabs={["Month","Week","List"]} active="Month" onChange={()=>{}} theme={t}/>} theme={t}/>
      <Panel theme={t}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,textTransform:"uppercase",letterSpacing:".08em",color:t.inkFaint,fontWeight:600}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {[
            {d:null},{d:1,chips:["Blog"]},{d:2},{d:3,chips:["SEO","Social"],today:true},{d:4,chips:["Video"]},{d:5,chips:["Social"]},{d:6},
            {d:7},{d:8,chips:["Blog"]},{d:9},{d:10,chips:["Email"]},{d:11,chips:["Case"]},{d:12},{d:13},
            {d:14},{d:15,chips:["SEO"]},{d:16},{d:17,chips:["Social"]},{d:18},{d:19},{d:20},
          ].map((cell,i)=>(
            <div key={i} style={{background:cell&&cell.today?`${t.accent}11`:cell?t.bgSunk:"rgba(0,0,0,.2)",borderRadius:8,padding:"6px 7px",minHeight:72,border:cell&&cell.today?`1px solid ${t.accent}`:`1px solid ${t.line}`,opacity:cell&&cell.d?1:.25}}>
              {cell&&cell.d&&<div style={{fontSize:11,color:cell.today?t.accent:t.inkFaint,fontFamily:"'JetBrains Mono',monospace",marginBottom:5,fontWeight:cell.today?700:400}}>{cell.d}</div>}
              {cell&&(cell.chips||[]).map((ch,j)=><div key={j} style={{marginBottom:2}}><CTag label={ch} theme={t}/></div>)}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AttributionView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Lead <em style={{fontStyle:"italic",color:t.accentDeep}}>Attribution</em></>} sub="First-touch + multi-touch · synced from CRM · last 30 days" actions={<><Btn theme={t}>First-touch ▾</Btn><Btn theme={t}>Export</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Total leads" value="312" trend="▲ 11.8%" trendDir="up" theme={t}/>
        <KpiCard label="Blended CPL" value="$48" trend="▼ 19%" trendDir="down-good" sub="vs vendor $84" theme={t}/>
        <KpiCard label="Lead → MQL" value={<>34<small style={{fontSize:18,color:t.inkFaint}}>%</small></>} trend="▲ 3pt" trendDir="up" theme={t}/>
        <KpiCard label="MQL → closed" value={<>22<small style={{fontSize:18,color:t.inkFaint}}>%</small></>} trend="▲ 2pt" trendDir="up" theme={t}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}>
          <PHead title="CPL by channel" sub="What each lead actually costs — the case for in-house" theme={t}/>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginTop:4}}>
            <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Channel","Leads","Cost","CPL","vs blended"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:h==="Channel"?"left":"right",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600}}>{h}</th>)}</tr></thead>
            <tbody>{[
              ["Organic search",131,"$0*","~$11","good","Best"],
              ["LinkedIn organic",56,"$0*","~$14","good","Best"],
              ["Email",25,"$120","$5","good","Best"],
              ["Direct / referral",75,"$0","$0","neutral","Brand"],
              ["Paid (Google)",25,"$1,975","$79","warn","Above"],
            ].map((r,i)=>(
              <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
                <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
                <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[1]}</td>
                <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:t.inkMuted}}>{r[2]}</td>
                <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:r[3]==="warn"?t.warn:t.good}}>{r[3]}</td>
                <td style={{padding:"12px 14px",textAlign:"right"}}><Pill v={r[4]} theme={t}>{r[5]}</Pill></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{marginTop:12,fontSize:12,color:t.inkFaint}}>*Organic/social carry no per-lead media cost — only the fixed cost of the in-house team.</div>
        </Panel>
        <Panel theme={t}>
          <PHead title="Conversion funnel" sub="This month" theme={t}/>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>{[
            {label:"Visitors",val:"21,840",w:"100%",bg:t.accent,c:t.bg},
            {label:"Engaged",val:"8,210",w:"88%",bg:t.accentDeep,c:t.bg},
            {label:"Leads",val:"312",w:"62%",bg:`linear-gradient(135deg,${t.accent},${t.accentHover})`,c:t.bg},
            {label:"MQL",val:"106",w:"42%",bg:`linear-gradient(135deg,${t.good},${t.teal})`,c:t.bg},
            {label:"Closed",val:"23",w:"26%",bg:t.ink,c:t.bg},
          ].map(r=>(
            <div key={r.label} style={{background:r.bg,color:r.c,borderRadius:8,padding:"14px 16px",width:r.w,boxSizing:"border-box",transition:"width .4s"}}>
              <div style={{fontSize:11,opacity:.85,textTransform:"uppercase",letterSpacing:".06em"}}>{r.label}</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:400}}>{r.val}</div>
            </div>
          ))}</div>
        </Panel>
      </div>
      <Panel theme={t} flush>
        <PHead title="Recent attributed leads" sub="Live from CRM sync" theme={t} b right={<Pill v="good" theme={t}>● CRM connected</Pill>}/>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>{["Lead","First touch","Landing page","Stage","Value"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:10.5,textTransform:"uppercase",letterSpacing:".07em",color:t.inkFaint,fontWeight:600,background:t.bgElevated}}>{h}</th>)}</tr></thead>
          <tbody>{[
            ["SunPro Solar (FL)","accent","Organic","/solutions/solar","info","MQL","$8,400"],
            ["Coastal Builders Group","good","LinkedIn","/solutions/developers","good","Closed","$22,000"],
            ["M. Reyes Contracting","accent","Organic","/areas/orlando","neutral","New","—"],
            ["Apex Roofing","warn","Paid","/services/florida","info","MQL","$5,200"],
            ["Hartman Architects","neutral","Referral","/solutions/architects","good","Closed","$14,800"],
          ].map((r,i)=>(
            <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${t.line}`}}>
              <td style={{padding:"12px 14px",fontWeight:500,color:t.ink}}>{r[0]}</td>
              <td style={{padding:"12px 14px"}}><Pill v={r[1]} theme={t}>{r[2]}</Pill></td>
              <td style={{padding:"12px 14px",fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{r[3]}</td>
              <td style={{padding:"12px 14px"}}><Pill v={r[4]} theme={t}>{r[5]}</Pill></td>
              <td style={{padding:"12px 14px",fontFamily:"'JetBrains Mono',monospace",color:t.ink,fontWeight:600}}>{r[6]}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
    </div>
  );
}

function ReportsView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Reports & <em style={{fontStyle:"italic",color:t.accentDeep}}>Exports</em></>} sub="Build, schedule, and send branded reports — replace client reporting tools" actions={<Btn theme={t} accent>+ Build report</Btn>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:15,marginBottom:30}}>
        {[
          {title:"Monthly Executive Summary",sub:"KPIs, organic, leads, channel ROI",border:t.accent,sched:"Auto-sends 1st of month · 3 recipients"},
          {title:"SEO Performance Report",sub:"Rankings, clicks, technical health, backlinks",border:t.teal,sched:"Auto-sends weekly · Mondays 8am"},
          {title:"Social & Content Recap",sub:"Engagement, top posts, content shipped",border:t.gold,sched:"Manual · on demand"},
        ].map(r=>(
          <Panel key={r.title} theme={t} style={{borderTop:`3px solid ${r.border}`}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:16.5,fontWeight:500,color:t.ink,marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:12,color:t.inkMuted,marginBottom:14}}>{r.sub}</div>
            <div style={{display:"flex",gap:8}}><Btn theme={t} sm>Preview</Btn><Btn theme={t} sm accent>Export PDF</Btn></div>
            <div style={{marginTop:12,fontSize:12,color:t.inkFaint}}>{r.sched}</div>
          </Panel>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t} flush>
          <PHead title="Scheduled reports" sub="Automated delivery" theme={t} b right={<Btn theme={t} sm>+ Schedule</Btn>}/>
          <div style={{padding:"6px 22px 14px"}}>{[
            {title:"Monthly Executive Summary",desc:"PDF → marshall@, leadership@ · 1st of month",on:true},
            {title:"Weekly SEO Snapshot",desc:"PDF + CSV → marketing@ · Mon 8:00am",on:true},
            {title:"Daily lead digest",desc:"Email → sales@ · weekdays 7:00am",on:true},
            {title:"Quarterly board deck",desc:"PDF → leadership@ · paused until Q3",on:false},
          ].map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${t.line}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:t.ink}}>{r.title}</div>
                <div style={{fontSize:11.5,color:t.inkMuted,marginTop:2}}>{r.desc}</div>
              </div>
              <Pill v={r.on?"good":"neutral"} theme={t}>{r.on?"● On":"Off"}</Pill>
            </div>
          ))}</div>
        </Panel>
        <Panel theme={t}>
          <PHead title="Report builder" sub="Pick modules to include" theme={t}/>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>{[
            {label:"KPI snapshot",on:true},{label:"Organic search performance",on:true},{label:"Keyword movements",on:true},
            {label:"Social performance",on:false},{label:"Lead attribution & CPL",on:true},{label:"Paid advertising summary",on:false},
          ].map((r,i)=>(
            <label key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer"}}>
              <span style={{width:18,height:18,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:r.on?t.good:t.bgElevated,border:`1px solid ${r.on?t.good:t.lineStrong}`}}>
                {r.on&&<Check size={11} style={{color:t.bg}}/>}
              </span>
              <span style={{fontSize:13.5,fontWeight:500,color:t.ink}}>{r.label}</span>
            </label>
          ))}</div>
          <button style={{width:"100%",padding:"11px",background:t.accent,color:t.bg,border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:16,fontFamily:"'IBM Plex Sans',inherit"}}>Generate report</button>
        </Panel>
      </div>
    </div>
  );
}

function IntegrationsView({theme:t}){
  const integs=[
    {name:"Search Console",desc:"Clicks, impressions, queries",bg:"#4285F4",abbr:"G",status:"good"},
    {name:"Analytics 4",desc:"Sessions, conversions",bg:"#E8710A",abbr:"A",status:"good"},
    {name:"Tag Manager",desc:"Event tracking",bg:"#34A853",abbr:"T",status:"good"},
    {name:"Google Ads",desc:"Spend, conversions",bg:"#FBBC04",abbr:"Ad",tc:"#3c4043",status:"good"},
    {name:"Ahrefs / Semrush",desc:"Rankings, backlinks, KD",bg:"#1A1A1A",abbr:"Ah",status:"good"},
    {name:"LinkedIn Pages",desc:"Followers, engagement",bg:"#0A66C2",abbr:"in",status:"good"},
    {name:"Meta (IG + FB)",desc:"Insights API",bg:"#C13584",abbr:"IG",status:"warn"},
    {name:"CRM",desc:"Lead attribution sync",bg:t.accent,abbr:"C",tc:t.bg,status:"good"},
  ];
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Integrations & <em style={{fontStyle:"italic",color:t.accentDeep}}>Data</em></>} sub="Where this console pulls its numbers · own every account" actions={<Btn theme={t} accent>+ Connect source</Btn>} theme={t}/>
      <SecH title="Connected data sources" meta="Pull through official APIs — never a third-party aggregator" theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        {integs.map(it=>(
          <Panel key={it.name} theme={t}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:9,background:it.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:it.tc||"#fff",flexShrink:0}}>{it.abbr}</div>
              <div><div style={{fontSize:14,fontWeight:600,color:t.ink}}>{it.name}</div><div style={{fontSize:11.5,color:t.inkMuted}}>{it.desc}</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <Pill v={it.status==="warn"?"warn":"good"} theme={t}>{it.status==="good"?"● Connected":"Re-auth"}</Pill>
              <div style={{width:36,height:20,borderRadius:20,background:it.status==="good"?t.good:t.warn,position:"relative",cursor:"pointer"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,right:2}}/>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t} flush>
          <PHead title="Account ownership audit" sub="Confirm you — not a vendor — owns every account." theme={t} b right={<Pill v="warn" theme={t}>2 open</Pill>}/>
          <div style={{padding:"6px 22px 16px"}}>{[
            {title:"Search Console — primary owner confirmed",desc:"marshall@ is verified owner",done:true},
            {title:"GA4 property — admin access reclaimed",desc:"Vendor downgraded to viewer",done:true},
            {title:"Google Tag Manager — container ownership",desc:"Transferred to Alliance Google account",done:true},
            {title:"Google Ads — billing & admin transfer",desc:"Still under vendor MCC — request transfer",done:false},
            {title:"Social profiles — admin role on all 4",desc:"Confirm LinkedIn, IG, FB, X admin is yours",done:false},
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 0",borderBottom:`1px solid ${t.line}`}}>
              <span style={{width:18,height:18,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,background:r.done?t.good:t.bgElevated,border:`1px solid ${r.done?t.good:t.lineStrong}`}}>
                {r.done&&<Check size={11} style={{color:t.bg}}/>}
              </span>
              <div>
                <div style={{fontSize:13.5,fontWeight:500,color:r.done?t.inkFaint:t.ink,textDecoration:r.done?"line-through":"none"}}>{r.title}</div>
                <div style={{fontSize:12,color:t.inkMuted,marginTop:2}}>{r.desc}</div>
              </div>
            </div>
          ))}</div>
        </Panel>
        <Panel theme={t}>
          <PHead title="Data freshness" sub="Last successful sync per source" theme={t}/>
          <div>{[
            {name:"Search Console",time:"4 min ago",ok:true},{name:"Analytics 4",time:"4 min ago",ok:true},
            {name:"Google Ads",time:"1 hr ago",ok:true},{name:"Ahrefs rankings",time:"Daily · 6am",ok:true},
            {name:"Meta insights",time:"Needs re-auth",ok:false},{name:"CRM leads",time:"Real-time",ok:true},
          ].map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${t.line}`}}>
              <div style={{fontSize:13,color:t.ink,fontWeight:450}}>{r.name}</div>
              {r.ok?<span style={{fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{r.time}</span>:<Pill v="warn" theme={t}>{r.time}</Pill>}
            </div>
          ))}</div>
        </Panel>
      </div>
    </div>
  );
}

// ── LOGINS VIEW ───────────────────────────────────────────────
function LoginsView({companyId,theme:t}){
  const blank=()=>({media:"",username:"",password:""});
  const emptyMap=useMemo(()=>{const b={};for(const c of COMPANIES)b[c.id]=[blank()];return b;},[]);
  const [logins,setLogins]=useState(emptyMap);
  const [msg,setMsg]=useState("");
  const [vis,setVis]=useState({});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let x=false;(async()=>{setLoading(true);try{const shared=await dbLoadCompanyLogins();if(x)return;setLogins(cur=>{const n={...cur};for(const c of COMPANIES){const rows=shared[c.id]||[];n[c.id]=rows.length?rows:[blank()];}return n;});}catch{if(!x)setMsg("Failed to load");}finally{if(!x)setLoading(false);}})();return()=>{x=true;};},[]);
  const companies=companyId==="all"?COMPANIES:COMPANIES.filter(c=>c.id===companyId);
  const sf=(cid,idx,f,v)=>setLogins(c=>({...c,[cid]:c[cid].map((r,i)=>i===idx?{...r,[f]:v}:r)}));
  const addRow=cid=>setLogins(c=>({...c,[cid]:[...c[cid],blank()]}));
  const remRow=(cid,idx)=>setLogins(c=>{if(c[cid].length===1)return c;return{...c,[cid]:c[cid].filter((_,i)=>i!==idx)};});
  const rk=(cid,idx)=>`${cid}-${idx}`;
  const tog=(cid,idx)=>setVis(v=>({...v,[rk(cid,idx)]:!v[rk(cid,idx)]}));
  const cp=async(val,lbl)=>{if(!val)return;try{await navigator.clipboard.writeText(val);setMsg(`${lbl} copied`);setTimeout(()=>setMsg(""),1200);}catch{setMsg("Copy failed");setTimeout(()=>setMsg(""),1200);}};
  const save=async()=>{try{for(const c of COMPANIES){const cl=(logins[c.id]||[]).filter(r=>r.media||r.username||r.password);await dbReplaceCompanyLogins(c.id,cl);}setMsg("Saved");setTimeout(()=>setMsg(""),2000);}catch{setMsg("Save failed");setTimeout(()=>setMsg(""),2000);}};
  const IS=iS(t);
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Company <em style={{fontStyle:"italic",color:t.accentDeep}}>Logins</em></>} sub="Shared social media credentials · visible to all team members"
        actions={<div style={{display:"flex",alignItems:"center",gap:10}}>{msg&&<span style={{color:t.good,fontSize:12,fontWeight:700}}>{msg}</span>}<Btn theme={t} accent onClick={save}>Save logins</Btn></div>} theme={t}/>
      {companies.map(co=>(
        <div key={co.id} style={{background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:12,padding:22,marginBottom:16,boxShadow:t.shadowCard}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:co.color,display:"inline-block"}}/>
              <strong style={{fontSize:14,color:t.ink}}>{co.name}</strong>
            </div>
            <Btn theme={t} sm onClick={()=>addRow(co.id)}>+ Add row</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,marginBottom:8}}>
            {["Media","Username","Password","Actions"].map(h=><span key={h} style={{fontSize:11,fontWeight:700,color:t.inkFaint,letterSpacing:".04em",textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {logins[co.id].map((row,idx)=>(
            <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"center",marginBottom:8}}>
              {["media","username","password"].map(f=>(
                <input key={f} type={f==="password"&&!vis[rk(co.id,idx)]?"password":"text"} value={row[f]}
                  onChange={e=>sf(co.id,idx,f,e.target.value)} placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                  style={{...IS,margin:0}}/>
              ))}
              <div style={{display:"flex",gap:6}}>
                {[
                  {i:<Copy size={14}/>,a:()=>cp(row.username,"Username"),title:"Copy username"},
                  {i:<Copy size={14}/>,a:()=>cp(row.password,"Password"),title:"Copy password"},
                  {i:vis[rk(co.id,idx)]?<EyeOff size={14}/>:<Eye size={14}/>,a:()=>tog(co.id,idx),title:"Toggle"},
                  {i:<X size={14}/>,a:()=>remRow(co.id,idx),title:"Remove",danger:true},
                ].map((b,bi)=>(
                  <button key={bi} onClick={b.a} title={b.title} disabled={b.danger&&logins[co.id].length===1} style={{border:`1px solid ${t.lineStrong}`,background:t.bgElevated,color:b.danger?t.bad:t.inkMuted,borderRadius:8,width:34,height:34,display:"grid",placeItems:"center",cursor:"pointer",opacity:b.danger&&logins[co.id].length===1?.4:1}}>{b.i}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      {loading&&<div style={{color:t.inkFaint,fontSize:13,fontStyle:"italic"}}>Loading shared logins…</div>}
    </div>
  );
}

// ── SETUP SCREEN ──────────────────────────────────────────────
function SetupScreen({onDone,me}){
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const run=async()=>{setBusy(true);setErr("");try{const r=await fetch("/api/seed",{method:"POST"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Seed failed");await onDone();}catch(e){setErr(e?.message||String(e));setBusy(false);}};
  return(
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0E0F12",fontFamily:"'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif",padding:20}}>
      <div style={{width:480,maxWidth:"92vw",background:"#17181D",borderRadius:16,padding:36,border:"1px solid rgba(255,180,120,.14)",boxShadow:"0 24px 60px rgba(0,0,0,.6)"}}>
        <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(150deg,#FF7A1A,#FFB020)",display:"grid",placeItems:"center",fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:"#1A1206",marginBottom:20}}>M</div>
        <h1 style={{fontSize:22,fontWeight:500,margin:"0 0 8px",color:"#F5F2EE",fontFamily:"'Fraunces',serif",letterSpacing:"-.02em"}}>One-time setup</h1>
        <p style={{fontSize:13.5,color:"#A8A29B",lineHeight:1.6,margin:"0 0 24px"}}>Your database is empty. Load the master SEO + Paid/Social checklists for all three companies.</p>
        <button onClick={run} disabled={busy} style={{width:"100%",padding:"13px",background:"#FF7A1A",color:"#1A1206",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:busy?"default":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"Loading master tasks…":"Load master tasks"}</button>
        {err&&<div style={{marginTop:14,color:"#FF6B5E",fontSize:13}}>{err}</div>}
        <div style={{marginTop:18,fontSize:12,color:"#6F6A63"}}>Signed in as {me}</div>
      </div>
    </div>
  );
}

// ── NEW TASK MODAL ─────────────────────────────────────────────
function NewTaskModal({open,onClose,onCreate,defaults,companyId,track,theme:t}){
  const [title,setTitle]=useState("");const [phase,setPhase]=useState(defaults.phase);const [priority,setPriority]=useState("medium");const [cadence,setCadence]=useState("one-time");const [deadline,setDeadline]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!open)return;setTitle("");setPhase(defaults.phase);setPriority("medium");setCadence("one-time");setDeadline("");},[open,defaults.phase]);
  if(!open)return null;
  const IS=iS(t);
  const submit=async()=>{if(!title.trim())return;setBusy(true);try{await onCreate({company_id:companyId==="all"?COMPANIES[0].id:companyId,track,phase,title:title.trim(),priority,cadence,deadline:deadline||null});onClose();}finally{setBusy(false);}};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"flex-end",zIndex:100,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{width:500,maxWidth:"92vw",background:t.bgCard,height:"100%",overflowY:"auto",padding:28,borderLeft:`1px solid ${t.lineStrong}`,boxShadow:"-20px 0 60px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:t.accent}}>New Task</span>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:6,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={16}/></button>
        </div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:400,color:t.ink,margin:"0 0 24px",letterSpacing:"-.02em"}}>Add a task</h2>
        {[
          {label:"Task title",content:<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter a task title" style={IS}/>},
          {label:"Priority",content:<div style={{display:"flex",gap:8}}>{["high","medium","low"].map(p=><button key={p} onClick={()=>setPriority(p)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:12.5,fontWeight:500,textTransform:"capitalize",fontFamily:"inherit",borderColor:priority===p?t.accent:t.lineStrong,background:priority===p?t.accentSoft:t.bgElevated,color:priority===p?t.accentDeep:t.inkMuted}}>{p}</button>)}</div>},
          {label:"Cadence",content:<select value={cadence} onChange={e=>setCadence(e.target.value)} style={IS}>{["one-time","weekly","monthly","quarterly"].map(c=><option key={c} value={c}>{c}</option>)}</select>},
          {label:"Deadline",content:<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={IS}/>},
        ].map(({label,content})=>(
          <div key={label} style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:t.inkFaint,marginBottom:7}}>{label}</label>
            {content}
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn theme={t} onClick={onClose}>Cancel</Btn>
          <Btn theme={t} accent onClick={submit}>{busy?"Creating…":"Create task"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── BOARD VIEW ────────────────────────────────────────────────
const SEO_MASTER=[["Phase 1 — Foundations & Access",[["Secure domain + business email on the domain","high","one-time"],["Create the central Google account that owns all assets","high","one-time"],["Document all logins in a shared password manager","high","one-time"],["Confirm site is on HTTPS with valid SSL","high","one-time"]]],["Phase 2 — Measurement & Verification",[["Set up & verify Google Search Console","high","one-time"],["Install GA4 and confirm tracking","high","one-time"],["Configure GA4 conversion events","high","one-time"],["Submit XML sitemap in Search Console","high","one-time"],["Audit robots.txt for accidental blocks","high","one-time"],["Decide AI-crawler policy","medium","one-time"],["Connect GA4 + GSC; install rank/audit tool","medium","one-time"]]],["Phase 3 — Keyword & Market Research",[["Build seed keyword list","high","one-time"],["Map search intent to each keyword","high","one-time"],["Run competitor gap analysis","medium","one-time"],["Group keywords into topic clusters","high","one-time"],["Refresh keyword research & rankings","medium","quarterly"]]],["Phase 4 — Technical SEO",[["Confirm crawl/render/index of key pages","high","one-time"],["Pass Core Web Vitals (LCP, INP, CLS)","high","monthly"],["Ensure fully responsive mobile experience","high","one-time"],["Set canonicals; fix duplicate content","medium","one-time"],["Add structured data / schema","high","one-time"],["Fix broken links and 4xx/5xx","medium","monthly"],["Run full-site crawl audit","medium","quarterly"]]],["Phase 5 — On-Page SEO",[["Unique title tags + meta descriptions","high","one-time"],["One H1 + logical heading hierarchy","medium","one-time"],["One primary keyword per page","medium","one-time"],["Optimize images","medium","one-time"],["Add concise top-of-page answers","high","one-time"]]],["Phase 6 — Content & E-E-A-T",[["Publish pillar + cluster content","high","monthly"],["Add author bios, credentials, experience","high","one-time"],["Show trust signals","high","one-time"],["Consolidate / improve thin pages","medium","quarterly"],["Refresh existing top content","medium","monthly"]]],["Phase 7 — Local SEO",[["Create / complete Google Business Profile","high","one-time"],["Make NAP identical everywhere","high","one-time"],["Location/service-area page per location","medium","one-time"],["Build citations in directories","medium","one-time"],["Post GBP updates; request & reply to reviews","medium","weekly"]]],["Phase 8 — Off-Page & Authority",[["Set up brand profiles; earn mentions","medium","monthly"],["Run targeted link building","medium","monthly"],["Monitor backlinks; disavow toxic only","low","quarterly"]]],["Phase 9 — AI Search Readiness",[["Confirm AI crawlers can access the site","high","one-time"],["Format content for AI extraction","high","monthly"],["Strengthen entity/topic coverage","medium","quarterly"],["Track brand citations in AI results","low","monthly"]]],["Phase 10 — Measurement & Reporting",[["Build reporting dashboard","high","one-time"],["Review Search Console performance","medium","weekly"],["Monthly performance review vs goals","medium","monthly"],["Quarterly full audit + strategy reset","medium","quarterly"]]]];
const PAID_MASTER=[["Phase 1 — Paid Foundations",[["Create Google Ads account","high","one-time"],["Define primary objective","high","one-time"],["Link Google Ads to GA4","high","one-time"]]],["Phase 2 — Conversion Tracking",[["Set up Google Tag Manager","high","one-time"],["Create conversion actions","high","one-time"],["Place conversion tag on thank-you pages","high","one-time"],["Confirm GA4 isn't double-counting","high","one-time"]]],["Phase 3 — Campaign Structure",[["Set account hierarchy","high","one-time"],["Separate Brand, Non-Brand, PMax","high","one-time"],["Build tight ad groups","high","one-time"],["Add 20+ negative keywords before launch","high","one-time"],["Write 2–3 Responsive Search Ads per ad group","high","one-time"]]],["Phase 4 — Launch & Budget",[["Set location targeting to Presence only","high","one-time"],["Set daily budget high enough","high","one-time"],["Start with Maximize Clicks","high","one-time"],["Monitor closely for first 48–72 hours","high","one-time"]]],["Phase 5 — Paid Optimization",[["Review Search Terms Report after ~100 clicks","high","weekly"],["Weekly budget review","high","weekly"],["Test new ad variations","medium","monthly"],["Run a full Google Ads audit","medium","quarterly"]]],["Phase 6 — Social Foundations",[["Create/claim business accounts","high","one-time"],["Apply consistent branding","high","one-time"],["Write keyword-clear bios","high","one-time"]]],["Phase 7 — Social Strategy",[["Write a one-sentence positioning statement","high","one-time"],["Create audience personas","high","one-time"],["Define 3–5 content pillars","high","one-time"]]],["Phase 8 — Content Creation",[["Build a content calendar","high","one-time"],["Bank 15–20 posts before launch","high","one-time"],["Shoot 5–10 short-form videos","high","monthly"],["Repurpose each core asset","medium","weekly"]]],["Phase 9 — Engagement",[["Post consistently (3–5×/week)","high","weekly"],["Reply to comments and DMs","high","weekly"]]],["Phase 10 — Paid Social",[["Install Meta Pixel","high","one-time"],["Build first-party custom audiences","high","one-time"],["A/B test creatives","medium","monthly"]]],["Phase 11 — Analytics & Reporting",[["Build combined dashboard","high","one-time"],["Review platform analytics weekly","medium","weekly"],["Monthly performance review","medium","monthly"]]]];
const SEO_TIMELINE=[{phase:"Phase 1 — Foundations & Access",start:1,len:2,kind:"one-time"},{phase:"Phase 2 — Measurement & Verification",start:1,len:2,kind:"one-time"},{phase:"Phase 3 — Keyword & Market Research",start:2,len:2,kind:"one-time"},{phase:"Phase 4 — Technical SEO",start:3,len:3,kind:"one-time"},{phase:"Phase 5 — On-Page SEO",start:4,len:2,kind:"one-time"},{phase:"Phase 6 — Content & E-E-A-T",start:5,len:3,kind:"recurring"},{phase:"Phase 7 — Local SEO",start:6,len:2,kind:"recurring"},{phase:"Phase 8 — Off-Page & Authority",start:7,len:6,kind:"recurring"},{phase:"Phase 9 — AI Search Readiness",start:8,len:5,kind:"recurring"},{phase:"Phase 10 — Measurement & Reporting",start:9,len:4,kind:"recurring"}];

function BoardView({tasks,companyId,track,statusFilter,theme:t,onOpen,onUpdate,todayISO,weekISO}){
  const visible=useMemo(()=>tasks.filter(tk=>(companyId==="all"||tk.companyId===companyId)&&tk.track===track&&(statusFilter==="all"||tk.status===statusFilter)&&(!tk.recurring||(tk.deadline>=todayISO&&tk.deadline<=weekISO))),[tasks,companyId,track,statusFilter,todayISO,weekISO]);
  const grouped=useMemo(()=>{const m=new Map();for(const tk of visible){if(!m.has(tk.phase))m.set(tk.phase,[]);m.get(tk.phase).push(tk);}return[...m.entries()];},[visible]);
  if(!grouped.length)return <div style={{flex:1,overflowY:"auto",padding:"22px 38px 60px"}}><div style={{textAlign:"center",color:t.inkFaint,padding:50,fontSize:14}}>No tasks match this filter.</div></div>;
  return(
    <div style={{flex:1,overflowY:"auto",padding:"22px 38px 60px"}}>
      {grouped.map(([phase,items])=>{
        const done=items.filter(tk=>tk.status==="done").length;
        return(
          <div key={phase} style={{marginBottom:24,background:t.bgCard,borderRadius:14,border:`1px solid ${t.line}`,overflow:"hidden",boxShadow:t.shadowCard}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px",background:t.bgElevated,borderBottom:`1px solid ${t.line}`}}>
              <span style={{fontWeight:700,fontSize:13.5,color:t.ink,letterSpacing:"-.01em"}}>{phase}</span>
              <span style={{fontSize:12,color:t.inkFaint,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{done}/{items.length}</span>
            </div>
            {items.map(tk=>{
              const St=STATUSES[tk.status];const Ico=St.icon;const sC=stC(tk.status,t);
              const co=COMPANIES.find(c=>c.id===tk.companyId);
              return(
                <div key={tk.id} className="task-row" style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",borderBottom:`1px solid ${t.line}`,transition:"background .12s",cursor:"default"}}>
                  <button onClick={()=>{const i=STATUS_ORDER.indexOf(tk.status);onUpdate(tk.id,{status:STATUS_ORDER[(i+1)%4]});}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"grid",placeItems:"center",color:sC}}><Ico size={17}/></button>
                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>onOpen(tk.id)}>
                    <div style={{fontSize:14,fontWeight:500,color:tk.status==="done"?t.inkFaint:t.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:tk.status==="done"?"line-through":"none"}}>{tk.title}</div>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:4,flexWrap:"wrap"}}>
                      {companyId==="all"&&co&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:5,background:co.color+"22",color:co.color}}>{co.short}</span>}
                      <span style={{fontSize:11,color:t.inkFaint,background:t.bgElevated,padding:"2px 7px",borderRadius:5,fontWeight:600}}>{tk.cadence}</span>
                      {tk.deadline&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Calendar size={11}/>{tk.deadline}</span>}
                      {tk.assignees.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Users size={11}/>{tk.assignees.join(", ")}</span>}
                      {tk.notes.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><MessageSquare size={11}/>{tk.notes.length}</span>}
                    </div>
                  </div>
                  <button onClick={()=>{const o=["high","medium","low"];const i=o.indexOf(tk.priority);onUpdate(tk.id,{priority:o[(i+1)%3]});}} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
                    <Star size={15} style={{color:PRIORITIES[tk.priority],fill:tk.priority==="high"?PRIORITIES.high:"none"}}/>
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── CALENDAR VIEW ─────────────────────────────────────────────
function CalendarView({tasks,companyId,theme:t}){
  const [cal,setCal]=useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const {y,m}=cal;
  const dated=useMemo(()=>tasks.filter(tk=>tk.deadline&&(companyId==="all"||tk.companyId===companyId)),[tasks,companyId]);
  const byDay=useMemo(()=>{const map={};for(const tk of dated)(map[tk.deadline]||=[]).push(tk);return map;},[dated]);
  const first=new Date(y,m,1);const sDow=first.getDay();const dim=new Date(y,m+1,0).getDate();
  const todayStr=new Date().toISOString().slice(0,10);
  const cells=[];for(let i=0;i<sDow;i++)cells.push(null);
  for(let d=1;d<=dim;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;cells.push({d,ds,tasks:byDay[ds]||[]});}
  while(cells.length%7!==0)cells.push(null);
  const monthCount=dated.filter(tk=>tk.deadline.startsWith(`${y}-${String(m+1).padStart(2,"0")}`)).length;
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 38px 24px",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:14,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setCal(m===0?{y:y-1,m:11}:{y,m:m-1})} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:9,padding:7,cursor:"pointer",color:t.inkMuted,display:"grid",placeItems:"center"}}><ChevronLeft size={18}/></button>
          <h2 style={{margin:0,fontSize:20,fontWeight:500,letterSpacing:"-.02em",color:t.ink,minWidth:170,textAlign:"center",fontFamily:"'Fraunces',serif"}}>{MONTHS[m]} {y}</h2>
          <button onClick={()=>setCal(m===11?{y:y+1,m:0}:{y,m:m+1})} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:9,padding:7,cursor:"pointer",color:t.inkMuted,display:"grid",placeItems:"center"}}><ChevronRight size={18}/></button>
          <button onClick={()=>{const d=new Date();setCal({y:d.getFullYear(),m:d.getMonth()});}} style={{background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",marginLeft:4,fontFamily:"inherit"}}>Today</button>
        </div>
        <span style={{fontSize:12.5,color:t.inkMuted,fontWeight:600}}>{monthCount} task{monthCount!==1?"s":""} due this month</span>
      </div>
      <div style={{flex:1,overflowY:"auto",border:`1px solid ${t.line}`,borderRadius:14,minHeight:0,background:t.bgCard}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:1,background:t.line}}>
          {DOW.map(d=><div key={d} style={{background:t.bgElevated,padding:"11px 0",textAlign:"center",fontSize:11.5,fontWeight:700,color:t.inkMuted,letterSpacing:".08em",textTransform:"uppercase"}}>{d}</div>)}
          {cells.map((cell,i)=>{
            if(!cell)return <div key={i} style={{background:t.bgSunk,minHeight:160}}/>;
            const isT=cell.ds===todayStr;
            return(
              <div key={i} style={{background:isT?`${t.accent}11`:t.bgCard,minHeight:160,padding:"7px 8px",display:"flex",flexDirection:"column",border:isT?`1px solid ${t.accent}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${t.line}`}}>
                  <div style={{fontSize:14,fontWeight:700,color:isT?t.bg:t.inkMuted,...(isT?{background:t.accent,width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:12}:{})}}>{cell.d}</div>
                  {cell.tasks.length>0&&<span style={{fontSize:10.5,fontWeight:700,color:t.accent,background:t.accentSoft,borderRadius:9,padding:"2px 8px"}}>{cell.tasks.length}</span>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,overflowY:"auto"}}>
                  {cell.tasks.slice(0,5).map(tk=>{const co=COMPANIES.find(c=>c.id===tk.companyId);return(
                    <div key={tk.id} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,borderLeft:`3px solid ${co?.color||t.accent}`,borderRadius:6,padding:"5px 7px",fontSize:11.5,color:t.inkMuted,overflow:"hidden"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:stC(tk.status,t),flexShrink:0}}/>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</span>
                    </div>
                  );})}
                  {cell.tasks.length>5&&<span style={{fontSize:11,color:t.accent,fontWeight:700,padding:"2px 0"}}>+{cell.tasks.length-5} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SelPhasePanel({ph,onClose,t}){
  return(
    <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${t.line}`}}>
      <div style={{background:t.bgCard,borderRadius:10,padding:16,border:`1px solid ${t.line}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:10}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,fontWeight:500,color:t.ink}}>
            <span style={{width:10,height:10,borderRadius:3,background:ph.kind==="recurring"?"#1D9E75":"#7F77DD",display:"inline-block"}}/>{ph.phase}
          </div>
          <div style={{fontSize:12,color:t.inkFaint,display:"flex",gap:10}}><span>{ph.tasks.length} tasks</span><span>Weeks {ph.start}–{ph.start+ph.len-1}</span></div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {ph.tasks.slice(0,8).map(tk=><div key={tk.id} style={{fontSize:12,color:t.inkMuted,background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:7,padding:"5px 10px"}}>{tk.title}</div>)}
          {ph.tasks.length===0&&<div style={{fontSize:13,color:t.inkFaint,fontStyle:"italic"}}>No tasks loaded yet.</div>}
        </div>
        <button onClick={onClose} style={{marginTop:10,background:t.bgElevated,color:t.inkMuted,border:`1px solid ${t.line}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
      </div>
    </div>
  );
}

// ── TIMELINE VIEW ─────────────────────────────────────────────
function TimelineView({tasks,companyId,setCompanyId,theme:t}){
  const [sel,setSel]=useState(null);
  const seoTasks=useMemo(()=>tasks.filter(tk=>tk.track==="seo"&&(companyId==="all"||tk.companyId===companyId)),[tasks,companyId]);
  const rows=useMemo(()=>SEO_TIMELINE.map(meta=>{const pt=seoTasks.filter(tk=>tk.phase===meta.phase);return{...meta,tasks:pt,done:pt.filter(tk=>tk.status==="done").length};}), [seoTasks]);
  const co=companyId==="all"?{name:"All Companies",short:"ALL"}:COMPANIES.find(c=>c.id===companyId)||COMPANIES[0];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 38px 24px",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:t.inkFaint,marginBottom:4}}><Building2 size={13}/>{co.name}</div>
          <h2 style={{margin:0,fontSize:20,fontWeight:500,letterSpacing:"-.02em",color:t.ink,fontFamily:"'Fraunces',serif"}}>SEO Setup & Management</h2>
        </div>
        <span style={{background:t.warnSoft,color:t.warn,fontSize:12,fontWeight:600,padding:"5px 11px",borderRadius:10}}>12-week rollout</span>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[{id:"all",short:"ALL",color:"rgba(255,255,255,.3)"},...COMPANIES].map(c=>{
          const active=companyId===c.id;
          return <button key={c.id} onClick={()=>setCompanyId(c.id)} style={{padding:"6px 16px",fontSize:13,fontWeight:500,borderRadius:10,cursor:"pointer",border:`1px solid ${active?c.color||t.accent:t.lineStrong}`,background:active?c.color||t.accent:"transparent",color:active?t.bg:t.inkMuted,fontFamily:"inherit"}}>{c.short}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:14,marginBottom:10,fontSize:12,flexWrap:"wrap",color:t.inkMuted}}>
        <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#7F77DD",display:"inline-block"}}/> One-time setup</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#1D9E75",display:"inline-block"}}/> Recurring</span>
      </div>
      <div style={{overflowX:"auto",flex:1,minHeight:0}}>
        <table style={{width:"100%",minWidth:860,borderCollapse:"collapse",tableLayout:"fixed",fontSize:13,background:t.bgCard,borderRadius:14,border:`1px solid ${t.line}`}}>
          <colgroup><col style={{width:270}}/><col style={{width:46}}/>{Array.from({length:12}).map((_,i)=><col key={i} style={{width:"6.25%"}}/>)}</colgroup>
          <thead><tr style={{borderBottom:`1px solid ${t.line}`}}>
            <th style={{padding:8,textAlign:"left",fontWeight:500,fontSize:12,color:t.inkFaint}}>Phase</th>
            <th style={{padding:8,textAlign:"center",fontWeight:500,fontSize:12,color:t.inkFaint}}>Tasks</th>
            {Array.from({length:12},(_,i)=><th key={i} style={{padding:8,fontWeight:500,fontSize:11,textAlign:"center",color:t.inkFaint}}>W{i+1}</th>)}
          </tr></thead>
          <tbody>{rows.map(ph=>{
            const isOpen=sel===ph.phase;
            return <tr key={ph.phase} style={{borderTop:`1px solid ${t.line}`,background:isOpen?t.bgElevated:"transparent"}}>
              <td style={{padding:"9px 8px"}}>
                <button onClick={()=>setSel(isOpen?null:ph.phase)} style={{background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",width:"100%"}}>
                  <span style={{fontSize:13.5,fontWeight:500,color:t.ink,lineHeight:1.35,display:"block"}}>{ph.phase}</span>
                  <span style={{fontSize:11.5,color:t.inkFaint,display:"block",marginTop:2}}>{ph.kind==="recurring"?"Recurring":"One-time"}</span>
                </button>
              </td>
              <td style={{padding:"9px 4px",textAlign:"center"}}>
                <button onClick={()=>setSel(isOpen?null:ph.phase)} style={{background:t.bgElevated,border:"none",borderRadius:999,minWidth:42,padding:"6px 10px",cursor:"pointer",fontSize:12,fontWeight:700,color:t.inkMuted,fontFamily:"'JetBrains Mono',monospace"}}>{ph.done}/{ph.tasks.length}</button>
              </td>
              {Array.from({length:12},(_,wi)=>{
                const w=wi+1;const isStart=w===ph.start;
                return <td key={w} style={{padding:"9px 0",height:22,verticalAlign:"middle",borderLeft:`1px solid ${t.line}`}}>
                  <div style={{position:"relative",height:18}}>
                    {isStart&&<button onClick={()=>setSel(isOpen?null:ph.phase)} style={{position:"absolute",top:-9,left:1,height:18,border:"none",borderRadius:5,background:ph.kind==="recurring"?"#1D9E75":"#7F77DD",width:`calc(${ph.len*100}% - 2px)`,opacity:isOpen?1:.9,cursor:"pointer",outline:isOpen?`2px solid ${t.accent}`:"none",outlineOffset:1}}/>}
                  </div>
                </td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      {sel&&rows.find(r=>r.phase===sel)&&<SelPhasePanel ph={rows.find(r=>r.phase===sel)} onClose={()=>setSel(null)} t={t}/>}
    </div>
  );
}

// ── TASK DRAWER ───────────────────────────────────────────────
function TaskDrawer({t:tk,onClose,update,company,me,onChanged,theme:th}){
  const [note,setNote]=useState("");const [linkUrl,setUrl]=useState("");const [linkLabel,setLbl]=useState("");const [busy,setBusy]=useState(false);
  const fileRef=useRef(null);const who=me||"Someone";const IS=iS(th);
  const togA=async name=>{const has=tk.assignees.includes(name);update(tk.id,{assignees:has?tk.assignees.filter(a=>a!==name):[...tk.assignees,name]});await dbSetAssignee(tk.id,name,!has);};
  const postNote=async()=>{if(!note.trim())return;const b=note.trim();setNote("");update(tk.id,{notes:[...tk.notes,{who,text:b,when:"just now"}]});await dbAddNote(tk.id,who,b);if(onChanged)onChanged();};
  const fmtSz=b=>b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(0)} KB`:`${(b/1048576).toFixed(1)} MB`;
  const onFiles=async fl=>{const files=Array.from(fl||[]);if(!files.length)return;setBusy(true);try{for(const f of files)await dbUploadFile(tk.id,f,who);if(onChanged)await onChanged();}catch(e){alert("Upload failed: "+(e?.message||e));}finally{setBusy(false);}};
  const addLink=async()=>{if(!linkUrl.trim())return;let u=linkUrl.trim();if(!/^https?:\/\//i.test(u))u="https://"+u;const l=linkLabel.trim()||u;setUrl("");setLbl("");await dbAddLink(tk.id,l,u,who);if(onChanged)await onChanged();};
  const remAtt=async a=>{await dbRemoveAttachment(a);if(onChanged)await onChanged();};
  const openAtt=async a=>{if(a.kind==="link"||a.type==="link"){window.open(a.url,"_blank");return;}if(a.storage_path){const u=await dbFileUrl(a.storage_path);if(u)window.open(u,"_blank");}};
  const sC2={not_started:th.inkFaint,in_progress:th.accent,blocked:th.bad,done:th.good};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"flex-end",zIndex:100,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{width:460,maxWidth:"92vw",background:th.bgCard,height:"100%",overflowY:"auto",padding:26,borderLeft:`1px solid ${th.lineStrong}`,boxShadow:"-20px 0 60px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:6,background:company.color+"22",color:company.color,letterSpacing:".04em"}}>{company.short}</span>
          <button onClick={onClose} style={{background:th.bgElevated,border:`1px solid ${th.line}`,borderRadius:8,padding:6,cursor:"pointer",color:th.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
        </div>
        <div style={{fontSize:11.5,color:th.inkFaint,fontWeight:600,marginBottom:4}}>{tk.phase}</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:400,letterSpacing:"-.02em",color:th.ink,margin:"0 0 22px",lineHeight:1.3}}>{tk.title}</h2>
        <Field label="Status" theme={th}>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{STATUS_ORDER.map(s=><button key={s} onClick={()=>update(tk.id,{status:s})} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,fontFamily:"inherit",border:`1px solid ${tk.status===s?sC2[s]:th.lineStrong}`,background:tk.status===s?sC2[s]+"22":th.bgElevated,color:tk.status===s?sC2[s]:th.inkMuted}}>{STATUSES[s].label}</button>)}</div>
        </Field>
        <Field label="Assignees" theme={th}>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{TEAM.map(n=><button key={n} onClick={()=>togA(n)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,fontFamily:"inherit",border:`1px solid ${tk.assignees.includes(n)?th.accent:th.lineStrong}`,background:tk.assignees.includes(n)?th.accentSoft:th.bgElevated,color:tk.assignees.includes(n)?th.accentDeep:th.inkMuted}}>{tk.assignees.includes(n)&&<Check size={12}/>}{n}</button>)}</div>
        </Field>
        <Field label="Deadline" theme={th}>
          <input type="date" value={tk.deadline||""} onChange={e=>update(tk.id,{deadline:e.target.value})} style={IS}/>
        </Field>
        <Field label="Attachments" theme={th}>
          {(tk.attachments||[]).length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:10}}>
              {(tk.attachments||[]).map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,background:th.bgElevated,border:`1px solid ${th.line}`,borderRadius:9,padding:"8px 10px"}}>
                  <div style={{width:34,height:34,borderRadius:7,background:th.bgSunk,display:"grid",placeItems:"center",color:th.inkMuted,flexShrink:0,fontSize:13}}>{a.kind==="link"?"🔗":"📎"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <button onClick={()=>openAtt(a)} style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",padding:0,fontSize:13,fontWeight:600,color:th.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",maxWidth:"100%"}}>{a.name}</button>
                    <div style={{fontSize:11,color:th.inkFaint,marginTop:1}}>{a.kind}{a.size?` · ${fmtSz(a.size)}`:""}</div>
                  </div>
                  <button onClick={()=>openAtt(a)} style={{background:"none",border:"none",color:th.inkFaint,cursor:"pointer",padding:5,display:"grid",placeItems:"center",borderRadius:6}}><Download size={14}/></button>
                  <button onClick={()=>remAtt(a)} style={{background:"none",border:"none",color:th.inkFaint,cursor:"pointer",padding:5,display:"grid",placeItems:"center",borderRadius:6}}><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 13px",border:`1.5px dashed ${th.lineStrong}`,borderRadius:10,cursor:"pointer",fontSize:12.5,color:th.inkFaint,background:th.bgSunk,marginBottom:9,opacity:busy?.6:1}} onClick={()=>!busy&&fileRef.current&&fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFiles(e.dataTransfer.files);}}>
            <Paperclip size={15} style={{opacity:.6}}/><span>{busy?"Uploading…":<>Drop a file, or <span style={{color:th.accent,fontWeight:600}}>browse</span></>}</span>
            <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>onFiles(e.target.files)}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <Link2 size={14} style={{opacity:.5,flexShrink:0,color:th.inkFaint}}/>
            <input value={linkLabel} onChange={e=>setLbl(e.target.value)} placeholder="Label" style={{...IS,maxWidth:120}}/>
            <input value={linkUrl} onChange={e=>setUrl(e.target.value)} placeholder="Paste a link…" onKeyDown={e=>e.key==="Enter"&&addLink()} style={IS}/>
            <Btn theme={th} accent onClick={addLink} sm>Add</Btn>
          </div>
        </Field>
        <Field label="Notes" theme={th}>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
            {tk.notes.length===0&&<div style={{fontSize:13,color:th.inkFaint,fontStyle:"italic"}}>No notes yet.</div>}
            {tk.notes.map((n,i)=>(
              <div key={i} style={{background:th.bgElevated,borderRadius:9,padding:"9px 11px",fontSize:13,lineHeight:1.45,color:th.ink}}>
                <div style={{fontSize:11.5,marginBottom:3,color:th.inkFaint}}><strong style={{color:th.inkMuted}}>{n.who}</strong> {n.when}</div>
                {n.text}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" onKeyDown={e=>e.key==="Enter"&&postNote()} style={IS}/>
            <Btn theme={th} accent onClick={postNote}>Post</Btn>
          </div>
        </Field>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
const NAV=[
  {group:"Overview",items:[{id:"overview",label:"Dashboard",icon:LayoutGrid},{id:"reports",label:"Reports & Exports",icon:FileText}]},
  {group:"Channels",items:[{id:"seo",label:"SEO & Organic",icon:Search},{id:"social",label:"Social Media",icon:Globe},{id:"paid",label:"Paid Advertising",icon:BarChart2},{id:"email",label:"Email & Nurture",icon:Mail}]},
  {group:"Tasks",items:[{id:"board",label:"Board",icon:LayoutGrid},{id:"calendar",label:"Calendar",icon:CalendarDays},{id:"timeline",label:"SEO Timeline",icon:TrendingUp}]},
  {group:"Growth",items:[{id:"attribution",label:"Lead Attribution",icon:Zap},{id:"integrations",label:"Integrations & Data",icon:Settings},{id:"logins",label:"Company Logins",icon:Link2}]},
];

export default function App(){
  const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true);const [me,setMe]=useState("Someone");
  const [cid,setCid]=useState("aps");const [view,setView]=useState("overview");const [track,setTrack]=useState("seo");
  const [statusF,setStatusF]=useState("all");const [openTask,setOpenTask]=useState(null);const [newTaskOpen,setNewTaskOpen]=useState(false);const [coMenu,setCoMenu]=useState(false);
  const mapRow=r=>({...r,companyId:r.company_id,deadline:r.deadline||"",notes:(r.notes||[]).map(n=>({id:n.id,who:n.author,text:n.body,when:new Date(n.created_at).toLocaleDateString()})),attachments:(r.attachments||[]).map(a=>({...a,type:a.kind}))});
  const reload=React.useCallback(async()=>{const rows=await loadTasks();setTasks(rows.map(mapRow));},[]);
  useEffect(()=>{(async()=>{try{const[rows,team,email]=await Promise.all([loadTasks(),getTeam(),currentEmail()]);if(team&&team.length)TEAM=team;setMe(email);setTasks(rows.map(mapRow));}finally{setLoading(false);}})();},[]);
  const t=useTheme(cid);
  const activeCo=cid==="all"?{id:"all",name:"All Companies",short:"ALL",color:"rgba(255,255,255,.3)",site:""}:COMPANIES.find(c=>c.id===cid)||COMPANIES[0];
  const todayISO=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return fmtDate(d);},[]);
  const weekISO=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+7);return fmtDate(d);},[]);
  const scope=tasks.filter(tk=>(cid==="all"||tk.companyId===cid)&&tk.track===track&&(!tk.recurring||(tk.deadline>=todayISO&&tk.deadline<=weekISO)));
  const counts=STATUS_ORDER.reduce((a,s)=>(a[s]=scope.filter(tk=>tk.status===s).length,a),{});
  const pct=scope.length?Math.round((counts.done/scope.length)*100):0;
  const update=(id,patch)=>{setTasks(ts=>ts.map(tk=>tk.id===id?{...tk,...patch}:tk));const dp={};for(const k of["status","priority","deadline","title"])if(k in patch)dp[k]=patch[k];if(Object.keys(dp).length)dbUpdate(id,dp);};
  const createTask=async input=>{await dbCreateTask(input);await reload();};
  const detail=openTask?tasks.find(tk=>tk.id===openTask):null;
  const defPhase=track==="seo"?SEO_TIMELINE[0].phase:PAID_MASTER[0][0];
  if(loading)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0E0F12",fontFamily:"'IBM Plex Sans',ui-sans-serif,sans-serif",color:"#6F6A63",fontSize:14}}>Loading your command center…</div>;
  if(tasks.length===0)return <SetupScreen onDone={reload} me={me}/>;
  const isBoardMode=["board","calendar","timeline"].includes(view);
  return(
    <div style={{display:"grid",gridTemplateColumns:"248px 1fr",minHeight:"100vh",fontFamily:"'IBM Plex Sans',-apple-system,system-ui,sans-serif",background:t.bg,color:t.ink}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:9px;height:9px;}::-webkit-scrollbar-thumb{background:${t.lineStrong};border-radius:5px;border:2px solid ${t.bg};}.kpi-card:hover{box-shadow:${t.shadowHover};transform:translateY(-2px);}.kpi-card:hover .kpi-line{opacity:1!important;}.tbl-row:hover{background:${t.accentWash}!important;}.kan-card:hover{box-shadow:${t.shadowHover};transform:translateY(-2px);}.task-row:hover{background:${t.bgElevated}!important;}`}</style>

      {/* SIDEBAR */}
      <aside style={{background:t.sideBg,backgroundImage:t.gradBg,color:t.sideText,padding:"24px 16px 18px",position:"sticky",top:0,height:"100vh",display:"flex",flexDirection:"column",overflowY:"auto",borderRight:`1px solid ${t.line}`}}>
        {/* Brand */}
        <div style={{display:"flex",alignItems:"center",gap:11,padding:"4px 8px 22px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{width:38,height:38,flexShrink:0,background:t.gradBrand,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fraunces',serif",fontWeight:600,color:t.bg,fontSize:18,letterSpacing:"-.03em",boxShadow:`0 6px 18px -6px ${t.accent}cc,0 0 22px ${t.accent}66`}}>M</div>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:500,letterSpacing:"-.01em",lineHeight:1.05,color:"#fff"}}>Command Center</div>
            <div style={{fontSize:10,color:t.sideTextDim,letterSpacing:".14em",textTransform:"uppercase",marginTop:3}}>Marketing Ops</div>
          </div>
        </div>

        {/* Company switcher */}
        <div style={{position:"relative",margin:"16px 0 8px"}}>
          <button onClick={()=>setCoMenu(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:"rgba(255,255,255,.05)",border:`1px solid ${t.lineStrong}`,borderRadius:10,color:t.sideText,cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>
            <span style={{width:9,height:9,borderRadius:"50%",background:activeCo.color,flexShrink:0}}/>
            <span style={{fontWeight:700}}>{activeCo.short}</span>
            <span style={{fontSize:11,color:t.sideTextDim,flex:1,textAlign:"left"}}> · {activeCo.name}</span>
            <ChevronDown size={15} style={{opacity:.6,flexShrink:0}}/>
          </button>
          {coMenu&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:11,padding:5,zIndex:50,boxShadow:"0 18px 40px rgba(0,0,0,.55)"}}>
              {COMPANIES.map(c=>(
                <button key={c.id} onClick={()=>{setCid(c.id);setCoMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 10px",background:"none",border:"none",color:t.sideText,cursor:"pointer",fontSize:13.5,borderRadius:8,fontFamily:"inherit"}}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                  <span style={{textAlign:"left",flex:1}}><div style={{fontWeight:600,color:t.ink}}>{c.short}</div><div style={{fontSize:11,color:t.inkFaint}}>{c.name}</div></span>
                  {cid===c.id&&<Check size={14} style={{color:t.good}}/>}
                </button>
              ))}
              <button onClick={()=>{setCid("all");setCoMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 10px",background:"none",border:`none`,borderTop:`1px solid ${t.line}`,color:t.sideText,cursor:"pointer",fontSize:13.5,marginTop:4,fontFamily:"inherit"}}>
                <LayoutGrid size={15} style={{color:t.indigo}}/>
                <span style={{fontWeight:600,color:t.ink,flex:1,textAlign:"left"}}>All Companies</span>
                {cid==="all"&&<Check size={14} style={{color:t.good}}/>}
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex:1,paddingTop:8}}>
          {NAV.map(group=>(
            <div key={group.group} style={{marginTop:22}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".12em",color:t.sideTextDim,marginBottom:7,padding:"0 10px",fontWeight:700}}>{group.group}</div>
              {group.items.map(item=>{
                const Icon=item.icon;const active=view===item.id;
                return(
                  <button key={item.id} onClick={()=>setView(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:"9px 11px",background:active?t.navActiveBg:"none",border:"none",color:active?t.navActiveText:t.sideText,cursor:"pointer",fontSize:13.5,fontWeight:active?500:450,borderRadius:8,marginBottom:2,fontFamily:"inherit",position:"relative",transition:"background .14s,color .14s"}}>
                    {active&&<span style={{position:"absolute",left:-16,top:8,bottom:8,width:3,background:t.accent,borderRadius:"0 3px 3px 0",boxShadow:`0 0 12px ${t.accent}`}}/>}
                    <Icon size={16} style={{opacity:active?1:.8,color:active?t.accent:"currentColor",flexShrink:0}}/>
                    {item.label}
                    {item.id==="board"&&<span style={{marginLeft:"auto",background:pct>0?t.goodSoft:"rgba(255,255,255,.08)",padding:"1px 7px",borderRadius:20,fontSize:10,fontWeight:600,color:pct>0?t.good:t.sideText,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Progress */}
        <div style={{margin:"16px 0",padding:14,background:"rgba(0,0,0,.3)",borderRadius:12,border:`1px solid ${t.line}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <span style={{color:t.sideTextDim,fontSize:12}}>{track==="seo"?"SEO":"Paid + Social"} progress</span>
            <span style={{fontWeight:700,color:t.ink,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span>
          </div>
          <div style={{height:6,background:"rgba(0,0,0,.4)",borderRadius:5,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${t.accent},${t.good})`,transition:"width .4s",borderRadius:5}}/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",marginTop:10,fontSize:11,fontWeight:600}}>
            <span style={{color:t.inkFaint}}>{counts.not_started} Not started</span>
            <span style={{color:t.accent}}>{counts.in_progress} Active</span>
            <span style={{color:t.bad}}>{counts.blocked} Blocked</span>
            <span style={{color:t.good}}>{counts.done} Done</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{paddingTop:16,borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 6px",borderRadius:8}}>
            <div style={{width:34,height:34,flexShrink:0,background:"linear-gradient(145deg,#334155,#1e293b)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:12,border:"1px solid rgba(255,255,255,.1)"}}>{me.charAt(0).toUpperCase()}</div>
            <div><div style={{color:"#E2E8F0",fontSize:13,fontWeight:500,lineHeight:1.1}}>{me}</div><div style={{color:t.sideTextDim,fontSize:11,marginTop:2}}>Marketing Lead</div></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>setTrack(v=>v==="seo"?"paid_social":"seo")} style={{flex:1,padding:"6px 10px",background:"none",border:`1px solid ${t.lineStrong}`,color:t.inkFaint,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{track==="seo"?"→ Paid+Social":"→ SEO"}</button>
            <button onClick={dbSignOut} style={{padding:"6px 10px",background:"none",border:`1px solid ${t.lineStrong}`,color:t.inkFaint,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{minWidth:0,overflowY:isBoardMode?"hidden":"auto",display:"flex",flexDirection:"column",background:t.bg}}>
        {view==="board"&&(
          <div style={{padding:"18px 38px 14px",borderBottom:`1px solid ${t.line}`,background:t.bgCard,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexShrink:0,flexWrap:"wrap"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:t.inkFaint,marginBottom:4}}><Building2 size={13}/>{activeCo.name}</div>
              <h1 style={{margin:0,fontSize:23,fontWeight:500,letterSpacing:"-.02em",color:t.ink,fontFamily:"'Fraunces',serif"}}>{track==="seo"?"SEO Setup & Management":"Paid + Social"}</h1>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setTrack("seo")} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${track==="seo"?t.accent:t.lineStrong}`,background:track==="seo"?t.accentSoft:t.bgElevated,color:track==="seo"?t.accentDeep:t.inkMuted,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:7}}><Search size={14}/>SEO</button>
                <button onClick={()=>setTrack("paid_social")} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${track==="paid_social"?t.accent:t.lineStrong}`,background:track==="paid_social"?t.accentSoft:t.bgElevated,color:track==="paid_social"?t.accentDeep:t.inkMuted,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:7}}><Megaphone size={14}/>Paid + Social</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:9,padding:"0 10px"}}>
                <Filter size={14} style={{opacity:.5,color:t.inkFaint}}/>
                <select style={{border:"none",background:"none",padding:"9px 4px",fontSize:13,color:t.ink,cursor:"pointer",outline:"none",fontFamily:"inherit"}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
                  <option value="all">All statuses</option>
                  {STATUS_ORDER.map(s=><option key={s} value={s}>{STATUSES[s].label}</option>)}
                </select>
              </div>
              <button onClick={()=>setNewTaskOpen(true)} style={{display:"flex",alignItems:"center",gap:6,background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 6px 16px -8px ${t.accent}cc`}}><Plus size={15}/>Add task</button>
            </div>
          </div>
        )}

        {view==="overview"    &&<OverviewView theme={t} companyId={cid}/>}
        {view==="seo"         &&<SeoView theme={t}/>}
        {view==="social"      &&<SocialView theme={t}/>}
        {view==="paid"        &&<PaidView theme={t}/>}
        {view==="email"       &&<EmailView theme={t}/>}
        {view==="content"     &&<ContentView theme={t}/>}
        {view==="attribution" &&<AttributionView theme={t}/>}
        {view==="reports"     &&<ReportsView theme={t}/>}
        {view==="integrations"&&<IntegrationsView theme={t}/>}
        {view==="logins"      &&<LoginsView companyId={cid} theme={t}/>}
        {view==="board"       &&<BoardView tasks={tasks} companyId={cid} track={track} statusFilter={statusF} theme={t} onOpen={setOpenTask} onUpdate={update} todayISO={todayISO} weekISO={weekISO}/>}
        {view==="calendar"    &&<CalendarView tasks={tasks} companyId={cid} theme={t}/>}
        {view==="timeline"    &&<TimelineView tasks={tasks} companyId={cid} setCompanyId={setCid} theme={t}/>}
      </main>

      {detail&&<TaskDrawer t={detail} onClose={()=>setOpenTask(null)} update={update} company={COMPANIES.find(c=>c.id===detail.companyId)||COMPANIES[0]} me={me} onChanged={reload} theme={t}/>}
      <NewTaskModal open={newTaskOpen} onClose={()=>setNewTaskOpen(false)} onCreate={createTask} defaults={{phase:defPhase}} companyId={cid==="all"?COMPANIES[0].id:cid} track={track} theme={t}/>
    </div>
  );
}
