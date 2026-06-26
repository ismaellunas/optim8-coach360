import { C, fd } from '../tokens.js';

export const Rg = ({v,sz=56,c})=>{const r=(sz-5)/2,ci=2*Math.PI*r;return <div style={{position:"relative",width:sz,height:sz}}><svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={C.el} strokeWidth={5}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${(v/100)*ci} ${ci}`} style={{transition:"stroke-dasharray .8s"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fd,fontSize:14,fontWeight:800,color:C.ink}}>{v}%</div></div>;};
export default Rg;
