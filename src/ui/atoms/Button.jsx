import { C, fd } from '../tokens.js';

export const Btn = ({children,primary,full,sx,...p})=><button{...p} style={{padding:"16px 28px",background:primary?`linear-gradient(135deg,${C.br},${C.br2})`:C.cd,color:primary?"#fff":C.ink,border:primary?"none":`1px solid ${C.ln}`,borderRadius:16,fontSize:15,fontWeight:700,fontFamily:fd,cursor:"pointer",width:full?"100%":"auto",boxShadow:primary?`0 6px 24px ${C.brG}`:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:52,...sx}}>{children}</button>;
export default Btn;
