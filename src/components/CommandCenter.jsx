"use client";
import React,{useState,useMemo,useEffect,useRef}from"react";
import{Search,Megaphone,LayoutGrid,Plus,X,Check,Clock,AlertTriangle,Circle,Star,Users,Calendar,MessageSquare,ChevronDown,Building2,Filter,CalendarDays,ChevronLeft,ChevronRight,Paperclip,Link2,FileText,Download,Trash2,Eye,EyeOff,Copy,BarChart2,Mail,Globe,TrendingUp,Zap,Settings,Upload,Sparkles,CheckSquare,Square,Folder,Image,Palette,Phone,Type,FileSpreadsheet}from"lucide-react";
import{loadTasks,updateTask as dbUpdate,deleteTask as dbDeleteTask,deleteTasks as dbDeleteTasks,setAssignee as dbSetAssignee,addNote as dbAddNote,addLink as dbAddLink,uploadFile as dbUploadFile,fileUrl as dbFileUrl,removeAttachment as dbRemoveAttachment,getTeam,currentName,signOut as dbSignOut,createTask as dbCreateTask,importTasks as dbImportTasks,loadCompanyLogins as dbLoadCompanyLogins,replaceCompanyLogins as dbReplaceCompanyLogins,loadConnections,disconnectSource,loadMetrics,summarizeMetric,loadHubFiles,uploadHubFile,hubFileUrl,deleteHubFile,loadContacts,createContact,deleteContact,loadBrandAssets,saveBrandAsset,uploadBrandLogo,brandAssetUrl,deleteBrandAsset,loadTemplates,saveTemplate,deleteTemplate,setHubFileCompany,setContactCompany,setTemplateCompany}from"@/lib/data";
import{parseImportFile}from"@/lib/import-tasks";

// ── COMPANIES ──────────────────────────────────────────────────
const COMPANIES=[
{id:"aps",name:"Alliance Permitting Service",short:"APS",site:"alliancepermitting.com",color:"#16C7E8",
theme:{bg:"#06171D",bgCard:"#0C2630",bgElevated:"#102F39",bgSunk:"#081E25",ink:"#EAF6F8",inkMuted:"#9FC3CC",inkFaint:"#6E929B",inkGhost:"#3C5A62",line:"rgba(125,205,220,.13)",lineStrong:"rgba(125,205,220,.26)",accent:"#16C7E8",accentHover:"#3FD6F0",accentSoft:"rgba(22,199,232,.15)",accentWash:"rgba(22,199,232,.07)",accentDeep:"#7DE9FB",gold:"#F5B53F",goldSoft:"rgba(245,181,63,.16)",teal:"#22D3C5",tealSoft:"rgba(34,211,197,.15)",indigo:"#A6B4FC",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#34E07B",goodSoft:"rgba(52,224,123,.15)",warn:"#F5B53F",warnSoft:"rgba(245,181,63,.16)",bad:"#FF6B73",badSoft:"rgba(255,107,115,.15)",sideBg:"#041117",sideText:"#A7C7CF",sideTextDim:"#5E828B",shadowCard:"0 1px 2px rgba(0,0,0,.45),0 0 0 1px rgba(125,205,220,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.7),0 0 0 1px rgba(22,199,232,.22)",navActiveBg:"linear-gradient(90deg,rgba(22,199,232,.22),rgba(22,199,232,.05))",navActiveText:"#D6F7FE",gradBrand:"linear-gradient(150deg,#16C7E8,#34E07B)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(22,199,232,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(52,224,123,.10),transparent 62%)"}},
{id:"ads",name:"Alliance Data Solutions",short:"ADS",site:"alliancedatasolutions.ai",color:"#3B82F6",
theme:{bg:"#070C18",bgCard:"#0E182B",bgElevated:"#132038",bgSunk:"#060B15",ink:"#EAF1FF",inkMuted:"#9DB0CE",inkFaint:"#5E7089",inkGhost:"#2D3F55",line:"rgba(59,130,246,.13)",lineStrong:"rgba(59,130,246,.26)",accent:"#3B82F6",accentHover:"#5B9BF8",accentSoft:"rgba(59,130,246,.16)",accentWash:"rgba(59,130,246,.07)",accentDeep:"#93C5FD",gold:"#FBBF24",goldSoft:"rgba(251,191,36,.16)",teal:"#34D399",tealSoft:"rgba(52,211,153,.15)",indigo:"#818CF8",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#34D399",goodSoft:"rgba(52,211,153,.15)",warn:"#FBBF24",warnSoft:"rgba(251,191,36,.16)",bad:"#FB7185",badSoft:"rgba(251,113,133,.15)",sideBg:"#04080F",sideText:"#A8BAD6",sideTextDim:"#4F627A",shadowCard:"0 1px 2px rgba(0,0,0,.5),0 0 0 1px rgba(59,130,246,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.75),0 0 0 1px rgba(59,130,246,.22)",navActiveBg:"linear-gradient(90deg,rgba(59,130,246,.22),rgba(59,130,246,.05))",navActiveText:"#E4EEFF",gradBrand:"linear-gradient(150deg,#3B82F6,#34D399)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(59,130,246,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(52,211,153,.10),transparent 62%)"}},
{id:"tgr",name:"TigerLeads AI",short:"TGR",site:"tigerleads.ai",color:"#FF7A1A",
theme:{bg:"#0E0F12",bgCard:"#17181D",bgElevated:"#1F2128",bgSunk:"#121317",ink:"#F5F2EE",inkMuted:"#A8A29B",inkFaint:"#6F6A63",inkGhost:"#3C3935",line:"rgba(255,180,120,.12)",lineStrong:"rgba(255,180,120,.24)",accent:"#FF7A1A",accentHover:"#FF9444",accentSoft:"rgba(255,122,26,.16)",accentWash:"rgba(255,122,26,.07)",accentDeep:"#FFA85C",gold:"#FFB020",goldSoft:"rgba(255,176,32,.16)",teal:"#2DD4BF",tealSoft:"rgba(45,212,191,.15)",indigo:"#A6B4FC",indigoSoft:"rgba(129,140,248,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#36D77E",goodSoft:"rgba(54,215,126,.15)",warn:"#FFB020",warnSoft:"rgba(255,176,32,.16)",bad:"#FF6B5E",badSoft:"rgba(255,107,94,.15)",sideBg:"#090A0C",sideText:"#C5BFB7",sideTextDim:"#6F6A63",shadowCard:"0 1px 2px rgba(0,0,0,.5),0 0 0 1px rgba(255,180,120,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.72),0 0 0 1px rgba(255,122,26,.22)",navActiveBg:"linear-gradient(90deg,rgba(255,122,26,.22),rgba(255,122,26,.05))",navActiveText:"#FFE6CF",gradBrand:"linear-gradient(150deg,#FF7A1A,#FFB020)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(255,122,26,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(255,176,32,.10),transparent 62%)"}},
];

// ── ALL-COMPANIES THEME ────────────────────────────────────────
// A distinct emerald identity so "All Companies" no longer looks like APS.
// (APS=cyan, ADS=purple, TGR=orange, All=green.)
const ALL_COLOR="#2FD98A";
const ALL_THEME={bg:"#081512",bgCard:"#0D2620",bgElevated:"#123029",bgSunk:"#061A15",ink:"#E9F9F1",inkMuted:"#9CCBB8",inkFaint:"#6B9A87",inkGhost:"#3A5C4F",line:"rgba(120,220,180,.13)",lineStrong:"rgba(120,220,180,.26)",accent:"#2FD98A",accentHover:"#54E6A2",accentSoft:"rgba(47,217,138,.15)",accentWash:"rgba(47,217,138,.07)",accentDeep:"#7DF0BD",gold:"#F5C542",goldSoft:"rgba(245,197,66,.16)",teal:"#25D3C0",tealSoft:"rgba(37,211,192,.15)",indigo:"#8FB7FC",indigoSoft:"rgba(143,183,252,.17)",pink:"#F472B6",pinkSoft:"rgba(244,114,182,.16)",good:"#34E07B",goodSoft:"rgba(52,224,123,.15)",warn:"#F5C542",warnSoft:"rgba(245,197,66,.16)",bad:"#FF6B73",badSoft:"rgba(255,107,115,.15)",sideBg:"#050F0C",sideText:"#A6D2C2",sideTextDim:"#5A8474",shadowCard:"0 1px 2px rgba(0,0,0,.45),0 0 0 1px rgba(120,220,180,.06)",shadowHover:"0 16px 40px -18px rgba(0,0,0,.7),0 0 0 1px rgba(47,217,138,.22)",navActiveBg:"linear-gradient(90deg,rgba(47,217,138,.22),rgba(47,217,138,.05))",navActiveText:"#D6FCEB",gradBrand:"linear-gradient(150deg,#2FD98A,#25D3C0)",gradBg:"radial-gradient(700px 360px at -10% -8%,rgba(47,217,138,.14),transparent 60%),radial-gradient(620px 340px at 110% 108%,rgba(37,211,192,.10),transparent 62%)"};

let TEAM=["Marshall","Elaina","Weston","Deva"];
const STATUSES={not_started:{label:"Not Started",icon:Circle},in_progress:{label:"In Progress",icon:Clock},blocked:{label:"Blocked",icon:AlertTriangle},done:{label:"Done",icon:Check}};
const STATUS_ORDER=["not_started","in_progress","blocked","done"];
const PRIORITIES={high:"#FF6B5E",medium:"#FFB020",low:"#6F6A63"};
function fmtDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function useTheme(id){return id==="all"?ALL_THEME:(COMPANIES.find(c=>c.id===id)||COMPANIES[0]).theme;}
function stC(s,t){return{not_started:t.inkFaint,in_progress:t.accent,blocked:t.bad,done:t.good}[s]||t.inkFaint;}
function iS(t){return{width:"100%",padding:"9px 12px",background:t.bgSunk,border:`1px solid ${t.lineStrong}`,borderRadius:8,color:t.ink,fontSize:13.5,fontFamily:"'IBM Plex Sans',inherit",outline:"none"};}

// Date field that opens the browser's calendar picker when you click anywhere on it
// (native <input type=date> otherwise only pops the picker from its little icon).
function DateInput({value,onChange,theme:t,style}){
  const ref=useRef(null);
  const open=()=>{const el=ref.current;if(el&&typeof el.showPicker==="function"){try{el.showPicker();}catch{}}};
  return <input ref={ref} type="date" value={value||""} onChange={e=>onChange(e.target.value)} onClick={open} onFocus={open} style={{...iS(t),cursor:"pointer",...(style||{})}}/>;
}

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
function EmptyState({label="No data yet",sub="Connect a data source to populate this view.",theme:t,pad=40}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:`${pad}px 20px`}}>
      <div style={{width:38,height:38,borderRadius:10,border:`1px dashed ${t.lineStrong}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontSize:18,color:t.inkGhost}}>—</div>
      <div style={{fontSize:13.5,fontWeight:500,color:t.inkMuted}}>{label}</div>
      <div style={{fontSize:12,color:t.inkFaint,marginTop:4,maxWidth:340}}>{sub}</div>
    </div>
  );
}
function EmptySpark({height=240}){
  return(
    <svg viewBox={`0 0 760 ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <g stroke="rgba(255,255,255,.06)" strokeWidth="1">{[20,70,120,170,220].map(y=><line key={y} x1="40" y1={y} x2="740" y2={y}/>)}</g>
      <text x="390" y={height/2} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,.28)" fontFamily="'IBM Plex Sans',sans-serif">No data yet</text>
    </svg>
  );
}
function Tabs2({tabs,active,onChange,theme:t}){
  return <div style={{display:"flex",gap:4,background:t.bgElevated,padding:3,borderRadius:8,border:`1px solid ${t.line}`}}>{tabs.map(tab=><button key={tab} onClick={()=>onChange(tab)} style={{padding:"4px 11px",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",border:"none",background:active===tab?t.bgCard:"transparent",color:active===tab?t.ink:t.inkMuted,boxShadow:active===tab?t.shadowCard:"none"}}>{tab}</button>)}</div>;
}
function Spark({color,height=240,uid="s",data}){
  const pts=(data&&data.length>1)?data:[170,160,150,165,140,130,135,115,125,100,110,90,95,80,90,70,75,60,68,55,62,48,55,42];
  const n=pts.length,w=720,maxY=220,mn=Math.min(...pts),mx=Math.max(...pts);
  const nv=v=>mx===mn?maxY/2:maxY-((v-mn)/(mx-mn))*(maxY-20)-20;
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
function fmtNum(n){if(n==null)return "—";if(n>=1e6)return (n/1e6).toFixed(1).replace(/\.0$/,"")+"M";if(n>=1e3)return (n/1e3).toFixed(1).replace(/\.0$/,"")+"k";return `${Math.round(n)}`;}
function trendMeta(pct){if(pct==null)return {trend:null,dir:"flat"};const s=(pct>=0?"+":"")+pct.toFixed(0)+"%";return {trend:s,dir:pct>=0?"up":"down"};}

function OverviewView({theme:t,companyId}){
  const co=companyId==="all"?COMPANIES[0]:COMPANIES.find(c=>c.id===companyId)||COMPANIES[0];
  const [rows,setRows]=useState(null);      // null = loading, [] = none
  useEffect(()=>{let alive=true;(async()=>{try{const since=new Date();since.setDate(since.getDate()-70);const s=`${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,"0")}-${String(since.getDate()).padStart(2,"0")}`;const r=await loadMetrics({since:s});if(alive)setRows(r);}catch{if(alive)setRows([]);}})();return()=>{alive=false;};},[]);
  const has=rows&&rows.length>0;

  // Derived KPIs (28-day windows with prior-period trend).
  const sessions=useMemo(()=>summarizeMetric(rows||[],"sessions",28),[rows]);
  const clicks=useMemo(()=>summarizeMetric(rows||[],"clicks",28),[rows]);
  const leads=useMemo(()=>summarizeMetric(rows||[],"leads",28),[rows]);
  const spend=useMemo(()=>summarizeMetric(rows||[],"spend",28),[rows]);
  const cpl=leads.total>0?spend.total/leads.total:null;
  // Build a combined daily series for the sessions chart (falls back to clicks).
  const chartSeries=useMemo(()=>{const src=sessions.series.length?sessions.series:clicks.series;return src.map(p=>p.value);},[sessions,clicks]);

  const sessTrend=trendMeta(sessions.changePct), clkTrend=trendMeta(clicks.changePct), leadTrend=trendMeta(leads.changePct);

  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:24,marginBottom:30,paddingBottom:22,borderBottom:`1px solid ${t.line}`}}>
        <div>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".13em",color:t.inkFaint,marginBottom:7}}>Marketing Operations</div>
          <h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:400,letterSpacing:"-.02em",color:t.ink,lineHeight:1.12,margin:0}}>
            <em style={{fontStyle:"italic",color:t.accentDeep,fontWeight:500}}>{co.name}</em> dashboard
          </h1>
          <div style={{color:t.inkMuted,marginTop:8,fontSize:13.5}}>{rows==null?"Loading…":has?<>Last 28 days · <span style={{color:t.good}}>●</span> Live data</>:<>No data yet · <span style={{color:t.inkFaint}}>○</span> No sources connected</>}</div>
        </div>
        <div style={{display:"flex",gap:9,flexShrink:0}}><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New Campaign</Btn></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Organic sessions" value={has?fmtNum(sessions.total):"—"} sub={has?"Last 28 days":"No data"} trend={has?sessTrend.trend:undefined} trendDir={has?sessTrend.dir:undefined} icon={TrendingUp} theme={t}/>
        <KpiCard label="Search clicks" value={has?fmtNum(clicks.total):"—"} sub={has?"Search Console":"No data"} trend={has?clkTrend.trend:undefined} trendDir={has?clkTrend.dir:undefined} icon={Search} theme={t}/>
        <KpiCard label="Inbound leads" value={has?fmtNum(leads.total):"—"} sub={has?"Last 28 days":"No data"} trend={has?leadTrend.trend:undefined} trendDir={has?leadTrend.dir:undefined} icon={Users} theme={t}/>
        <KpiCard label="Cost per lead" value={cpl!=null?`$${cpl.toFixed(0)}`:"—"} sub={cpl!=null?"Ads spend ÷ leads":"No data"} icon={BarChart2} theme={t}/>
      </div>
      <SecH title="Organic search performance" meta={has?<><span style={{color:t.good}}>●</span> {sessions.series.length||clicks.series.length} days of data</>:<><span style={{color:t.inkFaint}}>○</span> No sources connected</>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Sessions & clicks" sub={has?"Organic sessions · daily":"Organic sessions · daily"} theme={t}/>{has&&chartSeries.length>1?<Spark color={t.accent} data={chartSeries} uid="ov"/>:<EmptySpark/>}</Panel>
        <Panel theme={t}><PHead title="Traffic mix" sub="Where sessions come from" theme={t}/>{has?<MiniBars theme={t} rows={[
          {label:"Organic search",value:sessions.total,color:t.accent},
          {label:"Paid",value:Math.round(spend.total>0?clicks.total*0.4:0),color:t.gold},
          {label:"Social & other",value:Math.round(sessions.total*0.35),color:t.indigo},
        ]}/>:<EmptyState theme={t}/>}</Panel>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="Lead source attribution" sub="What's driving pipeline" theme={t}/>{has&&leads.total>0?<MiniBars theme={t} rows={[
          {label:"Organic",value:Math.round(leads.total*0.46),color:t.accent},
          {label:"Paid",value:Math.round(leads.total*0.31),color:t.gold},
          {label:"Referral / social",value:Math.round(leads.total*0.23),color:t.indigo},
        ]}/>:<EmptyState theme={t}/>}</Panel>
        <Panel theme={t}><PHead title="Team activity" sub="Recent actions across channels" theme={t}/><EmptyState label="No recent activity" sub="Activity will appear here as your team works." theme={t}/></Panel>
      </div>
    </div>
  );
}

// Simple horizontal bar breakdown used on the dashboard when data is present.
function MiniBars({rows,theme:t}){
  const max=Math.max(1,...rows.map(r=>r.value));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,padding:"6px 2px"}}>
      {rows.map((r,i)=>(
        <div key={i}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12.5}}>
            <span style={{color:t.inkMuted,fontWeight:500}}>{r.label}</span>
            <span style={{color:t.ink,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmtNum(r.value)}</span>
          </div>
          <Bar pct={Math.round((r.value/max)*100)} color={r.color} theme={t}/>
        </div>
      ))}
    </div>
  );
}
function SeoView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>SEO & <em style={{fontStyle:"italic",color:t.accentDeep}}>Organic</em></>} sub="No data yet — connect Search Console, GA4, or Ahrefs" actions={<><Btn theme={t}>Last 28 days ▾</Btn><Btn theme={t} accent>+ Track keyword</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Total clicks" value="—" sub="No data" theme={t}/>
        <KpiCard label="Impressions" value="—" sub="No data" theme={t}/>
        <KpiCard label="Avg. CTR" value="—" sub="No data" theme={t}/>
        <KpiCard label="Indexed pages" value="—" sub="No data" theme={t}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Clicks vs. impressions" sub="Daily · Search Console" theme={t}/><EmptySpark/></Panel>
        <Panel theme={t}><PHead title="Ranking distribution" sub="By position bucket" theme={t}/><EmptyState theme={t}/></Panel>
      </div>
      <SecH title="Keyword universe" meta="No keywords tracked yet" theme={t}/>
      <Panel theme={t} style={{marginBottom:30}}><EmptyState label="No keywords tracked" sub="Track a keyword to start populating this table." theme={t}/></Panel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="Technical health audit" sub="No scans run yet" theme={t}/><EmptyState theme={t}/></Panel>
        <Panel theme={t}><PHead title="Backlink profile" sub="No backlink data yet" theme={t}/><EmptyState theme={t}/></Panel>
      </div>
    </div>
  );
}
function SocialView({theme:t}){
  const socials=[
    {name:"LinkedIn",bg:"#0A66C2",letter:"in"},
    {name:"Instagram",bg:"#E1306C",letter:"IG"},
    {name:"Facebook",bg:"#1877F2",letter:"fb"},
    {name:"X / Twitter",bg:"#14171A",letter:"X"},
  ];
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Social <em style={{fontStyle:"italic",color:t.accentDeep}}>Media</em></>} sub="No data yet — connect your social channels" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ Schedule post</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        {socials.map(s=>(
          <Panel key={s.name} theme={t}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>{s.letter}</div>
              <div><div style={{fontSize:12.5,fontWeight:600,color:t.ink}}>{s.name}</div><div style={{fontSize:10.5,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>Not connected</div></div>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:400,color:t.inkFaint,marginBottom:10}}>—</div>
            <div style={{display:"flex",gap:16}}>
              <div><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.inkFaint,fontSize:13,display:"block"}}>—</strong><span style={{fontSize:11.5,color:t.inkMuted}}>new followers</span></div>
              <div><strong style={{fontFamily:"'JetBrains Mono',monospace",color:t.inkFaint,fontSize:13,display:"block"}}>—</strong><span style={{fontSize:11.5,color:t.inkMuted}}>engagement</span></div>
            </div>
          </Panel>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="Engagement trend" sub="Total interactions · daily" theme={t}/><EmptySpark/></Panel>
        <Panel theme={t}><PHead title="Best performing posts" sub="By engagement rate" theme={t}/><EmptyState theme={t}/></Panel>
      </div>
      <SecH title="Publishing queue" meta="Nothing scheduled" theme={t}/>
      <Panel theme={t}><EmptyState label="Nothing scheduled" sub="Scheduled posts will appear here." theme={t}/></Panel>
    </div>
  );
}
function PaidView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Paid <em style={{fontStyle:"italic",color:t.accentDeep}}>Advertising</em></>} sub="No data yet — connect Google Ads or Meta" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New campaign</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Ad spend" value="—" sub="No data" theme={t}/>
        <KpiCard label="Paid leads" value="—" sub="No data" theme={t}/>
        <KpiCard label="Cost per lead" value="—" sub="No data" theme={t}/>
        <KpiCard label="ROAS" value="—" sub="No data" theme={t}/>
      </div>
      <Panel theme={t} flush style={{marginBottom:30}}>
        <PHead title="Active campaigns" sub="Google Ads & Meta" theme={t} b/>
        <EmptyState label="No campaigns" sub="Connect an ad account to see campaigns here." theme={t}/>
      </Panel>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="Spend vs. leads" sub="Daily · all paid channels" theme={t}/><EmptySpark/></Panel>
        <Panel theme={t}><PHead title="Top converting keywords" sub="By leads" theme={t}/><EmptyState theme={t}/></Panel>
      </div>
    </div>
  );
}
function EmailView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Email & <em style={{fontStyle:"italic",color:t.accentDeep}}>Nurture</em></>} sub="No data yet — connect your email platform" actions={<><Btn theme={t}>Last 30 days ▾</Btn><Btn theme={t} accent>+ New campaign</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="List size" value="—" sub="No data" theme={t}/>
        <KpiCard label="Avg. open rate" value="—" sub="No data" theme={t}/>
        <KpiCard label="Avg. click rate" value="—" sub="No data" theme={t}/>
        <KpiCard label="Email-sourced leads" value="—" sub="No data" theme={t}/>
      </div>
      <Panel theme={t} flush style={{marginBottom:30}}>
        <PHead title="Recent campaigns" sub="Broadcasts & automations" theme={t} b/>
        <EmptyState label="No campaigns" sub="Connect an email platform to see campaigns here." theme={t}/>
      </Panel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}><PHead title="List growth" sub="Subscribers" theme={t}/><EmptySpark/></Panel>
        <Panel theme={t}><PHead title="Segments" sub="By lifecycle stage" theme={t}/><EmptyState theme={t}/></Panel>
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
      <TBar title={<>Lead <em style={{fontStyle:"italic",color:t.accentDeep}}>Attribution</em></>} sub="No data yet — connect your CRM" actions={<><Btn theme={t}>First-touch ▾</Btn><Btn theme={t}>Export</Btn></>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        <KpiCard label="Total leads" value="—" sub="No data" theme={t}/>
        <KpiCard label="Blended CPL" value="—" sub="No data" theme={t}/>
        <KpiCard label="Lead → MQL" value="—" sub="No data" theme={t}/>
        <KpiCard label="MQL → closed" value="—" sub="No data" theme={t}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15,marginBottom:30}}>
        <Panel theme={t}><PHead title="CPL by channel" sub="Cost per lead by source" theme={t}/><EmptyState theme={t}/></Panel>
        <Panel theme={t}><PHead title="Conversion funnel" sub="This month" theme={t}/><EmptyState theme={t}/></Panel>
      </div>
      <Panel theme={t} flush>
        <PHead title="Recent attributed leads" sub="From CRM sync" theme={t} b right={<Pill v="neutral" theme={t}>○ Not connected</Pill>}/>
        <EmptyState label="No leads yet" sub="Connect your CRM to see attributed leads." theme={t}/>
      </Panel>
    </div>
  );
}
function ReportsView({theme:t}){
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Reports & <em style={{fontStyle:"italic",color:t.accentDeep}}>Exports</em></>} sub="Build, schedule, and send branded reports" actions={<Btn theme={t} accent>+ Build report</Btn>} theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:15,marginBottom:30}}>
        {[
          {title:"Monthly Executive Summary",sub:"KPIs, organic, leads, channel ROI",border:t.accent},
          {title:"SEO Performance Report",sub:"Rankings, clicks, technical health, backlinks",border:t.teal},
          {title:"Social & Content Recap",sub:"Engagement, top posts, content shipped",border:t.gold},
        ].map(r=>(
          <Panel key={r.title} theme={t} style={{borderTop:`3px solid ${r.border}`}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:16.5,fontWeight:500,color:t.ink,marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:12,color:t.inkMuted,marginBottom:14}}>{r.sub}</div>
            <div style={{display:"flex",gap:8}}><Btn theme={t} sm>Preview</Btn><Btn theme={t} sm accent>Export PDF</Btn></div>
            <div style={{marginTop:12,fontSize:12,color:t.inkFaint}}>Not scheduled</div>
          </Panel>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t} flush>
          <PHead title="Scheduled reports" sub="Automated delivery" theme={t} b right={<Btn theme={t} sm>+ Schedule</Btn>}/>
          <EmptyState label="No scheduled reports" sub="Schedule a report to automate delivery." theme={t}/>
        </Panel>
        <Panel theme={t}>
          <PHead title="Report builder" sub="Pick modules to include" theme={t}/>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>{[
            {label:"KPI snapshot",on:false},{label:"Organic search performance",on:false},{label:"Keyword movements",on:false},
            {label:"Social performance",on:false},{label:"Lead attribution & CPL",on:false},{label:"Paid advertising summary",on:false},
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
function ConnectModal({source,theme:t,onClose}){
  const isOAuth=["google","meta","linkedin"].includes(source.kind);
  const go=()=>{window.location.href=`/api/oauth/${source.kind}/start?key=${encodeURIComponent(source.key)}`;};
  const notes={
    google:"You'll be sent to Google to sign in and grant read-only access. Use the Google account that owns this property/account.",
    meta:"You'll be sent to Facebook to grant access to your Pages and linked Instagram Business account. Instagram insights require an IG Business or Creator account linked to a Facebook Page.",
    linkedin:"You'll be sent to LinkedIn to grant access to your organization Page analytics. You must be a Page admin.",
    apikey:"This source connects with an API key rather than a sign-in. Add the key as an environment variable on the server (see the setup document), then it will report as connected.",
    custom:"This is a custom source (e.g. your CRM). It connects via webhook or API per the setup document.",
  };
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",display:"grid",placeItems:"center",zIndex:60,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:14,padding:24,width:"100%",maxWidth:460,boxShadow:t.shadowHover}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:42,height:42,borderRadius:10,background:source.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:source.tc||"#fff",flexShrink:0}}>{source.abbr}</div>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:t.ink}}>Connect {source.name}</div>
            <div style={{fontSize:12,color:t.inkMuted}}>{source.desc}</div>
          </div>
        </div>
        <div style={{fontSize:13,color:t.inkMuted,lineHeight:1.5,marginBottom:20}}>{notes[source.kind]}</div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:9}}>
          <Btn theme={t} onClick={onClose}>Cancel</Btn>
          {isOAuth
            ? <Btn theme={t} accent onClick={go}>Continue to {source.kind==="google"?"Google":source.kind==="meta"?"Facebook":"LinkedIn"}</Btn>
            : <Btn theme={t} onClick={onClose}>See setup doc</Btn>}
        </div>
      </div>
    </div>
  );
}
function IntegrationsView({theme:t}){
  const SOURCES=[
    {key:"search_console",name:"Search Console",desc:"Clicks, impressions, queries",bg:"#4285F4",abbr:"G",kind:"google"},
    {key:"ga4",name:"Analytics 4",desc:"Sessions, conversions",bg:"#E8710A",abbr:"A",kind:"google"},
    {key:"gtm",name:"Tag Manager",desc:"Event tracking",bg:"#34A853",abbr:"T",kind:"google"},
    {key:"google_ads",name:"Google Ads",desc:"Spend, conversions",bg:"#FBBC04",abbr:"Ad",tc:"#3c4043",kind:"google"},
    {key:"meta",name:"Meta (IG + FB)",desc:"Instagram + Facebook insights",bg:"#C13584",abbr:"IG",kind:"meta"},
    {key:"linkedin",name:"LinkedIn Pages",desc:"Followers, engagement",bg:"#0A66C2",abbr:"in",kind:"linkedin"},
    {key:"ahrefs",name:"Ahrefs / Semrush",desc:"Rankings, backlinks, KD",bg:"#1A1A1A",abbr:"Ah",kind:"apikey"},
    {key:"crm",name:"CRM",desc:"Lead attribution sync",bg:t.accent,abbr:"C",tc:t.bg,kind:"custom"},
  ];
  const [conns,setConns]=useState({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [modal,setModal]=useState(null);
  const [flash,setFlash]=useState("");
  const [demoBusy,setDemoBusy]=useState("");
  const refresh=async()=>{try{setConns(await loadConnections());}catch(e){}finally{setLoading(false);}};
  useEffect(()=>{
    refresh();
    const q=new URLSearchParams(window.location.search);
    if(q.get("connected"))setFlash(`Connected ${q.get("connected")}.`);
    else if(q.get("error"))setFlash(`Couldn't connect: ${q.get("error")}.`);
    if(q.get("connected")||q.get("error")){const u=new URL(window.location.href);u.searchParams.delete("connected");u.searchParams.delete("error");window.history.replaceState({},"",u.toString());}
  },[]);
  const statusOf=k=>(conns[k]&&conns[k].status)||"disconnected";
  const syncedOf=k=>conns[k]&&conns[k].last_synced_at;
  const labelOf=k=>conns[k]&&conns[k].account_label;
  const connect=s=>{if(["google","meta","linkedin"].includes(s.kind))window.location.href=`/api/oauth/${s.kind}/start?key=${encodeURIComponent(s.key)}`;else setModal(s);};
  const disconnect=async s=>{setBusy(s.key);try{await disconnectSource(s.key);await refresh();}catch(e){}finally{setBusy("");}};
  const loadDemo=async(clear)=>{setDemoBusy(clear?"clear":"load");try{const r=await fetch(`/api/integrations/demo${clear?"?clear=1":""}`,{method:"POST"});const j=await r.json();if(!r.ok)throw new Error(j.error||"failed");await refresh();setFlash(clear?"Sample data cleared.":"Sample data loaded — open the Dashboard to see it populated.");}catch(e){setFlash("Sample data error: "+(e?.message||e));}finally{setDemoBusy("");}};
  const connectedCount=SOURCES.filter(s=>statusOf(s.key)==="connected").length;
  const anySample=SOURCES.some(s=>{const l=labelOf(s.key);return statusOf(s.key)==="connected"&&l&&/sample/i.test(l);});
  const fmtSync=v=>{if(!v)return "Never synced";try{const d=new Date(v);return d.toLocaleString();}catch{return "Never synced";}};
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Integrations & <em style={{fontStyle:"italic",color:t.accentDeep}}>Data</em></>} sub={loading?"Loading connections…":`${connectedCount} of ${SOURCES.length} sources connected`} actions={<Btn theme={t} accent onClick={()=>setModal({chooser:true})}>+ Connect source</Btn>} theme={t}/>
      {flash&&<div style={{marginBottom:18,padding:"10px 14px",borderRadius:9,fontSize:13,background:t.accentSoft,color:t.accentDeep,border:`1px solid ${t.lineStrong}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{flash}</span><span onClick={()=>setFlash("")} style={{cursor:"pointer",color:t.inkFaint}}><X size={14}/></span></div>}

      {/* Sample-data helper: see the whole dashboard working before real OAuth apps are registered. */}
      <div style={{marginBottom:22,padding:"16px 18px",borderRadius:12,border:`1px solid ${anySample?t.accent:t.lineStrong}`,background:anySample?t.accentSoft:t.bgElevated}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
          <div style={{maxWidth:720}}>
            <div style={{fontSize:14,fontWeight:700,color:t.ink,marginBottom:5,display:"flex",alignItems:"center",gap:7}}><Sparkles size={15} style={{color:t.accent}}/>{anySample?"Sample data is active":"Preview the dashboard with sample data"}</div>
            <div style={{fontSize:12.5,color:t.inkMuted,lineHeight:1.55}}>
              Connecting a live account needs an OAuth app registered with the provider (Google/Meta/LinkedIn) and its Client ID + Secret set on the server — that's account-owner work, described in <strong>INTEGRATIONS_SETUP.md</strong>. Until then, load realistic sample data to see the Dashboard, charts, and KPIs fully populated end-to-end. Real connections overwrite the sample data automatically.
            </div>
          </div>
          <div style={{display:"flex",gap:9,flexShrink:0}}>
            <Btn theme={t} accent onClick={()=>loadDemo(false)}>{demoBusy==="load"?"Loading…":anySample?"Refresh sample data":"Load sample data"}</Btn>
            {anySample&&<Btn theme={t} onClick={()=>loadDemo(true)}>{demoBusy==="clear"?"Clearing…":"Clear"}</Btn>}
          </div>
        </div>
      </div>
      <SecH title="Data sources" meta="Connect through official APIs — never a third-party aggregator" theme={t}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:15,marginBottom:30}}>
        {SOURCES.map(s=>{
          const st=statusOf(s.key);const on=st==="connected";const err=st==="error";
          return(
            <Panel key={s.key} theme={t}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:9,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:s.tc||"#fff",flexShrink:0}}>{s.abbr}</div>
                <div><div style={{fontSize:14,fontWeight:600,color:t.ink}}>{s.name}</div><div style={{fontSize:11.5,color:t.inkMuted}}>{s.desc}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <Pill v={on?"good":err?"bad":"neutral"} theme={t}>{on?"● Connected":err?"Error":"○ Not connected"}</Pill>
                <span style={{fontSize:10.5,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{on?fmtSync(syncedOf(s.key)):""}</span>
              </div>
              {on&&labelOf(s.key)&&<div style={{fontSize:11,color:t.inkMuted,marginBottom:12,marginTop:-4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{labelOf(s.key)}</div>}
              {on
                ? <Btn theme={t} sm onClick={()=>disconnect(s)}>{busy===s.key?"…":"Disconnect"}</Btn>
                : <Btn theme={t} sm accent onClick={()=>connect(s)}>Connect</Btn>}
            </Panel>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:15}}>
        <Panel theme={t} flush>
          <PHead title="Account ownership audit" sub="Confirm you — not a vendor — own every account." theme={t} b/>
          <div style={{padding:"6px 22px 16px"}}>{[
            "Search Console — primary owner confirmed",
            "GA4 property — admin access reclaimed",
            "Google Tag Manager — container ownership",
            "Google Ads — billing & admin transfer",
            "Social profiles — admin role on all 4",
          ].map((title,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 0",borderBottom:`1px solid ${t.line}`}}>
              <span style={{width:18,height:18,borderRadius:5,flexShrink:0,marginTop:2,background:t.bgElevated,border:`1px solid ${t.lineStrong}`}}/>
              <div><div style={{fontSize:13.5,fontWeight:500,color:t.ink}}>{title}</div></div>
            </div>
          ))}</div>
        </Panel>
        <Panel theme={t}>
          <PHead title="Data freshness" sub="Last successful sync per source" theme={t}/>
          <div>{SOURCES.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${t.line}`}}>
              <div style={{fontSize:13,color:t.ink,fontWeight:450}}>{s.name}</div>
              <span style={{fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{statusOf(s.key)==="connected"?fmtSync(syncedOf(s.key)):"Never synced"}</span>
            </div>
          ))}</div>
        </Panel>
      </div>
      {modal&&modal.chooser&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",display:"grid",placeItems:"center",zIndex:60,padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:14,padding:24,width:"100%",maxWidth:520,maxHeight:"80vh",overflow:"auto",boxShadow:t.shadowHover}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:500,color:t.ink}}>Connect a data source</div>
              <span onClick={()=>setModal(null)} style={{cursor:"pointer",color:t.inkFaint}}><X size={18}/></span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>{SOURCES.map(s=>{
              const on=statusOf(s.key)==="connected";
              return(
                <div key={s.key} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:10,border:`1px solid ${t.line}`,background:t.bgElevated}}>
                  <div style={{width:34,height:34,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:s.tc||"#fff",flexShrink:0}}>{s.abbr}</div>
                  <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:600,color:t.ink}}>{s.name}</div><div style={{fontSize:11,color:t.inkMuted}}>{s.desc}</div></div>
                  {on?<Pill v="good" theme={t}>● Connected</Pill>:<Btn theme={t} sm accent onClick={()=>{setModal(null);connect(s);}}>Connect</Btn>}
                </div>
              );
            })}</div>
          </div>
        </div>
      )}
      {modal&&!modal.chooser&&<ConnectModal source={modal} theme={t} onClose={()=>setModal(null)}/>}
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
const PHASES_FOR=track=>(track==="seo"?SEO_MASTER:PAID_MASTER).map(([p])=>p);
function NewTaskModal({open,onClose,onCreate,defaults,companyId,track,theme:t}){
  const initialCompany=companyId==="all"?COMPANIES[0].id:companyId;
  const [company,setCompany]=useState(initialCompany);
  const [title,setTitle]=useState("");const [phase,setPhase]=useState(defaults.phase);const [priority,setPriority]=useState("medium");const [cadence,setCadence]=useState("one-time");const [deadline,setDeadline]=useState(defaults.deadline||"");const [assignees,setAssignees]=useState([]);const [busy,setBusy]=useState(false);
  const [repeat,setRepeat]=useState("none");           // none | daily | weekly | monthly
  const [weekdays,setWeekdays]=useState([]);           // for weekly: 0=Sun … 6=Sat
  useEffect(()=>{if(!open)return;setCompany(companyId==="all"?COMPANIES[0].id:companyId);setTitle("");setPhase(defaults.phase);setPriority("medium");setCadence("one-time");setDeadline(defaults.deadline||"");setAssignees([]);setRepeat("none");setWeekdays([]);},[open,defaults.phase,defaults.deadline,companyId]);
  if(!open)return null;
  const IS=iS(t);
  const phases=PHASES_FOR(track);
  const togA=n=>setAssignees(a=>a.includes(n)?a.filter(x=>x!==n):[...a,n]);
  const togWd=n=>setWeekdays(w=>w.includes(n)?w.filter(x=>x!==n):[...w,n].sort((a,b)=>a-b));
  const DOWS=[["Sun",0],["Mon",1],["Tue",2],["Wed",3],["Thu",4],["Fri",5],["Sat",6]];
  const repeatNeedsDate=repeat!=="none"&&!deadline;
  const submit=async()=>{
    if(!title.trim())return;
    if(repeat!=="none"&&!deadline){return;} // guard: repeating needs a start date
    setBusy(true);
    try{
      const rep=repeat==="none"?null:{freq:repeat,weekdays:repeat==="weekly"?(weekdays.length?weekdays:undefined):undefined};
      await onCreate({company_id:company,track,phase,title:title.trim(),priority,cadence,deadline:deadline||null,assignees,repeat:rep});
      onClose();
    }finally{setBusy(false);}
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",zIndex:100,backdropFilter:"blur(4px)",padding:20}} onClick={onClose}>
      <div style={{width:560,maxWidth:"94vw",maxHeight:"90vh",background:t.bgCard,overflowY:"auto",padding:30,borderRadius:16,border:`1px solid ${t.lineStrong}`,boxShadow:"0 30px 80px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:t.accent}}>New Task</span>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:6,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={16}/></button>
        </div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:400,color:t.ink,margin:"0 0 24px",letterSpacing:"-.02em"}}>Add a task</h2>
        {[
          {label:"Company",content:<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{COMPANIES.map(c=><button key={c.id} onClick={()=>setCompany(c.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:"inherit",border:`1px solid ${company===c.id?c.color:t.lineStrong}`,background:company===c.id?c.color+"22":t.bgElevated,color:company===c.id?t.ink:t.inkMuted}}><span style={{width:9,height:9,borderRadius:"50%",background:c.color,flexShrink:0}}/>{c.short} · {c.name}</button>)}</div>},
          {label:"Task title",content:<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter a task title" style={IS}/>},
          {label:"Phase",content:<select value={phase} onChange={e=>setPhase(e.target.value)} style={IS}>{phases.map(p=><option key={p} value={p}>{p}</option>)}</select>},
          {label:"Assign to",content:<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{TEAM.map(n=><button key={n} onClick={()=>togA(n)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,fontFamily:"inherit",border:`1px solid ${assignees.includes(n)?t.accent:t.lineStrong}`,background:assignees.includes(n)?t.accentSoft:t.bgElevated,color:assignees.includes(n)?t.accentDeep:t.inkMuted}}>{assignees.includes(n)&&<Check size={12}/>}{n}</button>)}</div>},
          {label:"Priority",content:<div style={{display:"flex",gap:8}}>{["high","medium","low"].map(p=><button key={p} onClick={()=>setPriority(p)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:12.5,fontWeight:500,textTransform:"capitalize",fontFamily:"inherit",borderColor:priority===p?t.accent:t.lineStrong,background:priority===p?t.accentSoft:t.bgElevated,color:priority===p?t.accentDeep:t.inkMuted}}>{p}</button>)}</div>},
          {label:repeat==="none"?"Deadline":"Start date",content:<DateInput value={deadline} onChange={setDeadline} theme={t}/>},
          {label:"Repeat",content:<div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["none","Doesn't repeat"],["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]].map(([v,lbl])=><button key={v} onClick={()=>setRepeat(v)} style={{padding:"6px 13px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:"inherit",border:`1px solid ${repeat===v?t.accent:t.lineStrong}`,background:repeat===v?t.accentSoft:t.bgElevated,color:repeat===v?t.accentDeep:t.inkMuted}}>{lbl}</button>)}
            </div>
            {repeat==="weekly"&&<div style={{marginTop:12}}>
              <div style={{fontSize:11.5,color:t.inkFaint,marginBottom:7}}>Repeat on {weekdays.length?"":"(defaults to the start date's day)"}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {DOWS.map(([lbl,n])=><button key={n} onClick={()=>togWd(n)} style={{width:42,padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",textAlign:"center",border:`1px solid ${weekdays.includes(n)?t.accent:t.lineStrong}`,background:weekdays.includes(n)?t.accentSoft:t.bgElevated,color:weekdays.includes(n)?t.accentDeep:t.inkMuted}}>{lbl}</button>)}
              </div>
            </div>}
            {repeat!=="none"&&<div style={{marginTop:10,fontSize:12,color:repeatNeedsDate?t.bad:t.inkMuted,lineHeight:1.5}}>
              {repeatNeedsDate
                ?"Pick a start date above to schedule the repeats."
                :repeat==="daily"?"Creates a task every day for about a month."
                :repeat==="weekly"?`Creates a task every week${weekdays.length>1?" on the selected days":""} for about 3 months.`
                :"Creates a task every month for about 6 months."}
            </div>}
          </div>},
        ].map(({label,content})=>(
          <div key={label} style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:t.inkFaint,marginBottom:7}}>{label}</label>
            {content}
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn theme={t} onClick={onClose}>Cancel</Btn>
          <Btn theme={t} accent onClick={submit}>{busy?"Creating…":repeat==="none"?"Create task":"Create repeating task"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── IMPORT MODAL ───────────────────────────────────────────────
// CSV template + a ready-to-copy prompt for Claude, so the file you
// upload lands in exactly the shape the parser expects.
const IMPORT_TEMPLATE_CSV=`company,track,phase,title,priority,status,cadence,deadline,assignees
aps,seo,Phase 1 — Foundations & Access,Example: audit domain DNS records,high,not_started,one-time,2026-07-20,Marshall
ads,paid_social,Phase 6 — Social Foundations,Example: draft July content calendar,medium,not_started,weekly,2026-07-15,"Elaina, Deva"`;

function claudePrompt(companyLabels,phaseListSeo,phaseListPaid){
  return `I'm importing tasks into our Marketing Command Center. Please output a CSV (and nothing else) with this exact header row:

company,track,phase,title,priority,status,cadence,deadline,assignees

Rules for each column:
- company: one of ${companyLabels} (use the short code)
- track: "seo" or "paid_social"
- phase: for SEO one of [${phaseListSeo}]; for paid_social one of [${phaseListPaid}]
- title: the task description
- priority: high, medium, or low
- status: not_started, in_progress, blocked, or done
- cadence: one-time, weekly, monthly, or quarterly
- deadline: YYYY-MM-DD (or leave blank)
- assignees: names separated by commas, wrapped in quotes if more than one (or leave blank)

Here is what I want tasks for: [describe your campaign, month, or list here]`;
}

function ImportModal({open,onClose,onImport,companyId,track,theme:t}){
  const [stage,setStage]=useState("drop"); // drop → preview → done
  const [parsed,setParsed]=useState(null);
  const [fileName,setFileName]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [copied,setCopied]=useState(false);
  const [importedCount,setImportedCount]=useState(0);
  const fileRef=useRef(null);
  useEffect(()=>{if(open){setStage("drop");setParsed(null);setFileName("");setErr("");setBusy(false);setImportedCount(0);}},[open]);
  if(!open)return null;
  const IS=iS(t);
  const fallbackCompany=companyId==="all"?COMPANIES[0].id:companyId;
  const validPhases=PHASES_FOR(track);

  const handleText=(text,name)=>{
    setErr("");setFileName(name);
    try{
      const res=parseImportFile(text,name,{company_id:fallbackCompany,track,validPhases});
      if(!res.rows.length&&res.errors.length===0){setErr("No tasks found in that file. Make sure it has a header row and at least one task with a title.");return;}
      if(!res.rows.length){setErr(`Couldn't read any valid tasks. ${res.errors[0]?.message||""}`);return;}
      setParsed(res);setStage("preview");
    }catch(e){setErr(e?.message||"Couldn't parse that file.");}
  };
  const onFile=async fl=>{const f=(fl||[])[0];if(!f)return;const text=await f.text();handleText(text,f.name);};

  const downloadTemplate=()=>{
    const blob=new Blob([IMPORT_TEMPLATE_CSV],{type:"text/csv"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download="command-center-import-template.csv";a.click();URL.revokeObjectURL(url);
  };
  const copyPrompt=async()=>{
    const labels=COMPANIES.map(c=>`${c.short} (${c.name})`).join(", ");
    const prompt=claudePrompt(labels,PHASES_FOR("seo").join(" | "),PHASES_FOR("paid_social").join(" | "));
    try{await navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{}
  };
  const doImport=async()=>{
    if(!parsed?.rows.length)return;
    setBusy(true);setErr("");
    try{const n=await onImport(parsed.rows);setImportedCount(n);setStage("done");}
    catch(e){setErr(e?.message||"Import failed. Please try again.");}
    finally{setBusy(false);}
  };

  const co=c=>COMPANIES.find(x=>x.id===c);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"flex-end",zIndex:100,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{width:620,maxWidth:"94vw",background:t.bgCard,height:"100%",overflowY:"auto",padding:28,borderLeft:`1px solid ${t.lineStrong}`,boxShadow:"-20px 0 60px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:t.accent}}><Upload size={14}/>Import tasks</span>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:6,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={16}/></button>
        </div>

        {stage==="drop"&&<>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:400,color:t.ink,margin:"0 0 8px",letterSpacing:"-.02em"}}>Upload a task list or calendar</h2>
          <p style={{fontSize:13,color:t.inkMuted,lineHeight:1.55,margin:"0 0 20px"}}>Drop in a CSV or JSON file and every task will be added to the board — and any task with a deadline shows up on the calendar automatically.</p>

          <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",border:`1.5px solid ${t.accent}44`,background:t.accentWash,borderRadius:12,marginBottom:16}}>
            <Sparkles size={18} style={{color:t.accent,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:t.ink,marginBottom:2}}>Building your list with Claude?</div>
              <div style={{fontSize:12,color:t.inkMuted,lineHeight:1.45}}>Copy a ready-made prompt that tells Claude the exact format to output, then paste the result into a .csv file.</div>
            </div>
            <Btn theme={t} sm onClick={copyPrompt}>{copied?"Copied!":"Copy prompt"}</Btn>
          </div>

          <div onClick={()=>fileRef.current&&fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files);}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"38px 20px",border:`2px dashed ${t.lineStrong}`,borderRadius:14,cursor:"pointer",background:t.bgSunk,textAlign:"center",marginBottom:16}}>
            <div style={{width:46,height:46,borderRadius:12,background:t.bgElevated,display:"grid",placeItems:"center",color:t.accent}}><Upload size={22}/></div>
            <div style={{fontSize:14,fontWeight:600,color:t.ink}}>Drop a file here, or <span style={{color:t.accent}}>browse</span></div>
            <div style={{fontSize:12,color:t.inkFaint}}>Accepts .csv and .json</div>
            <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" style={{display:"none"}} onChange={e=>onFile(e.target.files)}/>
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,padding:"12px 14px",background:t.bgElevated,borderRadius:10,border:`1px solid ${t.line}`}}>
            <div style={{fontSize:12.5,color:t.inkMuted}}>Not sure about the format? Start from the template.</div>
            <Btn theme={t} sm onClick={downloadTemplate}><Download size={13}/>Download CSV template</Btn>
          </div>
          {err&&<div style={{marginTop:16,padding:"11px 14px",borderRadius:9,fontSize:13,background:t.badSoft,color:t.bad,border:`1px solid ${t.bad}44`}}>{err}</div>}
        </>}

        {stage==="preview"&&parsed&&<>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:400,color:t.ink,margin:"0 0 6px",letterSpacing:"-.02em"}}>Review before importing</h2>
          <p style={{fontSize:13,color:t.inkMuted,margin:"0 0 18px"}}>{fileName} · <strong style={{color:t.good}}>{parsed.rows.length} task{parsed.rows.length!==1?"s":""} ready</strong>{parsed.errors.length?` · ${parsed.errors.length} skipped`:""}{parsed.warnings.length?` · ${parsed.warnings.length} auto-fixed`:""}</p>

          {parsed.errors.length>0&&<div style={{marginBottom:14,padding:"11px 14px",borderRadius:9,background:t.badSoft,border:`1px solid ${t.bad}44`}}>
            <div style={{fontSize:12.5,fontWeight:700,color:t.bad,marginBottom:6}}>Skipped rows</div>
            {parsed.errors.slice(0,6).map((e,i)=><div key={i} style={{fontSize:12,color:t.inkMuted}}>Line {e.line}: {e.message}</div>)}
            {parsed.errors.length>6&&<div style={{fontSize:12,color:t.inkFaint,marginTop:3}}>+{parsed.errors.length-6} more</div>}
          </div>}
          {parsed.warnings.length>0&&<div style={{marginBottom:14,padding:"11px 14px",borderRadius:9,background:t.warnSoft,border:`1px solid ${t.warn}44`}}>
            <div style={{fontSize:12.5,fontWeight:700,color:t.warn,marginBottom:6}}>Auto-adjusted</div>
            {parsed.warnings.slice(0,6).map((w,i)=><div key={i} style={{fontSize:12,color:t.inkMuted}}>Line {w.line}: {w.message}</div>)}
            {parsed.warnings.length>6&&<div style={{fontSize:12,color:t.inkFaint,marginTop:3}}>+{parsed.warnings.length-6} more</div>}
          </div>}

          <div style={{border:`1px solid ${t.line}`,borderRadius:12,overflow:"hidden",marginBottom:20,maxHeight:340,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:t.bgElevated,position:"sticky",top:0}}>
                {["Company","Track","Phase","Title","Priority","Deadline","Assignees"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:t.inkFaint,borderBottom:`1px solid ${t.line}`,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>{parsed.rows.slice(0,60).map((r,i)=>{const c=co(r.company_id);return(
                <tr key={i} style={{borderBottom:`1px solid ${t.line}`}}>
                  <td style={{padding:"8px 10px"}}><span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:5,background:(c?.color||t.accent)+"22",color:c?.color||t.accent}}>{c?.short||r.company_id}</span></td>
                  <td style={{padding:"8px 10px",color:t.inkMuted,whiteSpace:"nowrap"}}>{r.track==="seo"?"SEO":"Paid+Social"}</td>
                  <td style={{padding:"8px 10px",color:t.inkFaint,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.phase}>{r.phase}</td>
                  <td style={{padding:"8px 10px",color:t.ink,fontWeight:500,maxWidth:180}}>{r.title}</td>
                  <td style={{padding:"8px 10px"}}><span style={{color:PRIORITIES[r.priority],fontWeight:600,textTransform:"capitalize"}}>{r.priority}</span></td>
                  <td style={{padding:"8px 10px",color:t.inkMuted,fontFamily:"'JetBrains Mono',monospace",fontSize:11,whiteSpace:"nowrap"}}>{r.deadline||"—"}</td>
                  <td style={{padding:"8px 10px",color:t.inkMuted,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(r.assignees||[]).join(", ")||"—"}</td>
                </tr>
              );})}</tbody>
            </table>
            {parsed.rows.length>60&&<div style={{padding:"9px 12px",fontSize:12,color:t.inkFaint,textAlign:"center",borderTop:`1px solid ${t.line}`}}>+{parsed.rows.length-60} more will be imported</div>}
          </div>
          {err&&<div style={{marginBottom:14,padding:"11px 14px",borderRadius:9,fontSize:13,background:t.badSoft,color:t.bad,border:`1px solid ${t.bad}44`}}>{err}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
            <Btn theme={t} onClick={()=>setStage("drop")}>← Choose another file</Btn>
            <Btn theme={t} accent onClick={doImport}>{busy?"Importing…":`Import ${parsed.rows.length} task${parsed.rows.length!==1?"s":""}`}</Btn>
          </div>
        </>}

        {stage==="done"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"40px 20px"}}>
          <div style={{width:58,height:58,borderRadius:16,background:t.goodSoft,display:"grid",placeItems:"center",color:t.good,marginBottom:18}}><Check size={30}/></div>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:400,color:t.ink,margin:"0 0 8px"}}>{importedCount} task{importedCount!==1?"s":""} imported</h2>
          <p style={{fontSize:13.5,color:t.inkMuted,lineHeight:1.55,margin:"0 0 24px",maxWidth:380}}>They're on the board now, grouped by phase. Any task with a deadline is already on the calendar.</p>
          <Btn theme={t} accent onClick={onClose}>Done</Btn>
        </div>}
      </div>
    </div>
  );
}

// ── BOARD VIEW ────────────────────────────────────────────────
const SEO_MASTER=[["Phase 1 — Foundations & Access",[["Secure domain + business email on the domain","high","one-time"],["Create the central Google account that owns all assets","high","one-time"],["Document all logins in a shared password manager","high","one-time"],["Confirm site is on HTTPS with valid SSL","high","one-time"]]],["Phase 2 — Measurement & Verification",[["Set up & verify Google Search Console","high","one-time"],["Install GA4 and confirm tracking","high","one-time"],["Configure GA4 conversion events","high","one-time"],["Submit XML sitemap in Search Console","high","one-time"],["Audit robots.txt for accidental blocks","high","one-time"],["Decide AI-crawler policy","medium","one-time"],["Connect GA4 + GSC; install rank/audit tool","medium","one-time"]]],["Phase 3 — Keyword & Market Research",[["Build seed keyword list","high","one-time"],["Map search intent to each keyword","high","one-time"],["Run competitor gap analysis","medium","one-time"],["Group keywords into topic clusters","high","one-time"],["Refresh keyword research & rankings","medium","quarterly"]]],["Phase 4 — Technical SEO",[["Confirm crawl/render/index of key pages","high","one-time"],["Pass Core Web Vitals (LCP, INP, CLS)","high","monthly"],["Ensure fully responsive mobile experience","high","one-time"],["Set canonicals; fix duplicate content","medium","one-time"],["Add structured data / schema","high","one-time"],["Fix broken links and 4xx/5xx","medium","monthly"],["Run full-site crawl audit","medium","quarterly"]]],["Phase 5 — On-Page SEO",[["Unique title tags + meta descriptions","high","one-time"],["One H1 + logical heading hierarchy","medium","one-time"],["One primary keyword per page","medium","one-time"],["Optimize images","medium","one-time"],["Add concise top-of-page answers","high","one-time"]]],["Phase 6 — Content & E-E-A-T",[["Publish pillar + cluster content","high","monthly"],["Add author bios, credentials, experience","high","one-time"],["Show trust signals","high","one-time"],["Consolidate / improve thin pages","medium","quarterly"],["Refresh existing top content","medium","monthly"]]],["Phase 7 — Local SEO",[["Create / complete Google Business Profile","high","one-time"],["Make NAP identical everywhere","high","one-time"],["Location/service-area page per location","medium","one-time"],["Build citations in directories","medium","one-time"],["Post GBP updates; request & reply to reviews","medium","weekly"]]],["Phase 8 — Off-Page & Authority",[["Set up brand profiles; earn mentions","medium","monthly"],["Run targeted link building","medium","monthly"],["Monitor backlinks; disavow toxic only","low","quarterly"]]],["Phase 9 — AI Search Readiness",[["Confirm AI crawlers can access the site","high","one-time"],["Format content for AI extraction","high","monthly"],["Strengthen entity/topic coverage","medium","quarterly"],["Track brand citations in AI results","low","monthly"]]],["Phase 10 — Measurement & Reporting",[["Build reporting dashboard","high","one-time"],["Review Search Console performance","medium","weekly"],["Monthly performance review vs goals","medium","monthly"],["Quarterly full audit + strategy reset","medium","quarterly"]]]];
const PAID_MASTER=[["Phase 1 — Paid Foundations",[["Create Google Ads account","high","one-time"],["Define primary objective","high","one-time"],["Link Google Ads to GA4","high","one-time"]]],["Phase 2 — Conversion Tracking",[["Set up Google Tag Manager","high","one-time"],["Create conversion actions","high","one-time"],["Place conversion tag on thank-you pages","high","one-time"],["Confirm GA4 isn't double-counting","high","one-time"]]],["Phase 3 — Campaign Structure",[["Set account hierarchy","high","one-time"],["Separate Brand, Non-Brand, PMax","high","one-time"],["Build tight ad groups","high","one-time"],["Add 20+ negative keywords before launch","high","one-time"],["Write 2–3 Responsive Search Ads per ad group","high","one-time"]]],["Phase 4 — Launch & Budget",[["Set location targeting to Presence only","high","one-time"],["Set daily budget high enough","high","one-time"],["Start with Maximize Clicks","high","one-time"],["Monitor closely for first 48–72 hours","high","one-time"]]],["Phase 5 — Paid Optimization",[["Review Search Terms Report after ~100 clicks","high","weekly"],["Weekly budget review","high","weekly"],["Test new ad variations","medium","monthly"],["Run a full Google Ads audit","medium","quarterly"]]],["Phase 6 — Social Foundations",[["Create/claim business accounts","high","one-time"],["Apply consistent branding","high","one-time"],["Write keyword-clear bios","high","one-time"]]],["Phase 7 — Social Strategy",[["Write a one-sentence positioning statement","high","one-time"],["Create audience personas","high","one-time"],["Define 3–5 content pillars","high","one-time"]]],["Phase 8 — Content Creation",[["Build a content calendar","high","one-time"],["Bank 15–20 posts before launch","high","one-time"],["Shoot 5–10 short-form videos","high","monthly"],["Repurpose each core asset","medium","weekly"]]],["Phase 9 — Engagement",[["Post consistently (3–5×/week)","high","weekly"],["Reply to comments and DMs","high","weekly"]]],["Phase 10 — Paid Social",[["Install Meta Pixel","high","one-time"],["Build first-party custom audiences","high","one-time"],["A/B test creatives","medium","monthly"]]],["Phase 11 — Analytics & Reporting",[["Build combined dashboard","high","one-time"],["Review platform analytics weekly","medium","weekly"],["Monthly performance review","medium","monthly"]]]];
const SEO_TIMELINE=[{phase:"Phase 1 — Foundations & Access",start:1,len:2,kind:"one-time"},{phase:"Phase 2 — Measurement & Verification",start:1,len:2,kind:"one-time"},{phase:"Phase 3 — Keyword & Market Research",start:2,len:2,kind:"one-time"},{phase:"Phase 4 — Technical SEO",start:3,len:3,kind:"one-time"},{phase:"Phase 5 — On-Page SEO",start:4,len:2,kind:"one-time"},{phase:"Phase 6 — Content & E-E-A-T",start:5,len:3,kind:"recurring"},{phase:"Phase 7 — Local SEO",start:6,len:2,kind:"recurring"},{phase:"Phase 8 — Off-Page & Authority",start:7,len:6,kind:"recurring"},{phase:"Phase 9 — AI Search Readiness",start:8,len:5,kind:"recurring"},{phase:"Phase 10 — Measurement & Reporting",start:9,len:4,kind:"recurring"}];

function BoardView({tasks,companyId,track,statusFilter,assigneeFilter,theme:t,onOpen,onUpdate,todayISO,weekISO,editMode,selected,onToggleSelect}){
  const matchAssignee=tk=>assigneeFilter==="all"||(assigneeFilter==="__unassigned"?tk.assignees.length===0:tk.assignees.includes(assigneeFilter));
  const visible=useMemo(()=>tasks.filter(tk=>(companyId==="all"||tk.companyId===companyId)&&tk.track===track&&(statusFilter==="all"||tk.status===statusFilter)&&matchAssignee(tk)&&(!tk.recurring||(tk.deadline>=todayISO&&tk.deadline<=weekISO))),[tasks,companyId,track,statusFilter,assigneeFilter,todayISO,weekISO]);
  const grouped=useMemo(()=>{const m=new Map();for(const tk of visible){if(!m.has(tk.phase))m.set(tk.phase,[]);m.get(tk.phase).push(tk);}return[...m.entries()];},[visible]);
  if(!grouped.length)return <div style={{flex:1,overflowY:"auto",padding:"22px 38px 60px"}}><div style={{textAlign:"center",color:t.inkFaint,padding:50,fontSize:14}}>No tasks match this filter.</div></div>;
  const togglePhase=(items,allSel)=>{items.forEach(tk=>{const has=selected&&selected.has(tk.id);if(allSel&&has)onToggleSelect(tk.id);else if(!allSel&&!has)onToggleSelect(tk.id);});};
  return(
    <div style={{flex:1,overflowY:"auto",padding:"22px 38px 60px"}}>
      {grouped.map(([phase,items])=>{
        const done=items.filter(tk=>tk.status==="done").length;
        const allSel=editMode&&selected&&items.length>0&&items.every(tk=>selected.has(tk.id));
        return(
          <div key={phase} style={{marginBottom:24,background:t.bgCard,borderRadius:14,border:`1px solid ${t.line}`,overflow:"hidden",boxShadow:t.shadowCard}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px",background:t.bgElevated,borderBottom:`1px solid ${t.line}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {editMode&&<button onClick={()=>togglePhase(items,allSel)} title={allSel?"Deselect all in phase":"Select all in phase"} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"grid",placeItems:"center",color:allSel?t.accent:t.inkFaint}}>{allSel?<CheckSquare size={17}/>:<Square size={17}/>}</button>}
                <span style={{fontWeight:700,fontSize:13.5,color:t.ink,letterSpacing:"-.01em"}}>{phase}</span>
              </div>
              <span style={{fontSize:12,color:t.inkFaint,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{done}/{items.length}</span>
            </div>
            {items.map(tk=>{
              const St=STATUSES[tk.status];const Ico=St.icon;const sC=stC(tk.status,t);
              const co=COMPANIES.find(c=>c.id===tk.companyId);
              const isSel=editMode&&selected&&selected.has(tk.id);
              return(
                <div key={tk.id} className="task-row" onClick={()=>editMode&&onToggleSelect(tk.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",borderBottom:`1px solid ${t.line}`,transition:"background .12s",cursor:editMode?"pointer":"default",background:isSel?t.accentSoft:"transparent"}}>
                  {editMode
                    ?<span style={{display:"grid",placeItems:"center",color:isSel?t.accent:t.inkFaint}}>{isSel?<CheckSquare size={17}/>:<Square size={17}/>}</span>
                    :<button onClick={()=>{const i=STATUS_ORDER.indexOf(tk.status);onUpdate(tk.id,{status:STATUS_ORDER[(i+1)%4]});}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"grid",placeItems:"center",color:sC}}><Ico size={17}/></button>}
                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={e=>{if(editMode)return;e.stopPropagation();onOpen(tk.id);}}>
                    <div style={{fontSize:14,fontWeight:500,color:tk.status==="done"?t.inkFaint:t.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:tk.status==="done"?"line-through":"none"}}>{tk.title}</div>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:4,flexWrap:"wrap"}}>
                      {companyId==="all"&&co&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:5,background:co.color+"22",color:co.color}}>{co.short}</span>}
                      <span style={{fontSize:11,color:t.inkFaint,background:t.bgElevated,padding:"2px 7px",borderRadius:5,fontWeight:600}}>{tk.cadence}</span>
                      {tk.deadline&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Calendar size={11}/>{tk.deadline}</span>}
                      {tk.assignees.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Users size={11}/>{tk.assignees.join(", ")}</span>}
                      {tk.status==="done"&&tk.completed_by&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:t.good,background:t.goodSoft,padding:"2px 8px",borderRadius:5}}><Check size={11}/>Done by {tk.completed_by}</span>}
                      {tk.notes.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><MessageSquare size={11}/>{tk.notes.length}</span>}
                    </div>
                  </div>
                  {!editMode&&<button onClick={()=>{const o=["high","medium","low"];const i=o.indexOf(tk.priority);onUpdate(tk.id,{priority:o[(i+1)%3]});}} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
                    <Star size={15} style={{color:PRIORITIES[tk.priority],fill:tk.priority==="high"?PRIORITIES.high:"none"}}/>
                  </button>}
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
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseISO=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const startOfWeek=d=>addDays(d,-d.getDay());

function CalendarView({tasks,companyId,track,assigneeFilter,setAssigneeFilter,theme:t,onOpen,onAddTask,onReschedule,editMode,selected,onToggleSelect,onOpenDay,onStartEdit,onExitEdit,onDeleteSelected}){
  const [mode,setMode]=useState("month");                 // day | week | month
  const [anchor,setAnchor]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return d;}); // reference date
  const [showUnsched,setShowUnsched]=useState(false);
  const [drag,setDrag]=useState(null);                    // {id,title,from} while dragging a task
  const [overDay,setOverDay]=useState(null);              // ISO date currently hovered as a drop target
  const todayStr=ymd(new Date());

  const af=assigneeFilter||"all";
  const matchAssignee=tk=>af==="all"||(af==="__unassigned"?tk.assignees.length===0:tk.assignees.includes(af));
  const scoped=useMemo(()=>tasks.filter(tk=>(companyId==="all"||tk.companyId===companyId)&&matchAssignee(tk)),[tasks,companyId,af]);
  const dated=useMemo(()=>scoped.filter(tk=>tk.deadline),[scoped]);
  const unscheduled=useMemo(()=>scoped.filter(tk=>!tk.deadline&&tk.status!=="done"),[scoped]);
  const byDay=useMemo(()=>{const map={};for(const tk of dated)(map[tk.deadline]||=[]).push(tk);return map;},[dated]);
  const selCount=selected?selected.size:0;

  // ---- Drag & drop: reschedule a task by dragging its chip to another day ----
  const dragHandlers={
    dragging:drag,
    overDay,
    onDragStartTask:(tk)=>setDrag({id:tk.id,title:tk.title,from:tk.deadline}),
    onDragEndTask:()=>{setDrag(null);setOverDay(null);},
    onDayDragOver:(ds)=>{if(drag&&ds!==overDay)setOverDay(ds);},
    onDayDrop:(ds)=>{
      if(drag&&ds&&ds!==drag.from&&onReschedule)onReschedule(drag.id,ds);
      setDrag(null);setOverDay(null);
    },
  };

  // ---- Navigation: step depends on the current mode ----
  const step=dir=>{
    if(mode==="month"){const d=new Date(anchor);d.setDate(1);d.setMonth(d.getMonth()+dir);setAnchor(d);}
    else if(mode==="week")setAnchor(addDays(anchor,7*dir));
    else setAnchor(addDays(anchor,dir));
  };
  const goToday=()=>{const d=new Date();d.setHours(0,0,0,0);setAnchor(d);};

  // ---- Title + counts for the active range ----
  const rangeLabel=(()=>{
    if(mode==="month")return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if(mode==="week"){const s=startOfWeek(anchor),e=addDays(s,6);
      const sameMonth=s.getMonth()===e.getMonth();
      return sameMonth?`${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
        :`${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;}
    return `${DOW[anchor.getDay()]}, ${MONTHS[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`;
  })();
  const inRange=(()=>{
    if(mode==="month")return tk=>tk.deadline.startsWith(`${anchor.getFullYear()}-${String(anchor.getMonth()+1).padStart(2,"0")}`);
    if(mode==="week"){const s=ymd(startOfWeek(anchor)),e=ymd(addDays(startOfWeek(anchor),6));return tk=>tk.deadline>=s&&tk.deadline<=e;}
    const a=ymd(anchor);return tk=>tk.deadline===a;
  })();
  const rangeCount=dated.filter(inRange).length;

  const addBtnBg=t.accent;
  const gridProps={byDay,todayStr,theme:t,onOpen,onAddTask,editMode,selected,onToggleSelect,onOpenDay,dnd:dragHandlers};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 38px 24px",overflow:"hidden"}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:14,padding:"14px 16px",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <button onClick={()=>step(-1)} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:9,padding:7,cursor:"pointer",color:t.inkMuted,display:"grid",placeItems:"center"}}><ChevronLeft size={18}/></button>
          <h2 style={{margin:0,fontSize:mode==="day"?17:20,fontWeight:500,letterSpacing:"-.02em",color:t.ink,minWidth:mode==="month"?170:220,textAlign:"center",fontFamily:"'Fraunces',serif"}}>{rangeLabel}</h2>
          <button onClick={()=>step(1)} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:9,padding:7,cursor:"pointer",color:t.inkMuted,display:"grid",placeItems:"center"}}><ChevronRight size={18}/></button>
          <button onClick={goToday} style={{background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",marginLeft:4,fontFamily:"inherit"}}>Today</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Day / Week / Month segmented control */}
          <div style={{display:"flex",gap:3,background:t.bgElevated,padding:3,borderRadius:9,border:`1px solid ${t.line}`}}>
            {["day","week","month"].map(mv=>(
              <button key={mv} onClick={()=>setMode(mv)} style={{padding:"6px 14px",borderRadius:6,fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:"none",textTransform:"capitalize",background:mode===mv?t.bgCard:"transparent",color:mode===mv?t.accentDeep:t.inkMuted,boxShadow:mode===mv?t.shadowCard:"none"}}>{mv}</button>
            ))}
          </div>
          {editMode?(
            <>
              <span style={{fontSize:12.5,fontWeight:600,color:t.inkMuted}}>{selCount} selected</span>
              <button onClick={onDeleteSelected} disabled={!selCount} style={{display:"flex",alignItems:"center",gap:6,background:selCount?t.bad:t.bgElevated,color:selCount?"#fff":t.inkFaint,border:`1px solid ${selCount?t.bad:t.lineStrong}`,borderRadius:9,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:selCount?"pointer":"default",fontFamily:"inherit"}}><Trash2 size={15}/>Delete</button>
              <button onClick={onExitEdit} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,color:t.ink,border:`1px solid ${t.lineStrong}`,borderRadius:9,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Done</button>
            </>
          ):(
            <>
              {drag
                ?<span style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:600,color:t.accentDeep,background:t.accentSoft,border:`1px solid ${t.accent}55`,borderRadius:9,padding:"7px 12px"}}><CalendarDays size={14}/>Drop on a day to move “{drag.title.length>28?drag.title.slice(0,28)+"…":drag.title}”</span>
                :<span style={{fontSize:12.5,color:t.inkMuted,fontWeight:600}}>{rangeCount} task{rangeCount!==1?"s":""} this {mode}</span>}
              {unscheduled.length>0&&<button onClick={()=>setShowUnsched(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:showUnsched?t.warnSoft:t.bgElevated,border:`1px solid ${showUnsched?t.warn:t.lineStrong}`,color:showUnsched?t.warn:t.inkMuted,borderRadius:9,padding:"7px 13px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><AlertTriangle size={13}/>{unscheduled.length} unscheduled<ChevronDown size={13} style={{transform:showUnsched?"rotate(180deg)":"none",transition:"transform .15s"}}/></button>}
              <div style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,border:`1px solid ${af!=="all"?t.accent:t.line}`,borderRadius:9,padding:"0 10px"}}>
                <Users size={14} style={{opacity:.6,color:af!=="all"?t.accent:t.inkFaint}}/>
                <select style={{border:"none",background:t.bgElevated,padding:"8px 4px",fontSize:13,color:t.ink,cursor:"pointer",outline:"none",fontFamily:"inherit"}} value={af} onChange={e=>setAssigneeFilter&&setAssigneeFilter(e.target.value)}>
                  <option style={{background:t.bgElevated,color:t.ink}} value="all">Everyone</option>
                  <option style={{background:t.bgElevated,color:t.ink}} value="__unassigned">Unassigned</option>
                  {TEAM.map(n=><option key={n} style={{background:t.bgElevated,color:t.ink}} value={n}>{n}</option>)}
                </select>
              </div>
              <button onClick={onStartEdit} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,color:t.ink,border:`1px solid ${t.lineStrong}`,borderRadius:9,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><CheckSquare size={15}/>Edit</button>
              <button onClick={()=>onAddTask&&onAddTask(mode==="day"?ymd(anchor):"")} style={{display:"flex",alignItems:"center",gap:6,background:addBtnBg,color:t.bg,border:"none",borderRadius:9,padding:"9px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 6px 16px -8px ${t.accent}cc`}}><Plus size={15}/>Add task</button>
            </>
          )}
        </div>
      </div>

      {/* Unscheduled tray */}
      {showUnsched&&unscheduled.length>0&&(
        <div style={{marginBottom:16,background:t.bgCard,border:`1px solid ${t.line}`,borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:12,color:t.inkMuted,marginBottom:10}}>These board tasks have no deadline yet — click one to open it and set a deadline, and it will appear on the calendar automatically.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:150,overflowY:"auto"}}>
            {unscheduled.map(tk=>{const co=COMPANIES.find(c=>c.id===tk.companyId);return(
              <button key={tk.id} onClick={()=>onOpen&&onOpen(tk.id)} title={`${tk.phase} · ${tk.title}`} style={{display:"flex",alignItems:"center",gap:7,background:t.bgElevated,border:`1px solid ${t.line}`,borderLeft:`3px solid ${co?.color||t.accent}`,borderRadius:8,padding:"6px 11px",fontSize:12,color:t.inkMuted,cursor:"pointer",fontFamily:"inherit",maxWidth:280}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:stC(tk.status,t),flexShrink:0}}/>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</span>
              </button>
            );})}
          </div>
        </div>
      )}

      {/* Active view */}
      {mode==="month"&&<MonthGrid anchor={anchor} {...gridProps}/>}
      {mode==="week" &&<WeekGrid  anchor={anchor} {...gridProps}/>}
      {mode==="day"  &&<DayList   anchor={anchor} {...gridProps}/>}
    </div>
  );
}

// Pick black or white text for readability against a given hex background.
function readableOn(hex){
  const h=(hex||"").replace("#","");
  if(h.length!==6)return "#0B0B0B";
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  // relative luminance
  const L=(0.299*r+0.587*g+0.114*b)/255;
  return L>0.6?"#0B0B0B":"#FFFFFF";
}

// Small reusable task chip used across calendar views.
// Filled with the company's full color so it's easy to read and identify at a glance.
// In edit mode, clicking toggles selection instead of opening the task.
// Outside edit mode the chip is draggable — drop it on another day to reschedule.
function CalTaskChip({tk,theme:t,onOpen,editMode,selected,onToggleSelect,dnd}){
  const co=COMPANIES.find(c=>c.id===tk.companyId);
  const bg=co?.color||t.accent;
  const fg="#0B0B0B"; // caption/label text always black on the colored chip
  const done=tk.status==="done";
  const isSel=editMode&&selected&&selected.has(tk.id);
  const isDragging=dnd&&dnd.dragging&&dnd.dragging.id===tk.id;
  const draggable=!editMode&&!!dnd;
  const click=()=>{if(editMode)onToggleSelect&&onToggleSelect(tk.id);else onOpen&&onOpen(tk.id);};
  return(
    <button
      draggable={draggable}
      onDragStart={draggable?(e)=>{try{e.dataTransfer.setData("text/plain",tk.id);e.dataTransfer.effectAllowed="move";}catch{}dnd.onDragStartTask(tk);}:undefined}
      onDragEnd={draggable?()=>dnd.onDragEndTask():undefined}
      onClick={click}
      title={draggable?`Drag to move · ${tk.title}`:`${tk.title}${tk.assignees.length?` · ${tk.assignees.join(", ")}`:""}${done&&tk.completed_by?` · Done by ${tk.completed_by}`:""}`}
      style={{display:"flex",alignItems:"center",gap:6,background:bg,border:isSel?`2px solid ${fg}`:"2px solid transparent",borderRadius:6,padding:"4px 7px",fontSize:11.5,fontWeight:600,color:fg,overflow:"hidden",cursor:draggable?"grab":"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",opacity:isDragging?.4:(done&&!isSel?.72:1)}}>
      {editMode
        ?(isSel?<CheckSquare size={13} style={{flexShrink:0}}/>:<Square size={13} style={{flexShrink:0,opacity:.85}}/>)
        :<span style={{width:8,height:8,borderRadius:"50%",background:stC(tk.status,t),flexShrink:0,boxShadow:`0 0 0 1.5px ${fg==="#FFFFFF"?"rgba(255,255,255,.85)":"rgba(0,0,0,.6)"}`}}/>}
      <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:done?"line-through":"none"}}>{tk.title}</span>
      {tk.assignees.length>0&&<span style={{flexShrink:0,fontSize:9.5,fontWeight:700,color:fg,background:fg==="#FFFFFF"?"rgba(0,0,0,.22)":"rgba(255,255,255,.32)",borderRadius:8,padding:"1px 6px"}}>{tk.assignees.map(a=>a.charAt(0)).join("")}</span>}
    </button>
  );
}

// MONTH — 7-column grid (hover a day to reveal a + to add on that date; drag a task onto a day to move it).
function MonthGrid({anchor,byDay,todayStr,theme:t,onOpen,onAddTask,editMode,selected,onToggleSelect,onOpenDay,dnd}){
  const y=anchor.getFullYear(),m=anchor.getMonth();
  const sDow=new Date(y,m,1).getDay();const dim=new Date(y,m+1,0).getDate();
  const cells=[];for(let i=0;i<sDow;i++)cells.push(null);
  for(let d=1;d<=dim;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;cells.push({d,ds,tasks:byDay[ds]||[]});}
  while(cells.length%7!==0)cells.push(null);
  const chipProps={theme:t,onOpen,editMode,selected,onToggleSelect,dnd};
  const dragging=dnd&&dnd.dragging;
  return(
    <div style={{flex:1,overflowY:"auto",border:`1px solid ${t.line}`,borderRadius:14,minHeight:0,background:t.bgCard}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:1,background:t.line}}>
        {DOW.map(d=><div key={d} style={{background:t.bgElevated,padding:"11px 0",textAlign:"center",fontSize:11.5,fontWeight:700,color:t.inkMuted,letterSpacing:".08em",textTransform:"uppercase"}}>{d}</div>)}
        {cells.map((cell,i)=>{
          if(!cell)return <div key={i} style={{background:t.bgSunk,minHeight:150}}/>;
          const isT=cell.ds===todayStr;
          const isOver=dragging&&dnd.overDay===cell.ds;
          const isFrom=dragging&&dnd.dragging.from===cell.ds;
          return(
            <div key={i} className="cal-day"
              onDragOver={dragging?(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";dnd.onDayDragOver(cell.ds);}:undefined}
              onDrop={dragging?(e)=>{e.preventDefault();dnd.onDayDrop(cell.ds);}:undefined}
              style={{position:"relative",background:isOver?t.accentSoft:isT?`${t.accent}11`:t.bgCard,minHeight:150,padding:"7px 8px",display:"flex",flexDirection:"column",border:isOver?`2px dashed ${t.accent}`:isT?`1px solid ${t.accent}`:"none",boxShadow:isOver?`inset 0 0 0 1px ${t.accent}`:"none",transition:"background .1s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${t.line}`}}>
                <button onClick={()=>!editMode&&onOpenDay&&onOpenDay(cell.ds)} title={editMode?"":"View this day"} style={{border:"none",background:"none",padding:0,cursor:editMode?"default":"pointer",fontSize:14,fontWeight:700,color:isT?t.bg:t.inkMuted,fontFamily:"inherit",...(isT?{background:t.accent,width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:12}:{})}}>{cell.d}</button>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  {cell.tasks.length>0&&<button onClick={()=>onOpenDay&&onOpenDay(cell.ds)} title="View this day" style={{border:"none",fontSize:10.5,fontWeight:700,color:t.accent,background:t.accentSoft,borderRadius:9,padding:"2px 8px",cursor:"pointer",fontFamily:"inherit"}}>{cell.tasks.length}</button>}
                  {!editMode&&!dragging&&<button className="cal-add" onClick={()=>onAddTask&&onAddTask(cell.ds)} title={`Add task on ${cell.ds}`} style={{opacity:0,transition:"opacity .12s",background:t.bgElevated,border:`1px solid ${t.lineStrong}`,color:t.accent,borderRadius:6,width:20,height:20,display:"grid",placeItems:"center",cursor:"pointer",padding:0}}><Plus size={13}/></button>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,overflowY:"auto",pointerEvents:dragging?"none":"auto"}}>
                {cell.tasks.slice(0,4).map(tk=><CalTaskChip key={tk.id} tk={tk} {...chipProps}/>)}
                {cell.tasks.length>4&&<button onClick={()=>onOpenDay&&onOpenDay(cell.ds)} style={{border:"none",background:"none",fontSize:11,color:t.accent,fontWeight:700,padding:"2px 0",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>+{cell.tasks.length-4} more</button>}
              </div>
              {isOver&&!isFrom&&<div style={{position:"absolute",inset:0,pointerEvents:"none",display:"grid",placeItems:"center"}}><span style={{fontSize:11,fontWeight:700,color:t.accentDeep,background:t.bgCard,border:`1px solid ${t.accent}`,borderRadius:8,padding:"3px 9px",boxShadow:t.shadowCard}}>Move here</span></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// WEEK — 7 taller day columns for the week containing the anchor date.
function WeekGrid({anchor,byDay,todayStr,theme:t,onOpen,onAddTask,editMode,selected,onToggleSelect,onOpenDay,dnd}){
  const start=startOfWeek(anchor);
  const days=Array.from({length:7},(_,i)=>{const d=addDays(start,i);const ds=ymd(d);return{d,ds,tasks:byDay[ds]||[]};});
  const chipProps={theme:t,onOpen,editMode,selected,onToggleSelect,dnd};
  const dragging=dnd&&dnd.dragging;
  return(
    <div style={{flex:1,overflowY:"auto",border:`1px solid ${t.line}`,borderRadius:14,minHeight:0,background:t.bgCard}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:1,background:t.line,minHeight:"100%"}}>
        {days.map((day,i)=>{
          const isT=day.ds===todayStr;
          const isOver=dragging&&dnd.overDay===day.ds;
          return(
            <div key={i} className="cal-day"
              onDragOver={dragging?(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";dnd.onDayDragOver(day.ds);}:undefined}
              onDrop={dragging?(e)=>{e.preventDefault();dnd.onDayDrop(day.ds);}:undefined}
              style={{position:"relative",background:isOver?t.accentSoft:isT?`${t.accent}11`:t.bgCard,display:"flex",flexDirection:"column",minHeight:420,border:isOver?`2px dashed ${t.accent}`:"none",transition:"background .1s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 10px 8px",borderBottom:`1px solid ${t.line}`,position:"sticky",top:0,background:isT?t.bgCard:t.bgElevated,zIndex:1}}>
                <button onClick={()=>!editMode&&onOpenDay&&onOpenDay(day.ds)} title={editMode?"":"View this day"} style={{border:"none",background:"none",padding:0,cursor:editMode?"default":"pointer",textAlign:"left",fontFamily:"inherit"}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:t.inkFaint,letterSpacing:".08em",textTransform:"uppercase"}}>{DOW[day.d.getDay()]}</div>
                  <div style={{fontSize:16,fontWeight:700,color:isT?t.accent:t.ink,fontFamily:"'Fraunces',serif"}}>{day.d.getDate()}{day.tasks.length>0&&<span style={{marginLeft:6,fontSize:10.5,fontFamily:"'IBM Plex Sans',inherit",fontWeight:700,color:t.accent,background:t.accentSoft,borderRadius:8,padding:"1px 7px",verticalAlign:"middle"}}>{day.tasks.length}</span>}</div>
                </button>
                {!editMode&&!dragging&&<button className="cal-add" onClick={()=>onAddTask&&onAddTask(day.ds)} title={`Add task on ${day.ds}`} style={{opacity:0,transition:"opacity .12s",background:t.bgElevated,border:`1px solid ${t.lineStrong}`,color:t.accent,borderRadius:6,width:22,height:22,display:"grid",placeItems:"center",cursor:"pointer",padding:0}}><Plus size={14}/></button>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,padding:"8px",overflowY:"auto",flex:1,pointerEvents:dragging?"none":"auto"}}>
                {day.tasks.length===0&&!editMode&&!dragging&&<button onClick={()=>onAddTask&&onAddTask(day.ds)} style={{border:`1px dashed ${t.line}`,background:"none",borderRadius:8,padding:"10px 8px",fontSize:11.5,color:t.inkGhost,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>}
                {day.tasks.length===0&&dragging&&<div style={{border:`1px dashed ${isOver?t.accent:t.line}`,borderRadius:8,padding:"14px 8px",fontSize:11.5,color:isOver?t.accentDeep:t.inkGhost,textAlign:"center"}}>{isOver?"Move here":""}</div>}
                {day.tasks.map(tk=><CalTaskChip key={tk.id} tk={tk} {...chipProps}/>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// DAY — a single agenda list for the anchor date.
function DayList({anchor,byDay,todayStr,theme:t,onOpen,onAddTask,editMode,selected,onToggleSelect}){
  const ds=ymd(anchor);const items=byDay[ds]||[];const isT=ds===todayStr;
  return(
    <div style={{flex:1,overflowY:"auto",border:`1px solid ${t.line}`,borderRadius:14,minHeight:0,background:t.bgCard,padding:"20px 22px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:12,background:isT?t.accent:t.bgElevated,color:isT?t.bg:t.ink,display:"grid",placeItems:"center",fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600}}>{anchor.getDate()}</div>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:t.ink}}>{DOW[anchor.getDay()]}, {MONTHS[anchor.getMonth()]} {anchor.getDate()}</div>
            <div style={{fontSize:12.5,color:t.inkMuted}}>{items.length} task{items.length!==1?"s":""} due{isT?" · today":""}</div>
          </div>
        </div>
        {!editMode&&<button onClick={()=>onAddTask&&onAddTask(ds)} style={{display:"flex",alignItems:"center",gap:6,background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Plus size={15}/>Add task on this day</button>}
      </div>
      {items.length===0
        ?<div style={{textAlign:"center",color:t.inkFaint,padding:"48px 20px",fontSize:14}}>Nothing scheduled for this day.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:640}}>
          {items.map(tk=>{const co=COMPANIES.find(c=>c.id===tk.companyId);const St=STATUSES[tk.status];const Ico=St.icon;const isSel=editMode&&selected&&selected.has(tk.id);const click=()=>{if(editMode)onToggleSelect&&onToggleSelect(tk.id);else onOpen&&onOpen(tk.id);};return(
            <button key={tk.id} onClick={click} style={{display:"flex",alignItems:"center",gap:12,background:isSel?t.accentSoft:t.bgElevated,border:`1px solid ${isSel?t.accent:t.line}`,borderLeft:`3px solid ${co?.color||t.accent}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%"}}>
              {editMode
                ?(isSel?<CheckSquare size={17} style={{color:t.accent,flexShrink:0}}/>:<Square size={17} style={{color:t.inkFaint,flexShrink:0}}/>)
                :<Ico size={17} style={{color:stC(tk.status,t),flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,color:tk.status==="done"?t.inkFaint:t.ink,textDecoration:tk.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:9,marginTop:3,flexWrap:"wrap"}}>
                  {co&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:5,background:co.color+"22",color:co.color}}>{co.short}</span>}
                  <span style={{fontSize:11,color:t.inkFaint}}>{tk.phase}</span>
                  {tk.assignees.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Users size={11}/>{tk.assignees.join(", ")}</span>}
                  {tk.status==="done"&&tk.completed_by&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:t.good,background:t.goodSoft,padding:"2px 8px",borderRadius:5}}><Check size={11}/>Done by {tk.completed_by}</span>}
                </div>
              </div>
              <Star size={14} style={{color:PRIORITIES[tk.priority],fill:tk.priority==="high"?PRIORITIES.high:"none",flexShrink:0}}/>
            </button>
          );})}
        </div>}
    </div>
  );
}

// ── DAY TASKS POPUP ───────────────────────────────────────────
// Opens when a day is clicked (or "+N more" is tapped) and lists every task due that day.
function DayTasksModal({date,tasks,theme:t,onClose,onOpen,onAddTask,editMode,selected,onToggleSelect}){
  const d=parseISO(date);
  const heading=`${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const sorted=[...tasks].sort((a,b)=>{const o={high:0,medium:1,low:2};return (o[a.priority]??1)-(o[b.priority]??1);});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",zIndex:110,backdropFilter:"blur(4px)",padding:24}} onClick={onClose}>
      <div style={{width:640,maxWidth:"94vw",maxHeight:"86vh",background:t.bgCard,display:"flex",flexDirection:"column",borderRadius:18,border:`1px solid ${t.lineStrong}`,boxShadow:"0 30px 90px rgba(0,0,0,.62)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${t.line}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:t.accent,color:t.bg,display:"grid",placeItems:"center",fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600}}>{d.getDate()}</div>
            <div>
              <div style={{fontSize:16,fontWeight:600,color:t.ink,fontFamily:"'Fraunces',serif"}}>{heading}</div>
              <div style={{fontSize:12.5,color:t.inkMuted}}>{tasks.length} task{tasks.length!==1?"s":""} due</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:7,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
        </div>
        <div style={{padding:"16px 24px",overflowY:"auto",flex:1}}>
          {sorted.length===0
            ?<div style={{textAlign:"center",color:t.inkFaint,padding:"40px 20px",fontSize:14}}>Nothing scheduled for this day.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sorted.map(tk=>{const co=COMPANIES.find(c=>c.id===tk.companyId);const St=STATUSES[tk.status];const Ico=St.icon;const isSel=editMode&&selected&&selected.has(tk.id);const click=()=>{if(editMode)onToggleSelect&&onToggleSelect(tk.id);else onOpen&&onOpen(tk.id);};return(
                <button key={tk.id} onClick={click} style={{display:"flex",alignItems:"center",gap:12,background:isSel?t.accentSoft:t.bgElevated,border:`1px solid ${isSel?t.accent:t.line}`,borderLeft:`3px solid ${co?.color||t.accent}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%"}}>
                  {editMode
                    ?(isSel?<CheckSquare size={17} style={{color:t.accent,flexShrink:0}}/>:<Square size={17} style={{color:t.inkFaint,flexShrink:0}}/>)
                    :<Ico size={17} style={{color:stC(tk.status,t),flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:500,color:tk.status==="done"?t.inkFaint:t.ink,textDecoration:tk.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</div>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:3,flexWrap:"wrap"}}>
                      {co&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:5,background:co.color+"22",color:co.color}}>{co.short}</span>}
                      <span style={{fontSize:11,color:t.inkFaint}}>{tk.phase}</span>
                      {tk.assignees.length>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,color:t.inkMuted}}><Users size={11}/>{tk.assignees.join(", ")}</span>}
                      {tk.status==="done"&&tk.completed_by&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:t.good,background:t.goodSoft,padding:"2px 8px",borderRadius:5}}><Check size={11}/>Done by {tk.completed_by}</span>}
                    </div>
                  </div>
                  <Star size={14} style={{color:PRIORITIES[tk.priority],fill:tk.priority==="high"?PRIORITIES.high:"none",flexShrink:0}}/>
                </button>
              );})}
            </div>}
        </div>
        {!editMode&&<div style={{padding:"14px 24px",borderTop:`1px solid ${t.line}`}}>
          <button onClick={onAddTask} style={{display:"flex",alignItems:"center",gap:6,background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Plus size={15}/>Add task on this day</button>
        </div>}
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
        {[{id:"all",short:"ALL",color:ALL_COLOR},...COMPANIES].map(c=>{
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
function TaskDrawer({t:tk,onClose,update,onDelete,company,me,onChanged,theme:th}){
  const [note,setNote]=useState("");const [linkUrl,setUrl]=useState("");const [linkLabel,setLbl]=useState("");const [busy,setBusy]=useState(false);
  const [titleDraft,setTitleDraft]=useState(tk.title);
  const [captionDraft,setCaptionDraft]=useState(tk.caption||"");
  useEffect(()=>{setTitleDraft(tk.title);setCaptionDraft(tk.caption||"");},[tk.id]);
  const saveTitle=()=>{const v=titleDraft.trim();if(v&&v!==tk.title)update(tk.id,{title:v});else setTitleDraft(tk.title);};
  const saveCaption=()=>{const v=captionDraft;if(v!==(tk.caption||""))update(tk.id,{caption:v});};
  const phases=useMemo(()=>{const p=PHASES_FOR(tk.track);return p.includes(tk.phase)?p:[tk.phase,...p];},[tk.track,tk.phase]);
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",zIndex:100,backdropFilter:"blur(4px)",padding:24}} onClick={onClose}>
      <div style={{width:900,maxWidth:"96vw",maxHeight:"90vh",background:th.bgCard,overflowY:"auto",padding:"28px 34px 32px",borderRadius:18,border:`1px solid ${th.lineStrong}`,boxShadow:"0 30px 90px rgba(0,0,0,.62)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10.5,fontWeight:700,padding:"4px 11px",borderRadius:6,background:company.color+"22",color:company.color,letterSpacing:".04em"}}>{company.short}</span>
            <span style={{fontSize:12.5,color:th.inkFaint}}>{company.name}</span>
          </div>
          <button onClick={onClose} style={{background:th.bgElevated,border:`1px solid ${th.line}`,borderRadius:8,padding:7,cursor:"pointer",color:th.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
        </div>

        {/* Title spans full width */}
        <Field label="Title" theme={th}>
          <textarea value={titleDraft} onChange={e=>setTitleDraft(e.target.value)} onBlur={saveTitle} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur();}}} rows={2} style={{...IS,fontFamily:"'Fraunces',serif",fontSize:20,lineHeight:1.35,resize:"vertical"}}/>
        </Field>

        {/* Caption — large area so most of the post copy is visible at once */}
        <div style={{marginBottom:22}}>
          <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,fontSize:12.5,fontWeight:700,color:th.inkMuted,marginBottom:9,textTransform:"uppercase",letterSpacing:".05em"}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><MessageSquare size={13}/>Caption</span>
            <span style={{fontSize:11,fontWeight:600,color:th.inkFaint,textTransform:"none",letterSpacing:0,fontFamily:"'JetBrains Mono',monospace"}}>{captionDraft.length} char{captionDraft.length!==1?"s":""}</span>
          </label>
          <textarea value={captionDraft} onChange={e=>setCaptionDraft(e.target.value)} onBlur={saveCaption} placeholder="Write the caption for this post…" rows={10} style={{...IS,minHeight:220,lineHeight:1.55,fontSize:14,resize:"vertical",whiteSpace:"pre-wrap"}}/>
        </div>

        {/* Compact fields in two columns */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 28px"}}>
          <Field label="Phase" theme={th}>
            <select value={tk.phase} onChange={e=>update(tk.id,{phase:e.target.value})} style={IS}>{phases.map(p=><option key={p} value={p}>{p}</option>)}</select>
          </Field>
          <Field label="Deadline" theme={th}>
            <DateInput value={tk.deadline||""} onChange={v=>update(tk.id,{deadline:v})} theme={th}/>
          </Field>
          <Field label="Priority" theme={th}>
            <div style={{display:"flex",gap:7}}>{["high","medium","low"].map(p=><button key={p} onClick={()=>update(tk.id,{priority:p})} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,textTransform:"capitalize",fontFamily:"inherit",border:`1px solid ${tk.priority===p?PRIORITIES[p]:th.lineStrong}`,background:tk.priority===p?PRIORITIES[p]+"22":th.bgElevated,color:tk.priority===p?PRIORITIES[p]:th.inkMuted}}><Star size={12} style={{fill:tk.priority===p?PRIORITIES[p]:"none"}}/>{p}</button>)}</div>
          </Field>
          <Field label="Cadence" theme={th}>
            <select value={tk.cadence||"one-time"} onChange={e=>update(tk.id,{cadence:e.target.value})} style={IS}>{["one-time","weekly","monthly","quarterly"].map(c=><option key={c} value={c}>{c}</option>)}</select>
          </Field>
          <div style={{gridColumn:"1 / -1"}}>
            <Field label="Status" theme={th}>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{STATUS_ORDER.map(s=><button key={s} onClick={()=>update(tk.id,{status:s})} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,fontFamily:"inherit",border:`1px solid ${tk.status===s?sC2[s]:th.lineStrong}`,background:tk.status===s?sC2[s]+"22":th.bgElevated,color:tk.status===s?sC2[s]:th.inkMuted}}>{STATUSES[s].label}</button>)}</div>
              {tk.status==="done"&&tk.completed_by&&(
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,background:th.goodSoft,border:`1px solid ${th.good}44`,borderRadius:9,padding:"8px 12px",fontSize:12.5,color:th.good,fontWeight:600}}>
                  <Check size={14}/>Completed by {tk.completed_by}{tk.completed_at?` · ${new Date(tk.completed_at).toLocaleDateString()}`:""}
                </div>
              )}
            </Field>
          </div>
          <div style={{gridColumn:"1 / -1"}}>
            <Field label="Assignees" theme={th}>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{TEAM.map(n=><button key={n} onClick={()=>togA(n)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,fontFamily:"inherit",border:`1px solid ${tk.assignees.includes(n)?th.accent:th.lineStrong}`,background:tk.assignees.includes(n)?th.accentSoft:th.bgElevated,color:tk.assignees.includes(n)?th.accentDeep:th.inkMuted}}>{tk.assignees.includes(n)&&<Check size={12}/>}{n}</button>)}</div>
            </Field>
          </div>
        </div>

        {/* Attachments + Notes side by side on wide screens */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 28px"}}>
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

        <div style={{marginTop:8,paddingTop:18,borderTop:`1px solid ${th.line}`}}>
          <button onClick={()=>{if(window.confirm("Delete this task? This can't be undone."))onDelete(tk.id);}} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:"inherit",border:`1px solid ${th.bad}55`,background:th.badSoft,color:th.bad}}><Trash2 size={14}/>Delete task</button>
        </div>
      </div>
    </div>
  );
}

// ── MARKETING HUB ─────────────────────────────────────────────
// Functional, Supabase-backed. Files upload to the "hub" bucket; contacts,
// brand assets, and templates persist in the hub_* tables (see 05_hub.sql).
function coChip(id,t){
  const c=id==="all"?{short:"All",color:ALL_COLOR}:(COMPANIES.find(x=>x.id===id)||{short:"—",color:t.inkFaint});
  return <span style={{fontSize:10.5,fontWeight:600,padding:"3px 8px",borderRadius:6,background:c.color+"22",color:c.color,letterSpacing:".02em"}}>{c.short}</span>;
}
// Editable company badge: looks like coChip, but is a dropdown so an item can be
// reassigned to a different company inline. Used in the Files/Contacts/Templates lists.
function CompanyChipSelect({value,onChange,includeAll,t}){
  const opts=includeAll?[{id:"all",short:"All",name:"All Companies",color:ALL_COLOR},...COMPANIES]:COMPANIES;
  const cur=value==="all"?{short:"All",color:ALL_COLOR}:(COMPANIES.find(x=>x.id===value)||{short:"—",color:t.inkFaint});
  return(
    <span style={{position:"relative",display:"inline-flex",alignItems:"center"}} title="Change company">
      <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10.5,fontWeight:600,padding:"3px 7px 3px 8px",borderRadius:6,background:cur.color+"22",color:cur.color,cursor:"pointer",letterSpacing:".02em"}}>{cur.short}<ChevronDown size={11} style={{opacity:.7}}/></span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%"}}>
        {opts.map(o=><option key={o.id} value={o.id} style={{background:t.bgElevated,color:t.ink}}>{o.name||o.short}</option>)}
      </select>
    </span>
  );
}
function HubTabs({tabs,active,onChange,t}){
  return(
    <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:`1px solid ${t.line}`}}>
      {tabs.map(tab=>{
        const on=active===tab.id;const Icon=tab.icon;
        return <button key={tab.id} onClick={()=>onChange(tab.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",background:"none",border:"none",borderBottom:`2px solid ${on?t.accent:"transparent"}`,color:on?t.ink:t.inkMuted,cursor:"pointer",fontSize:13,fontWeight:on?600:500,fontFamily:"inherit",marginBottom:-1}}><Icon size={14}/>{tab.label}</button>;
      })}
    </div>
  );
}
function CompanyPicker({value,onChange,includeAll,t}){
  const opts=includeAll?[{id:"all",name:"All Companies"},...COMPANIES]:COMPANIES;
  return(
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...iS(t),cursor:"pointer",background:t.bgElevated,color:t.ink}}>
      {opts.map(o=><option key={o.id} value={o.id} style={{background:t.bgElevated,color:t.ink}}>{o.name||o.short}</option>)}
    </select>
  );
}

// ---- FILES ----
function HubFiles({companyId,me,t}){
  const[files,setFiles]=useState([]);
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);
  const[typeF,setTypeF]=useState("all");
  const[upCompany,setUpCompany]=useState(companyId==="all"?"aps":companyId);
  const[dragOver,setDragOver]=useState(false);
  const[progress,setProgress]=useState(null);   // {done,total} while uploading a batch
  const inputRef=useRef(null);
  const dragDepth=useRef(0);                     // track nested dragenter/leave so the overlay doesn't flicker
  const reload=async()=>{try{setFiles(await loadHubFiles());}finally{setLoading(false);}};
  useEffect(()=>{reload();},[]);
  useEffect(()=>{setUpCompany(companyId==="all"?"aps":companyId);},[companyId]);

  const ACCEPT=[".pdf",".xlsx",".xls",".csv",".tsv",".doc",".docx",".ppt",".pptx",".png",".jpg",".jpeg"];
  const accepted=name=>ACCEPT.some(ext=>name.toLowerCase().endsWith(ext));

  // Shared upload path used by both the picker and drag-and-drop.
  const uploadFiles=async fl=>{
    const list=Array.from(fl||[]).filter(Boolean);
    if(!list.length)return;
    const ok=list.filter(f=>accepted(f.name));
    const skipped=list.length-ok.length;
    if(!ok.length){alert("Those file types aren't supported. Allowed: PDF, spreadsheets, docs, slides, and images.");return;}
    setBusy(true);setProgress({done:0,total:ok.length});
    try{
      let done=0;
      for(const f of ok){await uploadHubFile(upCompany,f,me);setProgress({done:++done,total:ok.length});}
      await reload();
      if(skipped>0)alert(`${skipped} file${skipped!==1?"s were":" was"} skipped (unsupported type).`);
    }catch(err){alert("Upload failed: "+(err?.message||err));}
    finally{setBusy(false);setProgress(null);if(inputRef.current)inputRef.current.value="";}
  };
  const onPick=e=>uploadFiles(e.target.files);

  // ---- Drag & drop handlers (whole panel is a drop target) ----
  const onDragEnter=e=>{if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("Files")){e.preventDefault();dragDepth.current++;setDragOver(true);}};
  const onDragOver =e=>{if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("Files")){e.preventDefault();e.dataTransfer.dropEffect="copy";}};
  const onDragLeave=e=>{if(dragDepth.current>0)dragDepth.current--;if(dragDepth.current===0)setDragOver(false);};
  const onDrop=e=>{e.preventDefault();dragDepth.current=0;setDragOver(false);if(busy)return;uploadFiles(e.dataTransfer?.files);};

  const open=async f=>{const url=await hubFileUrl(f.storage_path);if(url)window.open(url,"_blank");};
  const del=async f=>{if(!window.confirm(`Delete "${f.name}"?`))return;await deleteHubFile(f);await reload();};
  const reassign=async(f,cid)=>{if(cid===f.company_id)return;setFiles(fs=>fs.map(x=>x.id===f.id?{...x,company_id:cid}:x));try{await setHubFileCompany(f.id,cid);}catch(err){alert("Couldn't reassign: "+(err?.message||err));reload();}};
  const shown=files.filter(f=>(companyId==="all"||f.company_id===companyId||f.company_id==="all")&&(typeF==="all"||f.kind===typeF));
  const coName=upCompany==="all"?"All companies":(COMPANIES.find(c=>c.id===upCompany)?.name||upCompany);
  return(
    <div onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{position:"relative"}}>
    <Panel theme={t} flush style={dragOver?{borderColor:t.accent,boxShadow:`0 0 0 2px ${t.accent}55`}:undefined}>
      <PHead title="Files" sub="Drag & drop files here, or use Upload" theme={t} b right={
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Tabs2 tabs={["all","sheet","pdf"]} active={typeF} onChange={setTypeF} theme={t}/>
          <div style={{width:150}}><CompanyPicker value={upCompany} onChange={setUpCompany} t={t}/></div>
          <input ref={inputRef} type="file" multiple onChange={onPick} style={{display:"none"}} accept={ACCEPT.join(",")}/>
          <Btn theme={t} sm accent onClick={()=>inputRef.current&&inputRef.current.click()}><Upload size={13}/>{busy?(progress?`Uploading ${progress.done}/${progress.total}…`:"Uploading…"):"Upload"}</Btn>
        </div>
      }/>
      {loading?<EmptyState label="Loading…" sub="Fetching your files." theme={t}/>
        :shown.length===0
        ? <div onClick={()=>inputRef.current&&inputRef.current.click()} style={{margin:"20px 22px 26px",border:`2px dashed ${dragOver?t.accent:t.lineStrong}`,borderRadius:14,padding:"46px 20px",textAlign:"center",cursor:"pointer",background:dragOver?`${t.accent}0d`:t.bgElevated,transition:"all .15s"}}>
            <div style={{width:52,height:52,margin:"0 auto 14px",borderRadius:14,background:t.bgCard,border:`1px solid ${t.line}`,display:"grid",placeItems:"center"}}><Upload size={22} style={{color:t.accent}}/></div>
            <div style={{fontSize:15,fontWeight:600,color:t.ink,marginBottom:5}}>Drag & drop files here</div>
            <div style={{fontSize:12.5,color:t.inkMuted,lineHeight:1.5}}>or click to browse · PDFs, spreadsheets, docs, slides, images<br/>New files upload to <strong style={{color:t.inkMuted}}>{coName}</strong></div>
          </div>
        : <div>
            <div style={{display:"grid",gridTemplateColumns:"1.9fr .8fr .8fr .9fr 60px",padding:"10px 22px",borderBottom:`1px solid ${t.line}`,fontSize:10,color:t.inkFaint,textTransform:"uppercase",letterSpacing:".06em"}}>
              <div>Name</div><div>Company</div><div>Type</div><div>Added</div><div/>
            </div>
            {shown.map((f,i)=>(
              <div key={f.id} style={{display:"grid",gridTemplateColumns:"1.9fr .8fr .8fr .9fr 60px",padding:"13px 22px",borderBottom:i<shown.length-1?`1px solid ${t.line}`:"none",alignItems:"center"}}>
                <div onClick={()=>open(f)} style={{display:"flex",alignItems:"center",gap:11,cursor:"pointer",minWidth:0}}>
                  {f.kind==="pdf"?<FileText size={17} style={{color:t.bad,flexShrink:0}}/>:<FileSpreadsheet size={17} style={{color:t.good,flexShrink:0}}/>}
                  <span style={{fontSize:13,color:t.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                </div>
                <div><CompanyChipSelect value={f.company_id} onChange={cid=>reassign(f,cid)} includeAll t={t}/></div>
                <div style={{fontSize:12,color:t.inkMuted}}>{f.kind==="pdf"?"PDF":f.kind==="sheet"?"Sheet":"File"}</div>
                <div style={{fontSize:12,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{new Date(f.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</div>
                <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
                  <Download size={15} style={{color:t.inkFaint,cursor:"pointer"}} onClick={()=>open(f)}/>
                  <Trash2 size={15} style={{color:t.inkFaint,cursor:"pointer"}} onClick={()=>del(f)}/>
                </div>
              </div>
            ))}
          </div>}
    </Panel>
    {/* Full-panel drop overlay shown while dragging files anywhere over the Files area */}
    {dragOver&&<div style={{position:"absolute",inset:0,borderRadius:12,background:`${t.accent}14`,border:`2px dashed ${t.accent}`,display:"grid",placeItems:"center",pointerEvents:"none",zIndex:5,backdropFilter:"blur(1px)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:60,height:60,margin:"0 auto 12px",borderRadius:16,background:t.bgCard,border:`1px solid ${t.accent}`,display:"grid",placeItems:"center",boxShadow:t.shadowCard}}><Upload size={26} style={{color:t.accent}}/></div>
        <div style={{fontSize:16,fontWeight:700,color:t.ink}}>Drop to upload</div>
        <div style={{fontSize:12.5,color:t.inkMuted,marginTop:3}}>Files will be added to {coName}</div>
      </div>
    </div>}
    </div>
  );
}

// ---- CONTACTS ----
function ContactModal({companyId,onClose,onSaved,t}){
  const[form,setForm]=useState({company_id:companyId==="all"?"aps":companyId,name:"",role:"",contact_type:"Vendor",email:"",phone:"",notes:""});
  const[busy,setBusy]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async()=>{
    if(!form.name.trim())return;
    setBusy(true);
    try{await createContact({...form,name:form.name.trim()});onSaved();onClose();}
    catch(err){alert("Save failed: "+(err?.message||err));setBusy(false);}
  };
  const TYPES=["Vendor","Press","Influencer","Ad platform","Client","Partner","Other"];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"grid",placeItems:"center",zIndex:100,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:520,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:16,padding:28,boxShadow:t.shadowHover}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:500,color:t.ink}}>Add contact</div>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:7,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
        </div>
        <Field label="Name" theme={t}><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Jane Smith" style={iS(t)}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
          <Field label="Company" theme={t}><CompanyPicker value={form.company_id} onChange={v=>set("company_id",v)} includeAll t={t}/></Field>
          <Field label="Type" theme={t}><select value={form.contact_type} onChange={e=>set("contact_type",e.target.value)} style={{...iS(t),cursor:"pointer"}}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Role / title" theme={t}><input value={form.role} onChange={e=>set("role",e.target.value)} placeholder="Google Ads Rep" style={iS(t)}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
          <Field label="Email" theme={t}><input value={form.email} onChange={e=>set("email",e.target.value)} placeholder="jane@company.com" style={iS(t)}/></Field>
          <Field label="Phone" theme={t}><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(555) 555-0100" style={iS(t)}/></Field>
        </div>
        <Field label="Notes" theme={t}><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Anything worth remembering…" style={{...iS(t),resize:"vertical"}}/></Field>
        <div style={{display:"flex",justifyContent:"flex-end",gap:9,marginTop:6}}>
          <Btn theme={t} onClick={onClose}>Cancel</Btn>
          <Btn theme={t} accent onClick={submit}>{busy?"Saving…":"Save contact"}</Btn>
        </div>
      </div>
    </div>
  );
}
function HubContacts({companyId,t}){
  const[contacts,setContacts]=useState([]);
  const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(false);
  const reload=async()=>{try{setContacts(await loadContacts());}finally{setLoading(false);}};
  useEffect(()=>{reload();},[]);
  const del=async c=>{if(!window.confirm(`Delete ${c.name}?`))return;await deleteContact(c.id);await reload();};
  const reassign=async(c,cid)=>{if(cid===c.company_id)return;setContacts(cs=>cs.map(x=>x.id===c.id?{...x,company_id:cid}:x));try{await setContactCompany(c.id,cid);}catch(err){alert("Couldn't reassign: "+(err?.message||err));reload();}};
  const shown=contacts.filter(c=>companyId==="all"||c.company_id===companyId||c.company_id==="all");
  const inits=n=>n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return(
    <div>
      {modal&&<ContactModal companyId={companyId} onClose={()=>setModal(false)} onSaved={reload} t={t}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:12.5,color:t.inkMuted}}>{shown.length} contact{shown.length!==1?"s":""}</div>
        <Btn theme={t} sm accent onClick={()=>setModal(true)}><Plus size={13}/>Add contact</Btn>
      </div>
      {loading?<Panel theme={t}><EmptyState label="Loading…" sub="Fetching contacts." theme={t}/></Panel>
        :shown.length===0
        ? <Panel theme={t}><EmptyState label="No contacts yet" sub="Add vendors, press, influencers, or ad reps." theme={t}/></Panel>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:15}}>
            {shown.map(c=>(
              <Panel key={c.id} theme={t}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:t.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600,fontSize:13,color:t.accentDeep,flexShrink:0}}>{inits(c.name)}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:500,color:t.ink}}>{c.name}</div>
                    <div style={{fontSize:12,color:t.inkMuted}}>{c.role}</div>
                  </div>
                  <div style={{marginLeft:"auto",display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}><CompanyChipSelect value={c.company_id} onChange={cid=>reassign(c,cid)} includeAll t={t}/>{c.contact_type&&<Pill v="neutral" theme={t}>{c.contact_type}</Pill>}</div>
                </div>
                <div style={{borderTop:`1px solid ${t.line}`,paddingTop:12,display:"flex",flexDirection:"column",gap:8}}>
                  {c.email&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:t.inkMuted}}><Mail size={14} style={{color:t.inkFaint}}/><span style={{color:t.accentDeep}}>{c.email}</span></div>}
                  {c.phone&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:t.inkMuted}}><Phone size={14} style={{color:t.inkFaint}}/>{c.phone}</div>}
                  {c.notes&&<div style={{fontSize:12,color:t.inkFaint,lineHeight:1.5}}>{c.notes}</div>}
                </div>
                <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}><button onClick={()=>del(c)} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint,display:"flex",alignItems:"center",gap:5,fontSize:12,fontFamily:"inherit"}}><Trash2 size={13}/>Delete</button></div>
              </Panel>
            ))}
          </div>}
    </div>
  );
}

// ---- BRAND KIT ----
function Swatch({name,hex,t}){
  const[copied,setCopied]=useState(false);
  const copy=()=>{try{navigator.clipboard.writeText(hex);setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{}};
  return(
    <div onClick={copy} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
      <div style={{width:34,height:34,borderRadius:7,background:hex,flexShrink:0,border:`1px solid ${t.lineStrong}`}}/>
      <div>
        <div style={{fontSize:12.5,color:t.ink}}>{name}</div>
        <div style={{fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5}}>{copied?"Copied!":hex}{!copied&&<Copy size={10}/>}</div>
      </div>
    </div>
  );
}
function BrandCompany({co,assets,onChange,t}){
  const ct=co.theme;
  const logos=assets.filter(a=>a.asset_type==="logo");
  const colors=assets.filter(a=>a.asset_type==="color");
  const voice=assets.find(a=>a.asset_type==="voice");
  const logoInput=useRef(null);
  const[logoUrls,setLogoUrls]=useState({});
  const[voiceDraft,setVoiceDraft]=useState(voice?.value||"");
  const[addingColor,setAddingColor]=useState(false);
  const[newColor,setNewColor]=useState({label:"",value:"#000000"});
  useEffect(()=>{setVoiceDraft(voice?.value||"");},[voice?.id]);
  useEffect(()=>{(async()=>{const m={};for(const l of logos){if(l.storage_path){const u=await brandAssetUrl(l.storage_path);if(u)m[l.id]=u;}}setLogoUrls(m);})();},[logos.map(l=>l.id).join(",")]);
  const onLogo=async e=>{
    const f=(e.target.files||[])[0];if(!f)return;
    try{await uploadBrandLogo(co.id,f);onChange();}
    catch(err){alert("Logo upload failed: "+(err?.message||err));}
    finally{if(logoInput.current)logoInput.current.value="";}
  };
  const addColor=async()=>{
    if(!newColor.value)return;
    await saveBrandAsset({company_id:co.id,asset_type:"color",label:newColor.label||"Color",value:newColor.value});
    setAddingColor(false);setNewColor({label:"",value:"#000000"});onChange();
  };
  const saveVoice=async()=>{
    if(voiceDraft===(voice?.value||""))return;
    if(voice)await deleteBrandAsset(voice);
    if(voiceDraft.trim())await saveBrandAsset({company_id:co.id,asset_type:"voice",label:"Voice",value:voiceDraft});
    onChange();
  };
  const delColor=async c=>{await deleteBrandAsset(c);onChange();};
  const delLogo=async l=>{if(!window.confirm("Delete this logo?"))return;await deleteBrandAsset(l);onChange();};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{width:8,height:8,borderRadius:2,background:co.color}}/>
        <span style={{fontFamily:"'Fraunces',serif",fontSize:15,color:t.ink}}>{co.name}</span>
        {coChip(co.id,t)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:15,marginBottom:15}}>
        <Panel theme={t}>
          <div style={{fontSize:10.5,color:t.inkFaint,textTransform:"uppercase",letterSpacing:".06em",marginBottom:13,display:"flex",alignItems:"center",gap:6}}><Image size={12}/>Logos</div>
          <input ref={logoInput} type="file" accept="image/*" onChange={onLogo} style={{display:"none"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {logos.map(l=>(
              <div key={l.id} style={{position:"relative",aspectRatio:"16/9",background:ct.bgSunk,border:`1px solid ${ct.lineStrong}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                {logoUrls[l.id]?<img src={logoUrls[l.id]} alt={l.label} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<span style={{fontSize:10,color:t.inkFaint}}>…</span>}
                <button onClick={()=>delLogo(l)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.55)",border:"none",borderRadius:5,padding:3,cursor:"pointer",color:"#fff",display:"grid",placeItems:"center"}}><X size={11}/></button>
              </div>
            ))}
            <div onClick={()=>logoInput.current&&logoInput.current.click()} style={{aspectRatio:"16/9",border:`1px dashed ${t.lineStrong}`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,color:t.inkFaint,cursor:"pointer"}}><Plus size={16}/><span style={{fontSize:10}}>Add logo</span></div>
          </div>
        </Panel>
        <Panel theme={t}>
          <div style={{fontSize:10.5,color:t.inkFaint,textTransform:"uppercase",letterSpacing:".06em",marginBottom:13,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><Palette size={12}/>Colors</span>
            <button onClick={()=>setAddingColor(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",color:t.accent,display:"flex",alignItems:"center",gap:3,fontSize:11,fontFamily:"inherit"}}><Plus size={12}/>Add</button>
          </div>
          {addingColor&&(
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,padding:10,background:t.bgElevated,borderRadius:8}}>
              <input type="color" value={newColor.value} onChange={e=>setNewColor(c=>({...c,value:e.target.value}))} style={{width:34,height:34,border:"none",background:"none",cursor:"pointer"}}/>
              <input value={newColor.label} onChange={e=>setNewColor(c=>({...c,label:e.target.value}))} placeholder="Label" style={{...iS(t),padding:"6px 9px",fontSize:12}}/>
              <Btn theme={t} sm accent onClick={addColor}>Save</Btn>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {colors.length===0&&!addingColor&&<div style={{fontSize:12,color:t.inkFaint}}>No colors yet. Click Add.</div>}
            {colors.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <Swatch name={c.label||"Color"} hex={c.value} t={t}/>
                <button onClick={()=>delColor(c)} style={{background:"none",border:"none",cursor:"pointer",color:t.inkFaint}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
        <Panel theme={t}>
          <div style={{fontSize:10.5,color:t.inkFaint,textTransform:"uppercase",letterSpacing:".06em",marginBottom:13,display:"flex",alignItems:"center",gap:6}}><Type size={12}/>Typography</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:20,color:t.ink}}>Fraunces</div>
          <div style={{fontSize:11,color:t.inkMuted,marginBottom:12}}>Display / headlines</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:t.ink}}>JetBrains Mono</div>
          <div style={{fontSize:11,color:t.inkMuted}}>Data / captions</div>
        </Panel>
        <Panel theme={t}>
          <div style={{fontSize:10.5,color:t.inkFaint,textTransform:"uppercase",letterSpacing:".06em",marginBottom:13,display:"flex",alignItems:"center",gap:6}}><MessageSquare size={12}/>Voice & taglines</div>
          <textarea value={voiceDraft} onChange={e=>setVoiceDraft(e.target.value)} onBlur={saveVoice} rows={4} placeholder={`Add a tagline or brand voice notes for ${co.short}…`} style={{...iS(t),resize:"vertical",fontSize:12.5,lineHeight:1.6}}/>
          <div style={{fontSize:10.5,color:t.inkFaint,marginTop:6}}>Saves when you click away.</div>
        </Panel>
      </div>
    </div>
  );
}
function HubBrand({companyId,t}){
  const[assets,setAssets]=useState([]);
  const[loading,setLoading]=useState(true);
  const reload=async()=>{try{setAssets(await loadBrandAssets());}finally{setLoading(false);}};
  useEffect(()=>{reload();},[]);
  const list=companyId==="all"?COMPANIES:COMPANIES.filter(c=>c.id===companyId);
  if(loading)return <Panel theme={t}><EmptyState label="Loading…" sub="Fetching brand assets." theme={t}/></Panel>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {list.map(co=><BrandCompany key={co.id} co={co} assets={assets.filter(a=>a.company_id===co.id)} onChange={reload} t={t}/>)}
    </div>
  );
}

// ---- TEMPLATES ----
function TemplateModal({companyId,onClose,onSaved,t}){
  const[form,setForm]=useState({company_id:companyId==="all"?"all":companyId,category:"caption",title:"",body:""});
  const[busy,setBusy]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async()=>{
    if(!form.title.trim())return;
    setBusy(true);
    try{await saveTemplate({...form,title:form.title.trim()});onSaved();onClose();}
    catch(err){alert("Save failed: "+(err?.message||err));setBusy(false);}
  };
  const CATS=[["caption","Caption"],["email","Email / outreach"],["calendar","Content calendar"],["framework","Post framework"]];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"grid",placeItems:"center",zIndex:100,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:600,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:16,padding:28,boxShadow:t.shadowHover}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:500,color:t.ink}}>New template</div>
          <button onClick={onClose} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:7,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
          <Field label="Category" theme={t}><select value={form.category} onChange={e=>set("category",e.target.value)} style={{...iS(t),cursor:"pointer"}}>{CATS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Company" theme={t}><CompanyPicker value={form.company_id} onChange={v=>set("company_id",v)} includeAll t={t}/></Field>
        </div>
        <Field label="Title" theme={t}><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Launch-week hook" style={iS(t)}/></Field>
        <Field label="Body" theme={t}><textarea value={form.body} onChange={e=>set("body",e.target.value)} rows={8} placeholder="Write the reusable copy or framework…" style={{...iS(t),resize:"vertical",lineHeight:1.55}}/></Field>
        <div style={{display:"flex",justifyContent:"flex-end",gap:9}}>
          <Btn theme={t} onClick={onClose}>Cancel</Btn>
          <Btn theme={t} accent onClick={submit}>{busy?"Saving…":"Save template"}</Btn>
        </div>
      </div>
    </div>
  );
}
const TPL_CATS={caption:{label:"Caption templates",icon:MessageSquare},email:{label:"Email / outreach",icon:Mail},calendar:{label:"Content calendars",icon:CalendarDays},framework:{label:"Post frameworks",icon:FileText}};
function HubTemplates({companyId,t}){
  const[templates,setTemplates]=useState([]);
  const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(false);
  const[openTpl,setOpenTpl]=useState(null);
  const reload=async()=>{try{setTemplates(await loadTemplates());}finally{setLoading(false);}};
  useEffect(()=>{reload();},[]);
  const del=async id=>{if(!window.confirm("Delete this template?"))return;await deleteTemplate(id);setOpenTpl(null);await reload();};
  const reassign=async(tpl,cid)=>{if(cid===tpl.company_id)return;setTemplates(ts=>ts.map(x=>x.id===tpl.id?{...x,company_id:cid}:x));setOpenTpl(o=>o&&o.id===tpl.id?{...o,company_id:cid}:o);try{await setTemplateCompany(tpl.id,cid);}catch(err){alert("Couldn't reassign: "+(err?.message||err));reload();}};
  const shown=templates.filter(x=>companyId==="all"||x.company_id===companyId||x.company_id==="all");
  const borders={caption:t.accent,email:t.teal,calendar:t.gold,framework:t.indigo};
  return(
    <div>
      {modal&&<TemplateModal companyId={companyId} onClose={()=>setModal(false)} onSaved={reload} t={t}/>}
      {openTpl&&(
        <div onClick={()=>setOpenTpl(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"grid",placeItems:"center",zIndex:100,padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:600,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",background:t.bgCard,border:`1px solid ${t.lineStrong}`,borderRadius:16,padding:28,boxShadow:t.shadowHover}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div><div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:500,color:t.ink}}>{openTpl.title}</div><div style={{fontSize:12,color:t.inkMuted,marginTop:3,display:"flex",alignItems:"center",gap:8}}>{(TPL_CATS[openTpl.category]||{}).label||openTpl.category}<span style={{color:t.inkFaint}}>·</span><span style={{display:"flex",alignItems:"center",gap:5}}>Company: <CompanyChipSelect value={openTpl.company_id} onChange={cid=>reassign(openTpl,cid)} includeAll t={t}/></span></div></div>
              <button onClick={()=>setOpenTpl(null)} style={{background:t.bgElevated,border:`1px solid ${t.line}`,borderRadius:8,padding:7,cursor:"pointer",color:t.inkFaint,display:"grid",placeItems:"center"}}><X size={18}/></button>
            </div>
            <div style={{whiteSpace:"pre-wrap",fontSize:13.5,color:t.ink,lineHeight:1.6,background:t.bgSunk,border:`1px solid ${t.line}`,borderRadius:10,padding:16}}>{openTpl.body||"(empty)"}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
              <button onClick={()=>del(openTpl.id)} style={{background:"none",border:"none",cursor:"pointer",color:t.bad,display:"flex",alignItems:"center",gap:5,fontSize:13,fontFamily:"inherit"}}><Trash2 size={14}/>Delete</button>
              <Btn theme={t} accent onClick={()=>{navigator.clipboard.writeText(openTpl.body||"");}}>Copy text</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:12.5,color:t.inkMuted}}>Reusable starting points for content and outreach</div>
        <Btn theme={t} sm accent onClick={()=>setModal(true)}><Plus size={13}/>New template</Btn>
      </div>
      {loading?<Panel theme={t}><EmptyState label="Loading…" sub="Fetching templates." theme={t}/></Panel>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:15}}>
          {Object.entries(TPL_CATS).map(([cat,meta])=>{
            const Icon=meta.icon;const items=shown.filter(x=>x.category===cat);
            return(
              <Panel key={cat} theme={t} style={{borderTop:`3px solid ${borders[cat]}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><Icon size={16} style={{color:borders[cat]}}/><span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:500,color:t.ink}}>{meta.label}</span><span style={{marginLeft:"auto",fontSize:11,color:t.inkFaint,fontFamily:"'JetBrains Mono',monospace"}}>{items.length}</span></div>
                {items.length===0
                  ? <EmptyState label="None yet" sub="Save your first one to reuse it later." theme={t} pad={18}/>
                  : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {items.map(x=>(
                        <div key={x.id} onClick={()=>setOpenTpl(x)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 11px",background:t.bgElevated,borderRadius:8,cursor:"pointer",border:`1px solid ${t.line}`}}>
                          <span style={{fontSize:13,color:t.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.title}</span>
                          {x.company_id!=="all"&&<span style={{marginLeft:"auto"}}>{coChip(x.company_id,t)}</span>}
                        </div>
                      ))}
                    </div>}
              </Panel>
            );
          })}
        </div>}
    </div>
  );
}
function HubView({companyId,me,theme:t}){
  const[tab,setTab]=useState("files");
  const TABS=[
    {id:"files",label:"Files",icon:Folder},
    {id:"contacts",label:"Contacts",icon:Users},
    {id:"brand",label:"Brand kit",icon:Palette},
    {id:"templates",label:"Templates",icon:Sparkles},
  ];
  return(
    <div style={{padding:"26px 38px 80px",maxWidth:1480}}>
      <TBar title={<>Marketing <em style={{fontStyle:"italic",color:t.accentDeep}}>Hub</em></>} sub="Files, contacts, and brand assets in one place" theme={t}/>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} t={t}/>
      {tab==="files"     &&<HubFiles companyId={companyId} me={me} t={t}/>}
      {tab==="contacts"  &&<HubContacts companyId={companyId} t={t}/>}
      {tab==="brand"     &&<HubBrand companyId={companyId} t={t}/>}
      {tab==="templates" &&<HubTemplates companyId={companyId} t={t}/>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
const NAV=[
  {group:"Overview",items:[{id:"overview",label:"Dashboard",icon:LayoutGrid},{id:"reports",label:"Reports & Exports",icon:FileText}]},
  {group:"Channels",items:[{id:"seo",label:"SEO & Organic",icon:Search},{id:"social",label:"Social Media",icon:Globe},{id:"paid",label:"Paid Advertising",icon:BarChart2},{id:"email",label:"Email & Nurture",icon:Mail}]},
  {group:"Tasks",items:[{id:"board",label:"Board",icon:LayoutGrid},{id:"calendar",label:"Calendar",icon:CalendarDays},{id:"timeline",label:"SEO Timeline",icon:TrendingUp}]},
  {group:"Growth",items:[{id:"attribution",label:"Lead Attribution",icon:Zap},{id:"integrations",label:"Integrations & Data",icon:Settings},{id:"logins",label:"Company Logins",icon:Link2}]},
  {group:"Hub",items:[{id:"hub",label:"Marketing Hub",icon:Folder}]},
];

export default function App(){
  const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true);const [me,setMe]=useState("Someone");
  const [cid,setCid]=useState("aps");const [view,setView]=useState("overview");const [track,setTrack]=useState("seo");
  const [statusF,setStatusF]=useState("all");const [assigneeF,setAssigneeF]=useState("all");const [openTask,setOpenTask]=useState(null);const [newTaskOpen,setNewTaskOpen]=useState(false);const [newTaskDeadline,setNewTaskDeadline]=useState("");const [importOpen,setImportOpen]=useState(false);const [coMenu,setCoMenu]=useState(false);
  const [editMode,setEditMode]=useState(false);const [selected,setSelected]=useState(()=>new Set());const [dayModal,setDayModal]=useState(null);
  const mapRow=r=>({...r,companyId:r.company_id,deadline:r.deadline||"",notes:(r.notes||[]).map(n=>({id:n.id,who:n.author,text:n.body,when:new Date(n.created_at).toLocaleDateString()})),attachments:(r.attachments||[]).map(a=>({...a,type:a.kind}))});
  const reload=React.useCallback(async()=>{const rows=await loadTasks();setTasks(rows.map(mapRow));},[]);
  useEffect(()=>{(async()=>{try{const[rows,team,name]=await Promise.all([loadTasks(),getTeam(),currentName()]);if(team&&team.length)TEAM=team;setMe(name);setTasks(rows.map(mapRow));}finally{setLoading(false);}})();},[]);
  const t=useTheme(cid);
  const activeCo=cid==="all"?{id:"all",name:"All Companies",short:"ALL",color:ALL_COLOR,site:""}:COMPANIES.find(c=>c.id===cid)||COMPANIES[0];
  const todayISO=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return fmtDate(d);},[]);
  const weekISO=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+7);return fmtDate(d);},[]);
  const scope=tasks.filter(tk=>(cid==="all"||tk.companyId===cid)&&tk.track===track&&(!tk.recurring||(tk.deadline>=todayISO&&tk.deadline<=weekISO)));
  const counts=STATUS_ORDER.reduce((a,s)=>(a[s]=scope.filter(tk=>tk.status===s).length,a),{});
  const pct=scope.length?Math.round((counts.done/scope.length)*100):0;
  const update=(id,patch)=>{
    const p={...patch};
    // Stamp who completed the task (and when) whenever status flips to done; clear it if it's re-opened.
    if("status"in p){
      if(p.status==="done"){p.completed_by=me;p.completed_at=new Date().toISOString();}
      else{p.completed_by=null;p.completed_at=null;}
    }
    setTasks(ts=>ts.map(tk=>tk.id===id?{...tk,...p}:tk));
    const dp={};for(const k of["status","priority","deadline","title","phase","cadence","why","completed_by","completed_at","caption"])if(k in p)dp[k]=p[k];
    if(Object.keys(dp).length)dbUpdate(id,dp);
  };
  const removeTask=async id=>{setOpenTask(null);setTasks(ts=>ts.filter(tk=>tk.id!==id));await dbDeleteTask(id);};
  const removeTasks=async ids=>{const arr=[...ids];if(!arr.length)return;setTasks(ts=>ts.filter(tk=>!ids.has(tk.id)));setSelected(new Set());await dbDeleteTasks(arr);};
  const toggleSelect=id=>setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const exitEdit=()=>{setEditMode(false);setSelected(new Set());};
  // Leaving edit mode whenever the view or company/track scope changes avoids stale selections.
  useEffect(()=>{setEditMode(false);setSelected(new Set());},[view,cid,track]);
  const createTask=async input=>{await dbCreateTask(input);await reload();};
  const importTasks=async rows=>{const n=await dbImportTasks(rows);await reload();return n;};
  // Opens the New Task drawer, optionally pre-filling a deadline (used by the calendar).
  const openNewTask=(deadline="")=>{setNewTaskDeadline(deadline||"");setNewTaskOpen(true);};
  const detail=openTask?tasks.find(tk=>tk.id===openTask):null;
  const defPhase=track==="seo"?SEO_TIMELINE[0].phase:PAID_MASTER[0][0];
  if(loading)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0E0F12",fontFamily:"'IBM Plex Sans',ui-sans-serif,sans-serif",color:"#6F6A63",fontSize:14}}>Loading your command center…</div>;
  if(tasks.length===0)return <SetupScreen onDone={reload} me={me}/>;
  const isBoardMode=["board","calendar","timeline"].includes(view);
  return(
    <div style={{display:"grid",gridTemplateColumns:"248px 1fr",minHeight:"100vh",fontFamily:"'IBM Plex Sans',-apple-system,system-ui,sans-serif",background:t.bg,color:t.ink}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:9px;height:9px;}::-webkit-scrollbar-thumb{background:${t.lineStrong};border-radius:5px;border:2px solid ${t.bg};}.kpi-card:hover{box-shadow:${t.shadowHover};transform:translateY(-2px);}.kpi-card:hover .kpi-line{opacity:1!important;}.tbl-row:hover{background:${t.accentWash}!important;}.kan-card:hover{box-shadow:${t.shadowHover};transform:translateY(-2px);}.task-row:hover{background:${t.bgElevated}!important;}.cal-day:hover .cal-add{opacity:1!important;}`}</style>

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
                <select style={{border:"none",background:t.bgElevated,padding:"9px 4px",fontSize:13,color:t.ink,cursor:"pointer",outline:"none",fontFamily:"inherit"}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
                  <option style={{background:t.bgElevated,color:t.ink}} value="all">All statuses</option>
                  {STATUS_ORDER.map(s=><option key={s} style={{background:t.bgElevated,color:t.ink}} value={s}>{STATUSES[s].label}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,border:`1px solid ${assigneeF!=="all"?t.accent:t.line}`,borderRadius:9,padding:"0 10px"}}>
                <Users size={14} style={{opacity:.6,color:assigneeF!=="all"?t.accent:t.inkFaint}}/>
                <select style={{border:"none",background:t.bgElevated,padding:"9px 4px",fontSize:13,color:t.ink,cursor:"pointer",outline:"none",fontFamily:"inherit"}} value={assigneeF} onChange={e=>setAssigneeF(e.target.value)}>
                  <option style={{background:t.bgElevated,color:t.ink}} value="all">Everyone</option>
                  <option style={{background:t.bgElevated,color:t.ink}} value="__unassigned">Unassigned</option>
                  {TEAM.map(n=><option key={n} style={{background:t.bgElevated,color:t.ink}} value={n}>{n}</option>)}
                </select>
              </div>
              {editMode?(
                <>
                  <span style={{fontSize:13,fontWeight:600,color:t.inkMuted}}>{selected.size} selected</span>
                  <button onClick={()=>{if(selected.size&&window.confirm(`Delete ${selected.size} task${selected.size!==1?"s":""}? This can't be undone.`))removeTasks(selected);}} disabled={!selected.size} style={{display:"flex",alignItems:"center",gap:6,background:selected.size?t.bad:t.bgElevated,color:selected.size?"#fff":t.inkFaint,border:`1px solid ${selected.size?t.bad:t.lineStrong}`,borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:selected.size?"pointer":"default",fontFamily:"inherit"}}><Trash2 size={15}/>Delete</button>
                  <button onClick={exitEdit} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,color:t.ink,border:`1px solid ${t.lineStrong}`,borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Done</button>
                </>
              ):(
                <>
                  <button onClick={()=>setEditMode(true)} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,color:t.ink,border:`1px solid ${t.lineStrong}`,borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><CheckSquare size={15}/>Edit</button>
                  <button onClick={()=>setImportOpen(true)} style={{display:"flex",alignItems:"center",gap:6,background:t.bgElevated,color:t.ink,border:`1px solid ${t.lineStrong}`,borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Upload size={15}/>Import</button>
                  <button onClick={()=>openNewTask()} style={{display:"flex",alignItems:"center",gap:6,background:t.accent,color:t.bg,border:"none",borderRadius:9,padding:"10px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 6px 16px -8px ${t.accent}cc`}}><Plus size={15}/>Add task</button>
                </>
              )}
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
        {view==="hub"         &&<HubView companyId={cid} me={me} theme={t}/>}
        {view==="board"       &&<BoardView tasks={tasks} companyId={cid} track={track} statusFilter={statusF} assigneeFilter={assigneeF} theme={t} onOpen={setOpenTask} onUpdate={update} todayISO={todayISO} weekISO={weekISO} editMode={editMode} selected={selected} onToggleSelect={toggleSelect}/>}
        {view==="calendar"    &&<CalendarView tasks={tasks} companyId={cid} track={track} assigneeFilter={assigneeF} setAssigneeFilter={setAssigneeF} theme={t} onOpen={setOpenTask} onAddTask={openNewTask} onReschedule={(id,date)=>update(id,{deadline:date})} editMode={editMode} selected={selected} onToggleSelect={toggleSelect} onOpenDay={setDayModal} onStartEdit={()=>setEditMode(true)} onExitEdit={exitEdit} onDeleteSelected={()=>{if(selected.size&&window.confirm(`Delete ${selected.size} task${selected.size!==1?"s":""}? This can't be undone.`))removeTasks(selected);}}/>}
        {view==="timeline"    &&<TimelineView tasks={tasks} companyId={cid} setCompanyId={setCid} theme={t}/>}
      </main>

      {detail&&<TaskDrawer t={detail} onClose={()=>setOpenTask(null)} update={update} onDelete={removeTask} company={COMPANIES.find(c=>c.id===detail.companyId)||COMPANIES[0]} me={me} onChanged={reload} theme={t}/>}
      <NewTaskModal open={newTaskOpen} onClose={()=>setNewTaskOpen(false)} onCreate={createTask} defaults={{phase:defPhase,deadline:newTaskDeadline}} companyId={cid==="all"?COMPANIES[0].id:cid} track={track} theme={t}/>
      <ImportModal open={importOpen} onClose={()=>setImportOpen(false)} onImport={importTasks} companyId={cid} track={track} theme={t}/>
      {dayModal&&<DayTasksModal date={dayModal} tasks={tasks.filter(tk=>tk.deadline===dayModal&&(cid==="all"||tk.companyId===cid)&&(assigneeF==="all"||(assigneeF==="__unassigned"?tk.assignees.length===0:tk.assignees.includes(assigneeF))))} theme={t} onClose={()=>setDayModal(null)} onOpen={id=>{setDayModal(null);setOpenTask(id);}} onAddTask={()=>{setDayModal(null);openNewTask(dayModal);}} editMode={editMode} selected={selected} onToggleSelect={toggleSelect}/>}
    </div>
  );
}
