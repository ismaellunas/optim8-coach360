import { C, fd } from '../tokens.js';

const IA = ({src,sz=44})=><div style={{width:sz,height:sz,borderRadius:14,overflow:"hidden",flexShrink:0,background:C.el}}><img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>;

export const Av = ({ch,sz=44,g=[C.br,C.br2],img})=>{if(img)return <IA src={img} sz={sz}/>;return <div style={{width:sz,height:sz,borderRadius:14,background:`linear-gradient(135deg,${g[0]},${g[1]})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:sz*.3,fontWeight:800,color:"#fff",fontFamily:fd}}>{ch}</div>;};
export default Av;
