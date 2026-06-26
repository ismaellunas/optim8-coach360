import { C, ff, fd } from '../tokens.js';

export const SH = ({title,act,label="View All"})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{fontFamily:fd,fontSize:18,fontWeight:800,color:C.ink,margin:0}}>{title}</h2>{act&&<button onClick={act} style={{fontSize:13,color:C.br,background:"none",border:"none",cursor:"pointer",fontFamily:ff,fontWeight:600,padding:"8px 0",minHeight:44}}>{label}</button>}</div>;
export default SH;
