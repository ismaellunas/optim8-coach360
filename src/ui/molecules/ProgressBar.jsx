import { C } from '../tokens.js';

export const PB = ({l,v,c})=><div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:C.sub,fontWeight:500}}>{l}</span><span style={{fontSize:13,fontWeight:700,color:c}}>{v}%</span></div><div style={{height:6,borderRadius:3,background:C.el}}><div style={{height:"100%",width:`${Math.min(v,100)}%`,borderRadius:3,background:c,transition:"width .6s"}}/></div></div>;
export default PB;
